const http = require('http');
const zlib = require('zlib');

const bufferify = (value) => {
  if (Buffer.isBuffer(value)) {
    return {_base64: value.toString('base64')};
  } else if (Array.isArray(value)) {
    return value.map(v => bufferify(v));
  } else if (value !== null && typeof value === 'object') {
    return Object.keys(value).reduce((acc, key) => {
      acc[key] = bufferify(value[key]);
      return acc;
    }, {});
  } else {
    return value;
  }
}

class TestEngineTools {

  constructor (port) {
    this.host = 'localhost';
    this.port = port;
  }

  __parseServerSentEvents__ (buffer) {
    const events = {};
    const entries = buffer.toString().split('\n\n');
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
            data = data + contents;
          }
        });
        events[event] = events[event] || [];
        events[event].push(data || '');
      });
    return events;
  };

  __formatQueryParams__ (path, params) {
    let queryParams = '';
    if (params) {
      if (
        typeof params === 'object' &&
        !Buffer.isBuffer(params) &&
        Object.keys(params).length > 0
      ) {
        queryParams = Object.keys(params)
          .filter(key => params[key] !== null && params[key] !== void 0)
          .map(key => {
            let value = params[key];
            if (Buffer.isBuffer(value)) {
              value = JSON.stringify({_base64: value.toString('base64')});
            } else if (typeof value === 'object') {
              value = JSON.stringify(bufferify(value));
            }
            return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
          })
          .join('&');
      } else if (
        (Buffer.isBuffer(params) && params.length > 0) ||
        typeof params === 'string'
      ) {
        queryParams = params.toString();
      }
    }
    path = path.replace(/[\?\&]+$/, '');
    queryParams = queryParams.replace(/^[\?\&]+/, '');
    return path.indexOf('?') > -1
      ? `${path}${queryParams ? `&${queryParams}` : ``}`
      : `${path}${queryParams ? `?${queryParams}` : ``}`;
  }

  async request (method, path, data, headers = {}) {
    method = method || 'GET';
    path = path || '';
    path = path.startsWith('/') ? path : `/${path}`;
    let queryParams = '';
    if (data && typeof data === 'object' && !Buffer.isBuffer(data)) {
      data = JSON.stringify(bufferify(data));
      headers['Content-Type'] = 'application/json';
    } else if (typeof data === 'string') {
      let contentType = Object.keys(headers).find(k => k.toLowerCase() === 'content-type');
      if (!contentType) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
    }
    data = data || '';
    return new Promise((resolve, reject) => {
      // return resolve({statusCode: 200, headers: {}, body: Buffer.from(''), text: '', json: {}, events: {}});
      const pathname = `${path}${queryParams}`;
      const req = http.request(
        {
          host: this.host,
          port: this.port,
          path: pathname,
          method: method,
          headers: headers
        },
        (res) => {
          let buffers = [];
          res.on('data', chunk => buffers.push(chunk));
          res.on('error', err => reject(err));
          res.on('end', () => {
            let body = Buffer.concat(buffers);
            if (res.headers['content-encoding'] === 'gzip') {
              body = zlib.gunzipSync(body);
            } else if (res.headers['content-encoding'] === 'deflate') {
              body = zlib.inflateSync(body);
            }
            let text = body.toString();
            let json = null;
            let events = null;
            if ((res.headers['content-type'] || '').split(';')[0] === 'application/json') {
              json = JSON.parse(body.toString());
            } else if ((res.headers['content-type'] || '').split(';')[0] === 'text/event-stream') {
              events = this.__parseServerSentEvents__(body);
            }
            if (
              res.statusCode.toString().startsWith('4') ||
              res.statusCode.toString().startsWith('5')
            ) {
              const error = json?.error?.message || (json?.error && JSON.stringify(json.error)) || text;
              console.error(`${method} ${pathname} ${res.statusCode}:\n${error}`);
            }
            resolve({statusCode: res.statusCode, headers: res.headers, body, text, json, events});
          });
        }
      );
      req.on('error', err => reject(err));
      req.useChunkedEncodingByDefault = true;
      req.end(data);
    });
  }

  async get (path, params, headers) {
    return this.request('GET', this.__formatQueryParams__(path, params), null, headers);
  }

  async post (path, params, headers) {
    return this.request('POST', path, params, headers);
  }

  async put (path, params, headers) {
    return this.request('PUT', path, params, headers);
  }

  async del (path, params, headers) {
    return this.request('DELETE', this.__formatQueryParams__(path, params), null, headers);
  }

}

module.exports = TestEngineTools;