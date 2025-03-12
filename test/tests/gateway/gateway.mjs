import chai from 'chai';
const expect = chai.expect;

import fs from 'fs';
import FormData from 'form-data';

import { HOST, PORT, ROOT, InstantAPI } from '../../helpers.mjs';

const { Gateway, FunctionParser } = InstantAPI;
const parser = new FunctionParser();

const FaaSGateway = new Gateway({
  debug: false,
  defaultTimeout: 1000
});

process.env.ALLOWED_ORIGIN = 'instant.dev';

export const name = 'Gateway';
export default async function (setupResult) {

  before(() => {
    const preloadFiles = {
      'functions/sample_preload.js': Buffer.from(`module.exports = async () => { return true; };`)
    };
    FaaSGateway.load(ROOT, preloadFiles);
    FaaSGateway.listen(PORT);
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

  it('Should return 404 + NotFoundError for not found function', async () => {

    let res = await this.get('/DOES_NOT_EXIST', '');

    expect(res.statusCode).to.equal(404);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('NotFoundError');

  });

  it('Should return 302 redirect on GET request when missing trailing / with user agent', async () => {
    
    let res = await this.get('/my_function', '', {'user-agent': 'testing'});

    expect(res.statusCode).to.equal(302);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers).to.haveOwnProperty('location');
    expect(res.headers.location).to.equal('/my_function/');
    expect(res.body.toString()).to.be.a('string');
    expect(res.body.toString()).to.satisfy(s => s.startsWith('You are being redirected to: '));

  });

  it('Should not return 302 redirect on a GET request when missing trailing / without user agent', async () => {

    let res = await this.get('/my_function', '');

    expect(res.statusCode).to.not.equal(302);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');

  });

  it('Should not return 302 redirect for POST request with trailing slash with user agent', async () => {
    
    let res = await this.post('/my_function', '', {'user-agent': 'testing'});

    expect(res.statusCode).to.not.equal(302);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');

  });

  it('Should give 200 OK and property headers for OPTIONS', async () => {

    let res = await this.request('OPTIONS', '/my_function/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');

  });

  it('Should give 200 OK and property headers for HEAD', async () => {

    let res = await this.request('HEAD', '/my_function/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');

  });

  it('Should return 200 OK when no Content-Type specified on GET', async () => {

    let res = await this.get('/my_function/', undefined);

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.equal(6);

  });

  it('Should return 200 OK when different variables set in queryParams and bodyParams', async () => {

    let res = await this.post('/my_function/?a=100', {b: 200});

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.exist;
    expect(res.json).to.equal(303);

  });

  it('Should return 400 Bad Request + ParameterParseError when same variable set in queryParams and bodyParams', async () => {

    let res = await this.post('/my_function/?a=1', {a: 2});

    expect(res.statusCode).to.equal(400);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('ParameterParseError');
    expect(res.json.error.message).to.contain('Can not specify "a" in both query and body parameters');

  });

  it('Should return 400 Bad Request + ParameterParseError when no Content-Type specified on POST', async () => {

    let res = await this.post('/my_function/', undefined);

    expect(res.statusCode).to.equal(400);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('ParameterParseError');

  });

  it('Should return 400 Bad Request + ParameterParseError when Content-Type: text/plain specified on POST with invalid JSON', async () => {
    
    let res = await this.post('/my_function/', 'lol', {'Content-Type': 'text/plain'});

    expect(res.statusCode).to.equal(400);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('ParameterParseError');

  });

  it('Should return 400 Bad Request + ParameterParseError when Content-Type: text/plain specified on POST with non-object JSON', async () => {
    
    let res = await this.post('/my_function/', '[]', {'Content-Type': 'text/plain'});

    expect(res.statusCode).to.equal(400);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('ParameterParseError');

  });

  it('Should return 200 OK when Content-Type: text/plain specified on POST with valid JSON object', async () => {
    
    let res = await this.post('/my_function/', '{}', {'Content-Type': 'text/plain'});

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.equal(6);

  });

  it('Should return 200 OK when Content-Type: text/plain specified on POST with valid doubly-stringified JSON object', async () => {
    
    let res = await this.post('/my_function/', '"{}"', {'Content-Type': 'text/plain;charset=UTF-8'});

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.equal(6);

  });

  it('Should return 200 OK + res.json when executed', async () => {

    let res = await this.get('/my_function/', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.equal(6);

  });

  it('Should return 200 OK + res.json when preloadFile executed', async () => {

    let res = await this.get('/sample_preload/', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.equal(true);

  });

  it('Should return 200 OK + gzip res.json when executed with Accept-Encoding: gzip', async () => {
    
    let res = await this.get('/my_function/', '', {'accept-encoding': 'gzip'});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-encoding']).to.equal('gzip');
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.equal(6);

  });

  it('Should return 200 OK + deflate res.json when executed with Accept-Encoding: deflate', async () => {
    
    let res = await this.get('/my_function/', '', {'accept-encoding': 'deflate'});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-encoding']).to.equal('deflate');
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.equal(6);

  });

  it('Should return 200 OK + gzip res.json when executed with Accept-Encoding: gzip, deflate', async () => {
    
    let res = await this.get('/my_function/', '', {'accept-encoding': 'gzip, deflate'});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-encoding']).to.equal('gzip');
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.equal(6);

  });

  it('Should parse arguments from URL', async () => {

    let res = await this.get('/my_function/?a=10&b=20&c=30', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.equal(60);

  });

  it('Should parse arguments from URL into array, var[] format', async () => {

    let res = await this.get('/my_function_test_parsing/?a[]=1&a[]=2&a[]=3', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.deep.equal({a: ['1', '2', '3'], b: {}});

  });

  it('Should parse arguments from URL into array, var[0] format, with push', async () => {

    let res = await this.get('/my_function_test_parsing/?a[1]=1&a[0]=2&a[]=100&a[5]=3&a[]=7', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.deep.equal({a: ['2', '1', null, null, null, '3', '100', '7'], b: {}});

  });

  it('Should return bad request if array populated by pushing and set', async () => {

    let res = await this.get('/my_function_test_parsing/?a[]=1&a[]=2&a=[1,2,3]', '');

    expect(res.statusCode).to.equal(400);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');

  });

  it('Should return bad request if non-integer value used as index in array', async () => {

    let res = await this.get('/my_function_test_parsing/?a[1.5]=1', '');

    expect(res.statusCode).to.equal(400);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');

  });

  it('Should parse arguments from URL into array, var[0] format, with push and covert to type', async () => {

    let res = await this.get('/my_function_test_parsing_convert/?a[1]=1&a[0]=2&a[]=100&a[5]=3&a[]=7', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.deep.equal({a: [2, 1, null, null, null, 3, 100, 7], b: {}});

  });

  it('Should parse arguments from URL into array, obj.field format', async () => {

    let res = await this.get('/my_function_test_parsing/?b.lol=1&b.wat=23', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.deep.equal({a: [], b: {lol: '1', wat: '23'}});

  });

  it('Should parse arguments from URL into array, obj.field format, setting multiple field levels', async () => {

    let res = await this.get('/my_function_test_parsing/?b.lol=1&b.wat=23&b.cool.beans=hi', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.deep.equal({a: [], b: {lol: '1', wat: '23', cool: {beans: 'hi'}}});

  });

  it('Should parse arguments from URL into array, obj.field format, setting multiple field levels with array', async () => {

    let res = await this.get('/my_function_test_parsing/?b.lol=1&b.wat=23&b.cool.beans[]=hi', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.deep.equal({a: [], b: {lol: '1', wat: '23', cool: {beans: ['hi']}}});

  });

  it('Should parse arguments from URL into array, obj.field format, setting multiple field levels with array and sub object', async () => {

    let res = await this.get('/my_function_test_parsing/?b.lol=1&b.wat=23&b.cool[].beans=hi', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.deep.equal({a: [], b: {lol: '1', wat: '23', cool: [{beans: 'hi'}]}});

  });

  it('Should parse arguments from URL into array, obj.field format, setting multiple field levels with 2d array and sub object within an array', async () => {

    let res = await this.get('/my_function_test_parsing/?b.lol=1&b.wat=23&b.cool[][].beans=hi', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.deep.equal({a: [], b: {lol: '1', wat: '23', cool: [[{beans: 'hi'}]]}});

  });

  it('Should parse arguments from URL into array, obj.field format, setting multiple items in an array and sub object within an array', async () => {

    let res = await this.get('/my_function_test_parsing/?b.lol=1&b.wat=23&b.cool[]=hi&b.cool[]=anotheritem', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.deep.equal({a: [], b: {lol: '1', wat: '23', cool: ['hi', 'anotheritem']}});

  });

  it('Should reject obj.field format for an argument in the URL that is already typed as a non-object with a ParameterParseError', async () => {

    let res = await this.get('/my_function_test_parsing/?c=1&c.field=1', '');

    expect(res.statusCode).to.equal(400);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('ParameterParseError');

  });

  it('Should reject obj.field format for a nested argument in the URL that is already typed as a non object with a ParameterParseError', async () => {

    let res = await this.get('/my_function_test_parsing/?b.field=1&b.field.test=2', '');

    expect(res.statusCode).to.equal(400);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('ParameterParseError');

  });

  it('Should reject obj.field format, setting multiple field levels with array', async () => {

    let res = await this.get('/my_function_test_parsing/?b.lol=1&b.wat=23&b.cool[]=hi&b.cool=hi', '');

    expect(res.statusCode).to.equal(400);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');

  });

  it('Should reject obj.field format, overwriting child object', async () => {

    let res = await this.get('/my_function_test_parsing/?b.lol=1&b.wat=23&b.cool.beans=hi&b.cool=beans', '');

    expect(res.statusCode).to.equal(400);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');

  });

  it('Should return bad request if object populated by value and set', async () => {

    let res = await this.get('/my_function_test_parsing/?b.lol=1&b={}', '');

    expect(res.statusCode).to.equal(400);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');

  });

  it('Should parse arguments from URL into object, obj.field format, and convert to type', async () => {

    let res = await this.get('/my_function_test_parsing_convert/?b.lol=1&b.wat=23', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.deep.equal({a: [], b: {lol: 1, wat: '23'}});

  });

  it('Should parse arguments from POST (URL encoded)', async () => {

    let res = await this.post('/my_function/', 'a=10&b=20&c=30');

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.equal(60);

  });

  it('Should not overwrite POST (URL encoded) data with query parameters', async () => {

    let res = await this.post('/my_function/?c=300', 'a=10&b=20&c=30');

    expect(res.statusCode).to.equal(400);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('ParameterParseError');

  });

  it('Should parse arguments from POST (JSON)', async () => {

    let res = await this.post('/my_function/', {a: 10, b: 20, c: 30});

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.equal(60);

  });

  it('Should not overwrite POST (JSON) data with query parameters', async () => {

    let res = await this.post('/my_function/?c=300', {a: 10, b: 20, c: 30});

    expect(res.statusCode).to.equal(400);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('ParameterParseError');

  });

  it('Should successfully parse arguments from POST (JSON Array)', async () => {

    let res = await this.post('/my_function/', [10, 20, 30]);

    expect(res.statusCode).to.equal(200);
    expect(res.json.error).to.not.exist;

  });

  it('Should give ParameterError if parameter doesn\'t match (converted)', async () => {

    let res = await this.post('/my_function/', 'a=10&b=20&c=hello%20world');

    expect(res.statusCode).to.equal(400);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('ParameterError');
    expect(res.json.error.details).to.exist;
    expect(res.json.error.details.c).to.exist;
    expect(res.json.error.details.c.expected).to.exist;
    expect(res.json.error.details.c.expected.type).to.equal('number');
    expect(res.json.error.details.c.actual).to.exist;
    expect(res.json.error.details.c.actual.type).to.equal('string');
    expect(res.json.error.details.c.actual.value).to.equal('hello world');

  });

  it('Should give ParameterError if parameter doesn\'t match (not converted)', async () => {

    let res = await this.post('/my_function/', {a: 10, b: 20, c: '30'});

    expect(res.statusCode).to.equal(400);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('ParameterError');
    expect(res.json.error.details).to.exist;
    expect(res.json.error.details.c).to.exist;
    expect(res.json.error.details.c.expected).to.exist;
    expect(res.json.error.details.c.expected.type).to.equal('number');
    expect(res.json.error.details.c.actual).to.exist;
    expect(res.json.error.details.c.actual.type).to.equal('string');
    expect(res.json.error.details.c.actual.value).to.equal('30');

  });

  it('Should give 502 + ValueError if unexpected value', async () => {

    let res = await this.post('/my_function/', {c: 100});

    expect(res.statusCode).to.equal(502);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('ValueError');
    expect(res.json.error.details).to.exist;
    expect(res.json.error.details.returns).to.exist;
    expect(res.json.error.details.returns.message).to.exist;
    expect(res.json.error.details.returns.expected).to.exist;
    expect(res.json.error.details.returns.expected.type).to.equal('number');
    expect(res.json.error.details.returns.actual).to.exist;
    expect(res.json.error.details.returns.actual.type).to.equal('string');
    expect(res.json.error.details.returns.actual.value).to.equal('hello value');

  });

  it('Should give 200 OK for not found function', async () => {

    let res = await this.post('/test/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.equal('not found?');

  });

  it('Should allow status setting from third callback parameter', async () => {

    let res = await this.post('/test/status/', {});

    expect(res.statusCode).to.equal(404);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.body).to.be.instanceof(Buffer);
    expect(res.body.toString()).to.equal('not found');

  });

  it('Should pass headers properly', async () => {

    let res = await this.post('/headers/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('text/html');
    expect(res.body).to.be.instanceof(Buffer);
    expect(res.body.toString()).to.equal('abcdef');

  });

  it('Should parse object properly', async () => {

    let res = await this.post('/object_parsing/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.equal(null);

  });

  it('Should toJSON object properly', async () => {

    let res = await this.post('/object_tojson/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.deep.equal({name: 'hello world', description: 'MyClass'});

  });

  it('Should populate HTTP body', async () => {

    let res = await this.post('/http_body/', {abc: 123});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.be.a.string;
    expect(res.json).to.equal('{"abc":123}');

  });

  it('Should null number properly (POST)', async () => {

    let res = await this.post('/number_nullable/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.be.an.array;
    expect(res.json[0]).to.equal(null);
    expect(res.json[1]).to.equal(null);

  });

  it('Should null number properly (GET)', async () => {

    let res = await this.get('/number_nullable/', '');

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.be.an.array;
    expect(res.json[0]).to.equal(null);
    expect(res.json[1]).to.equal(null);

  });

  it('Should error object on string provided', async () => {

    let res = await this.post('/object_parsing/', {obj: 'xxx'});

    expect(res.statusCode).to.equal(400);
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('ParameterError');
    expect(res.json.error.details).to.exist;
    expect(res.json.error.details.obj).to.exist;
    expect(res.json.error.details.obj.message).to.exist;
    expect(res.json.error.details.obj.expected).to.exist;
    expect(res.json.error.details.obj.expected.type).to.equal('object');
    expect(res.json.error.details.obj.actual).to.exist;
    expect(res.json.error.details.obj.actual.type).to.equal('string');
    expect(res.json.error.details.obj.actual.value).to.equal('xxx');

  });

  it('Should reject integer type when provided float (GET)', async () => {

    let res = await this.get('/type_rejection/?alpha=47.2', '');

    expect(res.statusCode).to.equal(400);
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('ParameterError');
    expect(res.json.error.details).to.exist;
    expect(res.json.error.details.alpha).to.exist;
    expect(res.json.error.details.alpha.message).to.exist;
    expect(res.json.error.details.alpha.expected).to.exist;
    expect(res.json.error.details.alpha.expected.type).to.equal('integer');
    expect(res.json.error.details.alpha.actual).to.exist;
    expect(res.json.error.details.alpha.actual.type).to.equal('number');
    expect(res.json.error.details.alpha.actual.value).to.equal(47.2);

  });

  it('Should reject integer type when provided float (POST)', async () => {

    let res = await this.post('/type_rejection/', {alpha: 47.2});

    expect(res.statusCode).to.equal(400);
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('ParameterError');
    expect(res.json.error.details).to.exist;
    expect(res.json.error.details.alpha).to.exist;
    expect(res.json.error.details.alpha.message).to.exist;
    expect(res.json.error.details.alpha.expected).to.exist;
    expect(res.json.error.details.alpha.expected.type).to.equal('integer');
    expect(res.json.error.details.alpha.actual).to.exist;
    expect(res.json.error.details.alpha.actual.type).to.equal('number');
    expect(res.json.error.details.alpha.actual.value).to.equal(47.2);

  });

  it('Should accept integer type when provided integer (GET)', async () => {

    let res = await this.get('/type_rejection/?alpha=47', '');

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.equal(47);

  });

  it('Should accept integer type when provided integer (POST)', async () => {

    let res = await this.post('/type_rejection/', {alpha: 47});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.equal(47);

  });

  it('Should not accept empty object.http', async () => {

    let res = await this.get('/sanitize/http_object_empty/', '');

    expect(res.statusCode).to.equal(502);
    expect(res.json.error).to.exist;
    expect(res.json.error.details).to.exist;
    expect(res.json.error.details.returns).to.exist
    expect(res.json.error.details.returns.invalid).to.equal(true);

  });

  it('Should sanitize a {_base64: ...} buffer input', async () => {

    let res = await this.get('/sanitize/http_object_base64/', '');

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.not.exist;
    expect(res.body.toString()).to.equal('fix for steven');

  });

  it('Should accept uppercase Content-Type', async () => {

    let res = await this.get('/sanitize/http_object_header_case/?contentType=image/png', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.exist;
    expect(res.headers).to.haveOwnProperty('content-type');
    expect(res.headers['content-type']).to.equal('image/png');

  });

  it('Should return a proper error for invalid header names', async () => {

    let res = await this.get('/sanitize/http_object_invalid_header_names/', '');

    expect(res.statusCode).to.equal(502);
    expect(res.json.error).to.exist;
    expect(res.json.error.details).to.exist;
    expect(Object.keys(res.json.error.details).length).to.equal(5);
    expect(res.json.error.details['content-type ']).to.exist;
    expect(res.json.error.details['x authorization key']).to.exist;
    expect(res.json.error.details[' anotherheader']).to.exist;
    expect(res.json.error.details['multilinename\n']).to.exist;
    expect(res.json.error.details['weirdname!@#$%^&*()œ∑´®†¥¨ˆøπåß∂ƒ©˙∆˚¬≈ç√∫˜µ≤:|{}🔥🔥🔥']).to.exist;

  });

  it('Should return a proper error for invalid header values', async () => {

    let res = await this.get('/sanitize/http_object_invalid_header_values/', '');

    expect(res.statusCode).to.equal(502);
    expect(res.json.error).to.exist;
    expect(res.json.error.details).to.exist;
    expect(Object.keys(res.json.error.details).length).to.equal(3);
    expect(res.json.error.details['object-value']).to.exist;
    expect(res.json.error.details['undefined-value']).to.exist;
    expect(res.json.error.details['null-value']).to.exist;

  });

  it('Should not accept object.http with null body', async () => {

    let res = await this.get('/sanitize/http_object/', '');

    expect(res.statusCode).to.equal(502);
    expect(res.json.error).to.exist;
    expect(res.json.error.details).to.exist;
    expect(res.json.error.details.returns).to.exist
    expect(res.json.error.details.returns.invalid).to.equal(true);

  });

  it('Should accept object.http with string body', async () => {

    let res = await this.get('/sanitize/http_object/?body=hello', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('text/plain');
    expect(res.body.toString()).to.equal('hello');

  });

  it('Should not accept object.http with statusCode out of range', async () => {

    let res = await this.get('/sanitize/http_object/?statusCode=600', '');

    expect(res.statusCode).to.equal(502);
    expect(res.json.error).to.exist;
    expect(res.json.error.details).to.exist;
    expect(res.json.error.details.returns).to.exist
    expect(res.json.error.details.returns.invalid).to.equal(true);

  });

  it('Should not accept object.http with invalid headers object', async () => {

    let res = await this.post('/sanitize/http_object/', {headers: true});

    expect(res.statusCode).to.equal(502);
    expect(res.json.error).to.exist;
    expect(res.json.error.details).to.exist;
    expect(res.json.error.details.returns).to.exist
    expect(res.json.error.details.returns.invalid).to.equal(true);

  });

  it('Should allow header setting', async () => {

    let res = await this.post('/sanitize/http_object/', {body: '<b>hello</b>', headers: {'content-type': 'text/html'}});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('text/html');
    expect(res.body.toString()).to.equal('<b>hello</b>');

  });

  it('Should overwrite access-control-allow-origin', async () => {

    let res = await this.post('/sanitize/http_object/', {body: '<b>hello</b>', headers: {'access-control-allow-origin': '$'}});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['access-control-allow-origin']).to.equal('$');
    expect(res.body.toString()).to.equal('<b>hello</b>');

  });

  it('Should NOT overwrite x-instant-api', async () => {

    let res = await this.post('/sanitize/http_object/', {body: '<b>hello</b>', headers: {'x-instant-api': '$'}});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['x-instant-api']).to.not.equal('$');
    expect(res.body.toString()).to.equal('<b>hello</b>');

  });

  it('Should fail to run a background function without @background specified', async () => {

    let res = await this.post('/a_standard_function/', {_background: true});

    expect(res.statusCode).to.equal(403);
    expect(res.json).to.exist;
    expect(res.json).to.be.an.object;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('ExecutionModeError');
    expect(res.json.error.message).to.contain('"background"');

  });

  it('Should fail to run a background function without @stream specified', async () => {

    let res = await this.post('/a_standard_function/', {_stream: true});

    expect(res.statusCode).to.equal(403);
    expect(res.json).to.exist;
    expect(res.json).to.be.an.object;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('ExecutionModeError');
    expect(res.json.error.message).to.contain('"stream"');

  });

  it('Should run a background function', async () => {

    let res = await this.post('/bg/', {data: 'xxx', _background: true});

    expect(res.statusCode).to.equal(202);
    expect(res.body).to.be.instanceof(Buffer);
    expect(res.body.length).to.be.greaterThan(0);
    expect(res.body.toString()).to.equal(`initiated "bg" ...`);

  });

  it('Should return 302 redirect on a GET request with correct url when running a background function missing a slash before ?_background and at end of url', async () => {
    
    let res = await this.get('/bg?_background', '', {'user-agent': 'testing'});

    expect(res.statusCode).to.equal(302);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers).to.haveOwnProperty('location');
    expect(res.headers.location).to.equal('/bg/?_background');

  });

  it('Should return 302 redirect on a GET request with correct url when running a background function missing a slash before ?_background but with slash at end of url', async () => {
    
    let res = await this.get('/bg?_background/', '', {'user-agent': 'testing'});

    expect(res.statusCode).to.equal(302);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers).to.haveOwnProperty('location');
    expect(res.headers.location).to.equal('/bg/?_background/');

  });

  it('Should return 302 redirect on a GET request with correct url when running a background function missing a slash before ?_background and at end of url with a query', async () => {
    
    let res = await this.get('/bg?_background&test=param', '', {'user-agent': 'testing'});

    expect(res.statusCode).to.equal(302);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers).to.haveOwnProperty('location');
    expect(res.headers.location).to.equal('/bg/?_background&test=param');

  });

  it('Should run a background function with bg mode "info"', async () => {

    let res = await this.post('/bg/info/', {data: 'xxx', _background: true});

    expect(res.statusCode).to.equal(202);
    expect(res.body).to.be.instanceof(Buffer);
    expect(res.body.length).to.be.greaterThan(0);

  });

  it('Should run a background function with bg mode "empty"', async () => {

    let res = await this.post('/bg/empty/', {data: 'xxx', _background: true});

    expect(res.statusCode).to.equal(202);
    expect(res.body).to.be.instanceof(Buffer);
    expect(res.body.length).to.equal(0);

  });

  it('Should run a background function with bg mode "params"', async () => {

    let res = await this.post('/bg/params/', {data: 'xxx', _background: true});

    expect(res.statusCode).to.equal(202);
    expect(res.json).to.exist;
    expect(res.json).to.be.an('object');
    expect(res.json).to.haveOwnProperty('data');
    expect(res.json.data).to.equal('xxx');

  });

  it('Should run a background function with bg mode "params" looking for a specific parameter', async () => {

    let res = await this.post('/bg/paramsSpecific1/', {data: 'xxx', discarded: 'xxx', _background: true});

    expect(res.statusCode).to.equal(202);
    expect(res.json).to.exist;
    expect(res.json).to.be.an('object');
    expect(res.json).to.haveOwnProperty('data');
    expect(res.json).to.not.haveOwnProperty('discarded');
    expect(res.json.data).to.equal('xxx');

  });

  it('Should run a background function with bg mode "params" looking for two specific parameters', async () => {

    let res = await this.post('/bg/paramsSpecific2/', {data: 'xxx', otherdata: 'xxx', discarded: 'xxx', _background: true});

    expect(res.statusCode).to.equal(202);
    expect(res.json).to.exist;
    expect(res.json).to.be.an('object');
    expect(res.json).to.haveOwnProperty('data');
    expect(res.json).to.haveOwnProperty('otherdata');
    expect(res.json.data).to.equal('xxx');
    expect(res.json.otherdata).to.equal('xxx');

  });

  it('Should run a background function with bg mode "params" looking for specific param that is not there', async () => {

    let res = await this.post('/bg/paramsSpecific3/', {otherdata: 'xxx', _background: true});

    expect(res.statusCode).to.equal(202);
    expect(res.json).to.exist;
    expect(res.json).to.be.an('object');
    expect(res.json).to.not.haveOwnProperty('data');

  });

  it('Should register an error in the resolve step with type AccessPermissionError', async () => {

    let originalResolveFn = FaaSGateway.resolve;
    FaaSGateway.resolve = (req, res, buffer, callback) => {
      let error = new Error('You are not allowed to access this API.');
      error.accessPermissionError = true;
      return callback(error);
    };

    let res = await this.post('/my_function/', {});

    FaaSGateway.resolve = originalResolveFn;

    expect(res.statusCode).to.equal(401);
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('AccessPermissionError');


  });

  it('Should register an error in the resolve step with type AccessSourceError', async () => {

    let originalResolveFn = FaaSGateway.resolve;
    FaaSGateway.resolve = (req, res, buffer, callback) => {
      let error = new Error('You are not allowed to access this API.');
      error.accessSourceError = true;
      return callback(error);
    };

    let res = await this.post('/my_function/', {});

    FaaSGateway.resolve = originalResolveFn;

    expect(res.statusCode).to.equal(401);
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('AccessSourceError');


  });

  it('Should register an error in the resolve step with type AccessAuthError', async () => {

    let originalResolveFn = FaaSGateway.resolve;
    FaaSGateway.resolve = (req, res, buffer, callback) => {
      let error = new Error('You are not allowed to access this API.');
      error.accessAuthError = true;
      return callback(error);
    };

    let res = await this.post('/my_function/', {});

    FaaSGateway.resolve = originalResolveFn;

    expect(res.statusCode).to.equal(401);
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('AccessAuthError');


  });

  it('Should register an error in the resolve step with type AccessSuspendedError', async () => {

    let originalResolveFn = FaaSGateway.resolve;
    FaaSGateway.resolve = (req, res, buffer, callback) => {
      let error = new Error('You are not allowed to access this API.');
      error.accessSuspendedError = true;
      return callback(error);
    };

    let res = await this.post('/my_function/', {});

    FaaSGateway.resolve = originalResolveFn;

    expect(res.statusCode).to.equal(401);
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('AccessSuspendedError');


  });

  it('Should register an error in the resolve step with type OwnerSuspendedError', async () => {

    let originalResolveFn = FaaSGateway.resolve;
    FaaSGateway.resolve = (req, res, buffer, callback) => {
      let error = new Error('You are not allowed to access this API.');
      error.ownerSuspendedError = true;
      return callback(error);
    };

    let res = await this.post('/my_function/', {});

    FaaSGateway.resolve = originalResolveFn;

    expect(res.statusCode).to.equal(503);
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('OwnerSuspendedError');


  });

  it('Should register an error in the resolve step with type OwnerPaymentRequiredError', async () => {

    let originalResolveFn = FaaSGateway.resolve;
    FaaSGateway.resolve = (req, res, buffer, callback) => {
      let error = new Error('You are not allowed to access this API.');
      error.ownerPaymentRequiredError = true;
      return callback(error);
    };

    let res = await this.post('/my_function/', {});

    FaaSGateway.resolve = originalResolveFn;

    expect(res.statusCode).to.equal(503);
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('OwnerPaymentRequiredError');


  });

  it('Should register an error in the resolve step with type PaymentRequiredError', async () => {

    let originalResolveFn = FaaSGateway.resolve;
    FaaSGateway.resolve = (req, res, buffer, callback) => {
      let error = new Error('You are not allowed to access this API.');
      error.paymentRequiredError = true;
      return callback(error);
    };

    let res = await this.post('/my_function/', {});

    FaaSGateway.resolve = originalResolveFn;

    expect(res.statusCode).to.equal(402);
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('PaymentRequiredError');


  });

  it('Should register an error in the resolve step with type RateLimitError', async () => {

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

    let res = await this.post('/my_function/', {});

    FaaSGateway.resolve = originalResolveFn;

    expect(res.statusCode).to.equal(429);
    expect(res.json.error).to.exist;
    expect(res.json.error.message).to.equal(errorMessage);
    expect(res.json.error.type).to.equal('RateLimitError');
    expect(res.json.error.details).to.haveOwnProperty('rate');
    expect(res.json.error.details.rate).to.haveOwnProperty('count');
    expect(res.json.error.details.rate).to.haveOwnProperty('period');
    expect(res.json.error.details.rate.count).to.equal(1);
    expect(res.json.error.details.rate.period).to.equal(3600);


  });

  it('Should register an error in the resolve step with type AuthRateLimitError', async () => {

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

    let res = await this.post('/my_function/', {});

    FaaSGateway.resolve = originalResolveFn;

    expect(res.statusCode).to.equal(429);
    expect(res.json.error).to.exist;
    expect(res.json.error.message).to.equal(errorMessage);
    expect(res.json.error.type).to.equal('AuthRateLimitError');
    expect(res.json.error.details).to.haveOwnProperty('rate');
    expect(res.json.error.details.rate).to.haveOwnProperty('count');
    expect(res.json.error.details.rate).to.haveOwnProperty('period');
    expect(res.json.error.details.rate.count).to.equal(1);
    expect(res.json.error.details.rate.period).to.equal(3600);


  });

  it('Should register an error in the resolve step with type UnauthRateLimitError', async () => {

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

    let res = await this.post('/my_function/', {});

    FaaSGateway.resolve = originalResolveFn;

    expect(res.statusCode).to.equal(429);
    expect(res.json.error).to.exist;
    expect(res.json.error.message).to.equal(errorMessage);
    expect(res.json.error.type).to.equal('UnauthRateLimitError');
    expect(res.json.error.details).to.haveOwnProperty('rate');
    expect(res.json.error.details.rate).to.haveOwnProperty('count');
    expect(res.json.error.details.rate).to.haveOwnProperty('period');
    expect(res.json.error.details.rate.count).to.equal(1);
    expect(res.json.error.details.rate.period).to.equal(3600);


  });

  it('Should register an error in the resolve step with type SaveError', async () => {

    let originalResolveFn = FaaSGateway.resolve;
    FaaSGateway.resolve = (req, res, buffer, callback) => {
      let error = new Error('There was a problem when saving your API.');
      error.saveError = true;
      return callback(error);
    };

    let res = await this.post('/my_function/', {});

    FaaSGateway.resolve = originalResolveFn;

    expect(res.statusCode).to.equal(503);
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('SaveError');


  });

  it('Should register an error in the resolve step with type MaintenanceError', async () => {

    let originalResolveFn = FaaSGateway.resolve;
    FaaSGateway.resolve = (req, res, buffer, callback) => {
      let error = new Error('Your API is in maintenance mode.');
      error.maintenanceError = true;
      return callback(error);
    };

    let res = await this.post('/my_function/', {});

    FaaSGateway.resolve = originalResolveFn;

    expect(res.statusCode).to.equal(403);
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('MaintenanceError');


  });

  it('Should register an error in the resolve step with type UpdateError', async () => {

    let originalResolveFn = FaaSGateway.resolve;
    FaaSGateway.resolve = (req, res, buffer, callback) => {
      let error = new Error('Your API is currently updating.');
      error.updateError = true;
      return callback(error);
    };

    let res = await this.post('/my_function/', {});

    FaaSGateway.resolve = originalResolveFn;

    expect(res.statusCode).to.equal(409);
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('UpdateError');


  });

  it('Should register a runtime error properly', async () => {

    let res = await this.post('/runtime/', {});

    expect(res.statusCode).to.equal(420);
    expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
    expect(res.json).to.exist;
    expect(res.json).to.be.an('object');
    expect(res.json.error).to.exist;
    expect(res.json.error).to.be.an('object');
    expect(res.json.error.type).to.equal('RuntimeError');
    expect(res.json.error).to.not.haveOwnProperty('details');

  });

  it('Should register a runtime error properly with details', async () => {

    let res = await this.post('/runtime/details/', {});

    expect(res.statusCode).to.equal(420);
    expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
    expect(res.json).to.exist;
    expect(res.json).to.be.an('object');
    expect(res.json.error).to.exist;
    expect(res.json.error).to.be.an('object');
    expect(res.json.error.type).to.equal('RuntimeError');
    expect(res.json.error.details).to.deep.equal({objects: 'supported'});

  });

  it('Should register a fatal error properly', async () => {

    let res = await this.post('/runtime/fatal/', {});

    expect(res.statusCode).to.equal(500);
    expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
    expect(res.json).to.exist;
    expect(res.json).to.be.an('object');
    expect(res.json.error).to.exist;
    expect(res.json.error).to.be.an('object');
    expect(res.json.error.type).to.equal('FatalError');
    expect(res.json.error.stack).to.exist;

  });

  it('Should register a fatal error properly and catch in the error handler', async () => {

    let error;
    FaaSGateway.setErrorHandler(e => error = e);

    let res = await this.post('/runtime/fatal/', {});

    expect(res.statusCode).to.equal(500);
    expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
    expect(res.json).to.exist;
    expect(res.json).to.be.an('object');
    expect(res.json.error).to.exist;
    expect(res.json.error).to.be.an('object');
    expect(res.json.error.type).to.equal('FatalError');
    expect(res.json.error.stack).to.exist;

    expect(error).to.exist;
    expect(error.message).to.equal(res.json.error.message);
    expect(error.stack).to.equal(res.json.error.stack);

    FaaSGateway.setErrorHandler(() => {});

  });

  it('Should register a fatal error with no stack properly', async () => {

    let res = await this.post('/runtime/fatal_no_stack/', {});

    expect(res.statusCode).to.equal(500);
    expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
    expect(res.json).to.exist;
    expect(res.json).to.be.an('object');
    expect(res.json.error).to.exist;
    expect(res.json.error).to.be.an('object');
    expect(res.json.error.type).to.equal('FatalError');
    expect(res.json.error.stack).to.not.exist;

  });

  it('Should register a timeout error properly', async () => {

    let res = await this.post('/runtime/timeout/', {});

    expect(res.statusCode).to.equal(504);
    expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
    expect(res.json).to.exist;
    expect(res.json).to.be.an('object');
    expect(res.json.error).to.exist;
    expect(res.json.error).to.be.an('object');
    expect(res.json.error.type).to.equal('TimeoutError');

  });

  it('Should register a thrown error properly', async () => {

    let res = await this.post('/runtime/thrown/', {});

    expect(res.statusCode).to.equal(420);
    expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
    expect(res.json).to.exist;
    expect(res.json).to.be.an('object');
    expect(res.json.error).to.exist;
    expect(res.json.error).to.be.an('object');
    expect(res.json.error.type).to.equal('RuntimeError');
    expect(res.json.error.message).to.equal('crap');

  });

  it('Should register a thrown error properly with a status code in message', async () => {

    let res = await this.post('/runtime/thrown_status/', {});

    expect(res.statusCode).to.equal(401);
    expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
    expect(res.json).to.exist;
    expect(res.json).to.be.an('object');
    expect(res.json.error).to.exist;
    expect(res.json.error).to.be.an('object');
    expect(res.json.error.type).to.equal('UnauthorizedError');
    expect(res.json.error.message).to.equal('crap');

  });

  it('Should register an uncaught promise', async () => {

    let res = await this.post('/runtime/promise_uncaught/', {});

    expect(res.statusCode).to.equal(420);
    expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
    expect(res.json).to.exist;
    expect(res.json).to.be.an('object');
    expect(res.json.error).to.exist;
    expect(res.json.error).to.be.an('object');
    expect(res.json.error.type).to.equal('RuntimeError');
    expect(res.json.error.message).to.equal('crap');

  });

  it('Should register an unhandled promise rejection', async () => {

    let res = await this.post('/runtime/promise_unhandled_rejection/', {});

    expect(res.statusCode).to.equal(420);
    expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
    expect(res.json).to.exist;
    expect(res.json).to.be.an('object');
    expect(res.json.error).to.exist;
    expect(res.json.error).to.be.an('object');
    expect(res.json.error.type).to.equal('RuntimeError');
    expect(res.json.error.message).to.equal('crap x2');

  });

  it('Should respond to an array as an implementation error', async () => {

    let res = await this.post('/runtime/array/', {});

    expect(res.statusCode).to.equal(420);
    expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
    expect(res.json).to.exist;
    expect(res.json).to.be.an('object');
    expect(res.json.error).to.exist;
    expect(res.json.error).to.be.an('object');
    expect(res.json.error.type).to.equal('RuntimeError');

  });

  it('Should respond to a boolean as an implementation error', async () => {

    let res = await this.post('/runtime/boolean/', {});

    expect(res.statusCode).to.equal(420);
    expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
    expect(res.json).to.exist;
    expect(res.json).to.be.an('object');
    expect(res.json.error).to.exist;
    expect(res.json.error).to.be.an('object');
    expect(res.json.error.type).to.equal('RuntimeError');

  });

  it('Should respond to a number as an implementation error', async () => {

    let res = await this.post('/runtime/number/', {});

    expect(res.statusCode).to.equal(420);
    expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
    expect(res.json).to.exist;
    expect(res.json).to.be.an('object');
    expect(res.json.error).to.exist;
    expect(res.json.error).to.be.an('object');
    expect(res.json.error.type).to.equal('RuntimeError');

  });

  it('Should respond to an object as an implementation error', async () => {

    let res = await this.post('/runtime/object/', {});

    expect(res.statusCode).to.equal(420);
    expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
    expect(res.json).to.exist;
    expect(res.json).to.be.an('object');
    expect(res.json.error).to.exist;
    expect(res.json.error).to.be.an('object');
    expect(res.json.error.type).to.equal('RuntimeError');

  });

  it('Should respond to a string as an implementation error', async () => {

    let res = await this.post('/runtime/string/', {});

    expect(res.statusCode).to.equal(420);
    expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
    expect(res.json).to.exist;
    expect(res.json).to.be.an('object');
    expect(res.json.error).to.exist;
    expect(res.json.error).to.be.an('object');
    expect(res.json.error.type).to.equal('RuntimeError');

  });

  it('Should handle multipart/form-data', (done) => {

    let form = new FormData();
    form.append('my_field', 'my value');
    form.append('my_other_field', 'my other value');

    form.submit(`http://${HOST}:${PORT}/reflect`, (err, response) => {

      expect(err).to.not.exist;
      expect(response.statusCode).to.equal(200);

      let body = [];
      response.on('readable', function () {
          body.push(response.read());
      });

      response.on('end', function () {
        let results = JSON.parse(body);
        expect(results.my_field).to.equal('my value');
        expect(results.my_other_field).to.equal('my other value');
        done();
      });

      response.on('err', function (err) {
        expect(err).to.not.exist;
        done();
      })

    });

  });

  it('Should handle multipart/form-data with buffer', (done) => {

    let pkgJson = fs.readFileSync(process.cwd() + '/package.json')

    let form = new FormData();
    form.append('my_field', 'my value');
    form.append('my_string_buffer', Buffer.from('123'));
    form.append('my_file_buffer', pkgJson);

    form.submit(`http://${HOST}:${PORT}/reflect`, (err, response) => {

      expect(err).to.not.exist;
      expect(response.statusCode).to.equal(200);

      let body = [];
      response.on('readable', function () { body.push(response.read()); });

      response.on('end', function () {
        let results = JSON.parse(body);
        let stringBuffer = Buffer.from(results.my_string_buffer._base64, 'base64');
        let fileBuffer = Buffer.from(results.my_file_buffer._base64, 'base64');
        expect(results.my_field).to.equal('my value');
        expect(stringBuffer).to.be.deep.equal(Buffer.from('123'))
        expect(fileBuffer).to.be.deep.equal(pkgJson)
        done();
      });

      response.on('err', function (err) {
        expect(err).to.not.exist;
        done();
      });

    });

  });

  it('Should handle multipart/form-data with json', (done) => {

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
      response.on('readable', function () {
        body.push(response.read());
      });

      response.on('end', function () {
        let results = JSON.parse(body);
        expect(results.my_field).to.equal('my value');
        expect(results.my_json).to.deep.equal({
          someJsonNums: 123,
          someJson: 'hello'
        });
        done();
      });

      response.on('err', function (err) {
        expect(err).to.not.exist;
        done();
      })

    });

  });

  it('Should handle multipart/form-data with bad json', (done) => {

    let form = new FormData();
    form.append('my_field', 'my value');
    form.append('my_json', 'totally not json', 'my.json');

    form.submit(`http://${HOST}:${PORT}/reflect`, (err, response) => {

      expect(err).to.not.exist;
      expect(response.statusCode).to.equal(400);

      let body = [];
      response.on('readable', function () {
        body.push(response.read());
      });

      response.on('end', function () {
        let results = JSON.parse(body);
        expect(results.error).to.exist
        expect(results.error.type).to.equal('ParameterParseError');
        expect(results.error.message).to.equal('Invalid multipart form-data with key: my_json');
        done();
      });

      response.on('err', function (err) {
        expect(err).to.not.exist;
        done();
      })

    });
  });

  it('Should handle multipart/form-data with a png', (done) => {

    let image = fs.readFileSync(process.cwd() + '/test/gateway/www/fs-wordmark.png');

    let form = new FormData();
    form.append('bufferParam', image);

    form.submit(`http://${HOST}:${PORT}/buffer_reflect`, (err, response) => {

      expect(err).to.not.exist;
      expect(response.statusCode).to.equal(200);

      let body = [];
      response.on('readable', function () {
        body.push(response.read());
      });

      response.on('end', function () {
        let result = Buffer.concat(body);
        expect(image.equals(result)).to.equal(true);
        done();
      });

      response.on('err', function (err) {
      expect(err).to.not.exist;
        done();
      });

    });

  });

  it('Should reject an object that doesn\'t map to Schema', async () => {

    let res = await this.post('/schema_rejection/', {
      obj: {
        name: 'hello',
        enabled: true,
        data: 'xxx',
        timestamp: 1337
      }
    });

    expect(res.statusCode).to.equal(400);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('ParameterError');
    expect(res.json.error.details).to.exist;
    expect(res.json.error.details.obj).to.exist;
    expect(res.json.error.details.obj.expected).to.exist;
    expect(res.json.error.details.obj.expected.type).to.equal('object');
    expect(res.json.error.details.obj.expected.schema).to.exist;
    expect(res.json.error.details.obj.expected.schema).to.have.length(4);
    expect(res.json.error.details.obj.expected.schema[0].name).to.equal('name');
    expect(res.json.error.details.obj.expected.schema[0].type).to.equal('string');
    expect(res.json.error.details.obj.expected.schema[1].name).to.equal('enabled');
    expect(res.json.error.details.obj.expected.schema[1].type).to.equal('boolean');
    expect(res.json.error.details.obj.expected.schema[2].name).to.equal('data');
    expect(res.json.error.details.obj.expected.schema[2].type).to.equal('object');
    expect(res.json.error.details.obj.expected.schema[2].schema).to.exist;
    expect(res.json.error.details.obj.expected.schema[2].schema).to.have.length(2);
    expect(res.json.error.details.obj.expected.schema[2].schema[0].name).to.equal('a');
    expect(res.json.error.details.obj.expected.schema[2].schema[0].type).to.equal('string');
    expect(res.json.error.details.obj.expected.schema[2].schema[1].name).to.equal('b');
    expect(res.json.error.details.obj.expected.schema[2].schema[1].type).to.equal('string');
    expect(res.json.error.details.obj.expected.schema[3].name).to.equal('timestamp');
    expect(res.json.error.details.obj.expected.schema[3].type).to.equal('number');
    expect(res.json.error.details.obj.actual).to.exist;
    expect(res.json.error.details.obj.actual.type).to.equal('object');
    expect(res.json.error.details.obj.actual.value).to.deep.equal({
      name: 'hello',
      enabled: true,
      data: 'xxx',
      timestamp: 1337
    });

  });

  it('Should accept an object that correctly maps to Schema', async () => {

    let res = await this.post('/schema_rejection/', {
      obj: {
        name: 'hello',
        enabled: true,
        data: {a: 'alpha', b: 'beta'},
        timestamp: 1337
      }
    });

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.equal('hello');

  });

  it('Should reject an array that doesn\'t map to Schema', async () => {

    let res = await this.post('/schema_rejection_array/', {
      users: ['alpha', 'beta']
    });

    expect(res.statusCode).to.equal(400);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('ParameterError');
    expect(res.json.error.details).to.exist;
    expect(res.json.error.details.users).to.exist;
    expect(res.json.error.details.users.expected).to.exist;
    expect(res.json.error.details.users.expected.type).to.equal('array');
    expect(res.json.error.details.users.expected.schema).to.exist;
    expect(res.json.error.details.users.expected.schema).to.have.length(1);
    expect(res.json.error.details.users.expected.schema[0].name).to.equal('user');
    expect(res.json.error.details.users.expected.schema[0].type).to.equal('object');
    expect(res.json.error.details.users.expected.schema[0].schema).to.exist;
    expect(res.json.error.details.users.expected.schema[0].schema).to.have.length(2);
    expect(res.json.error.details.users.expected.schema[0].schema[0].name).to.equal('username');
    expect(res.json.error.details.users.expected.schema[0].schema[0].type).to.equal('string');
    expect(res.json.error.details.users.expected.schema[0].schema[1].name).to.equal('age');
    expect(res.json.error.details.users.expected.schema[0].schema[1].type).to.equal('number');
    expect(res.json.error.details.users.actual).to.exist;
    expect(res.json.error.details.users.actual.type).to.equal('array');
    expect(res.json.error.details.users.actual.value).to.deep.equal(['alpha', 'beta']);

  });

  it('Should accept an array that correctly maps to Schema', async () => {

    let res = await this.post('/schema_rejection_array/', {
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
    });

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.equal('hello');

  });

  it('Should reject an nested array that doesn\'t map to Schema', async () => {

    let res = await this.post('/schema_rejection_nested_array/', {
      users: [
        { username: 'steve', posts: [{ title: 't', body: 'b' }] },
        { posts: [{ title: 't', body: 'b' }] }
      ]
    });

    expect(res.statusCode).to.equal(400);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('ParameterError');
    expect(res.json.error.details).to.exist;
    expect(res.json.error.details.users).to.exist;
    expect(res.json.error.details.users.expected).to.exist;
    expect(res.json.error.details.users.expected.type).to.equal('array');
    expect(res.json.error.details.users.expected.schema).to.deep.equal([
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
    expect(res.json.error.details.users.actual).to.deep.equal({
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

  });

  it('Should accept a nested array that correctly maps to Schema', async () => {

    let res = await this.post('/schema_rejection_nested_array/', {
      users: [
        { username: 'steve', posts: [{ title: 't', body: 'b' }] },
        { username: 'steve2', posts: [{ title: 't', body: 'b' }] }
      ]
    });

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.deep.equal( [
        { username: 'steve', posts: [{ title: 't', body: 'b' }] },
        { username: 'steve2', posts: [{ title: 't', body: 'b' }] }
      ]);

  });

  it('Should reject an array that doesn\'t map to a Schema for an array of numbers', async () => {

    let res = await this.post('/schema_rejection_number_array/', {
      userIds: ['alpha', 'beta']
    });

    expect(res.statusCode).to.equal(400);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('ParameterError');
    expect(res.json.error.details).to.exist;
    expect(res.json.error.details.userIds).to.exist;
    expect(res.json.error.details.userIds.expected).to.exist;
    expect(res.json.error.details.userIds.expected.type).to.equal('array');
    expect(res.json.error.details.userIds.expected.schema).to.exist;
    expect(res.json.error.details.userIds.expected.schema).to.have.length(1);
    expect(res.json.error.details.userIds.expected.schema[0].type).to.equal('number');
    expect(res.json.error.details.userIds.actual).to.exist;
    expect(res.json.error.details.userIds.actual.type).to.equal('array');
    expect(res.json.error.details.userIds.actual.value).to.deep.equal(['alpha', 'beta']);

  });

  it('Should accept an array that correctly maps to Schema', async () => {

    let res = await this.post('/schema_rejection_number_array/', {
      userIds: [1, 2, 3]
    });

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.equal('hello');

  });

  it('Should handle large buffer parameters', async () => {
    
    let res = await this.post(
      '/runtime/largebuffer/',
      {
        file: `{"_base64": "${'a'.repeat(50000000)}"}`
      },
      {
        'x-convert-strings': true
      }
    );

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.exist;
    expect(res.json.error).to.not.exist;

  }).timeout(5000);

  it('Should accept a request with the optional param', async () => {

    let res = await this.post('/optional_params/', {name: 'steve'});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.equal('steve');

  });

  it('Should accept a request without the optional param', async () => {

    let res = await this.post('/optional_params/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.equal('hello');

  });

  it('Should accept a request without the optional param', async () => {

    let res = await this.post('/schema_optional_params/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.equal(null);

  });

  it('Should accept a request without the optional param field', async () => {

    let res = await this.post('/schema_optional_params/', {obj: {name: 'steve'}});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.deep.equal({name: 'steve'});

  });

  it('Should accept a request with the optional param field set to null', async () => {

    let res = await this.post('/schema_optional_params/', {obj: {name: 'steve', enabled: null}});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.deep.equal({name: 'steve', enabled: null});

  });

  it('Should accept a request with the optional param field', async () => {

    let res = await this.post('/schema_optional_params/', {obj: {name: 'steve', enabled: true}});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.deep.equal({name: 'steve', enabled: true});

  });

  it('Should accept a request without the optional param (nested schema)', async () => {

    let res = await this.post('/optional_nested_schema_params/', {obj: {name: 'steve' }});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.deep.equal({name: 'steve'});

  });

  it('Should reject a request without the required param within the optional object (nested schema)', async () => {

    let res = await this.post('/optional_nested_schema_params/', {obj: {name: 'steve', options: {}}});

    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.statusCode).to.equal(400);

  });

  it('Should accept a request with the optional object (nested schema)', async () => {

    let res = await this.post('/optional_nested_schema_params/', {obj: {name: 'steve', options: {istest: true}}});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.exist;
    expect(res.json).to.deep.equal({name: 'steve', options: { istest: true}});

  });

  it('Should accept a request with the optional object and optional field (nested schema)', async () => {

    let res = await this.post('/optional_nested_schema_params/', {obj: {name: 'steve', options: {istest: true, threads: 4}}});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.exist;
    expect(res.json).to.deep.equal({name: 'steve', options: { istest: true, threads: 4}});

  });

  it('Should successfully return a request without the optional value', async () => {

    let res = await this.post('/optional_nested_schema_params/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.equal(null);

  });


  it('Should successfully return a request without the optional values', async () => {

    let res = await this.post('/optional_nested_schema_params/', {obj: {name: 'steve'}});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.exist;
    expect(res.json).to.deep.equal({name: 'steve'});

  });

  it('Should successfully return a request with the optional values', async () => {

    let res = await this.post('/optional_nested_schema_params/', {obj: {name: 'steve', options: {istest: true}}});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.exist;
    expect(res.json).to.deep.equal({name: 'steve', options: {istest: true}});

  });

  it('Should successfully return a request with the optional values and fields', async () => {

    let res = await this.post('/optional_nested_schema_params/', {obj: {name: 'steve', options: {istest: true, threads: 4}}});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.exist;
    expect(res.json).to.deep.equal({name: 'steve', options: {istest: true, threads: 4}});

  });

  it('Should accept a request that matches first of two schemas', async () => {

    let res = await this.post('/object_alternate_schema/', {fileOrFolder: {name: 'test', size: 100}});

    expect(res.json).to.exist;
    expect(res.json.error).to.not.exist;
    expect(res.statusCode).to.equal(200);

  });

  it('Should accept a request that matches second of two schemas', async () => {

    let res = await this.post('/object_alternate_schema/', {fileOrFolder: {name: 'test', files: [], options: {type: 'test'}}});

    expect(res.json).to.exist;
    expect(res.json.error).to.not.exist;
    expect(res.statusCode).to.equal(200);

  });

  it('Should accept a request that matches second subsection of two schemas', async () => {

    let res = await this.post('/object_alternate_schema/', {fileOrFolder: {name: 'test', files: [], options: {type: 100}}});

    expect(res.json).to.exist;
    expect(res.json.error).to.not.exist;
    expect(res.statusCode).to.equal(200);

  });

  it('Should reject a request that matches no schema', async () => {

    let res = await this.post('/object_alternate_schema/', {fileOrFolder: {name: 'test'}});

    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.statusCode).to.equal(400);

  });

  it('Should reject a request that matches no schema based on subsection', async () => {

    let res = await this.post('/object_alternate_schema/', {fileOrFolder: {name: 'test', files: [], options: {}}});

    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.statusCode).to.equal(400);

  });

  it('Should reject a request that matches no schema based on subsection type mismatch', async () => {

    let res = await this.post('/object_alternate_schema/', {fileOrFolder: {name: 'test', files: [], options: {type: false}}});

    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.statusCode).to.equal(400);

  });

  it('Should successfully return a default value with an optional field', async () => {

    let res = await this.post('/optional_param_not_null/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.exist;
    expect(res.json).to.equal('default');

  });

  it('Should successfully return a schema with a default set to 0', async () => {

    let res = await this.post('/stripe/', {id: '0'});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.exist;

  });

  it('Should successfully return a schema with an array', async () => {

    let res = await this.post('/giphy/', {query: 'q'});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.exist;

  });

  it('Should reject a request without an proper enum member', async () => {

    let res = await this.post('/enum/', { day: 'funday' });

    expect(res.statusCode).to.equal(400);
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.exist;
    expect(res.json.error.type).to.equal('ParameterError');
    expect(res.json.error.details).to.exist;
    expect(res.json.error.details).to.deep.equal({
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

  });

  it('Should successfully return an enum variant (number)', async () => {

    let res = await this.post('/enum/', { day: 'sunday' });

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.exist;
    expect(res.json).to.equal(0);

  });

  it('Should successfully return an enum variant (string)', async () => {

    let res = await this.post('/enum/', { day: 'monday' });

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.exist;
    expect(res.json).to.equal("0");

  });

  it('Should successfully return an enum variant (object)', async () => {

    let res = await this.post('/enum/', { day: 'tuesday' });

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.exist;
    expect(res.json).to.deep.equal({a: 1, b: 2});

  });


  it('Should successfully return an enum variant (array)', async () => {

    let res = await this.post('/enum/', { day: 'thursday' });

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.exist;
    expect(res.json).to.deep.equal([1, 2, 3]);

  });

  it('Should successfully return an enum variant (float)', async () => {

    let res = await this.post('/enum/', { day: 'friday' });

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.exist;
    expect(res.json).to.equal(5.4321);

  });

  it('Should return a default enum variant', async () => {

    let res = await this.post('/enum_default/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.exist;
    expect(res.json).to.equal(0);

  });

  it('Should return an enum using the context param', async () => {

    let res = await this.post('/enum_context/', { thingA: 'a', thingB: 'c' });

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.exist;
    expect(res.json).to.deep.equal({
        a: 0,
        b: {
          c: 1,
          d: [1, 2, 3]
        },
        c: '4',
        d: 5.4321
      });

  });

  it('Should return an enum variant when the return type is enum', async () => {

    let res = await this.post('/enum_return/', { a: 'a' });

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.exist;
    expect(res.json).to.equal(0);

  });

  it('Should reject returning an invalid enum variant  when the return type is enum', async () => {

    let res = await this.post('/enum_return/', {});

    expect(res.statusCode).to.equal(502);
    expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
    expect(res.json).to.exist;
    expect(res.json.error).to.deep.equal({
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

  });

  it('Should fail to return null from a function without a nullable return value', async () => {

    let res = await this.post('/not_nullable_return/', {});

    expect(res.statusCode).to.equal(502);
    expect(res.json.error).to.exist;
    expect(res.json.error.details).to.exist;
    expect(res.json.error.details.returns).to.exist
    expect(res.json.error.details.returns.invalid).to.equal(true);

  });

  it('Should return null from a function with a nullable return value', async () => {

    let res = await this.post('/nullable_return/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.equal(null);;

  });

  it('Should return a value from a function with a nullable return value', async () => {

    let res = await this.post('/nullable_return/', {a: 'hello'});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.equal('hello');;

  });

  it('Should successfully return a default parameter after passing in null', async () => {

    let res = await this.post('/null_default_param/', {name: null});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.equal('default');

  });

  it('Should successfully return a default parameter after passing in undefined', async () => {

    let res = await this.post('/null_default_param/', {name: undefined});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.equal('default');

  });

  it('Should successfully return an object with a schema that has an enum variant', async () => {

    let res = await this.post(
      '/enum_schema/',
      {
        before: 'before',
        valueRange: {
          range: 'a range',
          majorDimension: 'ROWS',
          values: []
        },
        after: 'after',
      }
    );

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.exist;
    expect(res.json).to.deep.equal({
      range: 'a range',
      majorDimension: 'ROWS',
      values: []
    });
        
  });

  it('Should return a default enum variant set to null', async () => {

    let res = await this.post('/enum_null/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.equal(null);

  });

  it('Should accept keyql params', async () => {

    let res = await this.post('/keyql/', { query: { name: 'steve' }, limit: { count: 0, offset: 0 }, order: { field: 'name', sort: 'ASC' } });

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.equal('hello');

  });

  it('Should accept keyql params', async () => {
    let query = JSON.stringify({ name: 'steve' });
    let limit = JSON.stringify({ count: 0, offset: 0 });
    let order = JSON.stringify({field: 'name', sort: 'ASC'});

    let res = await this.get(
      `/keyql/?query=${query}&limit=${limit}&order=${order}`,
      '',
      {'x-convert-strings': true}
    );

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.equal('hello');

  });

  it('Should reject invalid keyql limit', async () => {

    let res = await this.post('/keyql/', { query: { name: 'steve' }, limit: { count: 0, wrong: 0 }, order: { field: 'name', sort: 'ASC' }});

    expect(res.statusCode).to.equal(400);
    expect(res.json.error).to.exist;
    expect(res.json.error.details).to.exist;
    expect(res.json.error.details.limit).to.exist;

  });

  it('Should reject invalid keyql order (no field)', async () => {

    let res = await this.post('/keyql/', { query: { name: 'steve' }, limit: { count: 0, offset: 0 }, order: { field: null, sort: 'ASC' }});

    expect(res.statusCode).to.equal(400);
    expect(res.json.error).to.exist;
    expect(res.json.error.details).to.exist;
    expect(res.json.error.details.order).to.exist;

  });

  it('Should reject invalid keyql order (invalid sort)', async () => {

    let res = await this.post('/keyql/', { query: { name: 'steve' }, limit: { count: 0, offset: 0 }, order: { field: 'name', sort: 'WRONG' }});

    expect(res.statusCode).to.equal(400);
    expect(res.json.error).to.exist;
    expect(res.json.error.details).to.exist;
    expect(res.json.error.details.order).to.exist;

  });

  it('Should reject invalid keyql order (overloaded)', async () => {

    let res = await this.post('/keyql/', { query: { name: 'steve' }, limit: { count: 0, offset: 0 }, order: { field: 'name', sort: 'ASC', wrong: 'WRONG' }});

    expect(res.statusCode).to.equal(400);
    expect(res.json.error).to.exist;
    expect(res.json.error.details).to.exist;
    expect(res.json.error.details.order).to.exist;

  });

  it('Should accept keyql with correct options', async () => {

    let res = await this.post('/keyql_options/', {query: {alpha: 'hello'}});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.equal('hello');

  });

  it('Should accept keyql with correct options and an operator', async () => {

    let res = await this.post('/keyql_options/', {query: {alpha__is: 'hello'}});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.equal('hello');

  });

  it('Should reject keyql with correct options with an incorrect operator', async () => {

    let res = await this.post('/keyql_options/', {query: {alpha__isnt: 'hello'}});

    expect(res.statusCode).to.equal(400);

  });

  it('Should reject keyql with incorrect options', async () => {

    let res = await this.post('/keyql_options/', {query: {gamma: 'hello'}});

    expect(res.statusCode).to.equal(400);

  });

  it('Should reject keyql with incorrect options with an operator', async () => {

    let res = await this.post('/keyql_options/', {query: {gamma__is: 'hello'}});

    expect(res.statusCode).to.equal(400);

  });

  it('Should accept keyql array with correct options', async () => {

    let res = await this.post('/keyql_options_array/', {query: [{alpha: 'hello'}]});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.equal('hello');

  });

  it('Should accept keyql array with correct options and an operator', async () => {

    let res = await this.post('/keyql_options_array/', {query: [{alpha__is: 'hello'}]});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.equal('hello');

  });

  it('Should reject keyql array with correct options with an incorrect operator', async () => {

    let res = await this.post('/keyql_options_array/', {query: [{alpha__isnt: 'hello'}]});

    expect(res.statusCode).to.equal(400);

  });

  it('Should reject keyql array with incorrect options', async () => {

    let res = await this.post('/keyql_options_array/', {query: [{gamma: 'hello'}]});

    expect(res.statusCode).to.equal(400);

  });

  it('Should reject keyql array with incorrect options with an operator', async () => {

    let res = await this.post('/keyql_options_array/', {query: [{gamma__is: 'hello'}]});

    expect(res.statusCode).to.equal(400);

  });

  it('Should accept keyql order with correct options', async () => {

    let res = await this.post('/keyql_order_options/', {order: {field: 'alpha'}});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.equal('hello');

  });

  it('Should reject keyql order with incorrect options', async () => {

    let res = await this.post('/keyql_order_options/', {order: {field: 'gamma'}});

    expect(res.statusCode).to.equal(400);

  });

  it('Should accept keyql array with correct options', async () => {

    let res = await this.post('/keyql_order_options_array/', {order: [{field: 'alpha'}]});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.equal('hello');

  });

  it('Should reject keyql array with incorrect options', async () => {

    let res = await this.post('/keyql_order_options_array/', {order: [{field: 'gamma'}]});

    expect(res.statusCode).to.equal(400);

  });

  it('Should accept keyql array with all correct options', async () => {

    let res = await this.post('/keyql_order_options_array/', {order: [{field: 'alpha'}, {field: 'beta'}]});

    expect(res.statusCode).to.equal(200);

  });

  it('Should reject keyql array with an incorrect option', async () => {

    let res = await this.post('/keyql_order_options_array/', {order: [{field: 'alpha'}, {field: 'gamma'}]});

    expect(res.statusCode).to.equal(400);

  });

  it('Should reject keyql limit count out of range, hard limit', async () => {

    let res = await this.post('/keyql_limit/', {limit: {count: -1, offset: 0}});

    expect(res.statusCode).to.equal(400);

  });

  it('Should reject keyql limit offset out of range, hard limit', async () => {

    let res = await this.post('/keyql_limit/', {limit: {count: 0, offset: -1}});

    expect(res.statusCode).to.equal(400);

  });

  it('Should reject keyql limit count non-integer, hard limit', async () => {

    let res = await this.post('/keyql_limit/', {limit: {count: 0.256, offset: 0}});

    expect(res.statusCode).to.equal(400);

  });

  it('Should reject keyql limit count out of lowerbound range, user limit', async () => {

    let res = await this.post('/keyql_limit_range/', {limit: {count: 1, offset: 0}});

    expect(res.statusCode).to.equal(400);

  });

  it('Should reject keyql limit count out of upperbound range, user limit', async () => {

    let res = await this.post('/keyql_limit_range/', {limit: {count: 30, offset: 0}});

    expect(res.statusCode).to.equal(400);

  });

  it('Should accept keyql limit count in range', async () => {

    let res = await this.post('/keyql_limit_range/', {limit: {count: 5}});

    expect(res.statusCode).to.equal(200);

  });

  it('Should accept number inside integer range', async () => {

    let res = await this.post('/range_integer/', {ranged: 1});

    expect(res.statusCode).to.equal(200);

  });

  it('Should reject number outside integer range, lowerbound', async () => {

    let res = await this.post('/range_integer/', {ranged: -1});

    expect(res.statusCode).to.equal(400);

  });

  it('Should reject number outside integer range, upperbound', async () => {

    let res = await this.post('/range_integer/', {ranged: 201});

    expect(res.statusCode).to.equal(400);

  });

  it('Should accept number inside number range', async () => {

    let res = await this.post('/range_number/', {ranged: 1.5});

    expect(res.statusCode).to.equal(200);

  });

  it('Should reject number outside number range, lowerbound', async () => {

    let res = await this.post('/range_number/', {ranged: 1});

    expect(res.statusCode).to.equal(400);
    expect(res.json.error).to.exist;
    expect(res.json.error.details.ranged.message).to.equal('must be greater than or equal to 1.01');

  });

  it('Should reject number outside number range, upperbound', async () => {

    let res = await this.post('/range_number/', {ranged: 200});

    expect(res.statusCode).to.equal(400);

  });

  it('Should accept string within provided options', async () => {

    let res = await this.post('/string_options/', {value: 'one'});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.equal('one');

  });

  it('Should reject string outside provided options', async () => {

    let res = await this.post('/string_options/', {value: 'four'});

    expect(res.statusCode).to.equal(400);
    expect(res.json.error.details.value.message).to.contain('["one","two","three"]');
    expect(res.json.error.details.value.expected.values).to.deep.equal(['one', 'two', 'three']);

  });

  it('Should identify mismatch in a returns statement (unnamed, non-array)', async () => {

    let res = await this.post('/mismatch_returns_anon/', {});

    expect(res.statusCode).to.equal(502);
    expect(res.json.error.details.returns.mismatch).to.exist;
    expect(res.json.error.details.returns.mismatch).to.equal('$.user.name');

  });

  it('Should identify mismatch in a returns statement (unnamed, array)', async () => {

    let res = await this.post('/mismatch_returns_anon_array/', {});

    expect(res.statusCode).to.equal(502);
    expect(res.json.error.details.returns.mismatch).to.exist;
    expect(res.json.error.details.returns.mismatch).to.equal('$.user.names[1]');

  });

  it('Should identify mismatch in a returns statement (named, non-array)', async () => {

    let res = await this.post('/mismatch_returns_named/', {});

    expect(res.statusCode).to.equal(502);
    expect(res.json.error.details.returns.mismatch).to.exist;
    expect(res.json.error.details.returns.mismatch).to.equal('myObject.user.name');

  });

  it('Should identify mismatch in a returns statement (named, array)', async () => {

    let res = await this.post('/mismatch_returns_named_array/', {});

    expect(res.statusCode).to.equal(502);
    expect(res.json.error.details.returns.mismatch).to.exist;
    expect(res.json.error.details.returns.mismatch).to.equal('myObject.user.names[1]');

  });

  it('Should identify mismatch in a returns statement (deep)', async () => {

    let res = await this.post('/mismatch_returns_deep/', {});

    expect(res.statusCode).to.equal(502);
    expect(res.json.error.details.returns.mismatch).to.exist;
    expect(res.json.error.details.returns.mismatch).to.equal('$.user.posts[0].messages[2]');

  });

  it('Should identify mismatch in a param statement (deep)', async () => {

    let res = await this.post('/mismatch_params_deep/',
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
    });

    expect(res.statusCode).to.equal(400);
    expect(res.json.error.details.userData).to.exist;
    expect(res.json.error.details.userData.mismatch).to.equal('userData.user.posts[0].messages[2]');

  });

  it('Should return a buffer properly', async () => {

    let res = await this.post('/buffer_return/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/octet-stream');
    expect(res.body).to.be.instanceof(Buffer);
    expect(res.body.toString()).to.equal('lol');

  });

  it('Should return a buffer properly with a .contentType set', async () => {

    let res = await this.post('/buffer_return_content_type/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('image/png');
    expect(res.body).to.be.instanceof(Buffer);
    expect(res.body.toString()).to.equal('lol');

  });

  it('Should return a nested buffer properly', async () => {

    let res = await this.post('/buffer_nested_return/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.exist;
    expect(res.json).to.haveOwnProperty('body');
    expect(res.json.body).to.haveOwnProperty('_base64');
    expect(Buffer.from(res.json.body._base64, 'base64').toString()).to.equal('lol');
    expect(res.json.test).to.exist;
    expect(res.json.test.deep).to.exist;
    expect(res.json.test.deep).to.be.an('array');
    expect(res.json.test.deep.length).to.equal(3);
    expect(res.json.test.deep[1]).to.haveOwnProperty('_base64');
    expect(Buffer.from(res.json.test.deep[1]._base64, 'base64').toString()).to.equal('wat');

  });

  it('Should parse buffers within object params', async () => {

    let res = await this.post('/buffer_within_object_param/', {
      objectParam: {
        bufferVal: {
          _base64: 'abcde'
        }
      }
    });

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json).to.exist;
    expect(res.json).to.equal('ok');

  });

  it('Should parse buffers within array params', async () => {

    let res = await this.post('/buffer_within_array_param/', {
      arrayParam: [{
        _base64: 'abcde'
      }]
    });

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json).to.exist;
    expect(res.json).to.equal('ok');

  });

  it('Should return a mocked buffer as if it were a real one', async () => {

    let res = await this.post('/buffer_mocked_return/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.be.instanceof(Buffer);
    expect(res.body.toString()).to.equal('lol');

  });

  it('Should return a nested mocked buffer as if it were a real one', async () => {

    let res = await this.post('/buffer_nested_mocked_return/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.exist;
    expect(res.json).to.haveOwnProperty('body');
    expect(res.json.body).to.haveOwnProperty('_base64');
    expect(Buffer.from(res.json.body._base64, 'base64').toString()).to.equal('lol');
    expect(res.json.test).to.exist;
    expect(res.json.test.deep).to.exist;
    expect(res.json.test.deep).to.be.an('array');
    expect(res.json.test.deep.length).to.equal(3);
    expect(res.json.test.deep[1]).to.haveOwnProperty('_base64');
    expect(Buffer.from(res.json.test.deep[1]._base64, 'base64').toString()).to.equal('wat');

  });

  it('Should return a mocked buffer as if it were a real one, if type "any"', async () => {

    let res = await this.post('/buffer_any_return/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.be.instanceof(Buffer);
    expect(res.body.toString()).to.equal('lol');

  });

  it('Should return a nested mocked buffer as if it were a real one, if type "any"', async () => {

    let res = await this.post('/buffer_nested_any_return/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.exist;
    expect(res.json).to.haveOwnProperty('body');
    expect(res.json.body).to.haveOwnProperty('_base64');
    expect(Buffer.from(res.json.body._base64, 'base64').toString()).to.equal('lol');
    expect(res.json.test).to.exist;
    expect(res.json.test.deep).to.exist;
    expect(res.json.test.deep).to.be.an('array');
    expect(res.json.test.deep.length).to.equal(3);
    expect(res.json.test.deep[1]).to.haveOwnProperty('_base64');
    expect(Buffer.from(res.json.test.deep[1]._base64, 'base64').toString()).to.equal('wat');

  });

  it('Should throw an ValueError on an invalid Buffer type', async () => {

    let res = await this.post('/value_error/buffer_invalid/', {});

    expect(res.statusCode).to.equal(502);
    expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
    expect(res.json).to.exist;

  });

  it('Should throw an ValueError on an invalid Number type', async () => {

    let res = await this.post('/value_error/number_invalid/', {});

    expect(res.statusCode).to.equal(502);
    expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
    expect(res.json).to.exist;

  });

  it('Should throw an ValueError on an invalid Object type with alternate schema', async () => {

    let res = await this.post('/value_error/object_alternate_schema_invalid/', {});

    expect(res.statusCode).to.equal(502);
    expect(res.headers['x-execution-uuid'].length).to.be.greaterThan(1);
    expect(res.json).to.exist;

  });

  it('Should not populate "context.providers" with no authorization providers header provided', async () => {

    let res = await this.post('/context/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.exist;
    expect(res.json.providers).to.deep.equal({});

  });

  it('Should not populate "context.providers" if the authorization providers header is not an serialized object', async () => {
    
    let res = await this.post(
      '/context/',
      {},
      {'X-Authorization-Providers': 'stringvalue'}
    );

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.exist;
    expect(res.json.providers).to.deep.equal({});

  });

  it('Should populate "context.providers" as the value of the authorization providers header if it is a serialized object', async () => {
    
    let headerValue = {
      test: {
        item: 'value'
      }
    };

    let res = await this.post(
      '/context/',
      {},
      {'X-Authorization-Providers': JSON.stringify(headerValue)}
    );

    expect(res.statusCode).to.equal(200);
    expect(res.json).to.exist;
    expect(res.json.providers).to.deep.equal(headerValue);

  });

  it('Should populate context in "inline/context"', async () => {

    let res = await this.post('/inline/context/', {a: 1, b: 2});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json).to.exist;
    expect(res.json.http.method).to.equal('POST');
    expect(res.json.params).to.deep.equal({a: 1, b: 2});

  });

  it('Should output buffer from "inline/buffer"', async () => {

    let res = await this.post('/inline/buffer/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('text/html');
    expect(res.body).to.be.instanceof(Buffer);
    expect(res.body.toString()).to.equal('lol');

  });

  it('Should output buffer from "inline/buffer_mock"', async () => {

    let res = await this.post('/inline/buffer_mock/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/octet-stream');
    expect(res.body).to.be.instanceof(Buffer);
    expect(res.body.toString()).to.equal('lol');

  });

  it('Should output buffer from "inline/http"', async () => {

    let res = await this.post('/inline/http/', {});

    expect(res.statusCode).to.equal(429);
    expect(res.headers['content-type']).to.equal('text/html');
    expect(res.body).to.be.instanceof(Buffer);
    expect(res.body.toString()).to.equal('lol');

  });

  it('Should output buffer from "inline/http_no_status"', async () => {

    let res = await this.post('/inline/http_no_status/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('text/html');
    expect(res.body).to.be.instanceof(Buffer);
    expect(res.body.toString()).to.equal('lol');

  });

  it('Should output object from "inline/extended_http_is_object"', async () => {

    let res = await this.post('/inline/extended_http_is_object/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json).to.exist;
    expect(res.json).to.deep.equal({
        statusCode: 429,
        headers: {'Content-Type': 'text/html'},
        body: 'lol',
        extend: true
      });

  });

  it('Should output object from "inline/number"', async () => {

    let res = await this.post('/inline/number/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json).to.exist;
    expect(res.json).to.equal(1988);

  });

  it('Should allow you to use "require()"', async () => {

    let res = await this.post('/inline/require/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json).to.exist;
    expect(res.json).to.equal('hello');

  });

  it('Should allow you to use "await"', async () => {

    let res = await this.post('/inline/await/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json).to.exist;
    expect(res.json).to.equal('hello world');

  });

  it('Should support static files in "www" directory properly', async () => {

    let res = await this.get('/page.html', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('text/html; charset=utf-8');
    expect(res.body.toString()).to.equal('this is an html file\n');

  });

  it('Should support POST to static files in "www" directory properly (noop)', async () => {

    let res = await this.post('/page.html', {});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('text/html; charset=utf-8');
    expect(res.body.toString()).to.equal('this is an html file\n');

  });

  it('Should NOT support static files in "www" directory properly, without .html', async () => {

    let res = await this.get('/page/', '');

    expect(res.statusCode).to.equal(404);

  });

  it('Should NOT support static files in "www" directory properly, without .htm', async () => {

    let res = await this.get('/page2/', '');

    expect(res.statusCode).to.equal(404);

  });

  it('Should support 404 not found in "www" directory properly by direct accession', async () => {

    let res = await this.get('/error/404.html', '');

    expect(res.statusCode).to.equal(404);
    expect(res.headers['content-type']).to.equal('text/html; charset=utf-8');
    expect(res.body.toString()).to.equal('error 404\n');

  });

  it('Should support 404 not found in "www" directory properly by dir accession', async () => {

    let res = await this.get('/error/', '');

    expect(res.statusCode).to.equal(404);
    expect(res.headers['content-type']).to.equal('text/html; charset=utf-8');
    expect(res.body.toString()).to.equal('error 404\n');

  });

  it('Should support 404 not found in "www" directory properly by non-existent file accession', async () => {

    let res = await this.get('/error/nope.txt', '');

    expect(res.statusCode).to.equal(404);
    expect(res.headers['content-type']).to.equal('text/html; charset=utf-8');
    expect(res.body.toString()).to.equal('error 404\n');

  });

  it('Should support 404 not found in "www" directory properly by nested non-existent file accession', async () => {

    let res = await this.get('/error/path/to/nope.txt', '');

    expect(res.statusCode).to.equal(404);
    expect(res.headers['content-type']).to.equal('text/html; charset=utf-8');
    expect(res.body.toString()).to.equal('error 404\n');

  });

  it('Should support 404 not found in "www" directory properly by nested non-existent file accession', async () => {

    let res = await this.get('/error/path/to/nope.txt', '');

    expect(res.statusCode).to.equal(404);
    expect(res.headers['content-type']).to.equal('text/html; charset=utf-8');
    expect(res.body.toString()).to.equal('error 404\n');

  });

  it('Should support "index.html" mapping to root directory', async () => {

    let res = await this.get('/static-test/', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('text/html; charset=utf-8');
    expect(res.body.toString()).to.equal('this is an index.html file\n');

  });

  it('Should support "index.html" also mapping to itself', async () => {

    let res = await this.get('/static-test/index.html', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('text/html; charset=utf-8');
    expect(res.body.toString()).to.equal('this is an index.html file\n');

  });

  it('Should support "index.htm" mapping to root directory', async () => {

    let res = await this.get('/static-test/htm/', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('text/html; charset=utf-8');
    expect(res.body.toString()).to.equal('this is an index.htm file\n');

  });

  it('Should support "index.htm" also mapping to itself', async () => {

    let res = await this.get('/static-test/htm/index.htm', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('text/html; charset=utf-8');
    expect(res.body.toString()).to.equal('this is an index.htm file\n');

  });

  it('Should support static (www) ".png" files properly', async () => {

    let res = await this.get('/fs-wordmark.png', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('image/png');
    expect(res.body.byteLength).to.equal(parseInt(res.headers['content-length']));

  });

  it('Should support static (www) ".mp4" files properly', async () => {

    let res = await this.get('/video.mp4', '');
    let size = parseInt(res.headers['content-length']);

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('video/mp4');
    expect(res.headers['content-range']).to.equal('bytes 0-' + (size - 1) + '/' + size);
    expect(res.headers['accept-ranges']).to.equal('bytes');
    expect(res.body.byteLength).to.equal(size);

  });

  it('Should support static (www) ".mp4" files properly with range header', async () => {
    
    let res = await this.get('/video.mp4', '', {range: '27-255'});

    let size = parseInt(res.headers['content-length']);

    expect(res.statusCode).to.equal(206);
    expect(res.headers['content-type']).to.equal('video/mp4');
    expect(res.headers['content-range']).to.equal('bytes 27-255/574823');
    expect(res.headers['accept-ranges']).to.equal('bytes');
    expect(size).to.equal(255 - 27 + 1);
    expect(res.body.byteLength).to.equal(size);

  });

  it('Should support static (www) ".mp4" files properly with range header (prefix)', async () => {
    
    let res = await this.get('/video.mp4', '', {range: '0-'});

    let size = parseInt(res.headers['content-length']);

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('video/mp4');
    expect(res.headers['content-range']).to.equal('bytes 0-' + (size - 1) + '/' + size);
    expect(res.headers['accept-ranges']).to.equal('bytes');
    expect(res.body.byteLength).to.equal(size);

  });

  it('Should support static (www) ".mp4" files properly with range header (prefix + 1)', async () => {
    
    let res = await this.get('/video.mp4', '', {range: '1-'});

    let size = parseInt(res.headers['content-length']);
    expect(res.statusCode).to.equal(206);
    expect(res.headers['content-type']).to.equal('video/mp4');
    expect(res.headers['content-range']).to.equal('bytes 1-574822/574823');
    expect(res.headers['accept-ranges']).to.equal('bytes');
    expect(res.body.byteLength).to.equal(size);

  });

  it('Should support static (www) ".mp4" files properly with range header (suffix)', async () => {
    
    let res = await this.get('/video.mp4', '', {range: '-500'});

    let size = parseInt(res.headers['content-length']);

    expect(res.statusCode).to.equal(206);
    expect(res.headers['content-type']).to.equal('video/mp4');
    expect(res.headers['content-range']).to.equal('bytes 574323-574822/574823');
    expect(res.headers['accept-ranges']).to.equal('bytes');
    expect(size).to.equal(500);
    expect(res.body.byteLength).to.equal(size);

  });

  it('Should support POST with nonstandard JSON (array)', async () => {

    let res = await this.post('/nonstandard/json/', [1, 2, 3]);

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json.http.json).to.exist;
    expect(res.json.http.json).to.deep.equal([1, 2, 3]);

  });

  it('Should support POST with nonstandard JSON (string)', async () => {

    let res = await this.post('/nonstandard/json/', '"hello"');

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json.http.json).to.exist;
    expect(res.json.http.json).to.equal('hello');

  });

  it('Should support POST with nonstandard JSON (boolean)', async () => {

    let res = await this.post('/nonstandard/json/', 'true');

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json.http.json).to.exist;
    expect(res.json.http.json).to.equal(true);

  });

  it('Should support POST with nonstandard JSON (number)', async () => {

    let res = await this.post('/nonstandard/json/', '1.2');

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json.http.json).to.exist;
    expect(res.json.http.json).to.equal(1.2);

  });

  it('Should support POST with XML', async () => {

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

    let res = await this.post('/reflect/', xmlData, {'Content-Type': 'application/xml'});

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.deep.equal(parsedData);

  });

  it('Should support POST with XML (containing attributes)', async () => {

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

    let res = await this.post('/reflect/', xmlData, {'Content-Type': 'application/xml'});

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.deep.equal(parsedData);


  });

  it('Should reject invalid XML', async () => {

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

    let res = await this.post('/reflect/', xmlData, {'Content-Type': 'application/xml'});

    expect(res.statusCode).to.equal(400);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('ParameterParseError');

  });

  it('Should not reject nor parse XML if no Content-Type headers are passed in', async () => {

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

    let res = await this.post('/reflect/', xmlData);

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');

  });

  it('Should support POST with XML for content type "application/atom+xml"', async () => {

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

    let res = await this.post('/reflect/', xmlData, {'Content-Type': 'application/atom+xml'});

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.deep.equal(parsedData);

  });

  it('Should support POST with XML for content type "application/atom+xml" (containing attributes)', async () => {

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

    let res = await this.post('/reflect/', xmlData, {'Content-Type': 'application/atom+xml'});

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.deep.equal(parsedData);


  });

  it('Should reject invalid XML for content type "application/atom+xml"', async () => {

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

    let res = await this.post('/reflect/', xmlData, {'Content-Type': 'application/atom+xml'});

    expect(res.statusCode).to.equal(400);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('ParameterParseError');

  });

  it('Streaming endpoints should default to normal request with no _stream sent', async () => {

    let res = await this.post('/stream/basic/', {alpha: 'hello'});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json).to.exist;
    expect(res.json).to.equal(true);

  });

  it('Streaming endpoints should default to normal request with _stream falsy', async () => {

    let res = await this.post('/stream/basic/', {alpha: 'hello', _stream: false});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json).to.exist;
    expect(res.json).to.equal(true);

  });

  it('Streaming endpoints should default to normal request with _stream falsy in query params', async () => {

    let res = await this.post('/stream/basic/?alpha=hello&_stream=false', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json).to.exist;
    expect(res.json).to.equal(true);

  });

  it('Streaming endpoints should fail with StreamError if contains an invalid stream', async () => {

    let res = await this.post('/stream/basic/', {alpha: 'hello', _stream: {test: true}});

    expect(res.statusCode).to.equal(400);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('StreamListenerError');
    expect(res.json.error.details).to.haveOwnProperty('test');

  });

  it('Should support POST with streaming with _stream in query params', async () => {

    let res = await this.post('/stream/basic/?alpha=hello&_stream', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type'].split(';')[0]).to.equal('text/event-stream');
    expect(res.body).to.exist;

    let events = res.events;
    expect(events).to.exist;
    expect(events['hello']).to.exist;
    expect(events['hello'][0]).to.equal('true');
    expect(events['@response']).to.exist;

    let response = JSON.parse(events['@response'][0]);
    expect(response.headers['Content-Type']).to.equal('application/json');
    expect(response.body).to.equal('true');

  });

  it('Should support POST with streaming with _stream in query params with truthy value', async () => {

    let res = await this.post('/stream/basic/?alpha=hello&_stream=lol', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type'].split(';')[0]).to.equal('text/event-stream');
    expect(res.body).to.exist;

    let events = res.events;
    expect(events).to.exist;
    expect(events['hello']).to.exist;
    expect(events['hello'][0]).to.equal('true');
    expect(events['@response']).to.exist;

    let response = JSON.parse(events['@response'][0]);
    expect(response.headers['Content-Type']).to.equal('application/json');
    expect(response.body).to.equal('true');

  });

  it('Should support POST with streaming with _stream set to valid stream', async () => {

    let res = await this.post('/stream/basic/', {alpha: 'hello', _stream: {'hello': true}});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type'].split(';')[0]).to.equal('text/event-stream');
    expect(res.body).to.exist;

    let events = res.events;
    expect(events).to.exist;
    expect(events['hello']).to.exist;
    expect(events['hello'][0]).to.equal('true');
    expect(events['@response']).to.exist;

    let response = JSON.parse(events['@response'][0]);
    expect(response.headers['Content-Type']).to.equal('application/json');
    expect(response.body).to.equal('true');

  });

  it('Should support POST with streaming with _stream set to *', async () => {

    let res = await this.post('/stream/basic/', {alpha: 'hello', _stream: {'*': true}});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type'].split(';')[0]).to.equal('text/event-stream');
    expect(res.body).to.exist;

    let events = res.events;
    expect(events).to.exist;
    expect(events['hello']).to.exist;
    expect(events['hello'][0]).to.equal('true');
    expect(events['@response']).to.exist;

    let response = JSON.parse(events['@response'][0]);
    expect(response.headers['Content-Type']).to.equal('application/json');
    expect(response.body).to.equal('true');

  });

  it('Should support POST with streaming with _stream set to valid stream or *', async () => {

    let res = await this.post('/stream/basic/', {alpha: 'hello', _stream: {'hello': true, '*': true}});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type'].split(';')[0]).to.equal('text/event-stream');
    expect(res.body).to.exist;

    let events = res.events;
    expect(events).to.exist;
    expect(events['hello']).to.exist;
    expect(events['hello'][0]).to.equal('true');
    expect(events['@response']).to.exist;

    let response = JSON.parse(events['@response'][0]);
    expect(response.headers['Content-Type']).to.equal('application/json');
    expect(response.body).to.equal('true');

  });

  it('Should support POST with streaming with _stream set', async () => {

    let res = await this.post('/stream/basic/', {alpha: 'hello', _stream: true});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type'].split(';')[0]).to.equal('text/event-stream');
    expect(res.body).to.exist;

    let events = res.events;
    expect(events).to.exist;
    expect(events['hello']).to.exist;
    expect(events['hello'][0]).to.equal('true');
    expect(events['@response']).to.exist;

    let response = JSON.parse(events['@response'][0]);
    expect(response.headers['Content-Type']).to.equal('application/json');
    expect(response.body).to.equal('true');

  });

  it('Should support POST with streaming (buffer) with _stream set', async () => {

    let res = await this.post('/stream/basic_buffer/', {alpha: 'hello', _stream: true});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type'].split(';')[0]).to.equal('text/event-stream');
    expect(res.body).to.exist;

    let events = res.events;
    expect(events).to.exist;
    expect(events['hello']).to.exist;
    expect(events['@response']).to.exist;

    let stream = JSON.parse(events['hello'][0]);
    expect(stream).to.be.an.object;
    expect(stream).to.haveOwnProperty('_base64');
    expect(stream._base64).to.equal(Buffer.from('123').toString('base64'));

    let response = JSON.parse(events['@response'][0]);
    expect(response.headers['Content-Type']).to.equal('application/json');
    expect(response.body).to.equal('true');

  });

  it('Should support POST with streaming (mocked buffer) with _stream set', async () => {

    let res = await this.post('/stream/basic_buffer_mocked/', {alpha: 'hello', _stream: true});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type'].split(';')[0]).to.equal('text/event-stream');
    expect(res.body).to.exist;

    let events = res.events;
    expect(events).to.exist;
    expect(events['hello']).to.exist;
    expect(events['@response']).to.exist;

    let stream = JSON.parse(events['hello'][0]);
    expect(stream).to.be.an.object;
    expect(stream).to.haveOwnProperty('_base64');
    expect(stream._base64).to.equal(Buffer.from('123').toString('base64'));

    let response = JSON.parse(events['@response'][0]);
    expect(response.headers['Content-Type']).to.equal('application/json');
    expect(response.body).to.equal('true');

  });

  it('Should support POST with streaming (nested buffer) with _stream set', async () => {

    let res = await this.post('/stream/basic_buffer_nested/', {alpha: 'hello', _stream: true});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type'].split(';')[0]).to.equal('text/event-stream');
    expect(res.body).to.exist;

    let events = res.events;
    expect(events).to.exist;
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

  });

  it('Should support POST with streaming (nested mocked buffer) with _stream set', async () => {

    let res = await this.post('/stream/basic_buffer_nested_mocked/', {alpha: 'hello', _stream: true});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type'].split(';')[0]).to.equal('text/event-stream');
    expect(res.body).to.exist;

    let events = res.events;
    expect(events).to.exist;
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

  });

  it('Should error POST with invalid stream name in execution with _stream set', async () => {

    let res = await this.post('/stream/invalid_stream_name/', {alpha: 'hello', _stream: true});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type'].split(';')[0]).to.equal('text/event-stream');
    expect(res.body).to.exist;

    let events = res.events;
    expect(events).to.exist;
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

  });

  it('Should quietly fail if invalid stream name in execution without _stream set', async () => {

    let res = await this.post('/stream/invalid_stream_name/', {alpha: 'hello'});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json).to.equal(true);

  });

  it('Should stream error POST with invalid stream value in execution with _stream set', async () => {

    let res = await this.post('/stream/invalid_stream_param/', {alpha: 'hello', _stream: true});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type'].split(';')[0]).to.equal('text/event-stream');
    expect(res.body).to.exist;

    let events = res.events;
    expect(events).to.exist;
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

  });

  it('Should support POST with streaming and stream components between sleep() calls with _stream set', async () => {

    let res = await this.post('/stream/sleep/', {alpha: 'hello', _stream: true});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type'].split(';')[0]).to.equal('text/event-stream');
    expect(res.body).to.exist;

    let events = res.events;
    expect(events).to.exist;
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

  });

  it('Should POST normally with streaming and stream components between sleep() calls without _stream set', async () => {

    let res = await this.post('/stream/sleep/', {alpha: 'hello'});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json).to.equal(true);

  });

  it('Should support POST with streaming without _debug set', async () => {

    let res = await this.post('/stream/debug/', {alpha: 'hello', _stream: true});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type'].split(';')[0]).to.equal('text/event-stream');
    expect(res.body).to.exist;

    let events = res.events;
    expect(events).to.exist;
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

  });

  it('Should support POST with streaming with _debug set without _stream set', async () => {

    let res = await this.post('/stream/debug/', {alpha: 'hello', _debug: true});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type'].split(';')[0]).to.equal('text/event-stream');
    expect(res.headers['x-debug']).to.equal('true');
    expect(res.body).to.exist;

    let events = res.events;
    expect(events).to.exist;
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

  });

  it('Should support POST with streaming with _debug set to valid channels without _stream set', async () => {

    let res = await this.post('/stream/debug/', {alpha: 'hello', _debug: {'*': true, '@begin': true, '@stdout': true, '@stderr': true, '@error': true}});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type'].split(';')[0]).to.equal('text/event-stream');
    expect(res.headers['x-debug']).to.equal('true');
    expect(res.body).to.exist;

    let events = res.events;
    expect(events).to.exist;
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

  });

  it('Streaming endpoints should succeed if contains a valid stream in _debug', async () => {

    let res = await this.post('/stream/basic/', {alpha: 'hello', _stream: {}, _debug: {hello: true}});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type'].split(';')[0]).to.equal('text/event-stream');
    expect(res.headers['x-debug']).to.equal('true');
    expect(res.body).to.exist;

    let events = res.events;
    expect(events).to.exist;
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

  });

  it('Streaming endpoints should fail if contains an invalid stream in _debug', async () => {

    let res = await this.post('/stream/basic/', {alpha: 'hello', _stream: {}, _debug: {test: true}});

    expect(res.statusCode).to.equal(403);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.headers['x-debug']).to.equal('true');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('DebugError');
    expect(res.json.error.message).to.contain('"test"');

  });

  it('Streaming endpoints should fail with StreamError if contains an invalid stream when _debug', async () => {

    let res = await this.post('/stream/basic/', {alpha: 'hello', _stream: {test: true}, _debug: true});

    expect(res.statusCode).to.equal(400);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.headers['x-debug']).to.equal('true');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('StreamListenerError');
    expect(res.json.error.details).to.haveOwnProperty('test');

  });

  it('Should support POST with streaming with _debug to a function with no stream', async () => {

    let res = await this.post('/stream/debug_no_stream/', {alpha: 'hello', _debug: true});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type'].split(';')[0]).to.equal('text/event-stream');
    expect(res.headers['x-debug']).to.equal('true');
    expect(res.body).to.exist;

    let events = res.events;
    expect(events).to.exist;
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

  });

  it('Endpoint without stream should fail with ExecutionModeError if _debug set and _stream set', async () => {

    let res = await this.post('/stream/debug_no_stream/', {alpha: 'hello', _stream: {test: true}, _debug: true});

    expect(res.statusCode).to.equal(403);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.headers['x-debug']).to.equal('true');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('ExecutionModeError');
    expect(res.json.error.message).to.contain('"stream"');

  });

  it('Endpoint without stream should fail with ExecutionModeError if _debug not set and _stream set', async () => {

    let res = await this.post('/stream/debug_no_stream/', {alpha: 'hello', _stream: {test: true}});

    expect(res.statusCode).to.equal(403);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('ExecutionModeError');
    expect(res.json.error.message).to.contain('"stream"');

  });

  it('Endpoint without stream should fail with DebugError if _debug set to an invalid listener', async () => {

    let res = await this.post('/stream/debug_no_stream/', {alpha: 'hello', _debug: {test: true}});

    expect(res.statusCode).to.equal(403);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.headers['x-debug']).to.equal('true');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('DebugError');
    expect(res.json.error.message).to.contain('"test"');

  });

  it('Endpoint without stream should fail with DebugError if _debug set and _background set', async () => {

    let res = await this.post('/stream/debug_no_stream/', {alpha: 'hello', _debug: true, _background: true});

    expect(res.statusCode).to.equal(403);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.headers['x-debug']).to.equal('true');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('DebugError');
    expect(res.json.error.message).to.equal('Can not debug with "background" mode set');

  });

  it('Endpoint triggered with request origin "autocode.com" should not work', async () => {
    
    let res = await this.post('/origin/allow/', {alpha: 'hello'}, {'origin': 'autocode.com'});

    expect(res.statusCode).to.equal(403);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.headers['access-control-allow-origin']).to.equal('!');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('OriginError');
    expect(res.json.error.message).to.contain(`"autocode.com"`)

  });

  it('Endpoint triggered with request origin "https://sub.autocode.com" should not work', async () => {
    
    let res = await this.post('/origin/allow/', {alpha: 'hello'}, {'origin': 'https://sub.autocode.com'});

    expect(res.statusCode).to.equal(403);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.headers['access-control-allow-origin']).to.equal('!');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('OriginError');
    expect(res.json.error.message).to.contain(`"https://sub.autocode.com"`)

  });

  it('Endpoint triggered with request origin "http://autocode.com" should work', async () => {
    
    let res = await this.post('/origin/allow/', {alpha: 'hello'}, {'origin': 'http://autocode.com'});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.headers['access-control-allow-origin']).to.equal('http://autocode.com');
    expect(res.json).to.exist;

  });

  it('Endpoint triggered with request origin "https://autocode.com" should work', async () => {
    
    let res = await this.post('/origin/allow/', {alpha: 'hello'}, {'origin': 'https://autocode.com'});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.headers['access-control-allow-origin']).to.equal('https://autocode.com');
    expect(res.json).to.exist;

  });

  it('Endpoint triggered with request origin "localhost:8000" should not work', async () => {
    
    let res = await this.post('/origin/allow/', {alpha: 'hello'}, {'origin': 'localhost:8000'});

    expect(res.statusCode).to.equal(403);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.headers['access-control-allow-origin']).to.equal('!');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('OriginError');
    expect(res.json.error.message).to.contain(`"localhost:8000"`)

  });

  it('Endpoint triggered with request origin "http://localhost:8000" should work', async () => {
    
    let res = await this.post('/origin/allow/', {alpha: 'hello'}, {'origin': 'http://localhost:8000'});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.headers['access-control-allow-origin']).to.equal('http://localhost:8000');
    expect(res.json).to.exist;

  });

  it('Endpoint triggered with request origin "https://localhost:8000" should work', async () => {
    
    let res = await this.post('/origin/allow/', {alpha: 'hello'}, {'origin': 'https://localhost:8000'});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.headers['access-control-allow-origin']).to.equal('https://localhost:8000');
    expect(res.json).to.exist;

  });

  it('Endpoint triggered with request origin "test.some-url.com:9999" should not work', async () => {
    
    let res = await this.post('/origin/allow/', {alpha: 'hello'}, {'origin': 'test.some-url.com:9999'});

    expect(res.statusCode).to.equal(403);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.headers['access-control-allow-origin']).to.equal('!');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('OriginError');
    expect(res.json.error.message).to.contain(`"test.some-url.com:9999"`)

  });

  it('Endpoint triggered with request origin "http://test.some-url.com:9999" should work', async () => {
    
    let res = await this.post('/origin/allow/', {alpha: 'hello'}, {'origin': 'http://test.some-url.com:9999'});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.headers['access-control-allow-origin']).to.equal('http://test.some-url.com:9999');
    expect(res.json).to.exist;

  });

  it('Endpoint triggered with request origin "https://test.some-url.com:9999" should work', async () => {
    
    let res = await this.post('/origin/allow/', {alpha: 'hello'}, {'origin': 'https://test.some-url.com:9999'});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.headers['access-control-allow-origin']).to.equal('https://test.some-url.com:9999');
    expect(res.json).to.exist;

  });

  it('Endpoint triggered with request origin "http://hello.com" should not work', async () => {
    
    let res = await this.post('/origin/allow/', {alpha: 'hello'}, {'origin': 'http://hello.com'});

    expect(res.statusCode).to.equal(403);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.headers['access-control-allow-origin']).to.equal('!');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('OriginError');
    expect(res.json.error.message).to.contain(`"http://hello.com"`)

  });

  it('Endpoint triggered with request origin "http://instant.dev" should work', async () => {
    
    let res = await this.post('/origin/allow/', {alpha: 'hello'}, {'origin': 'http://instant.dev'});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.headers['access-control-allow-origin']).to.equal('http://instant.dev');
    expect(res.json).to.exist;

  });

  it('Endpoint triggered with request origin "http://hello.com" should not work with _stream', async () => {
    
    let res = await this.post('/origin/allow/', {alpha: 'hello', _stream: true}, {'origin': 'http://hello.com'});

    expect(res.statusCode).to.equal(403);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.headers['access-control-allow-origin']).to.equal('!');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('OriginError');
    expect(res.json.error.message).to.contain(`"http://hello.com"`)

  });

  it('Endpoint triggered with request origin "http://hello.com" should not work with _debug', async () => {
    
    let res = await this.post('/origin/allow/', {alpha: 'hello', _debug: true}, {'origin': 'http://hello.com'});

    expect(res.statusCode).to.equal(403);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.headers['access-control-allow-origin']).to.equal('!');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('OriginError');
    expect(res.json.error.message).to.contain(`"http://hello.com"`)

  });

  it('Endpoint triggered with request origin "http://hello.com" should not work with _background', async () => {
    
    let res = await this.post('/origin/allow/', {alpha: 'hello', _background: true}, {'origin': 'http://hello.com'});

    expect(res.statusCode).to.equal(403);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.headers['access-control-allow-origin']).to.equal('!');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.type).to.equal('OriginError');
    expect(res.json.error.message).to.contain(`"http://hello.com"`)

  });

  it('Endpoint triggered with request origin "https://hello.com" should work', async () => {
    
    let res = await this.post('/origin/allow/', {alpha: 'hello'}, {'origin': 'https://hello.com'});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.headers['access-control-allow-origin']).to.equal('https://hello.com');
    expect(res.json).to.exist;

  });

  it('Endpoint triggered with request origin "https://hello.com" should work with _stream', async () => {
    
    let res = await this.post('/origin/allow/', {alpha: 'hello', _stream: true}, {'origin': 'https://hello.com'});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type'].split(';')[0]).to.equal('text/event-stream');
    expect(res.headers['access-control-allow-origin']).to.equal('https://hello.com');
    expect(res.body).to.exist;

  });

  it('Endpoint triggered with request origin "https://hello.com" should work with _debug', async () => {
    
    let res = await this.post('/origin/allow/', {alpha: 'hello', _debug: true}, {'origin': 'https://hello.com'});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type'].split(';')[0]).to.equal('text/event-stream');
    expect(res.headers['access-control-allow-origin']).to.equal('https://hello.com');
    expect(res.body).to.exist;

  });

  it('Endpoint triggered with request origin "https://hello.com" should work with _background', async () => {
    
    let res = await this.post('/origin/allow/', {alpha: 'hello', _background: true}, {'origin': 'https://hello.com'});

    expect(res.statusCode).to.equal(202);
    expect(res.headers['content-type']).to.equal('text/plain');
    expect(res.headers['access-control-allow-origin']).to.equal('https://hello.com');
    expect(res.body).to.exist;

  });

  it('Should return a valid /.well-known/ai-plugin.json', async () => {

    let res = await this.get('/.well-known/ai-plugin.json', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.exist;
    expect(res.json.schema_version).to.equal('v1');
    expect(res.json.name_for_human).to.equal('(No name provided)');
    expect(res.json.name_for_model).to.equal('No_name_provided');
    expect(res.json.description_for_human).to.equal('(No description provided)');
    expect(res.json.description_for_model).to.equal('(No description provided)');
    expect(res.json.api).to.exist;
    expect(res.json.api.type).to.equal('openapi');
    expect(res.json.api.url).to.equal('localhost/.well-known/openapi.yaml');

  });

  it('Should return a valid /.well-known/openapi.json', async () => {

    let res = await this.get('/.well-known/openapi.json', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.json).to.exist;
    expect(res.json.openapi).to.equal('3.1.0');
    expect(res.json.info).to.exist;
    expect(res.json.info.version).to.equal('development');
    expect(res.json.info.title).to.equal('(No name provided)');
    expect(res.json.info.description).to.equal('(No description provided)');
    expect(res.json.servers).to.be.an('Array');
    expect(res.json.servers[0]).to.exist;
    expect(res.json.servers[0].url).to.equal('localhost');
    expect(res.json.servers[0].description).to.equal('Instant API Gateway');
    expect(res.json.paths).to.be.an('Object');
    expect(res.json.paths['/my_function/']).to.exist;
    expect(res.json.paths['/my_function/'].post).to.exist;
    expect(res.json.paths['/my_function/'].post.description).to.equal('My function');
    expect(res.json.paths['/my_function/'].post.operationId).to.equal('service_localhost_my_function_post');
    expect(res.json.paths['/my_function/'].post.requestBody).to.exist;
    expect(res.json.paths['/my_function/'].post.requestBody.content).to.exist;
    expect(res.json.paths['/my_function/'].post.requestBody.content['application/json']).to.exist;
    expect(res.json.paths['/my_function/'].post.requestBody.content['application/json']).to.deep.equal({
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
    expect(res.json.paths['/my_function/'].post.responses).to.exist;
    expect(res.json.paths['/my_function/'].post.responses['200']).to.exist;
    expect(res.json.paths['/my_function/'].post.responses['200'].content).to.exist;
    expect(res.json.paths['/my_function/'].post.responses['200'].content['application/json']).to.exist;
    expect(res.json.paths['/my_function/'].post.responses['200'].content['application/json']).to.deep.equal({
        "schema": {
          "type": "number"
        }
      });
    expect(res.json.paths['/a_standard_function/']).to.exist;
    expect(res.json.paths['/my_function_private/']).to.not.exist;
    expect(res.json.paths['/reflect/']).to.exist;
    expect(res.json.paths['/my_esm_function/']).to.exist;
    expect(res.json.paths['/my_esm_function/'].get).to.exist;
    expect(res.json.paths['/my_esm_function/'].get.parameters).to.exist;
    expect(res.json.paths['/my_esm_function/'].get.requestBody).to.not.exist;
    expect(res.json.paths['/my_esm_function/'].post).to.exist;
    expect(res.json.paths['/my_esm_function/'].post.parameters).to.not.exist;
    expect(res.json.paths['/my_esm_function/'].post.requestBody).to.exist;
    expect(res.json.paths['/my_esm_function/'].put).to.exist;
    expect(res.json.paths['/my_esm_function/'].put.parameters).to.not.exist;
    expect(res.json.paths['/my_esm_function/'].put.requestBody).to.exist;
    expect(res.json.paths['/my_esm_function/'].delete).to.exist;
    expect(res.json.paths['/my_esm_function/'].delete.parameters).to.exist;
    expect(res.json.paths['/my_esm_function/'].delete.requestBody).to.not.exist;

  });

  it('Should return a valid /.well-known/openapi.yaml', async () => {

    let res = await this.get('/.well-known/openapi.yaml', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/yaml');
    let yaml = res.body.toString();
    expect(yaml.startsWith('openapi: "3.1.0"')).to.equal(true);

  });

  it('Should return a valid /.well-known/schema.json', async () => {

    let res = await this.get('/.well-known/schema.json', '');

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json).to.exist;
    expect(res.json.functions).to.exist;
    expect(res.json.functions.length).to.be.greaterThan(1);
    expect(res.json.functions.find(fn => fn.name === 'my_function')).to.exist;
    expect(res.json.functions.find(fn => fn.endpoint_name === 'my_function')).to.exist;
    expect(res.json.functions.find(fn => fn.name === 'my_function_private')).to.not.exist;
    expect(res.json.functions.find(fn => fn.name === 'my_esm_function')).to.not.exist;
    expect(res.json.functions.find(fn => fn.name === 'my_esm_function_get')).to.exist;
    expect(res.json.functions.find(fn => fn.name === 'my_esm_function_delete')).to.exist;
    expect(res.json.functions.find(fn => fn.name === 'my_esm_function_put')).to.exist;
    expect(res.json.functions.find(fn => fn.name === 'my_esm_function_post')).to.exist;
    expect(res.json.functions.find(fn => fn.endpoint_name === 'my_esm_function')).to.not.exist;
    expect(res.json.functions.find(fn => fn.endpoint_name === 'my_esm_function#GET')).to.exist;
    expect(res.json.functions.find(fn => fn.endpoint_name === 'my_esm_function#DELETE')).to.exist;
    expect(res.json.functions.find(fn => fn.endpoint_name === 'my_esm_function#PUT')).to.exist;
    expect(res.json.functions.find(fn => fn.endpoint_name === 'my_esm_function#POST')).to.exist;
    expect(res.json.functions.find(fn => fn.name === 'my_esm_function_default')).to.exist;
    expect(res.json.functions.find(fn => fn.endpoint_name === 'my_esm_function_default')).to.exist;
    expect(res.json.functions.find(fn => fn.name === '_')).to.exist;
    expect(res.json.functions.find(fn => fn.endpoint_name === '')).to.exist;
    expect(res.json.functions.find(fn => fn.name === 'test-notfound')).to.exist;
    expect(res.json.functions.find(fn => fn.endpoint_name === 'test:notfound')).to.exist;

  });

  it('Should error when you try to retrieve a platform scope', async () => {

    let res = await this.post('/context/basic/', {});

    expect(res.statusCode).to.equal(403);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.message).to.contain('This function does not have access to platform keys.');

  });

  it('Should error when you try to retrieve a specific key for "hello"', async () => {

    process.env.__PLATFORM_KEYS = JSON.stringify({global: {enabled: true}});

    let res = await this.post('/context/basic/', {});

    expect(res.statusCode).to.equal(403);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.message).to.contain('This function only works when called from "hello".');

  });

  it('Should error when you try to retrieve a specific key for "hello", when enabled is false', async () => {

    process.env.__PLATFORM_KEYS = JSON.stringify({global: {enabled: true}, hello: {enabled: false}});

    let res = await this.post('/context/basic/', {});

    expect(res.statusCode).to.equal(403);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.message).to.contain('This function only works when called from "hello".');

  });

  it('Should error when you try to retrieve a specific key for "hello", when enabled is true but key is missing', async () => {

    process.env.__PLATFORM_KEYS = JSON.stringify({global: {enabled: true}, hello: {enabled: true}});

    let res = await this.post('/context/basic/', {});

    expect(res.statusCode).to.equal(403);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.message).to.contain('This function requires the platform key "hello"."cool" which is missing.');

  });

  it('Should succeed with null when you try to retrieve a specific key for "hello", when enabled is true and key is present', async () => {

    process.env.__PLATFORM_KEYS = JSON.stringify({global: {enabled: true}, hello: {enabled: true, cool: 'beans'}});

    let res = await this.post('/context/basic/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json).to.exist;
    expect(res.json.key).to.equal('beans');

  });

  it('Should succeed with "beans" when you try to retrieve "cool" key for "hello", when set', async () => {

    process.env.__PLATFORM_KEYS = JSON.stringify({global: {enabled: true}, hello: {enabled: true, cool: 'beans'}});

    let res = await this.post('/context/basic/', {});

    expect(res.statusCode).to.equal(200);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json).to.exist;
    expect(res.json.key).to.equal('beans');

  });

  it('Should error again when you try to retrieve a platform key, when env variables not set', async () => {

    delete process.env.__PLATFORM_KEYS;

    let res = await this.post('/context/basic/', {});

    expect(res.statusCode).to.equal(403);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.message).to.contain('This function does not have access to platform keys.');

  });

  it('Should error when you try to retrieve a keychain key that has not been requested', async () => {

    let res = await this.post('/context/keychain/', {});

    expect(res.statusCode).to.equal(400);
    expect(res.headers['content-type']).to.equal('application/json');
    expect(res.json).to.exist;
    expect(res.json.error).to.exist;
    expect(res.json.error.message).to.contain('This function is attempting to read the keychain key "hello" which it has not requested permission to access.');

  });

  after(() => FaaSGateway.close());

};
