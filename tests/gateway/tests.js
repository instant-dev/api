const http = require('http');
const zlib = require('zlib');
const fs = require('fs')
const FormData = require('form-data');
const {Gateway, FunctionParser} = require('../../index.js');

const PORT = 7357;
const HOST = 'localhost'
const ROOT = './tests/gateway';

const FaaSGateway = new Gateway({debug: false, root: ROOT, defaultTimeout: 1000});
const parser = new FunctionParser();

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

module.exports = (expect) => {

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

  it('Should setup correctly', () => {

    expect(FaaSGateway.server).to.exist;
    expect(FaaSGateway.definitions).to.exist;
    expect(FaaSGateway.definitions).to.haveOwnProperty('my_function');
    expect(FaaSGateway.definitions).to.haveOwnProperty('sample_preload');
    expect(FaaSGateway.preloadFiles).to.haveOwnProperty('functions/sample_preload.js');

  });

  it('Should have the parser preload correctly', () => {

    const preloadFiles = {
      'functions/preload.js': Buffer.from(`
        module.exports = async (a, context) => {
          return true;
        };
      `),
      'functions/preload2.js': Buffer.from(`
        module.exports = async (b, c) => {
          return true;
        };
      `)
    };

    let definitions = parser.load(ROOT, 'functions', 'www', null, preloadFiles);
    expect(definitions).to.haveOwnProperty('preload');
    expect(definitions['preload'].params.length).to.equal(1);
    expect(definitions['preload'].context).to.deep.equal({});
    expect(definitions['preload2'].params.length).to.equal(2);
    expect(definitions['preload2'].context).to.equal(null);

  });

  it('Should parser error if trying to load a preloaded file name', () => {

    const preloadFiles = {
      'functions/my_function.js': Buffer.from(`
        module.exports = async (a, context) => {
          return true;
        };
      `)
    };

    let definitions;
    try {
      definitions = parser.load(ROOT, 'functions', 'www', null, preloadFiles);
    } catch (e) {
      expect(e).to.exist;
      expect(e.message).to.contain('preload');
    }

  });

  it('Should return 404 + ClientError for not found function', done => {
    request('GET', {}, '/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(404);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ClientError');
      done();

    });
  });

  it('Should return 302 redirect on GET request when missing trailing / with user agent', done => {
    request('GET', {'user-agent': 'testing'}, '/my_function', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(302);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers).to.haveOwnProperty('location');
      expect(res.headers.location).to.equal('/my_function/');
      done();

    });
  });

  it('Should not return 302 redirect on a GET request when missing trailing / without user agent', done => {
    request('GET', {}, '/my_function', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.not.equal(302);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');

      done();

    });
  });

  it('Should not return 302 redirect for POST request with trailing slash with user agent', done => {
    request('POST', {'user-agent': 'testing'}, '/my_function', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.not.equal(302);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      done();

    });
  });

  it('Should give 200 OK and property headers for OPTIONS', done => {
    request('OPTIONS', {}, '/my_function/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      done();

    });
  });

  it('Should give 200 OK and property headers for HEAD', done => {
    request('HEAD', {}, '/my_function/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      done();

    });
  });

  it('Should return 200 OK when no Content-Type specified on GET', done => {
    request('GET', {}, '/my_function/', undefined, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.equal(6);
      done();

    });
  });

  it('Should return 400 Bad Request + ParameterParseError when no Content-Type specified on POST', done => {
    request('POST', {}, '/my_function/', undefined, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterParseError');
      done();

    });
  });

  it('Should return 400 Bad Request + ParameterParseError when Content-Type: text/plain specified on POST with invalid JSON', done => {
    request('POST', {'Content-Type': 'text/plain'}, '/my_function/', 'lol', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterParseError');
      done();

    });
  });

  it('Should return 400 Bad Request + ParameterParseError when Content-Type: text/plain specified on POST with non-object JSON', done => {
    request('POST', {'Content-Type': 'text/plain'}, '/my_function/', '[]', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterParseError');
      done();

    });
  });

  it('Should return 200 OK when Content-Type: text/plain specified on POST with valid JSON object', done => {
    request('POST', {'Content-Type': 'text/plain'}, '/my_function/', '{}', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.equal(6);
      done();

    });
  });

  it('Should return 200 OK when Content-Type: text/plain specified on POST with valid doubly-stringified JSON object', done => {
    request('POST', {'Content-Type': 'text/plain;charset=UTF-8'}, '/my_function/', '"{}"', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.equal(6);
      done();

    });
  });

  it('Should return 200 OK + result when executed', done => {
    request('GET', {}, '/my_function/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.equal(6);
      done();

    });
  });

  it('Should return 200 OK + result when preloadFile executed', done => {
    request('GET', {}, '/sample_preload/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.equal(true);
      done();

    });
  });

  it('Should return 200 OK + gzip result when executed with Accept-Encoding: gzip', done => {
    request('GET', {'accept-encoding': 'gzip'}, '/my_function/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-encoding']).to.equal('gzip');
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.equal(6);
      done();

    });
  });

  it('Should return 200 OK + deflate result when executed with Accept-Encoding: deflate', done => {
    request('GET', {'accept-encoding': 'deflate'}, '/my_function/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-encoding']).to.equal('deflate');
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.equal(6);
      done();

    });
  });

  it('Should return 200 OK + gzip result when executed with Accept-Encoding: gzip, deflate', done => {
    request('GET', {'accept-encoding': 'gzip, deflate'}, '/my_function/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-encoding']).to.equal('gzip');
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.equal(6);
      done();

    });
  });

  it('Should parse arguments from URL', done => {
    request('GET', {}, '/my_function/?a=10&b=20&c=30', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.equal(60);
      done();

    });
  });

  it('Should parse arguments from URL into array, var[] format', done => {
    request('GET', {}, '/my_function_test_parsing/?a[]=1&a[]=2&a[]=3', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.deep.equal({a: ['1', '2', '3'], b: {}});
      done();

    });
  });

  it('Should parse arguments from URL into array, var[0] format, with push', done => {
    request('GET', {}, '/my_function_test_parsing/?a[1]=1&a[0]=2&a[]=100&a[5]=3&a[]=7', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.deep.equal({a: ['2', '1', null, null, null, '3', '100', '7'], b: {}});
      done();

    });
  });

  it('Should return bad request if array populated by pushing and set', done => {
    request('GET', {}, '/my_function_test_parsing/?a[]=1&a[]=2&a=[1,2,3]', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      done();

    });
  });

  it('Should return bad request if non-integer value used as index in array', done => {
    request('GET', {}, '/my_function_test_parsing/?a[1.5]=1', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      done();

    });
  });

  it('Should parse arguments from URL into array, var[0] format, with push and covert to type', done => {
    request('GET', {}, '/my_function_test_parsing_convert/?a[1]=1&a[0]=2&a[]=100&a[5]=3&a[]=7', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.deep.equal({a: [2, 1, null, null, null, 3, 100, 7], b: {}});
      done();

    });
  });

  it('Should parse arguments from URL into array, obj.field format', done => {
    request('GET', {}, '/my_function_test_parsing/?b.lol=1&b.wat=23', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.deep.equal({a: [], b: {lol: '1', wat: '23'}});
      done();

    });
  });

  it('Should parse arguments from URL into array, obj.field format, setting multiple field levels', done => {
    request('GET', {}, '/my_function_test_parsing/?b.lol=1&b.wat=23&b.cool.beans=hi', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.deep.equal({a: [], b: {lol: '1', wat: '23', cool: {beans: 'hi'}}});
      done();

    });
  });

  it('Should parse arguments from URL into array, obj.field format, setting multiple field levels with array', done => {
    request('GET', {}, '/my_function_test_parsing/?b.lol=1&b.wat=23&b.cool.beans[]=hi', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.deep.equal({a: [], b: {lol: '1', wat: '23', cool: {beans: ['hi']}}});
      done();

    });
  });

  it('Should parse arguments from URL into array, obj.field format, setting multiple field levels with array and sub object', done => {
    request('GET', {}, '/my_function_test_parsing/?b.lol=1&b.wat=23&b.cool[].beans=hi', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.deep.equal({a: [], b: {lol: '1', wat: '23', cool: [{beans: 'hi'}]}});
      done();

    });
  });

  it('Should parse arguments from URL into array, obj.field format, setting multiple field levels with 2d array and sub object within an array', done => {
    request('GET', {}, '/my_function_test_parsing/?b.lol=1&b.wat=23&b.cool[][].beans=hi', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.deep.equal({a: [], b: {lol: '1', wat: '23', cool: [[{beans: 'hi'}]]}});
      done();

    });
  });

  it('Should parse arguments from URL into array, obj.field format, setting multiple items in an array and sub object within an array', done => {
    request('GET', {}, '/my_function_test_parsing/?b.lol=1&b.wat=23&b.cool[]=hi&b.cool[]=anotheritem', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.deep.equal({a: [], b: {lol: '1', wat: '23', cool: ['hi', 'anotheritem']}});
      done();

    });
  });

  it('Should reject obj.field format for an argument in the URL that is already typed as a non-object with a ParameterParseError', done => {
    request('GET', {}, '/my_function_test_parsing/?c=1&c.field=1', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterParseError');
      done();

    });
  });

  it('Should reject obj.field format for a nested argument in the URL that is already typed as a non object with a ParameterParseError', done => {
    request('GET', {}, '/my_function_test_parsing/?b.field=1&b.field.test=2', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterParseError');
      done();

    });
  });

  it('Should reject obj.field format, setting multiple field levels with array', done => {
    request('GET', {}, '/my_function_test_parsing/?b.lol=1&b.wat=23&b.cool[]=hi&b.cool=hi', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      done();

    });
  });

  it('Should reject obj.field format, overwriting child object', done => {
    request('GET', {}, '/my_function_test_parsing/?b.lol=1&b.wat=23&b.cool.beans=hi&b.cool=beans', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      done();

    });
  });

  it('Should return bad request if object populated by value and set', done => {
    request('GET', {}, '/my_function_test_parsing/?b.lol=1&b={}', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      done();

    });
  });

  it('Should parse arguments from URL into object, obj.field format, and convert to type', done => {
    request('GET', {}, '/my_function_test_parsing_convert/?b.lol=1&b.wat=23', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.deep.equal({a: [], b: {lol: 1, wat: '23'}});
      done();

    });
  });

  it('Should parse arguments from POST (URL encoded)', done => {
    request('POST', {}, '/my_function/', 'a=10&b=20&c=30', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.equal(60);
      done();

    });
  });

  it('Should not overwrite POST (URL encoded) data with query parameters', done => {
    request('POST', {}, '/my_function/?c=300', 'a=10&b=20&c=30', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterParseError');
      done();

    });
  });

  it('Should parse arguments from POST (JSON)', done => {
    request('POST', {}, '/my_function/', {a: 10, b: 20, c: 30}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.equal(60);
      done();

    });
  });

  it('Should not overwrite POST (JSON) data with query parameters', done => {
    request('POST', {}, '/my_function/?c=300', {a: 10, b: 20, c: 30}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterParseError');
      done();

    });
  });

  it('Should successfully parse arguments from POST (JSON Array)', done => {
    request('POST', {}, '/my_function/', [10, 20, 30], (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result.error).to.not.exist;
      done();

    });
  });

  it('Should give ParameterError if parameter doesn\'t match (converted)', done => {
    request('POST', {}, '/my_function/', 'a=10&b=20&c=hello%20world', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterError');
      expect(result.error.details).to.exist;
      expect(result.error.details.c).to.exist;
      expect(result.error.details.c.expected).to.exist;
      expect(result.error.details.c.expected.type).to.equal('number');
      expect(result.error.details.c.actual).to.exist;
      expect(result.error.details.c.actual.type).to.equal('string');
      expect(result.error.details.c.actual.value).to.equal('hello world');
      done();

    });
  });

  it('Should give ParameterError if parameter doesn\'t match (not converted)', done => {
    request('POST', {}, '/my_function/', {a: 10, b: 20, c: '30'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterError');
      expect(result.error.details).to.exist;
      expect(result.error.details.c).to.exist;
      expect(result.error.details.c.expected).to.exist;
      expect(result.error.details.c.expected.type).to.equal('number');
      expect(result.error.details.c.actual).to.exist;
      expect(result.error.details.c.actual.type).to.equal('string');
      expect(result.error.details.c.actual.value).to.equal('30');
      done();

    });
  });

  it('Should give 502 + ValueError if unexpected value', done => {
    request('POST', {}, '/my_function/', {c: 100}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(502);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ValueError');
      expect(result.error.details).to.exist;
      expect(result.error.details.returns).to.exist;
      expect(result.error.details.returns.message).to.exist;
      expect(result.error.details.returns.expected).to.exist;
      expect(result.error.details.returns.expected.type).to.equal('number');
      expect(result.error.details.returns.actual).to.exist;
      expect(result.error.details.returns.actual.type).to.equal('string');
      expect(result.error.details.returns.actual.value).to.equal('hello value');
      done();

    });
  });

  it('Should give 200 OK for not found function', done => {
    request('POST', {}, '/test/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.equal('not found?');
      done();

    });
  });

  it('Should allow status setting from third callback parameter', done => {
    request('POST', {}, '/test/status/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(404);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.be.instanceof(Buffer);
      expect(result.toString()).to.equal('not found');
      done();

    });
  });

  it('Should pass headers properly', done => {
    request('POST', {}, '/headers/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('text/html');
      expect(result).to.be.instanceof(Buffer);
      expect(result.toString()).to.equal('abcdef');
      done();

    });
  });

  it('Should parse object properly', done => {
    request('POST', {}, '/object_parsing/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal(null);
      done();

    });
  });

  it('Should toJSON object properly', done => {
    request('POST', {}, '/object_tojson/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.deep.equal({name: 'hello world', description: 'MyClass'});
      done();

    });
  });

  it('Should populate HTTP body', done => {
    request('POST', {}, '/http_body/', {abc: 123}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.be.a.string;
      expect(result).to.equal('{"abc":123}');
      done();

    });
  });

  it('Should null number properly (POST)', done => {
    request('POST', {}, '/number_nullable/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.be.an.array;
      expect(result[0]).to.equal(null);
      expect(result[1]).to.equal(null);
      done();

    });
  });

  it('Should null number properly (GET)', done => {
    request('GET', {}, '/number_nullable/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.be.an.array;
      expect(result[0]).to.equal(null);
      expect(result[1]).to.equal(null);
      done();

    });
  });

  it('Should error object on string provided', done => {
    request('POST', {}, '/object_parsing/', {obj: 'xxx'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterError');
      expect(result.error.details).to.exist;
      expect(result.error.details.obj).to.exist;
      expect(result.error.details.obj.message).to.exist;
      expect(result.error.details.obj.expected).to.exist;
      expect(result.error.details.obj.expected.type).to.equal('object');
      expect(result.error.details.obj.actual).to.exist;
      expect(result.error.details.obj.actual.type).to.equal('string');
      expect(result.error.details.obj.actual.value).to.equal('xxx');
      done();

    });
  });

  it('Should reject integer type when provided float (GET)', done => {
    request('GET', {}, '/type_rejection/?alpha=47.2', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterError');
      expect(result.error.details).to.exist;
      expect(result.error.details.alpha).to.exist;
      expect(result.error.details.alpha.message).to.exist;
      expect(result.error.details.alpha.expected).to.exist;
      expect(result.error.details.alpha.expected.type).to.equal('integer');
      expect(result.error.details.alpha.actual).to.exist;
      expect(result.error.details.alpha.actual.type).to.equal('number');
      expect(result.error.details.alpha.actual.value).to.equal(47.2);
      done();

    });
  });

  it('Should reject integer type when provided float (POST)', done => {
    request('POST', {}, '/type_rejection/', {alpha: 47.2}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterError');
      expect(result.error.details).to.exist;
      expect(result.error.details.alpha).to.exist;
      expect(result.error.details.alpha.message).to.exist;
      expect(result.error.details.alpha.expected).to.exist;
      expect(result.error.details.alpha.expected.type).to.equal('integer');
      expect(result.error.details.alpha.actual).to.exist;
      expect(result.error.details.alpha.actual.type).to.equal('number');
      expect(result.error.details.alpha.actual.value).to.equal(47.2);
      done();

    });
  });

  it('Should accept integer type when provided integer (GET)', done => {
    request('GET', {}, '/type_rejection/?alpha=47', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal(47);
      done();

    });
  });

  it('Should accept integer type when provided integer (POST)', done => {
    request('POST', {}, '/type_rejection/', {alpha: 47}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal(47);
      done();

    });
  });

  it('Should not accept empty object.http', done => {
    request('GET', {}, '/sanitize/http_object_empty/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(502);
      expect(result.error).to.exist;
      expect(result.error.details).to.exist;
      expect(result.error.details.returns).to.exist
      expect(result.error.details.returns.invalid).to.equal(true);
      done();

    });
  });

  it('Should sanitize a {_base64: ...} buffer input', done => {
    request('GET', {}, '/sanitize/http_object_base64/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result.error).to.not.exist;
      expect(result.toString()).to.equal('fix for steven');
      done();

    });
  });

  it('Should accept uppercase Content-Type', done => {
    request('GET', {}, '/sanitize/http_object_header_case/?contentType=image/png', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.exist;
      expect(res.headers).to.haveOwnProperty('content-type');
      expect(res.headers['content-type']).to.equal('image/png');
      done();

    });
  });

  it('Should return a proper error for invalid header names', done => {
    request('GET', {}, '/sanitize/http_object_invalid_header_names/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(502);
      expect(result.error).to.exist;
      expect(result.error.details).to.exist;
      expect(Object.keys(result.error.details).length).to.equal(5);
      expect(result.error.details['content-type ']).to.exist;
      expect(result.error.details['x authorization key']).to.exist;
      expect(result.error.details[' anotherheader']).to.exist;
      expect(result.error.details['multilinename\n']).to.exist;
      expect(result.error.details['weirdname!@#$%^&*()œ∑´®†¥¨ˆøπåß∂ƒ©˙∆˚¬≈ç√∫˜µ≤:|{}🔥🔥🔥']).to.exist;
      done();

    });
  });

  it('Should return a proper error for invalid header values', done => {
    request('GET', {}, '/sanitize/http_object_invalid_header_values/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(502);
      expect(result.error).to.exist;
      expect(result.error.details).to.exist;
      expect(Object.keys(result.error.details).length).to.equal(3);
      expect(result.error.details['object-value']).to.exist;
      expect(result.error.details['undefined-value']).to.exist;
      expect(result.error.details['null-value']).to.exist;
      done();

    });
  });

  it('Should not accept object.http with null body', done => {
    request('GET', {}, '/sanitize/http_object/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(502);
      expect(result.error).to.exist;
      expect(result.error.details).to.exist;
      expect(result.error.details.returns).to.exist
      expect(result.error.details.returns.invalid).to.equal(true);
      done();


    });
  });

  it('Should accept object.http with string body', done => {
    request('GET', {}, '/sanitize/http_object/?body=hello', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/plain');
      expect(result.toString()).to.equal('hello');
      done();

    });
  });

  it('Should not accept object.http with statusCode out of range', done => {
    request('GET', {}, '/sanitize/http_object/?statusCode=600', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(502);
      expect(result.error).to.exist;
      expect(result.error.details).to.exist;
      expect(result.error.details.returns).to.exist
      expect(result.error.details.returns.invalid).to.equal(true);
      done();


    });
  });

  it('Should not accept object.http with invalid headers object', done => {
    request('POST', {}, '/sanitize/http_object/', {headers: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(502);
      expect(result.error).to.exist;
      expect(result.error.details).to.exist;
      expect(result.error.details.returns).to.exist
      expect(result.error.details.returns.invalid).to.equal(true);
      done();


    });
  });

  it('Should allow header setting', done => {
    request('POST', {}, '/sanitize/http_object/', {body: '<b>hello</b>', headers: {'content-type': 'text/html'}}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/html');
      expect(result.toString()).to.equal('<b>hello</b>');
      done();

    });
  });

  it('Should overwrite access-control-allow-origin', done => {
    request('POST', {}, '/sanitize/http_object/', {body: '<b>hello</b>', headers: {'access-control-allow-origin': '$'}}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['access-control-allow-origin']).to.equal('$');
      expect(result.toString()).to.equal('<b>hello</b>');
      done();

    });
  });

  it('Should NOT overwrite x-instant-api', done => {
    request('POST', {}, '/sanitize/http_object/', {body: '<b>hello</b>', headers: {'x-instant-api': '$'}}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['x-instant-api']).to.not.equal('$');
      expect(result.toString()).to.equal('<b>hello</b>');
      done();

    });
  });

  it('Should run a function with an empty response', done => {
    request('POST', {}, '/empty/:bg', {intValue: 1}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(202);
      expect(result).to.exist;
      expect(result).to.be.instanceof(Buffer);
      expect(result.length).to.be.greaterThan(0);
      expect(result.toString()).to.equal('202 accepted');
      done();

    });
  });

  it('Should run a function with an empty response even if it has an invalid parameter', done => {
    request('POST', {}, '/empty/:bg', {intValue: 'what'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(202);
      expect(result).to.exist;
      expect(result).to.be.instanceof(Buffer);
      expect(result.length).to.be.greaterThan(0);
      expect(result.toString()).to.equal('202 accepted');
      done();

    });
  });

  it('Should return 302 redirect on a GET request with correct url when running a background function missing a slash before :bg and at end of url', done => {
    request('GET', {'user-agent': 'testing'}, '/empty:bg', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(302);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers).to.haveOwnProperty('location');
      expect(res.headers.location).to.equal('/empty/:bg');
      done();

    });
  });

  it('Should return 302 redirect on a GET request with correct url when running a background function missing a slash before :bg but with slash at end of url', done => {
    request('GET', {'user-agent': 'testing'}, '/empty:bg/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(302);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers).to.haveOwnProperty('location');
      expect(res.headers.location).to.equal('/empty/:bg');
      done();

    });
  });

  it('Should return 302 redirect on a GET request with correct url when running a background function missing a slash before :bg and at end of url with a query', done => {
    request('GET', {'user-agent': 'testing'}, '/empty:bg?test=param', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(302);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers).to.haveOwnProperty('location');
      expect(res.headers.location).to.equal('/empty/:bg?test=param');
      done();

    });
  });

  it('Should return 302 redirect on a GET request with correct url when running a background function missing a slash before :bg but with slash at end of url with a query', done => {
    request('GET', {'user-agent': 'testing'}, '/empty:bg/?test=param', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(302);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers).to.haveOwnProperty('location');
      expect(res.headers.location).to.equal('/empty/:bg?test=param');
      done();

    });
  });

  it('Should fail to run a background function without @background specified', done => {
    request('POST', {}, '/a_standard_function/', {_background: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(result).to.exist;
      expect(result).to.be.an.object;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ExecutionModeError');
      expect(result.error.message).to.contain('"background"');
      done();

    });
  });

  it('Should fail to run a background function without @stream specified', done => {
    request('POST', {}, '/a_standard_function/', {_stream: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(result).to.exist;
      expect(result).to.be.an.object;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ExecutionModeError');
      expect(result.error.message).to.contain('"stream"');
      done();

    });
  });

  it('Should run a background function', done => {
    request('POST', {}, '/bg/', {data: 'xxx', _background: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(202);
      expect(result).to.exist;
      expect(result).to.be.instanceof(Buffer);
      expect(result.length).to.be.greaterThan(0);
      expect(result.toString()).to.equal(`initiated "bg"...`);
      done();

    });
  });

  it('Should return 302 redirect on a GET request with correct url when running a background function missing a slash before ?_background and at end of url', done => {
    request('GET', {'user-agent': 'testing'}, '/bg?_background', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(302);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers).to.haveOwnProperty('location');
      expect(res.headers.location).to.equal('/bg/?_background');
      done();

    });
  });

  it('Should return 302 redirect on a GET request with correct url when running a background function missing a slash before ?_background but with slash at end of url', done => {
    request('GET', {'user-agent': 'testing'}, '/bg?_background/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(302);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers).to.haveOwnProperty('location');
      expect(res.headers.location).to.equal('/bg/?_background/');
      done();

    });
  });

  it('Should return 302 redirect on a GET request with correct url when running a background function missing a slash before ?_background and at end of url with a query', done => {
    request('GET', {'user-agent': 'testing'}, '/bg?_background&test=param', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(302);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers).to.haveOwnProperty('location');
      expect(res.headers.location).to.equal('/bg/?_background&test=param');
      done();

    });
  });

  it('Should run a background function with bg mode "info"', done => {
    request('POST', {}, '/bg/info/', {data: 'xxx', _background: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(202);
      expect(result).to.exist;
      expect(result).to.be.instanceof(Buffer);
      expect(result.length).to.be.greaterThan(0);
      done();

    });
  });

  it('Should run a background function with bg mode "empty"', done => {
    request('POST', {}, '/bg/empty/', {data: 'xxx', _background: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(202);
      expect(result).to.exist;
      expect(result).to.be.instanceof(Buffer);
      expect(result.length).to.equal(0);
      done();

    });
  });

  it('Should run a background function with bg mode "params"', done => {
    request('POST', {}, '/bg/params/', {data: 'xxx', _background: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(202);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result).to.haveOwnProperty('data');
      expect(result.data).to.equal('xxx');
      done();

    });
  });

  it('Should run a background function with bg mode "params" looking for a specific parameter', done => {
    request('POST', {}, '/bg/paramsSpecific1/', {data: 'xxx', discarded: 'xxx', _background: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(202);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result).to.haveOwnProperty('data');
      expect(result).to.not.haveOwnProperty('discarded');
      expect(result.data).to.equal('xxx');
      done();

    });
  });

  it('Should run a background function with bg mode "params" looking for two specific parameters', done => {
    request('POST', {}, '/bg/paramsSpecific2/', {data: 'xxx', otherdata: 'xxx', discarded: 'xxx', _background: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(202);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result).to.haveOwnProperty('data');
      expect(result).to.haveOwnProperty('otherdata');
      expect(result.data).to.equal('xxx');
      expect(result.otherdata).to.equal('xxx');
      done();

    });
  });

  it('Should run a background function with bg mode "params" looking for specific param that is not there', done => {
    request('POST', {}, '/bg/paramsSpecific3/', {otherdata: 'xxx', _background: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(202);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result).to.not.haveOwnProperty('data');
      done();

    });
  });

  it('Should register an error in the resolve step with type AccessPermissionError', done => {

    let originalResolveFn = FaaSGateway.resolve;
    FaaSGateway.resolve = (req, res, buffer, callback) => {
      let error = new Error('You are not allowed to access this API.');
      error.accessPermissionError = true;
      return callback(error);
    };

    request('POST', {}, '/my_function/', {}, (err, res, result) => {

      FaaSGateway.resolve = originalResolveFn;

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(401);
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('AccessPermissionError');
      done();

    });

  });

  it('Should register an error in the resolve step with type AccessSourceError', done => {

    let originalResolveFn = FaaSGateway.resolve;
    FaaSGateway.resolve = (req, res, buffer, callback) => {
      let error = new Error('You are not allowed to access this API.');
      error.accessSourceError = true;
      return callback(error);
    };

    request('POST', {}, '/my_function/', {}, (err, res, result) => {

      FaaSGateway.resolve = originalResolveFn;

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(401);
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('AccessSourceError');
      done();

    });

  });

  it('Should register an error in the resolve step with type AccessAuthError', done => {

    let originalResolveFn = FaaSGateway.resolve;
    FaaSGateway.resolve = (req, res, buffer, callback) => {
      let error = new Error('You are not allowed to access this API.');
      error.accessAuthError = true;
      return callback(error);
    };

    request('POST', {}, '/my_function/', {}, (err, res, result) => {

      FaaSGateway.resolve = originalResolveFn;

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(401);
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('AccessAuthError');
      done();

    });

  });

  it('Should register an error in the resolve step with type AccessSuspendedError', done => {

    let originalResolveFn = FaaSGateway.resolve;
    FaaSGateway.resolve = (req, res, buffer, callback) => {
      let error = new Error('You are not allowed to access this API.');
      error.accessSuspendedError = true;
      return callback(error);
    };

    request('POST', {}, '/my_function/', {}, (err, res, result) => {

      FaaSGateway.resolve = originalResolveFn;

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(401);
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('AccessSuspendedError');
      done();

    });

  });

  it('Should register an error in the resolve step with type OwnerSuspendedError', done => {

    let originalResolveFn = FaaSGateway.resolve;
    FaaSGateway.resolve = (req, res, buffer, callback) => {
      let error = new Error('You are not allowed to access this API.');
      error.ownerSuspendedError = true;
      return callback(error);
    };

    request('POST', {}, '/my_function/', {}, (err, res, result) => {

      FaaSGateway.resolve = originalResolveFn;

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(401);
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('OwnerSuspendedError');
      done();

    });

  });

  it('Should register an error in the resolve step with type OwnerPaymentRequiredError', done => {

    let originalResolveFn = FaaSGateway.resolve;
    FaaSGateway.resolve = (req, res, buffer, callback) => {
      let error = new Error('You are not allowed to access this API.');
      error.ownerPaymentRequiredError = true;
      return callback(error);
    };

    request('POST', {}, '/my_function/', {}, (err, res, result) => {

      FaaSGateway.resolve = originalResolveFn;

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(401);
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('OwnerPaymentRequiredError');
      done();

    });

  });

  it('Should register an error in the resolve step with type PaymentRequiredError', done => {

    let originalResolveFn = FaaSGateway.resolve;
    FaaSGateway.resolve = (req, res, buffer, callback) => {
      let error = new Error('You are not allowed to access this API.');
      error.paymentRequiredError = true;
      return callback(error);
    };

    request('POST', {}, '/my_function/', {}, (err, res, result) => {

      FaaSGateway.resolve = originalResolveFn;

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(402);
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('PaymentRequiredError');
      done();

    });

  });

  it('Should register an error in the resolve step with type RateLimitError', done => {

    let errorMessage = 'You have called this API too many times.';
    let originalResolveFn = FaaSGateway.resolve;
    FaaSGateway.resolve = (req, res, buffer, callback) => {
      let error = new Error(errorMessage);
      error.rateLimitError = true;
      error.rate = {
        count: 1,
        period: 3600
      };
      return callback(error);
    };

    request('POST', {}, '/my_function/', {}, (err, res, result) => {

      FaaSGateway.resolve = originalResolveFn;

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(429);
      expect(result.error).to.exist;
      expect(result.error.message).to.equal(errorMessage);
      expect(result.error.type).to.equal('RateLimitError');
      expect(result.error.details).to.haveOwnProperty('rate');
      expect(result.error.details.rate).to.haveOwnProperty('count');
      expect(result.error.details.rate).to.haveOwnProperty('period');
      expect(result.error.details.rate.count).to.equal(1);
      expect(result.error.details.rate.period).to.equal(3600);
      done();

    });

  });

  it('Should register an error in the resolve step with type AuthRateLimitError', done => {

    let errorMessage = 'You have called this API authenticated too many times.';
    let originalResolveFn = FaaSGateway.resolve;
    FaaSGateway.resolve = (req, res, buffer, callback) => {
      let error = new Error(errorMessage);
      error.authRateLimitError = true;
      error.rate = {
        count: 1,
        period: 3600
      };
      return callback(error);
    };

    request('POST', {}, '/my_function/', {}, (err, res, result) => {

      FaaSGateway.resolve = originalResolveFn;

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(429);
      expect(result.error).to.exist;
      expect(result.error.message).to.equal(errorMessage);
      expect(result.error.type).to.equal('AuthRateLimitError');
      expect(result.error.details).to.haveOwnProperty('rate');
      expect(result.error.details.rate).to.haveOwnProperty('count');
      expect(result.error.details.rate).to.haveOwnProperty('period');
      expect(result.error.details.rate.count).to.equal(1);
      expect(result.error.details.rate.period).to.equal(3600);
      done();

    });

  });

  it('Should register an error in the resolve step with type UnauthRateLimitError', done => {

    let errorMessage = 'You have called this API unauthenticated too many times.';
    let originalResolveFn = FaaSGateway.resolve;
    FaaSGateway.resolve = (req, res, buffer, callback) => {
      let error = new Error(errorMessage);
      error.unauthRateLimitError = true;
      error.rate = {
        count: 1,
        period: 3600
      };
      return callback(error);
    };

    request('POST', {}, '/my_function/', {}, (err, res, result) => {

      FaaSGateway.resolve = originalResolveFn;

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(429);
      expect(result.error).to.exist;
      expect(result.error.message).to.equal(errorMessage);
      expect(result.error.type).to.equal('UnauthRateLimitError');
      expect(result.error.details).to.haveOwnProperty('rate');
      expect(result.error.details.rate).to.haveOwnProperty('count');
      expect(result.error.details.rate).to.haveOwnProperty('period');
      expect(result.error.details.rate.count).to.equal(1);
      expect(result.error.details.rate.period).to.equal(3600);
      done();

    });

  });

  it('Should register an error in the resolve step with type SaveError', done => {

    let originalResolveFn = FaaSGateway.resolve;
    FaaSGateway.resolve = (req, res, buffer, callback) => {
      let error = new Error('There was a problem when saving your API.');
      error.saveError = true;
      return callback(error);
    };

    request('POST', {}, '/my_function/', {}, (err, res, result) => {

      FaaSGateway.resolve = originalResolveFn;

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(503);
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('SaveError');
      done();

    });

  });

  it('Should register an error in the resolve step with type MaintenanceError', done => {

    let originalResolveFn = FaaSGateway.resolve;
    FaaSGateway.resolve = (req, res, buffer, callback) => {
      let error = new Error('Your API is in maintenance mode.');
      error.maintenanceError = true;
      return callback(error);
    };

    request('POST', {}, '/my_function/', {}, (err, res, result) => {

      FaaSGateway.resolve = originalResolveFn;

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('MaintenanceError');
      done();

    });

  });

  it('Should register an error in the resolve step with type UpdateError', done => {

    let originalResolveFn = FaaSGateway.resolve;
    FaaSGateway.resolve = (req, res, buffer, callback) => {
      let error = new Error('Your API is currently updating.');
      error.updateError = true;
      return callback(error);
    };

    request('POST', {}, '/my_function/', {}, (err, res, result) => {

      FaaSGateway.resolve = originalResolveFn;

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(409);
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('UpdateError');
      done();

    });

  });

  it('Should register a runtime error properly', done => {
    request('POST', {}, '/runtime/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result.error).to.exist;
      expect(result.error).to.be.an('object');
      expect(result.error.type).to.equal('RuntimeError');
      expect(result.error).to.not.haveOwnProperty('details');
      done();

    });
  });

  it('Should register a runtime error properly with details', done => {
    request('POST', {}, '/runtime/details/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result.error).to.exist;
      expect(result.error).to.be.an('object');
      expect(result.error.type).to.equal('RuntimeError');
      expect(result.error.details).to.deep.equal({objects: 'supported'});
      done();

    });
  });

  it('Should register a fatal error properly', done => {
    request('POST', {}, '/runtime/fatal/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(500);
      expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result.error).to.exist;
      expect(result.error).to.be.an('object');
      expect(result.error.type).to.equal('FatalError');
      expect(result.error.stack).to.exist;
      done();

    });
  });

  it('Should register a fatal error with no stack properly', done => {
    request('POST', {}, '/runtime/fatal_no_stack/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(500);
      expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result.error).to.exist;
      expect(result.error).to.be.an('object');
      expect(result.error.type).to.equal('FatalError');
      expect(result.error.stack).to.not.exist;
      done();

    });
  });

  it('Should register a timeout error properly', done => {
    request('POST', {}, '/runtime/timeout/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(504);
      expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result.error).to.exist;
      expect(result.error).to.be.an('object');
      expect(result.error.type).to.equal('TimeoutError');
      done();

    });
  });

  it('Should register a thrown error properly', done => {
    request('POST', {}, '/runtime/thrown/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result.error).to.exist;
      expect(result.error).to.be.an('object');
      expect(result.error.type).to.equal('RuntimeError');
      done();

    });
  });

  it('Should register an uncaught promise', done => {
    request('POST', {}, '/runtime/promise_uncaught/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result.error).to.exist;
      expect(result.error).to.be.an('object');
      expect(result.error.type).to.equal('RuntimeError');
      done();

    });
  });

  it('Should respond to an array as an implementation error', done => {
    request('POST', {}, '/runtime/array/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result.error).to.exist;
      expect(result.error).to.be.an('object');
      expect(result.error.type).to.equal('RuntimeError');
      done();

    });
  });

  it('Should respond to a boolean as an implementation error', done => {
    request('POST', {}, '/runtime/boolean/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result.error).to.exist;
      expect(result.error).to.be.an('object');
      expect(result.error.type).to.equal('RuntimeError');
      done();

    });
  });

  it('Should respond to a number as an implementation error', done => {
    request('POST', {}, '/runtime/number/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result.error).to.exist;
      expect(result.error).to.be.an('object');
      expect(result.error.type).to.equal('RuntimeError');
      done();

    });
  });

  it('Should respond to an object as an implementation error', done => {
    request('POST', {}, '/runtime/object/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result.error).to.exist;
      expect(result.error).to.be.an('object');
      expect(result.error.type).to.equal('RuntimeError');
      done();

    });
  });

  it('Should respond to a string as an implementation error', done => {
    request('POST', {}, '/runtime/string/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
      expect(result).to.exist;
      expect(result).to.be.an('object');
      expect(result.error).to.exist;
      expect(result.error).to.be.an('object');
      expect(result.error.type).to.equal('RuntimeError');
      done();

    });
  });

  it('Should handle multipart/form-data', done => {

    let form = new FormData();
    form.append('my_field', 'my value');
    form.append('my_other_field', 'my other value');

    form.submit(`http://${HOST}:${PORT}/reflect`, (err, response) => {

      expect(err).to.not.exist;
      expect(response.statusCode).to.equal(200);

      let body = [];
      response.on('readable', function() {
          body.push(response.read());
      });

      response.on('end', function() {
        let results = JSON.parse(body);
        expect(results.my_field).to.equal('my value');
        expect(results.my_other_field).to.equal('my other value');
        done();
      });

      response.on('err', function(err) {
        expect(err).to.not.exist;
        done();
      })

    })
  });

  it('Should handle multipart/form-data with buffer', done => {

    let pkgJson = fs.readFileSync(process.cwd() + '/package.json')

    let form = new FormData();
    form.append('my_field', 'my value');
    form.append('my_string_buffer', Buffer.from('123'));
    form.append('my_file_buffer', pkgJson);

    form.submit(`http://${HOST}:${PORT}/reflect`, (err, response) => {

      expect(err).to.not.exist;
      expect(response.statusCode).to.equal(200);

      let body = [];
      response.on('readable', function() { body.push(response.read()); });

      response.on('end', function() {
        let results = JSON.parse(body);
        let stringBuffer = Buffer.from(results.my_string_buffer._base64, 'base64');
        let fileBuffer = Buffer.from(results.my_file_buffer._base64, 'base64');
        expect(results.my_field).to.equal('my value');
        expect(stringBuffer).to.be.deep.equal(Buffer.from('123'))
        expect(fileBuffer).to.be.deep.equal(pkgJson)
        done();
      });

      response.on('err', function(err) {
        expect(err).to.not.exist;
        done();
      })

    })
  });

  it('Should handle multipart/form-data with json', done => {

    let form = new FormData();
    form.append('my_field', 'my value');
    form.append('my_json', JSON.stringify({
      someJsonNums: 123,
      someJson: 'hello'
    }), 'my.json');

    form.submit(`http://${HOST}:${PORT}/reflect`, (err, response) => {

      expect(err).to.not.exist;
      expect(response.statusCode).to.equal(200);

      let body = [];
      response.on('readable', function() {
          body.push(response.read());
      });

      response.on('end', function() {
        let results = JSON.parse(body);
        expect(results.my_field).to.equal('my value');
        expect(results.my_json).to.deep.equal({
          someJsonNums: 123,
          someJson: 'hello'
        });
        done();
      });

      response.on('err', function(err) {
        expect(err).to.not.exist;
        done();
      })

    })
  });

  it('Should handle multipart/form-data with bad json', done => {

    let form = new FormData();
    form.append('my_field', 'my value');
    form.append('my_json', 'totally not json', 'my.json');

    form.submit(`http://${HOST}:${PORT}/reflect`, (err, response) => {

      expect(err).to.not.exist;
      expect(response.statusCode).to.equal(400);

      let body = [];
      response.on('readable', function() {
          body.push(response.read());
      });

      response.on('end', function() {
        let results = JSON.parse(body);
        expect(results.error).to.exist
        expect(results.error.type).to.equal('ParameterParseError');
        expect(results.error.message).to.equal('Invalid multipart form-data with key: my_json');
        done();
      });

      response.on('err', function(err) {
        expect(err).to.not.exist;
        done();
      })

    })
  });

  it('Should handle multipart/form-data with a png', done => {

    let image = fs.readFileSync(process.cwd() + '/tests/gateway/www/fs-wordmark.png');

    let form = new FormData();
    form.append('bufferParam', image);

    form.submit(`http://${HOST}:${PORT}/buffer_reflect`, (err, response) => {

      expect(err).to.not.exist;
      expect(response.statusCode).to.equal(200);

      let body = [];
      response.on('readable', function() {
          body.push(response.read());
      });

      response.on('end', function() {
        let result = Buffer.concat(body);
        expect(image.equals(result)).to.equal(true);
        done();
      });

      response.on('err', function(err) {
        expect(err).to.not.exist;
        done();
      })

    })
  });

  it('Should reject an object that doesn\'t map to Schema', done => {
    request('POST', {}, '/schema_rejection/', {
      obj: {
        name: 'hello',
        enabled: true,
        data: 'xxx',
        timestamp: 1337
      }
    },
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterError');
      expect(result.error.details).to.exist;
      expect(result.error.details.obj).to.exist;
      expect(result.error.details.obj.expected).to.exist;
      expect(result.error.details.obj.expected.type).to.equal('object');
      expect(result.error.details.obj.expected.schema).to.exist;
      expect(result.error.details.obj.expected.schema).to.have.length(4);
      expect(result.error.details.obj.expected.schema[0].name).to.equal('name');
      expect(result.error.details.obj.expected.schema[0].type).to.equal('string');
      expect(result.error.details.obj.expected.schema[1].name).to.equal('enabled');
      expect(result.error.details.obj.expected.schema[1].type).to.equal('boolean');
      expect(result.error.details.obj.expected.schema[2].name).to.equal('data');
      expect(result.error.details.obj.expected.schema[2].type).to.equal('object');
      expect(result.error.details.obj.expected.schema[2].schema).to.exist;
      expect(result.error.details.obj.expected.schema[2].schema).to.have.length(2);
      expect(result.error.details.obj.expected.schema[2].schema[0].name).to.equal('a');
      expect(result.error.details.obj.expected.schema[2].schema[0].type).to.equal('string');
      expect(result.error.details.obj.expected.schema[2].schema[1].name).to.equal('b');
      expect(result.error.details.obj.expected.schema[2].schema[1].type).to.equal('string');
      expect(result.error.details.obj.expected.schema[3].name).to.equal('timestamp');
      expect(result.error.details.obj.expected.schema[3].type).to.equal('number');
      expect(result.error.details.obj.actual).to.exist;
      expect(result.error.details.obj.actual.type).to.equal('object');
      expect(result.error.details.obj.actual.value).to.deep.equal({
        name: 'hello',
        enabled: true,
        data: 'xxx',
        timestamp: 1337
      });
      done();

    });
  });

  it('Should accept an object that correctly maps to Schema', done => {
    request('POST', {}, '/schema_rejection/', {
      obj: {
        name: 'hello',
        enabled: true,
        data: {a: 'alpha', b: 'beta'},
        timestamp: 1337
      }
    },
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.equal('hello');
      done();

    });
  });

  it('Should reject an array that doesn\'t map to Schema', done => {
    request('POST', {}, '/schema_rejection_array/', {
      users: ['alpha', 'beta']
    },
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterError');
      expect(result.error.details).to.exist;
      expect(result.error.details.users).to.exist;
      expect(result.error.details.users.expected).to.exist;
      expect(result.error.details.users.expected.type).to.equal('array');
      expect(result.error.details.users.expected.schema).to.exist;
      expect(result.error.details.users.expected.schema).to.have.length(1);
      expect(result.error.details.users.expected.schema[0].name).to.equal('user');
      expect(result.error.details.users.expected.schema[0].type).to.equal('object');
      expect(result.error.details.users.expected.schema[0].schema).to.exist;
      expect(result.error.details.users.expected.schema[0].schema).to.have.length(2);
      expect(result.error.details.users.expected.schema[0].schema[0].name).to.equal('username');
      expect(result.error.details.users.expected.schema[0].schema[0].type).to.equal('string');
      expect(result.error.details.users.expected.schema[0].schema[1].name).to.equal('age');
      expect(result.error.details.users.expected.schema[0].schema[1].type).to.equal('number');
      expect(result.error.details.users.actual).to.exist;
      expect(result.error.details.users.actual.type).to.equal('array');
      expect(result.error.details.users.actual.value).to.deep.equal(['alpha', 'beta']);
      done();

    });
  });

  it('Should accept an array that correctly maps to Schema', done => {
    request('POST', {}, '/schema_rejection_array/', {
      users: [
        {
          username: 'alpha',
          age: 1
        },
        {
          username: 'beta',
          age: 2
        }
      ]
    },
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.equal('hello');
      done();

    });
  });

  it('Should reject an nested array that doesn\'t map to Schema', done => {
    request('POST', {}, '/schema_rejection_nested_array/', {
      users: [
        { username: 'steve', posts: [{ title: 't', body: 'b' }] },
        { posts: [{ title: 't', body: 'b' }] }
      ]
    },
      (err, res, result) => {

        expect(err).to.not.exist;
        expect(res.statusCode).to.equal(400);
        expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
        expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
        expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
        expect(result.error).to.exist;
        expect(result.error.type).to.equal('ParameterError');
        expect(result.error.details).to.exist;
        expect(result.error.details.users).to.exist;
        expect(result.error.details.users.expected).to.exist;
        expect(result.error.details.users.expected.type).to.equal('array');
        expect(result.error.details.users.expected.schema).to.deep.equal([
          {
            name: 'user',
            type: 'object',
            description: 'a user',
            schema: [
              {
                name: 'username',
                type: 'string',
                description: ''
              },
              {
                name: 'posts',
                type: 'array',
                description: '',
                schema: [
                  {
                    name: 'post',
                    type: 'object',
                    description: '',
                    schema: [
                      {
                        name: 'title',
                        type: 'string',
                        description: ''
                      },
                      {
                        name: 'body',
                        type: 'string',
                        description: ''
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]);
        expect(result.error.details.users.actual).to.deep.equal({
          type: 'array',
          value: [
            {
              posts: [
                {
                  body: 'b',
                  title: 't'
                }
              ],
              username: 'steve'
            },
            {
              posts: [
                {
                  body: 'b',
                  title: 't'
                }
              ]
            }
          ]
        });
        done();

      });
  });

  it('Should accept a nested array that correctly maps to Schema', done => {
    request('POST', {}, '/schema_rejection_nested_array/', {
      users: [
        { username: 'steve', posts: [{ title: 't', body: 'b' }] },
        { username: 'steve2', posts: [{ title: 't', body: 'b' }] }
      ]
    },
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.deep.equal( [
        { username: 'steve', posts: [{ title: 't', body: 'b' }] },
        { username: 'steve2', posts: [{ title: 't', body: 'b' }] }
      ]);
      done();

    });
  });

  it('Should reject an array that doesn\'t map to a Schema for an array of numbers', done => {
    request('POST', {}, '/schema_rejection_number_array/', {
      userIds: ['alpha', 'beta']
    },
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterError');
      expect(result.error.details).to.exist;
      expect(result.error.details.userIds).to.exist;
      expect(result.error.details.userIds.expected).to.exist;
      expect(result.error.details.userIds.expected.type).to.equal('array');
      expect(result.error.details.userIds.expected.schema).to.exist;
      expect(result.error.details.userIds.expected.schema).to.have.length(1);
      expect(result.error.details.userIds.expected.schema[0].type).to.equal('number');
      expect(result.error.details.userIds.actual).to.exist;
      expect(result.error.details.userIds.actual.type).to.equal('array');
      expect(result.error.details.userIds.actual.value).to.deep.equal(['alpha', 'beta']);
      done();

    });
  });

  it('Should accept an array that correctly maps to Schema', done => {
    request('POST', {}, '/schema_rejection_number_array/', {
      userIds: [1, 2, 3]
    },
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.equal('hello');
      done();

    });
  });

  it('Should handle large buffer parameters', done => {
    request('POST', {'x-convert-strings': true}, '/runtime/largebuffer/', {
      file: `{"_base64": "${'a'.repeat(50000000)}"}`
    }, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result.error).to.not.exist;
      done();

    });
  }).timeout(5000);

  it('Should accept a request with the optional param', done => {
    request('POST', {}, '/optional_params/', {name: 'steve'},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal('steve');
      done();

    });
  });

  it('Should accept a request without the optional param', done => {
    request('POST', {}, '/optional_params/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal('hello');
      done();

    });
  });

  it('Should accept a request without the optional param', done => {
    request('POST', {}, '/schema_optional_params/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal(null);
      done();

    });
  });

  it('Should accept a request without the optional param field', done => {
    request('POST', {}, '/schema_optional_params/', {obj: {name: 'steve'}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.deep.equal({name: 'steve'});
      done();

    });
  });

  it('Should accept a request with the optional param field set to null', done => {
    request('POST', {}, '/schema_optional_params/', {obj: {name: 'steve', enabled: null}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.deep.equal({name: 'steve', enabled: null});
      done();

    });
  });

  it('Should accept a request with the optional param field', done => {
    request('POST', {}, '/schema_optional_params/', {obj: {name: 'steve', enabled: true}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.deep.equal({name: 'steve', enabled: true});
      done();

    });
  });

  it('Should accept a request without the optional param (nested schema)', done => {
    request('POST', {}, '/optional_nested_schema_params/', {obj: {name: 'steve' }},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.deep.equal({name: 'steve'});
      done();

    });
  });

  it('Should reject a request without the required param within the optional object (nested schema)', done => {
    request('POST', {}, '/optional_nested_schema_params/', {obj: {name: 'steve', options: {}}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(res.statusCode).to.equal(400);
      done();

    });
  });

  it('Should accept a request with the optional object (nested schema)', done => {
    request('POST', {}, '/optional_nested_schema_params/', {obj: {name: 'steve', options: {istest: true}}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.deep.equal({name: 'steve', options: { istest: true}});
      done();

    });
  });

  it('Should accept a request with the optional object and optional field (nested schema)', done => {
    request('POST', {}, '/optional_nested_schema_params/', {obj: {name: 'steve', options: {istest: true, threads: 4}}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.deep.equal({name: 'steve', options: { istest: true, threads: 4}});
      done();

    });
  });

  it('Should successfully return a request without the optional value', done => {
    request('POST', {}, '/optional_nested_schema_params/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal(null);
      done();

    });
  });


  it('Should successfully return a request without the optional values', done => {
    request('POST', {}, '/optional_nested_schema_params/', {obj: {name: 'steve'}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.deep.equal({name: 'steve'});
      done();

    });
  });

  it('Should successfully return a request with the optional values', done => {
    request('POST', {}, '/optional_nested_schema_params/', {obj: {name: 'steve', options: {istest: true}}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.deep.equal({name: 'steve', options: {istest: true}});
      done();

    });
  });

  it('Should successfully return a request with the optional values and fields', done => {
    request('POST', {}, '/optional_nested_schema_params/', {obj: {name: 'steve', options: {istest: true, threads: 4}}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.deep.equal({name: 'steve', options: {istest: true, threads: 4}});
      done();

    });
  });

  it('Should accept a request that matches first of two schemas', done => {
    request('POST', {}, '/object_alternate_schema/', {fileOrFolder: {name: 'test', size: 100}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(result).to.exist;
      expect(result.error).to.not.exist;
      expect(res.statusCode).to.equal(200);
      done();

    });
  });

  it('Should accept a request that matches second of two schemas', done => {
    request('POST', {}, '/object_alternate_schema/', {fileOrFolder: {name: 'test', files: [], options: {type: 'test'}}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(result).to.exist;
      expect(result.error).to.not.exist;
      expect(res.statusCode).to.equal(200);
      done();

    });
  });

  it('Should accept a request that matches second subsection of two schemas', done => {
    request('POST', {}, '/object_alternate_schema/', {fileOrFolder: {name: 'test', files: [], options: {type: 100}}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(result).to.exist;
      expect(result.error).to.not.exist;
      expect(res.statusCode).to.equal(200);
      done();

    });
  });

  it('Should reject a request that matches no schema', done => {
    request('POST', {}, '/object_alternate_schema/', {fileOrFolder: {name: 'test'}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(res.statusCode).to.equal(400);
      done();

    });
  });

  it('Should reject a request that matches no schema based on subsection', done => {
    request('POST', {}, '/object_alternate_schema/', {fileOrFolder: {name: 'test', files: [], options: {}}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(res.statusCode).to.equal(400);
      done();

    });
  });

  it('Should reject a request that matches no schema based on subsection type mismatch', done => {
    request('POST', {}, '/object_alternate_schema/', {fileOrFolder: {name: 'test', files: [], options: {type: false}}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(res.statusCode).to.equal(400);
      done();

    });
  });

  it('Should successfully return a default value with an optional field', done => {
    request('POST', {}, '/optional_param_not_null/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.equal('default');
      done();

    });
  });

  it('Should successfully return a schema with a default set to 0', done => {
    request('POST', {}, '/stripe/', {id: '0'},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      done();

    });
  });

  it('Should successfully return a schema with an array', done => {
    request('POST', {}, '/giphy/', {query: 'q'},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      done();

    });
  });

  it('Should reject a request without an proper enum member', done => {
    request('POST', {}, '/enum/', { day: 'funday' }, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error.type).to.exist;
      expect(result.error.type).to.equal('ParameterError');
      expect(result.error.details).to.exist;
      expect(result.error.details).to.deep.equal({
        day: {
          message: 'invalid value: "funday" (string), expected (enum)',
          invalid: true,
          expected: {
            type: 'enum',
            members: [
              ['sunday', 0],
              ['monday', '0'],
              ['tuesday', { a: 1, b: 2 }],
              ['wednesday', 3],
              ['thursday', [1, 2, 3]],
              ['friday', 5.4321],
              ['saturday', 6]
            ]
          },
          actual: {
            value: 'funday',
            type: 'string'
          }
        }
      });
      done();

    });
  });

  it('Should successfully return an enum variant (number)', done => {
    request('POST', {}, '/enum/', { day: 'sunday' },
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.equal(0);
      done();

    });
  });

  it('Should successfully return an enum variant (string)', done => {
    request('POST', {}, '/enum/', { day: 'monday' },
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.equal("0");
      done();

    });
  });

  it('Should successfully return an enum variant (object)', done => {
    request('POST', {}, '/enum/', { day: 'tuesday' },
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.deep.equal({a: 1, b: 2});
      done();

    });
  });


  it('Should successfully return an enum variant (array)', done => {
    request('POST', {}, '/enum/', { day: 'thursday' },
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.deep.equal([1, 2, 3]);
      done();

    });
  });

  it('Should successfully return an enum variant (float)', done => {
    request('POST', {}, '/enum/', { day: 'friday' },
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.equal(5.4321);
      done();

    });
  });

  it('Should return a default enum variant', done => {
    request('POST', {}, '/enum_default/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.equal(0);
      done();

    });
  });

  it('Should return an enum using the context param', done => {
    request('POST', {}, '/enum_context/', { thingA: 'a', thingB: 'c' },
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.deep.equal({
        a: 0,
        b: {
          c: 1,
          d: [1, 2, 3]
        },
        c: '4',
        d: 5.4321
      });
      done();

    });
  });

  it('Should return an enum variant when the return type is enum', done => {
    request('POST', {}, '/enum_return/', { a: 'a' },
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.equal(0);
      done();

    });
  });

  it('Should reject returning an invalid enum variant  when the return type is enum', done => {
    request('POST', {}, '/enum_return/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(502);
      expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
      expect(result).to.exist;
      expect(result.error).to.deep.equal({
        type: 'ValueError',
        message: 'The value returned by the function did not match the specified type',
        details: {
          returns: {
            message: 'invalid return value: "not correct" (string), expected (enum)',
            invalid: true,
            expected: {
              type: 'enum',
              members: [['a', 0], ['b', [1, 2, 3]]]
            },
            actual: {
              value: 'not correct',
              type: 'string'
            }
          }
        }
      });
      done();

    });
  });

  it('Should fail to return null from a function without a nullable return value', done => {
    request('POST', {}, '/not_nullable_return/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(502);
      expect(result.error).to.exist;
      expect(result.error.details).to.exist;
      expect(result.error.details.returns).to.exist
      expect(result.error.details.returns.invalid).to.equal(true);
      done();

    });
  });

  it('Should return null from a function with a nullable return value', done => {
    request('POST', {}, '/nullable_return/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal(null);;
      done();

    });
  });

  it('Should return a value from a function with a nullable return value', done => {
    request('POST', {}, '/nullable_return/', {a: 'hello'},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal('hello');;
      done();

    });
  });

  it('Should successfully return a default parameter after passing in null', done => {
    request('POST', {}, '/null_default_param/', {name: null},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal('default');
      done();

    });
  });

  it('Should successfully return a default parameter after passing in undefined', done => {
    request('POST', {}, '/null_default_param/', {name: undefined},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal('default');
      done();

    });
  });

  it('Should successfully return an object with a schema that has an enum variant', done => {
    request(
      'POST',
      {},
      '/enum_schema/',
      {
        before: 'before',
        valueRange: {
          range: 'a range',
          majorDimension: 'ROWS',
          values: []
        },
        after: 'after',
      },
      (err, res, result) => {

        expect(err).to.not.exist;
        expect(res.statusCode).to.equal(200);
        expect(result).to.exist;
        expect(result).to.deep.equal({
          range: 'a range',
          majorDimension: 'ROWS',
          values: []
        });
        done();

      }
    );
  });

  it('Should return a default enum variant set to null', done => {
    request('POST', {}, '/enum_null/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal(null);
      done();

    });
  });

  it('Should accept keyql params', done => {
    request('POST', {}, '/keyql/', { query: { name: 'steve' }, limit: { count: 0, offset: 0 }, order: { field: 'name', sort: 'ASC' } },
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal('hello');
      done();

    });
  });

  it('Should accept keyql params', done => {
    let query = JSON.stringify({ name: 'steve' });
    let limit = JSON.stringify({ count: 0, offset: 0 });
    let order = JSON.stringify({field: 'name', sort: 'ASC'});

    request('GET', {'x-convert-strings': true}, `/keyql/?query=${query}&limit=${limit}&order=${order}`, '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal('hello');
      done();

    });
  });

  it('Should reject invalid keyql limit', done => {
    request('POST', {}, '/keyql/', { query: { name: 'steve' }, limit: { count: 0, wrong: 0 }, order: { field: 'name', sort: 'ASC' }},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(result.error).to.exist;
      expect(result.error.details).to.exist;
      expect(result.error.details.limit).to.exist;
      done();

    });
  });

  it('Should reject invalid keyql order (no field)', done => {
    request('POST', {}, '/keyql/', { query: { name: 'steve' }, limit: { count: 0, offset: 0 }, order: { field: null, sort: 'ASC' }},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(result.error).to.exist;
      expect(result.error.details).to.exist;
      expect(result.error.details.order).to.exist;
      done();

    });
  });

  it('Should reject invalid keyql order (invalid sort)', done => {
    request('POST', {}, '/keyql/', { query: { name: 'steve' }, limit: { count: 0, offset: 0 }, order: { field: 'name', sort: 'WRONG' }},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(result.error).to.exist;
      expect(result.error.details).to.exist;
      expect(result.error.details.order).to.exist;
      done();

    });
  });

  it('Should reject invalid keyql order (overloaded)', done => {
    request('POST', {}, '/keyql/', { query: { name: 'steve' }, limit: { count: 0, offset: 0 }, order: { field: 'name', sort: 'ASC', wrong: 'WRONG' }},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(result.error).to.exist;
      expect(result.error.details).to.exist;
      expect(result.error.details.order).to.exist;
      done();

    });
  });

  it('Should accept keyql with correct options', done => {
    request('POST', {}, '/keyql_options/', {query: {alpha: 'hello'}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal('hello');
      done();

    });
  });

  it('Should accept keyql with correct options and an operator', done => {
    request('POST', {}, '/keyql_options/', {query: {alpha__is: 'hello'}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal('hello');
      done();

    });
  });

  it('Should reject keyql with correct options with an incorrect operator', done => {
    request('POST', {}, '/keyql_options/', {query: {alpha__isnt: 'hello'}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      done();

    });
  });

  it('Should reject keyql with incorrect options', done => {
    request('POST', {}, '/keyql_options/', {query: {gamma: 'hello'}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      done();

    });
  });

  it('Should reject keyql with incorrect options with an operator', done => {
    request('POST', {}, '/keyql_options/', {query: {gamma__is: 'hello'}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      done();

    });
  });

  it('Should accept keyql array with correct options', done => {
    request('POST', {}, '/keyql_options_array/', {query: [{alpha: 'hello'}]},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal('hello');
      done();

    });
  });

  it('Should accept keyql array with correct options and an operator', done => {
    request('POST', {}, '/keyql_options_array/', {query: [{alpha__is: 'hello'}]},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal('hello');
      done();

    });
  });

  it('Should reject keyql array with correct options with an incorrect operator', done => {
    request('POST', {}, '/keyql_options_array/', {query: [{alpha__isnt: 'hello'}]},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      done();

    });
  });

  it('Should reject keyql array with incorrect options', done => {
    request('POST', {}, '/keyql_options_array/', {query: [{gamma: 'hello'}]},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      done();

    });
  });

  it('Should reject keyql array with incorrect options with an operator', done => {
    request('POST', {}, '/keyql_options_array/', {query: [{gamma__is: 'hello'}]},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      done();

    });
  });

  it('Should accept keyql order with correct options', done => {
    request('POST', {}, '/keyql_order_options/', {order: {field: 'alpha'}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal('hello');
      done();

    });
  });

  it('Should reject keyql order with incorrect options', done => {
    request('POST', {}, '/keyql_order_options/', {order: {field: 'gamma'}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      done();

    });
  });

  it('Should accept keyql array with correct options', done => {
    request('POST', {}, '/keyql_order_options_array/', {order: [{field: 'alpha'}]},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal('hello');
      done();

    });
  });

  it('Should reject keyql array with incorrect options', done => {
    request('POST', {}, '/keyql_order_options_array/', {order: [{field: 'gamma'}]},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      done();

    });
  });

  it('Should accept keyql array with all correct options', done => {
    request('POST', {}, '/keyql_order_options_array/', {order: [{field: 'alpha'}, {field: 'beta'}]},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      done();

    });
  });

  it('Should reject keyql array with an incorrect option', done => {
    request('POST', {}, '/keyql_order_options_array/', {order: [{field: 'alpha'}, {field: 'gamma'}]},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      done();

    });
  });

  it('Should reject keyql limit count out of range, hard limit', done => {
    request('POST', {}, '/keyql_limit/', {limit: {count: -1, offset: 0}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      done();

    });
  });

  it('Should reject keyql limit offset out of range, hard limit', done => {
    request('POST', {}, '/keyql_limit/', {limit: {count: 0, offset: -1}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      done();

    });
  });

  it('Should reject keyql limit count non-integer, hard limit', done => {
    request('POST', {}, '/keyql_limit/', {limit: {count: 0.256, offset: 0}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      done();

    });
  });

  it('Should reject keyql limit count out of lowerbound range, user limit', done => {
    request('POST', {}, '/keyql_limit_range/', {limit: {count: 1, offset: 0}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      done();

    });
  });

  it('Should reject keyql limit count out of upperbound range, user limit', done => {
    request('POST', {}, '/keyql_limit_range/', {limit: {count: 30, offset: 0}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      done();

    });
  });

  it('Should accept keyql limit count in range', done => {
    request('POST', {}, '/keyql_limit_range/', {limit: {count: 5}},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      done();

    });
  });

  it('Should accept number inside integer range', done => {
    request('POST', {}, '/range_integer/', {ranged: 1},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      done();

    });
  });

  it('Should reject number outside integer range, lowerbound', done => {
    request('POST', {}, '/range_integer/', {ranged: -1},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      done();

    });
  });

  it('Should reject number outside integer range, upperbound', done => {
    request('POST', {}, '/range_integer/', {ranged: 201},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      done();

    });
  });

  it('Should accept number inside number range', done => {
    request('POST', {}, '/range_number/', {ranged: 1.5},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      done();

    });
  });

  it('Should reject number outside number range, lowerbound', done => {
    request('POST', {}, '/range_number/', {ranged: 1},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(result.error).to.exist;
      expect(result.error.details.ranged.message).to.equal('must be greater than or equal to 1.01');
      done();

    });
  });

  it('Should reject number outside number range, upperbound', done => {
    request('POST', {}, '/range_number/', {ranged: 200},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      done();

    });
  });

  it('Should accept string within provided options', done => {
    request('POST', {}, '/string_options/', {value: 'one'},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.equal('one');
      done();

    });
  });

  it('Should reject string outside provided options', done => {
    request('POST', {}, '/string_options/', {value: 'four'},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(result.error.details.value.message).to.contain('["one","two","three"]');
      expect(result.error.details.value.expected.values).to.deep.equal(['one', 'two', 'three']);
      done();

    });
  });

  it('Should identify mismatch in a returns statement (unnamed, non-array)', done => {
    request('POST', {}, '/mismatch_returns_anon/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(502);
      expect(result.error.details.returns.mismatch).to.exist;
      expect(result.error.details.returns.mismatch).to.equal('$.user.name');
      done();

    });
  });

  it('Should identify mismatch in a returns statement (unnamed, array)', done => {
    request('POST', {}, '/mismatch_returns_anon_array/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(502);
      expect(result.error.details.returns.mismatch).to.exist;
      expect(result.error.details.returns.mismatch).to.equal('$.user.names[1]');
      done();

    });
  });

  it('Should identify mismatch in a returns statement (named, non-array)', done => {
    request('POST', {}, '/mismatch_returns_named/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(502);
      expect(result.error.details.returns.mismatch).to.exist;
      expect(result.error.details.returns.mismatch).to.equal('myObject.user.name');
      done();

    });
  });

  it('Should identify mismatch in a returns statement (named, array)', done => {
    request('POST', {}, '/mismatch_returns_named_array/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(502);
      expect(result.error.details.returns.mismatch).to.exist;
      expect(result.error.details.returns.mismatch).to.equal('myObject.user.names[1]');
      done();

    });
  });

  it('Should identify mismatch in a returns statement (deep)', done => {
    request('POST', {}, '/mismatch_returns_deep/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(502);
      expect(result.error.details.returns.mismatch).to.exist;
      expect(result.error.details.returns.mismatch).to.equal('$.user.posts[0].messages[2]');
      done();

    });
  });

  it('Should identify mismatch in a param statement (deep)', done => {
    request('POST', {}, '/mismatch_params_deep/',
    {
      userData: {
        user: {
          posts: [
            {
              title: 'sup',
              messages: ['hey', 'there', 7]
            }
          ]
        }
      }
    },
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(result.error.details.userData).to.exist;
      expect(result.error.details.userData.mismatch).to.equal('userData.user.posts[0].messages[2]');
      done();

    });
  });

  it('Should return a buffer properly', done => {
    request('POST', {}, '/buffer_return/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/octet-stream');
      expect(result).to.exist;
      expect(result).to.be.instanceof(Buffer);
      expect(result.toString()).to.equal('lol');
      done();

    });
  });

  it('Should return a buffer properly with a .contentType set', done => {
    request('POST', {}, '/buffer_return_content_type/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('image/png');
      expect(result).to.exist;
      expect(result).to.be.instanceof(Buffer);
      expect(result.toString()).to.equal('lol');
      done();

    });
  });

  it('Should return a nested buffer properly', done => {
    request('POST', {}, '/buffer_nested_return/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.haveOwnProperty('body');
      expect(result.body).to.haveOwnProperty('_base64');
      expect(Buffer.from(result.body._base64, 'base64').toString()).to.equal('lol');
      expect(result.test).to.exist;
      expect(result.test.deep).to.exist;
      expect(result.test.deep).to.be.an('array');
      expect(result.test.deep.length).to.equal(3);
      expect(result.test.deep[1]).to.haveOwnProperty('_base64');
      expect(Buffer.from(result.test.deep[1]._base64, 'base64').toString()).to.equal('wat');
      done();

    });
  });

  it('Should parse buffers within object params', done => {
    request('POST', {}, '/buffer_within_object_param/', {
      objectParam: {
        bufferVal: {
          _base64: 'abcde'
        }
      }
    }, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.exist;
      expect(result).to.equal('ok');
      done();

    });
  });

  it('Should parse buffers within array params', done => {
    request('POST', {}, '/buffer_within_array_param/', {
      arrayParam: [{
        _base64: 'abcde'
      }]
    }, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.exist;
      expect(result).to.equal('ok');
      done();

    });
  });

  it('Should return a mocked buffer as if it were a real one', done => {
    request('POST', {}, '/buffer_mocked_return/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.be.instanceof(Buffer);
      expect(result.toString()).to.equal('lol');
      done();

    });
  });

  it('Should return a nested mocked buffer as if it were a real one', done => {
    request('POST', {}, '/buffer_nested_mocked_return/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.haveOwnProperty('body');
      expect(result.body).to.haveOwnProperty('_base64');
      expect(Buffer.from(result.body._base64, 'base64').toString()).to.equal('lol');
      expect(result.test).to.exist;
      expect(result.test.deep).to.exist;
      expect(result.test.deep).to.be.an('array');
      expect(result.test.deep.length).to.equal(3);
      expect(result.test.deep[1]).to.haveOwnProperty('_base64');
      expect(Buffer.from(result.test.deep[1]._base64, 'base64').toString()).to.equal('wat');
      done();

    });
  });

  it('Should return a mocked buffer as if it were a real one, if type "any"', done => {
    request('POST', {}, '/buffer_any_return/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.be.instanceof(Buffer);
      expect(result.toString()).to.equal('lol');
      done();

    });
  });

  it('Should return a nested mocked buffer as if it were a real one, if type "any"', done => {
    request('POST', {}, '/buffer_nested_any_return/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.haveOwnProperty('body');
      expect(result.body).to.haveOwnProperty('_base64');
      expect(Buffer.from(result.body._base64, 'base64').toString()).to.equal('lol');
      expect(result.test).to.exist;
      expect(result.test.deep).to.exist;
      expect(result.test.deep).to.be.an('array');
      expect(result.test.deep.length).to.equal(3);
      expect(result.test.deep[1]).to.haveOwnProperty('_base64');
      expect(Buffer.from(result.test.deep[1]._base64, 'base64').toString()).to.equal('wat');
      done();

    });
  });

  it('Should throw an ValueError on an invalid Buffer type', done => {
    request('POST', {}, '/value_error/buffer_invalid/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(502);
      expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
      expect(result).to.exist;
      done();

    });
  });

  it('Should throw an ValueError on an invalid Number type', done => {
    request('POST', {}, '/value_error/number_invalid/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(502);
      expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
      expect(result).to.exist;
      done();

    });
  });

  it('Should throw an ValueError on an invalid Object type with alternate schema', done => {
    request('POST', {}, '/value_error/object_alternate_schema_invalid/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(502);
      expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
      expect(result).to.exist;
      done();

    });
  });

  it('Should not populate "context.providers" with no authorization providers header provided', done => {
    request('POST', {}, '/context/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result.providers).to.deep.equal({});
      done();

    });
  });

  it('Should not populate "context.providers" if the authorization providers header is not an serialized object', done => {
    request('POST', {
      'X-Authorization-Providers': 'stringvalue'
    }, '/context/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result.providers).to.deep.equal({});
      done();

    });
  });

  it('Should populate "context.providers" as the value of the authorization providers header if it is a serialized object', done => {
    let headerValue = {
      test: {
        item: 'value'
      }
    };
    request('POST', {
      'X-Authorization-Providers': JSON.stringify(headerValue)
    }, '/context/', {},
    (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result.providers).to.deep.equal(headerValue);
      done();

    });
  });

  it('Should populate context in "inline/context"', done => {
    request('POST', {}, '/inline/context/', {a: 1, b: 2}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.exist;
      expect(result.http.method).to.equal('POST');
      expect(result.params).to.deep.equal({a: 1, b: 2});
      done();

    });
  });

  it('Should output buffer from "inline/buffer"', done => {
    request('POST', {}, '/inline/buffer/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/html');
      expect(result).to.exist;
      expect(result).to.be.instanceof(Buffer);
      expect(result.toString()).to.equal('lol');
      done();

    });
  });

  it('Should output buffer from "inline/buffer_mock"', done => {
    request('POST', {}, '/inline/buffer_mock/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/octet-stream');
      expect(result).to.exist;
      expect(result).to.be.instanceof(Buffer);
      expect(result.toString()).to.equal('lol');
      done();

    });
  });

  it('Should output buffer from "inline/http"', done => {
    request('POST', {}, '/inline/http/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(429);
      expect(res.headers['content-type']).to.equal('text/html');
      expect(result).to.exist;
      expect(result).to.be.instanceof(Buffer);
      expect(result.toString()).to.equal('lol');
      done();

    });
  });

  it('Should output buffer from "inline/http_no_status"', done => {
    request('POST', {}, '/inline/http_no_status/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/html');
      expect(result).to.exist;
      expect(result).to.be.instanceof(Buffer);
      expect(result.toString()).to.equal('lol');
      done();

    });
  });

  it('Should output object from "inline/extended_http_is_object"', done => {
    request('POST', {}, '/inline/extended_http_is_object/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.exist;
      expect(result).to.deep.equal({
        statusCode: 429,
        headers: {'Content-Type': 'text/html'},
        body: 'lol',
        extend: true
      });
      done();

    });
  });

  it('Should output object from "inline/number"', done => {
    request('POST', {}, '/inline/number/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.exist;
      expect(result).to.equal(1988);
      done();

    });
  });

  it('Should allow you to use "require()"', done => {
    request('POST', {}, '/inline/require/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.exist;
      expect(result).to.equal('hello');
      done();

    });
  });

  it('Should allow you to use "await"', done => {
    request('POST', {}, '/inline/await/', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.exist;
      expect(result).to.equal('hello world');
      done();

    });
  });

  it('Should support static files in "www" directory properly', done => {
    request('GET', {}, '/page.html', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/html; charset=utf-8');
      expect(result.toString()).to.equal('this is an html file\n');
      done();

    });
  });

  it('Should support POST to static files in "www" directory properly (noop)', done => {
    request('POST', {}, '/page.html', {}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/html; charset=utf-8');
      expect(result.toString()).to.equal('this is an html file\n');
      done();

    });
  });

  it('Should NOT support static files in "www" directory properly, without .html', done => {
    request('GET', {}, '/page/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(404);
      done();

    });
  });

  it('Should NOT support static files in "www" directory properly, without .htm', done => {
    request('GET', {}, '/page2/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(404);
      done();

    });
  });

  it('Should support 404 not found in "www" directory properly by direct accession', done => {
    request('GET', {}, '/error/404.html', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(404);
      expect(res.headers['content-type']).to.equal('text/html; charset=utf-8');
      expect(result.toString()).to.equal('error 404\n');
      done();

    });
  });

  it('Should support 404 not found in "www" directory properly by dir accession', done => {
    request('GET', {}, '/error/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(404);
      expect(res.headers['content-type']).to.equal('text/html; charset=utf-8');
      expect(result.toString()).to.equal('error 404\n');
      done();

    });
  });

  it('Should support 404 not found in "www" directory properly by non-existent file accession', done => {
    request('GET', {}, '/error/nope.txt', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(404);
      expect(res.headers['content-type']).to.equal('text/html; charset=utf-8');
      expect(result.toString()).to.equal('error 404\n');
      done();

    });
  });

  it('Should support 404 not found in "www" directory properly by nested non-existent file accession', done => {
    request('GET', {}, '/error/path/to/nope.txt', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(404);
      expect(res.headers['content-type']).to.equal('text/html; charset=utf-8');
      expect(result.toString()).to.equal('error 404\n');
      done();

    });
  });

  it('Should support 404 not found in "www" directory properly by nested non-existent file accession', done => {
    request('GET', {}, '/error/path/to/nope.txt', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(404);
      expect(res.headers['content-type']).to.equal('text/html; charset=utf-8');
      expect(result.toString()).to.equal('error 404\n');
      done();

    });
  });

  it('Should support "index.html" mapping to root directory', done => {
    request('GET', {}, '/static-test/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/html; charset=utf-8');
      expect(result.toString()).to.equal('this is an index.html file\n');
      done();

    });
  });

  it('Should support "index.html" also mapping to itself', done => {
    request('GET', {}, '/static-test/index.html', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/html; charset=utf-8');
      expect(result.toString()).to.equal('this is an index.html file\n');
      done();

    });
  });

  it('Should support "index.htm" mapping to root directory', done => {
    request('GET', {}, '/static-test/htm/', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/html; charset=utf-8');
      expect(result.toString()).to.equal('this is an index.htm file\n');
      done();

    });
  });

  it('Should support "index.htm" also mapping to itself', done => {
    request('GET', {}, '/static-test/htm/index.htm', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/html; charset=utf-8');
      expect(result.toString()).to.equal('this is an index.htm file\n');
      done();

    });
  });

  it('Should support static (www) ".png" files properly', done => {
    request('GET', {}, '/fs-wordmark.png', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('image/png');
      expect(result.byteLength).to.equal(parseInt(res.headers['content-length']));
      done();

    });
  });

  it('Should support static (www) ".mp4" files properly', done => {
    request('GET', {}, '/video.mp4', '', (err, res, result, headers) => {

      let size = parseInt(res.headers['content-length']);
      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('video/mp4');
      expect(res.headers['content-range']).to.equal('bytes 0-' + (size - 1) + '/' + size);
      expect(res.headers['accept-ranges']).to.equal('bytes');
      expect(result.byteLength).to.equal(size);
      done();

    });
  });

  it('Should support static (www) ".mp4" files properly with range header', done => {
    request('GET', {range: '27-255'}, '/video.mp4', '', (err, res, result) => {

      let size = parseInt(res.headers['content-length']);
      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(206);
      expect(res.headers['content-type']).to.equal('video/mp4');
      expect(res.headers['content-range']).to.equal('bytes 27-255/574823');
      expect(res.headers['accept-ranges']).to.equal('bytes');
      expect(size).to.equal(255 - 27 + 1);
      expect(result.byteLength).to.equal(size);
      done();

    });
  });

  it('Should support static (www) ".mp4" files properly with range header (prefix)', done => {
    request('GET', {range: '0-'}, '/video.mp4', '', (err, res, result) => {

      let size = parseInt(res.headers['content-length']);
      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('video/mp4');
      expect(res.headers['content-range']).to.equal('bytes 0-' + (size - 1) + '/' + size);
      expect(res.headers['accept-ranges']).to.equal('bytes');
      expect(result.byteLength).to.equal(size);
      done();

    });
  });

  it('Should support static (www) ".mp4" files properly with range header (prefix + 1)', done => {
    request('GET', {range: '1-'}, '/video.mp4', '', (err, res, result) => {

      let size = parseInt(res.headers['content-length']);
      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(206);
      expect(res.headers['content-type']).to.equal('video/mp4');
      expect(res.headers['content-range']).to.equal('bytes 1-574822/574823');
      expect(res.headers['accept-ranges']).to.equal('bytes');
      expect(result.byteLength).to.equal(size);
      done();

    });
  });

  it('Should support static (www) ".mp4" files properly with range header (suffix)', done => {
    request('GET', {range: '-500'}, '/video.mp4', '', (err, res, result) => {

      let size = parseInt(res.headers['content-length']);
      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(206);
      expect(res.headers['content-type']).to.equal('video/mp4');
      expect(res.headers['content-range']).to.equal('bytes 574323-574822/574823');
      expect(res.headers['accept-ranges']).to.equal('bytes');
      expect(size).to.equal(500);
      expect(result.byteLength).to.equal(size);
      done();

    });
  });

  it('Should support POST with nonstandard JSON (array)', done => {
    request('POST', {}, '/nonstandard/json/', [1, 2, 3], (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result.http.json).to.exist;
      expect(result.http.json).to.deep.equal([1, 2, 3]);
      done();

    });
  });

  it('Should support POST with nonstandard JSON (string)', done => {
    request('POST', {}, '/nonstandard/json/', '"hello"', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result.http.json).to.exist;
      expect(result.http.json).to.equal('hello');
      done();

    });
  });

  it('Should support POST with nonstandard JSON (boolean)', done => {
    request('POST', {}, '/nonstandard/json/', 'true', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result.http.json).to.exist;
      expect(result.http.json).to.equal(true);
      done();

    });
  });

  it('Should support POST with nonstandard JSON (number)', done => {
    request('POST', {}, '/nonstandard/json/', '1.2', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result.http.json).to.exist;
      expect(result.http.json).to.equal(1.2);
      done();

    });
  });

  it('Should support POST with XML', done => {

    let xmlData = `
      <Company>
        <Employee>
            <FirstName>John</FirstName>
            <LastName>Doe</LastName>
            <ContactNo>1234567890</ContactNo>
            <Email>johndoe@example.com</Email>
            <Address>
                 <City>San Francisco</City>
                 <State>California</State>
                 <Zip>123456</Zip>
            </Address>
            <Fulltime>True</Fulltime>
        </Employee>
        <Employee>
            <FirstName>Jane</FirstName>
            <LastName>Smith</LastName>
            <ContactNo>0987654321</ContactNo>
            <Email>janesmith@example.com</Email>
            <Address>
                 <City>Los Angeles</City>
                 <State>California</State>
                 <Zip>654321</Zip>
            </Address>
            <Fulltime>False</Fulltime>
        </Employee>
      </Company>`;

    let parsedData = {
      Company: {
        Employee: [
          {
            FirstName: 'John',
            LastName: 'Doe',
            ContactNo: "1234567890",
            Email: 'johndoe@example.com',
            Address: {
              City: 'San Francisco',
              State: 'California',
              Zip: '123456'
            },
            Fulltime: 'True',
          },
          {
            FirstName: 'Jane',
            LastName: 'Smith',
            ContactNo: '0987654321',
            Email: 'janesmith@example.com',
            Address: {
              City: 'Los Angeles',
              State: 'California',
              Zip: '654321'
            },
            Fulltime: 'False',
          }
        ]
      }
    }

    request('POST', {'Content-Type': 'application/xml'}, '/reflect/', xmlData, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.deep.equal(parsedData);
      done();

    });
  });

  it('Should support POST with XML (containing attributes)', done => {

    let xmlData = `<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015"
         xmlns="http://www.w3.org/2005/Atom">
      <link rel="hub" href="https://pubsubhubbub.appspot.com"/>
      <link rel="self" href="https://www.youtube.com/xml/feeds/videos.xml?channel_id=CHANNEL_ID"/>
      <title>YouTube video feed</title>
      <updated>2015-04-01T19:05:24.552394234+00:00</updated>
      <entry>
        <id>yt:video:VIDEO_ID</id>
        <yt:videoId>VIDEO_ID</yt:videoId>
        <yt:channelId>CHANNEL_ID</yt:channelId>
        <title>Video title</title>
        <link rel="alternate" href="http://www.youtube.com/watch?v=VIDEO_ID"/>
        <author>
         <name>Channel title</name>
         <uri>http://www.youtube.com/channel/CHANNEL_ID</uri>
        </author>
        <published>2015-03-06T21:40:57+00:00</published>
        <updated>2015-03-09T19:05:24.552394234+00:00</updated>
      </entry>
    </feed>`;

    let parsedData = {
      "feed": {
        "@_xmlns:yt": "http://www.youtube.com/xml/schemas/2015",
        "@_xmlns": "http://www.w3.org/2005/Atom",
        "link": [
          {
            "@_rel": "hub",
            "@_href": "https://pubsubhubbub.appspot.com"
          },
          {
            "@_rel": "self",
            "@_href": "https://www.youtube.com/xml/feeds/videos.xml?channel_id=CHANNEL_ID"
          }
        ],
        "title": "YouTube video feed",
        "updated": "2015-04-01T19:05:24.552394234+00:00",
        "entry": {
          "id": "yt:video:VIDEO_ID",
          "yt:videoId": "VIDEO_ID",
          "yt:channelId": "CHANNEL_ID",
          "title": "Video title",
          "link": {
            "@_rel": "alternate",
            "@_href": "http://www.youtube.com/watch?v=VIDEO_ID"
          },
          "author": {
            "name": "Channel title",
            "uri": "http://www.youtube.com/channel/CHANNEL_ID"
          },
          "published": "2015-03-06T21:40:57+00:00",
          "updated": "2015-03-09T19:05:24.552394234+00:00"
        }
      }
    }

    request('POST', {'Content-Type': 'application/xml'}, '/reflect/', xmlData, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.deep.equal(parsedData);
      done();

    });

  });

  it('Should reject invalid XML', done => {

    let xmlData = `
      <Company>
        <Employee>
            <FirstName>John</FirstName>
            <LastName>Doe</LastName>
            <ContactNo>1234567890</ContactNo>
            <Email>johndoe@example.com</Email>
            <Address>
                 <City>San Francisco</City>
                 <State>California</State>
                 <Zip>123456</Zip>
            </Address>
            <Fulltime>True</Fulltime>
        </Employee>
        <Employee>
            <FirstName>Jane</FirstName>
            <LastName>Smith</LastName>
            <ContactNo>0987654321</ContactNo>
            <Email>janesmith@example.com</Email>
            <Address>
                 <City>Los Angeles</City>
                 <State>California</State>
                 <Zip>654321</Zip>
            </Address>
            <Fulltime>False</Fulltime>
        </Employee>
      </Companyyy>`;

    request('POST', {'Content-Type': 'application/xml'}, '/reflect/', xmlData, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterParseError');
      done();

    });
  });

  it('Should not reject nor parse XML if no Content-Type headers are passed in', done => {

    let xmlData = `
      <Company>
        <Employee>
            <FirstName>John</FirstName>
            <LastName>Doe</LastName>
            <ContactNo>1234567890</ContactNo>
            <Email>johndoe@example.com</Email>
            <Address>
                 <City>San Francisco</City>
                 <State>California</State>
                 <Zip>123456</Zip>
            </Address>
            <Fulltime>True</Fulltime>
        </Employee>
        <Employee>
            <FirstName>Jane</FirstName>
            <LastName>Smith</LastName>
            <ContactNo>0987654321</ContactNo>
            <Email>janesmith@example.com</Email>
            <Address>
                 <City>Los Angeles</City>
                 <State>California</State>
                 <Zip>654321</Zip>
            </Address>
            <Fulltime>False</Fulltime>
        </Employee>
      </Company>`;

    request('POST', {}, '/reflect/', xmlData, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      done();

    });
  });

  it('Should support POST with XML for content type "application/atom+xml"', done => {

    let xmlData = `
      <Company>
        <Employee>
            <FirstName>John</FirstName>
            <LastName>Doe</LastName>
            <ContactNo>1234567890</ContactNo>
            <Email>johndoe@example.com</Email>
            <Address>
                 <City>San Francisco</City>
                 <State>California</State>
                 <Zip>123456</Zip>
            </Address>
            <Fulltime>True</Fulltime>
        </Employee>
        <Employee>
            <FirstName>Jane</FirstName>
            <LastName>Smith</LastName>
            <ContactNo>0987654321</ContactNo>
            <Email>janesmith@example.com</Email>
            <Address>
                 <City>Los Angeles</City>
                 <State>California</State>
                 <Zip>654321</Zip>
            </Address>
            <Fulltime>False</Fulltime>
        </Employee>
      </Company>`;

    let parsedData = {
      Company: {
        Employee: [
          {
            FirstName: 'John',
            LastName: 'Doe',
            ContactNo: "1234567890",
            Email: 'johndoe@example.com',
            Address: {
              City: 'San Francisco',
              State: 'California',
              Zip: '123456'
            },
            Fulltime: 'True',
          },
          {
            FirstName: 'Jane',
            LastName: 'Smith',
            ContactNo: '0987654321',
            Email: 'janesmith@example.com',
            Address: {
              City: 'Los Angeles',
              State: 'California',
              Zip: '654321'
            },
            Fulltime: 'False',
          }
        ]
      }
    }

    request('POST', {'Content-Type': 'application/atom+xml'}, '/reflect/', xmlData, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.deep.equal(parsedData);
      done();

    });
  });

  it('Should support POST with XML for content type "application/atom+xml" (containing attributes)', done => {

    let xmlData = `<entry>
      <id>yt:video:abdefghijklmnop</id>
      <yt:videoId>abdefghijklmnop</yt:videoId>
      <yt:channelId>abcdefghijklmnop</yt:channelId>
      <title>Some Video Title</title>
      <link rel="alternate" href="https://www.youtube.com/watch?v=abcdefghijklmnop"/>
      <author>
        <name>Video Name</name>
        <uri>https://www.youtube.com/channel/abcdefghijklmnop</uri>
      </author>
      <published>2021-06-24T23:37:28+00:00</published>
      <updated>2021-06-24T23:37:58.731601431+00:00</updated>
    </entry>`;

    let parsedData = {
      "entry": {
        "author": {
            "name": "Video Name",
            "uri": "https://www.youtube.com/channel/abcdefghijklmnop"
        },
        "id": "yt:video:abdefghijklmnop",
        "link": {
          "@_href": "https://www.youtube.com/watch?v=abcdefghijklmnop",
          "@_rel": "alternate",
        },
        "published": "2021-06-24T23:37:28+00:00",
        "title": "Some Video Title",
        "updated": "2021-06-24T23:37:58.731601431+00:00",
        "yt:channelId": "abcdefghijklmnop",
        "yt:videoId": "abdefghijklmnop"
      }
    };

    request('POST', {'Content-Type': 'application/atom+xml'}, '/reflect/', xmlData, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.deep.equal(parsedData);
      done();

    });

  });

  it('Should reject invalid XML for content type "application/atom+xml"', done => {

    let xmlData = `
      <Company>
        <Employee>
            <FirstName>John</FirstName>
            <LastName>Doe</LastName>
            <ContactNo>1234567890</ContactNo>
            <Email>johndoe@example.com</Email>
            <Address>
                 <City>San Francisco</City>
                 <State>California</State>
                 <Zip>123456</Zip>
            </Address>
            <Fulltime>True</Fulltime>
        </Employee>
        <Employee>
            <FirstName>Jane</FirstName>
            <LastName>Smith</LastName>
            <ContactNo>0987654321</ContactNo>
            <Email>janesmith@example.com</Email>
            <Address>
                 <City>Los Angeles</City>
                 <State>California</State>
                 <Zip>654321</Zip>
            </Address>
            <Fulltime>False</Fulltime>
        </Employee>
      </Companyyy>`;

    request('POST', {'Content-Type': 'application/atom+xml'}, '/reflect/', xmlData, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ParameterParseError');
      done();

    });
  });

  it('Streaming endpoints should default to normal request with no _stream sent', done => {
    request('POST', {}, '/stream/basic/', {alpha: 'hello'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.exist;
      expect(result).to.equal(true);

      done();

    });
  });

  it('Streaming endpoints should default to normal request with _stream falsy', done => {
    request('POST', {}, '/stream/basic/', {alpha: 'hello', _stream: false}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.exist;
      expect(result).to.equal(true);

      done();

    });
  });

  it('Streaming endpoints should default to normal request with _stream falsy in query params', done => {
    request('POST', {}, '/stream/basic/?alpha=hello&_stream=false', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.exist;
      expect(result).to.equal(true);

      done();

    });
  });

  it('Streaming endpoints should fail with StreamError if contains an invalid stream', done => {
    request('POST', {}, '/stream/basic/', {alpha: 'hello', _stream: {test: true}}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('StreamListenerError');
      expect(result.error.details).to.haveOwnProperty('test');

      done();

    });
  });

  it('Should support POST with streaming with _stream in query params', done => {
    request('POST', {}, '/stream/basic/?alpha=hello&_stream', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/event-stream');
      expect(result).to.exist;

      let events = parseServerSentEvents(result);
      expect(events['hello']).to.exist;
      expect(events['hello'][0]).to.equal('true');
      expect(events['@response']).to.exist;

      let response = JSON.parse(events['@response'][0]);
      expect(response.headers['Content-Type']).to.equal('application/json');
      expect(response.body).to.equal('true');

      done();

    });
  });

  it('Should support POST with streaming with _stream in query params with truthy value', done => {
    request('POST', {}, '/stream/basic/?alpha=hello&_stream=lol', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/event-stream');
      expect(result).to.exist;

      let events = parseServerSentEvents(result);
      expect(events['hello']).to.exist;
      expect(events['hello'][0]).to.equal('true');
      expect(events['@response']).to.exist;

      let response = JSON.parse(events['@response'][0]);
      expect(response.headers['Content-Type']).to.equal('application/json');
      expect(response.body).to.equal('true');

      done();

    });
  });

  it('Should support POST with streaming with _stream set to valid stream', done => {
    request('POST', {}, '/stream/basic/', {alpha: 'hello', _stream: {'hello': true}}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/event-stream');
      expect(result).to.exist;

      let events = parseServerSentEvents(result);
      expect(events['hello']).to.exist;
      expect(events['hello'][0]).to.equal('true');
      expect(events['@response']).to.exist;

      let response = JSON.parse(events['@response'][0]);
      expect(response.headers['Content-Type']).to.equal('application/json');
      expect(response.body).to.equal('true');

      done();

    });
  });

  it('Should support POST with streaming with _stream set to *', done => {
    request('POST', {}, '/stream/basic/', {alpha: 'hello', _stream: {'*': true}}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/event-stream');
      expect(result).to.exist;

      let events = parseServerSentEvents(result);
      expect(events['hello']).to.exist;
      expect(events['hello'][0]).to.equal('true');
      expect(events['@response']).to.exist;

      let response = JSON.parse(events['@response'][0]);
      expect(response.headers['Content-Type']).to.equal('application/json');
      expect(response.body).to.equal('true');

      done();

    });
  });

  it('Should support POST with streaming with _stream set to valid stream or *', done => {
    request('POST', {}, '/stream/basic/', {alpha: 'hello', _stream: {'hello': true, '*': true}}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/event-stream');
      expect(result).to.exist;

      let events = parseServerSentEvents(result);
      expect(events['hello']).to.exist;
      expect(events['hello'][0]).to.equal('true');
      expect(events['@response']).to.exist;

      let response = JSON.parse(events['@response'][0]);
      expect(response.headers['Content-Type']).to.equal('application/json');
      expect(response.body).to.equal('true');

      done();

    });
  });

  it('Should support POST with streaming with _stream set', done => {
    request('POST', {}, '/stream/basic/', {alpha: 'hello', _stream: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/event-stream');
      expect(result).to.exist;

      let events = parseServerSentEvents(result);
      expect(events['hello']).to.exist;
      expect(events['hello'][0]).to.equal('true');
      expect(events['@response']).to.exist;

      let response = JSON.parse(events['@response'][0]);
      expect(response.headers['Content-Type']).to.equal('application/json');
      expect(response.body).to.equal('true');

      done();

    });
  });

  it('Should support POST with streaming (buffer) with _stream set', done => {
    request('POST', {}, '/stream/basic_buffer/', {alpha: 'hello', _stream: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/event-stream');
      expect(result).to.exist;

      let events = parseServerSentEvents(result);
      expect(events['hello']).to.exist;
      expect(events['@response']).to.exist;

      let stream = JSON.parse(events['hello'][0]);
      expect(stream).to.be.an.object;
      expect(stream).to.haveOwnProperty('_base64');
      expect(stream._base64).to.equal(Buffer.from('123').toString('base64'));

      let response = JSON.parse(events['@response'][0]);
      expect(response.headers['Content-Type']).to.equal('application/json');
      expect(response.body).to.equal('true');

      done();

    });
  });

  it('Should support POST with streaming (mocked buffer) with _stream set', done => {
    request('POST', {}, '/stream/basic_buffer_mocked/', {alpha: 'hello', _stream: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/event-stream');
      expect(result).to.exist;

      let events = parseServerSentEvents(result);
      expect(events['hello']).to.exist;
      expect(events['@response']).to.exist;

      let stream = JSON.parse(events['hello'][0]);
      expect(stream).to.be.an.object;
      expect(stream).to.haveOwnProperty('_base64');
      expect(stream._base64).to.equal(Buffer.from('123').toString('base64'));

      let response = JSON.parse(events['@response'][0]);
      expect(response.headers['Content-Type']).to.equal('application/json');
      expect(response.body).to.equal('true');

      done();

    });
  });

  it('Should support POST with streaming (nested buffer) with _stream set', done => {
    request('POST', {}, '/stream/basic_buffer_nested/', {alpha: 'hello', _stream: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/event-stream');
      expect(result).to.exist;

      let events = parseServerSentEvents(result);
      expect(events['hello']).to.exist;
      expect(events['@response']).to.exist;

      let stream = JSON.parse(events['hello'][0]);
      expect(stream).to.be.an.object;
      expect(stream).to.haveOwnProperty('mybuff');
      expect(stream.mybuff).to.haveOwnProperty('_base64');
      expect(stream.mybuff._base64).to.equal(Buffer.from('123').toString('base64'));

      let response = JSON.parse(events['@response'][0]);
      expect(response.headers['Content-Type']).to.equal('application/json');
      expect(response.body).to.equal('true');

      done();

    });
  });

  it('Should support POST with streaming (nested mocked buffer) with _stream set', done => {
    request('POST', {}, '/stream/basic_buffer_nested_mocked/', {alpha: 'hello', _stream: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/event-stream');
      expect(result).to.exist;

      let events = parseServerSentEvents(result);
      expect(events['hello']).to.exist;
      expect(events['@response']).to.exist;

      let stream = JSON.parse(events['hello'][0]);
      expect(stream).to.be.an.object;
      expect(stream).to.haveOwnProperty('mybuff');
      expect(stream.mybuff).to.haveOwnProperty('_base64');
      expect(stream.mybuff._base64).to.equal(Buffer.from('123').toString('base64'));

      let response = JSON.parse(events['@response'][0]);
      expect(response.headers['Content-Type']).to.equal('application/json');
      expect(response.body).to.equal('true');

      done();

    });
  });

  it('Should error POST with invalid stream name in execution with _stream set', done => {
    request('POST', {}, '/stream/invalid_stream_name/', {alpha: 'hello', _stream: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/event-stream');
      expect(result).to.exist;

      let events = parseServerSentEvents(result);
      expect(events['hello']).to.not.exist;
      expect(events['@error']).to.exist;
      expect(events['@response']).to.exist;

      let error = JSON.parse(events['@error'][0]);
      expect(error.type).to.equal('StreamError');
      expect(error.message).to.satisfy(msg => msg.startsWith(`No such stream "hello2" in function definition.`));

      let response = JSON.parse(events['@response'][0]);
      expect(response.headers['Content-Type']).to.equal('application/json');
      expect(response.statusCode).to.equal(200);
      expect(response.body).to.equal('true');

      done();

    });
  });

  it('Should quietly fail if invalid stream name in execution without _stream set', done => {
    request('POST', {}, '/stream/invalid_stream_name/', {alpha: 'hello'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.equal(true);

      done();

    });
  });

  it('Should stream error POST with invalid stream value in execution with _stream set', done => {
    request('POST', {}, '/stream/invalid_stream_param/', {alpha: 'hello', _stream: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/event-stream');
      expect(result).to.exist;

      let events = parseServerSentEvents(result);
      expect(events['hello']).to.not.exist;
      expect(events['@error']).to.exist;
      expect(events['@response']).to.exist;

      let error = JSON.parse(events['@error'][0]);
      expect(error.type).to.equal('StreamError');
      expect(error.message).to.satisfy(msg => msg.startsWith(`Stream Parameter Error: "hello".`));
      expect(error.details).to.haveOwnProperty('hello');
      expect(error.details['hello'].invalid).to.equal(true);
      expect(error.details['hello'].expected.type).to.equal('boolean');
      expect(error.details['hello'].actual.type).to.equal('string');
      expect(error.details['hello'].actual.value).to.equal('what');

      let response = JSON.parse(events['@response'][0]);
      expect(response.headers['Content-Type']).to.equal('application/json');
      expect(response.statusCode).to.equal(200);
      expect(response.body).to.equal('true');

      done();

    });
  });

  it('Should support POST with streaming and stream components between sleep() calls with _stream set', done => {
    request('POST', {}, '/stream/sleep/', {alpha: 'hello', _stream: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/event-stream');
      expect(result).to.exist;

      let events = parseServerSentEvents(result);
      expect(events['hello']).to.exist;
      expect(events['hello'].length).to.equal(3);
      expect(events['hello'][0]).to.equal('"Hello?"');
      expect(events['hello'][1]).to.equal('"How are you?"');
      expect(events['hello'][2]).to.equal('"Is it me you\'re looking for?"');

      expect(events['goodbye']).to.exist;
      expect(events['goodbye'].length).to.equal(1);
      expect(events['goodbye'][0]).to.equal('"Nice to see ya"');

      expect(events['@response']).to.exist;
      let response = JSON.parse(events['@response'][0]);
      expect(response.headers['Content-Type']).to.equal('application/json');
      expect(response.body).to.equal('true');

      done();

    });
  });

  it('Should POST normally with streaming and stream components between sleep() calls without _stream set', done => {
    request('POST', {}, '/stream/sleep/', {alpha: 'hello'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.equal(true);

      done();

    });
  });

  it('Should support POST with streaming without _debug set', done => {
    request('POST', {}, '/stream/debug/', {alpha: 'hello', _stream: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/event-stream');
      expect(result).to.exist;

      let events = parseServerSentEvents(result);
      expect(Object.keys(events).length).to.equal(4);

      expect(events['hello']).to.exist;
      expect(events['hello'].length).to.equal(3);
      expect(events['hello'][0]).to.equal('"Hello?"');
      expect(events['hello'][1]).to.equal('"How are you?"');
      expect(events['hello'][2]).to.equal('"Is it me you\'re looking for?"');

      expect(events['goodbye']).to.exist;
      expect(events['goodbye'].length).to.equal(1);
      expect(events['goodbye'][0]).to.equal('"Nice to see ya"');

      expect(events['@begin']).to.exist;
      expect(events['@begin'].length).to.equal(1);
      expect(events['@begin'][0]).to.be.a.string;

      expect(events['@response']).to.exist;
      let response = JSON.parse(events['@response'][0]);
      expect(response.headers['Content-Type']).to.equal('application/json');
      expect(response.body).to.equal('true');

      done();

    });
  });

  it('Should support POST with streaming with _debug set without _stream set', done => {
    request('POST', {}, '/stream/debug/', {alpha: 'hello', _debug: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/event-stream');
      expect(res.headers['x-debug']).to.equal('true');
      expect(result).to.exist;

      let events = parseServerSentEvents(result);
      expect(Object.keys(events).length).to.equal(6);

      expect(events['hello']).to.exist;
      expect(events['hello'].length).to.equal(3);
      expect(events['hello'][0]).to.equal('"Hello?"');
      expect(events['hello'][1]).to.equal('"How are you?"');
      expect(events['hello'][2]).to.equal('"Is it me you\'re looking for?"');

      expect(events['goodbye']).to.exist;
      expect(events['goodbye'].length).to.equal(1);
      expect(events['goodbye'][0]).to.equal('"Nice to see ya"');

      expect(events['@begin']).to.exist;
      expect(events['@begin'].length).to.equal(1);
      expect(events['@begin'][0]).to.be.a.string;

      expect(events['@stdout']).to.exist;
      expect(events['@stdout'].length).to.equal(2);
      expect(events['@stdout'][0]).to.equal('"what? who?"');
      expect(events['@stdout'][1]).to.equal('"finally"');

      expect(events['@stderr']).to.exist;
      expect(events['@stderr'].length).to.equal(1);
      expect(events['@stderr'][0]).to.equal('"oh no"');

      expect(events['@response']).to.exist;
      let response = JSON.parse(events['@response'][0]);
      expect(response.headers['Content-Type']).to.equal('application/json');
      expect(response.body).to.equal('true');

      done();

    });
  });

  it('Should support POST with streaming with _debug set to valid channels without _stream set', done => {
    request('POST', {}, '/stream/debug/', {alpha: 'hello', _debug: {'*': true, '@begin': true, '@stdout': true, '@stderr': true, '@error': true}}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/event-stream');
      expect(res.headers['x-debug']).to.equal('true');
      expect(result).to.exist;

      let events = parseServerSentEvents(result);
      expect(Object.keys(events).length).to.equal(6);

      expect(events['hello']).to.exist;
      expect(events['hello'].length).to.equal(3);
      expect(events['hello'][0]).to.equal('"Hello?"');
      expect(events['hello'][1]).to.equal('"How are you?"');
      expect(events['hello'][2]).to.equal('"Is it me you\'re looking for?"');

      expect(events['goodbye']).to.exist;
      expect(events['goodbye'].length).to.equal(1);
      expect(events['goodbye'][0]).to.equal('"Nice to see ya"');

      expect(events['@begin']).to.exist;
      expect(events['@begin'].length).to.equal(1);
      expect(events['@begin'][0]).to.be.a.string;

      expect(events['@stdout']).to.exist;
      expect(events['@stdout'].length).to.equal(2);
      expect(events['@stdout'][0]).to.equal('"what? who?"');
      expect(events['@stdout'][1]).to.equal('"finally"');

      expect(events['@stderr']).to.exist;
      expect(events['@stderr'].length).to.equal(1);
      expect(events['@stderr'][0]).to.equal('"oh no"');

      expect(events['@response']).to.exist;
      let response = JSON.parse(events['@response'][0]);
      expect(response.headers['Content-Type']).to.equal('application/json');
      expect(response.body).to.equal('true');

      done();

    });
  });

  it('Streaming endpoints should succeed if contains a valid stream in _debug', done => {
    request('POST', {}, '/stream/basic/', {alpha: 'hello', _stream: {}, _debug: {hello: true}}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/event-stream');
      expect(res.headers['x-debug']).to.equal('true');
      expect(result).to.exist;

      let events = parseServerSentEvents(result);
      expect(Object.keys(events).length).to.equal(3);

      expect(events['@begin']).to.exist;
      expect(events['@begin'].length).to.equal(1);
      expect(events['@begin'][0]).to.be.a.string;

      expect(events['hello']).to.exist;
      expect(events['hello'].length).to.equal(1);
      expect(events['hello'][0]).to.equal('true');

      expect(events['@response']).to.exist;
      let response = JSON.parse(events['@response'][0]);
      expect(response.headers['Content-Type']).to.equal('application/json');
      expect(response.body).to.equal('true');

      done();

    });
  });

  it('Streaming endpoints should fail if contains an invalid stream in _debug', done => {
    request('POST', {}, '/stream/basic/', {alpha: 'hello', _stream: {}, _debug: {test: true}}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.headers['x-debug']).to.equal('true');
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('DebugError');
      expect(result.error.message).to.contain('"test"');

      done();

    });
  });

  it('Streaming endpoints should fail with StreamError if contains an invalid stream when _debug', done => {
    request('POST', {}, '/stream/basic/', {alpha: 'hello', _stream: {test: true}, _debug: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.headers['x-debug']).to.equal('true');
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('StreamListenerError');
      expect(result.error.details).to.haveOwnProperty('test');

      done();

    });
  });

  it('Should support POST with streaming with _debug to a function with no stream', done => {
    request('POST', {}, '/stream/debug_no_stream/', {alpha: 'hello', _debug: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/event-stream');
      expect(res.headers['x-debug']).to.equal('true');
      expect(result).to.exist;

      let events = parseServerSentEvents(result);
      expect(Object.keys(events).length).to.equal(4);

      expect(events['@begin']).to.exist;
      expect(events['@begin'].length).to.equal(1);
      expect(events['@begin'][0]).to.be.a.string;

      expect(events['@stdout']).to.exist;
      expect(events['@stdout'].length).to.equal(2);
      expect(events['@stdout'][0]).to.equal('"what? who?"');
      expect(events['@stdout'][1]).to.equal('"finally"');

      expect(events['@stderr']).to.exist;
      expect(events['@stderr'].length).to.equal(1);
      expect(events['@stderr'][0]).to.equal('"oh no"');

      expect(events['@response']).to.exist;
      let response = JSON.parse(events['@response'][0]);
      expect(response.headers['Content-Type']).to.equal('application/json');
      expect(response.body).to.equal('true');

      done();

    });
  });

  it('Endpoint without stream should fail with ExecutionModeError if _debug set and _stream set', done => {
    request('POST', {}, '/stream/debug_no_stream/', {alpha: 'hello', _stream: {test: true}, _debug: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.headers['x-debug']).to.equal('true');
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ExecutionModeError');
      expect(result.error.message).to.contain('"stream"');

      done();

    });
  });

  it('Endpoint without stream should fail with ExecutionModeError if _debug not set and _stream set', done => {
    request('POST', {}, '/stream/debug_no_stream/', {alpha: 'hello', _stream: {test: true}}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('ExecutionModeError');
      expect(result.error.message).to.contain('"stream"');

      done();

    });
  });

  it('Endpoint without stream should fail with DebugError if _debug set to an invalid listener', done => {
    request('POST', {}, '/stream/debug_no_stream/', {alpha: 'hello', _debug: {test: true}}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.headers['x-debug']).to.equal('true');
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('DebugError');
      expect(result.error.message).to.contain('"test"');

      done();

    });
  });

  it('Endpoint without stream should fail with DebugError if _debug set and _background set', done => {
    request('POST', {}, '/stream/debug_no_stream/', {alpha: 'hello', _debug: true, _background: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.headers['x-debug']).to.equal('true');
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('DebugError');
      expect(result.error.message).to.equal('Can not debug with "background" mode set');

      done();

    });
  });

  it('Endpoint triggered with request origin "autocode.com" should not work', done => {
    request('POST', {'origin': 'autocode.com'}, '/origin/allow/', {alpha: 'hello'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.headers['access-control-allow-origin']).to.equal('!');
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('OriginError');
      expect(result.error.message).to.contain(`"autocode.com"`)

      done();

    });
  });

  it('Endpoint triggered with request origin "https://sub.autocode.com" should not work', done => {
    request('POST', {'origin': 'https://sub.autocode.com'}, '/origin/allow/', {alpha: 'hello'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.headers['access-control-allow-origin']).to.equal('!');
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('OriginError');
      expect(result.error.message).to.contain(`"https://sub.autocode.com"`)

      done();

    });
  });

  it('Endpoint triggered with request origin "http://autocode.com" should work', done => {
    request('POST', {'origin': 'http://autocode.com'}, '/origin/allow/', {alpha: 'hello'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.headers['access-control-allow-origin']).to.equal('http://autocode.com');
      expect(result).to.exist;

      done();

    });
  });

  it('Endpoint triggered with request origin "https://autocode.com" should work', done => {
    request('POST', {'origin': 'https://autocode.com'}, '/origin/allow/', {alpha: 'hello'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.headers['access-control-allow-origin']).to.equal('https://autocode.com');
      expect(result).to.exist;

      done();

    });
  });

  it('Endpoint triggered with request origin "localhost:8000" should not work', done => {
    request('POST', {'origin': 'localhost:8000'}, '/origin/allow/', {alpha: 'hello'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.headers['access-control-allow-origin']).to.equal('!');
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('OriginError');
      expect(result.error.message).to.contain(`"localhost:8000"`)

      done();

    });
  });

  it('Endpoint triggered with request origin "http://localhost:8000" should work', done => {
    request('POST', {'origin': 'http://localhost:8000'}, '/origin/allow/', {alpha: 'hello'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.headers['access-control-allow-origin']).to.equal('http://localhost:8000');
      expect(result).to.exist;

      done();

    });
  });

  it('Endpoint triggered with request origin "https://localhost:8000" should work', done => {
    request('POST', {'origin': 'https://localhost:8000'}, '/origin/allow/', {alpha: 'hello'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.headers['access-control-allow-origin']).to.equal('https://localhost:8000');
      expect(result).to.exist;

      done();

    });
  });

  it('Endpoint triggered with request origin "test.some-url.com:9999" should not work', done => {
    request('POST', {'origin': 'test.some-url.com:9999'}, '/origin/allow/', {alpha: 'hello'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.headers['access-control-allow-origin']).to.equal('!');
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('OriginError');
      expect(result.error.message).to.contain(`"test.some-url.com:9999"`)

      done();

    });
  });

  it('Endpoint triggered with request origin "http://test.some-url.com:9999" should work', done => {
    request('POST', {'origin': 'http://test.some-url.com:9999'}, '/origin/allow/', {alpha: 'hello'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.headers['access-control-allow-origin']).to.equal('http://test.some-url.com:9999');
      expect(result).to.exist;

      done();

    });
  });

  it('Endpoint triggered with request origin "https://test.some-url.com:9999" should work', done => {
    request('POST', {'origin': 'https://test.some-url.com:9999'}, '/origin/allow/', {alpha: 'hello'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.headers['access-control-allow-origin']).to.equal('https://test.some-url.com:9999');
      expect(result).to.exist;

      done();

    });
  });

  it('Endpoint triggered with request origin "http://hello.com" should not work', done => {
    request('POST', {'origin': 'http://hello.com'}, '/origin/allow/', {alpha: 'hello'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.headers['access-control-allow-origin']).to.equal('!');
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('OriginError');
      expect(result.error.message).to.contain(`"http://hello.com"`)

      done();

    });
  });

  it('Endpoint triggered with request origin "http://hello.com" should not work with _stream', done => {
    request('POST', {'origin': 'http://hello.com'}, '/origin/allow/', {alpha: 'hello', _stream: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.headers['access-control-allow-origin']).to.equal('!');
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('OriginError');
      expect(result.error.message).to.contain(`"http://hello.com"`)

      done();

    });
  });

  it('Endpoint triggered with request origin "http://hello.com" should not work with _debug', done => {
    request('POST', {'origin': 'http://hello.com'}, '/origin/allow/', {alpha: 'hello', _debug: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.headers['access-control-allow-origin']).to.equal('!');
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('OriginError');
      expect(result.error.message).to.contain(`"http://hello.com"`)

      done();

    });
  });

  it('Endpoint triggered with request origin "http://hello.com" should not work with _background', done => {
    request('POST', {'origin': 'http://hello.com'}, '/origin/allow/', {alpha: 'hello', _background: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(403);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.headers['access-control-allow-origin']).to.equal('!');
      expect(result).to.exist;
      expect(result.error).to.exist;
      expect(result.error.type).to.equal('OriginError');
      expect(result.error.message).to.contain(`"http://hello.com"`)

      done();

    });
  });

  it('Endpoint triggered with request origin "https://hello.com" should work', done => {
    request('POST', {'origin': 'https://hello.com'}, '/origin/allow/', {alpha: 'hello'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.headers['access-control-allow-origin']).to.equal('https://hello.com');
      expect(result).to.exist;

      done();

    });
  });

  it('Endpoint triggered with request origin "https://hello.com" should work with _stream', done => {
    request('POST', {'origin': 'https://hello.com'}, '/origin/allow/', {alpha: 'hello', _stream: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/event-stream');
      expect(res.headers['access-control-allow-origin']).to.equal('https://hello.com');
      expect(result).to.exist;

      done();

    });
  });

  it('Endpoint triggered with request origin "https://hello.com" should work with _debug', done => {
    request('POST', {'origin': 'https://hello.com'}, '/origin/allow/', {alpha: 'hello', _debug: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers['content-type']).to.equal('text/event-stream');
      expect(res.headers['access-control-allow-origin']).to.equal('https://hello.com');
      expect(result).to.exist;

      done();

    });
  });

  it('Endpoint triggered with request origin "https://hello.com" should work with _background', done => {
    request('POST', {'origin': 'https://hello.com'}, '/origin/allow/', {alpha: 'hello', _background: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(202);
      expect(res.headers['content-type']).to.equal('text/plain');
      expect(res.headers['access-control-allow-origin']).to.equal('https://hello.com');
      expect(result).to.exist;

      done();

    });
  });

  it('Should return a valid /.well-known/ai-plugin.json', done => {
    request('GET', {}, '/.well-known/ai-plugin.json', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.exist;
      expect(result.schema_version).to.equal('v1');
      expect(result.name_for_human).to.equal('(No name provided)');
      expect(result.name_for_model).to.equal('No_name_provided');
      expect(result.description_for_human).to.equal('(No description provided)');
      expect(result.description_for_model).to.equal('(No description provided)');
      expect(result.api).to.exist;
      expect(result.api.type).to.equal('openapi');
      expect(result.api.url).to.equal('localhost/.well-known/openapi.yaml');
      done();

    });
  });

  it('Should return a valid /.well-known/openapi.json', done => {
    request('GET', {}, '/.well-known/openapi.json', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(result).to.exist;
      expect(result.openapi).to.equal('3.1.0');
      expect(result.info).to.exist;
      expect(result.info.version).to.equal('local');
      expect(result.info.title).to.equal('(No name provided)');
      expect(result.info.description).to.equal('(No description provided)');
      expect(result.servers).to.be.an('Array');
      expect(result.servers[0]).to.exist;
      expect(result.servers[0].url).to.equal('localhost');
      expect(result.servers[0].description).to.equal('Instant API Gateway');
      expect(result.paths).to.be.an('Object');
      expect(result.paths['/my_function/']).to.exist;
      expect(result.paths['/my_function/'].post).to.exist;
      expect(result.paths['/my_function/'].post.description).to.equal('My function');
      expect(result.paths['/my_function/'].post.operationId).to.equal('service_localhost_my_function');
      expect(result.paths['/my_function/'].post.requestBody).to.exist;
      expect(result.paths['/my_function/'].post.requestBody.content).to.exist;
      expect(result.paths['/my_function/'].post.requestBody.content['application/json']).to.exist;
      expect(result.paths['/my_function/'].post.requestBody.content['application/json']).to.deep.equal({
        "schema": {
          "type": "object",
          "properties": {
            "a": {
              "type": "number",
              "default": 1
            },
            "b": {
              "type": "number",
              "default": 2
            },
            "c": {
              "type": "number",
              "default": 3
            }
          }
        }
      });
      expect(result.paths['/my_function/'].post.responses).to.exist;
      expect(result.paths['/my_function/'].post.responses['200']).to.exist;
      expect(result.paths['/my_function/'].post.responses['200'].content).to.exist;
      expect(result.paths['/my_function/'].post.responses['200'].content['application/json']).to.exist;
      expect(result.paths['/my_function/'].post.responses['200'].content['application/json']).to.deep.equal({
        "schema": {
          "type": "number"
        }
      });
      expect(result.paths['/a_standard_function/']).to.exist;
      expect(result.paths['/reflect/']).to.exist;
      done();

    });
  });

  it('Should return a valid /.well-known/openapi.yaml', done => {
    request('GET', {}, '/.well-known/openapi.yaml', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/yaml');
      let yaml = result.toString();
      expect(yaml.startsWith('openapi: "3.1.0"')).to.equal(true);
      done();

    });
  });

  it('Should return a valid /.well-known/schema.json', done => {
    request('GET', {}, '/.well-known/schema.json', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.exist;
      expect(result.functions).to.exist;
      expect(result.functions.length).to.be.greaterThan(1);
      done();

    });
  });

  after(() => FaaSGateway.close());

};
