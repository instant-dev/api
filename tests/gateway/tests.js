const http = require('http');
const zlib = require('zlib');

const PORT = 7357;
const HOST = 'localhost'
const ROOT = './tests/gateway';

function parseServerSentEvents (buffer) {
  let events = {};
  let entries = buffer.toString().split('\n\n');
  entries
    .filter(entry => !!entry)
    .forEach(entry => {
      let event = '';
      let data = null;
      let lines = entry.split('\n').map((line, i) => {
        let lineData = line.split(':');
        let type = lineData[0];
        let contents = lineData.slice(1).join(':');
        if (contents.startsWith(' ')) {
          contents = contents.slice(1);
        }
        if (type === 'event' && data === null) {
          event = contents;
        } else if (type === 'data') {
          data = data || '';
          data = data + contents + '\n';
        }
      });
      if (data && data.endsWith('\n')) {
        data = data.slice(0, -1);
      }
      events[event] = events[event] || [];
      events[event].push(data || '');
    });
  return events;
}

function request (method, headers, path, data, callback) {
  headers = headers || {};
  method = method || 'GET';
  path = path || '';
  path = path.startsWith('/') ? path : `/${path}`;
  if (typeof data === 'object') {
    data = JSON.stringify(data);
    headers['Content-Type'] = 'application/json';
  } else if (typeof data === 'string') {
    let contentType = Object.keys(headers).find(k => k.toLowerCase() === 'content-type');
    if (!contentType) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
  }
  data = data || '';
  let req = http.request({
    host: HOST,
    port: PORT,
    path: path,
    method: method,
    headers: headers
  }, (res) => {
    let buffers = [];
    res.on('data', chunk => buffers.push(chunk));
    res.on('end', () => {
      let result = Buffer.concat(buffers);
      if (res.headers['content-encoding'] === 'gzip') {
        result = zlib.gunzipSync(result);
      } else if (res.headers['content-encoding'] === 'deflate') {
        result = zlib.inflateSync(result);
      }
      if ((res.headers['content-type'] || '').split(';')[0] === 'application/json') {
        result = JSON.parse(result.toString());
      }
      callback(null, res, result);
    });
    res.on('error', err => callback(err));
  });
  req.end(data);
}

module.exports = (expect, instantModule) => {

  const {Gateway, FunctionParser} = instantModule;

  const FaaSGateway = new Gateway({
    debug: false,
    root: ROOT,
    defaultTimeout: 1000,
    developmentMode: true
  });
  const parser = new FunctionParser();

  before(() => {
    const preloadFiles = {
      'functions/sample_preload.js': Buffer.from(`module.exports = async () => { return true; };`)
    };
    FaaSGateway.listen(PORT);
    FaaSGateway.define(
      parser.load(ROOT, 'functions', 'www', null, preloadFiles),
      preloadFiles
    );
  });

  describe('Main tests', () => {
    require('./tests/main.js')(expect, FaaSGateway, parser, parseServerSentEvents, request);
  });

  describe('ESM tests', () => {
    require('./tests/esm.js')(expect, FaaSGateway, parser, parseServerSentEvents, request);
  })

  after(() => FaaSGateway.close());

};
