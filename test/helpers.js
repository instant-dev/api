const zlib = require('zlib');
const http = require('http');

const InstantAPI = require('../index.js');

const HOST = 'localhost';
const PORT = 7357;
const ROOT = './test/gateway';

function parseServerSentEvents (buffer) {
  let events = {};
  let entries = buffer.toString().split('\n\n');
  entries
    .filter(entry => !!entry)
    .forEach(entry => {
      let event = '';
      let data = null;
      entry.split('\n').forEach((line, i) => {
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
  // Allow passing in body to HTTP DELETE
  req.useChunkedEncodingByDefault = true;
  req.end(data);
}

module.exports = {
  HOST,
  PORT,
  ROOT,
  InstantAPI,
  request,
  parseServerSentEvents
};