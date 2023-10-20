import chai from 'chai';
const expect = chai.expect;

import { ROOT, PORT, InstantAPI } from '../../helpers.mjs';

export default async function (setupResult) {

  const { Gateway, FunctionParser } = InstantAPI;
  const parser = new FunctionParser();

  const FaaSGateway = new Gateway({
    debug: false,
    root: ROOT,
    defaultTimeout: 1000
  });

  before(() => {
    const preloadFiles = {
      'functions/sample_preload.js': Buffer.from(`module.exports = async () => { return true; };`)
    };
    FaaSGateway.load(ROOT, preloadFiles);
    FaaSGateway.listen(PORT);
  });

  describe('Gateway (ESM)', async () => {
    
    it('Should successfully execute a default-exported ESM function with GET', async () => {

      let res = await this.get('/esm/default/', 'str=ABC%20&repeat=10');
      
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.json).to.equal('ABC '.repeat(10));

    });

    it('Should successfully execute a default-exported ESM function with DELETE', async () => {
      
      let res = await this.del('/esm/default/', 'str=ABC%20&repeat=10');

      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.json).to.equal('ABC '.repeat(10));

    });

    it('Should fail to execute a DELETE-exported ESM function with DELETE when body provided', async () => {
      
      let res = await this.request('DELETE', '/esm/default/', {str: 'ABC ', repeat: 10});

      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.json.error.message).to.contain('SHOULD NOT generate content in a DELETE request');

    });

    it('Should successfully execute a default-exported ESM function with POST', async () => {
      
      let res = await this.post('/esm/default/', {str: 'ABC ', repeat: 10});

      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.json).to.equal('ABC '.repeat(10));

    });

    it('Should successfully execute a default-exported ESM function with PUT', async () => {
      
      let res = await this.put('/esm/default/', {str: 'ABC ', repeat: 10});

      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.json).to.equal('ABC '.repeat(10));

    });

    it('Should successfully execute a GET-exported ESM function with GET', async () => {
      
      let res = await this.get('/esm/named/', 'str=ABC%20&repeat=10');

      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.json).to.equal('ABC '.repeat(10));

    });

    it('Should successfully execute a GET-exported ESM function with GET (? in path)', async () => {
      
      let res = await this.get('/esm/named/?', 'str=ABC%20&repeat=10');

      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.json).to.equal('ABC '.repeat(10));

    });

    it('Should successfully execute a GET-exported ESM function with GET (? in params)', async () => {
      
      let res = await this.get('/esm/named/', '?str=ABC%20&repeat=10');

      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.json).to.equal('ABC '.repeat(10));

    });

    it('Should successfully execute a GET-exported ESM function with GET (? in path and params)', async () => {
      
      let res = await this.get('/esm/named/?', '?str=ABC%20&repeat=10');

      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.json).to.equal('ABC '.repeat(10));

    });

    it('Should successfully execute a GET-exported ESM function with GET (params split between path and params)', async () => {
      
      let res = await this.get('/esm/named/?str=ABC%20', 'repeat=10');

      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.json).to.equal('ABC '.repeat(10));

    });

    it('Should successfully execute a DELETE-exported ESM function with DELETE', async () => {
      
      let res = await this.del('/esm/named/', 'str=ABC%20&repeat=10');

      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.json).to.equal(' CBA');

    });

    it('Should successfully execute a POST-exported ESM function with POST', async () => {
      
      let res = await this.post('/esm/named/', {str: 'ABC ', repeat: 10});

      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.json).to.equal(' CBA'.repeat(10));

    });

    it('Should successfully execute a PUT-exported ESM function with PUT', async () => {
      
      let res = await this.put('/esm/named/', {str: 'ABC ', repeat: 10});

      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.json).to.equal('ABC ');

    });

    it('Should successfully execute an ESM function missing methods if the method exists', async () => {
      
      let res = await this.post('/esm/missing_method/', {str: 'ABC ', repeat: 10});

      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(res.json).to.equal(' CBA'.repeat(10));

    });

    it('Should fail to execute an ESM function missing methods if the method does not exist', async () => {
      
      let res = await this.put('/esm/missing_method/', {str: 'ABC ', repeat: 10});

      expect(res.statusCode).to.equal(501);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

    });

    it('Should respect ESM-defined schema and fail if key not provided', async () => {
      
      let res = await this.post('/esm/nested/', {alpha: 'hello', beta: {}, gamma: [1, 2]});

      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(res.json.error).to.exist;
      expect(res.json.error.details).to.exist;
      expect(res.json.error.details.beta).to.exist;
      expect(res.json.error.details.beta.mismatch).to.equal('beta.num');

    });

    it('Should respect ESM-defined schema and fail if key invalid', async () => {
      
      let res = await this.post('/esm/nested/', {alpha: 'hello', beta: {num: 'xx'}, gamma: [1, 2]});

      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(res.json.error).to.exist;
      expect(res.json.error.details).to.exist;
      expect(res.json.error.details.beta).to.exist;
      expect(res.json.error.details.beta.mismatch).to.equal('beta.num');

    });

    it('Should respect ESM-defined schema and fail if nested key invalid', async () => {
      
      let res = await this.post('/esm/nested/', {alpha: 'hello', beta: {num: 10, obj: {num: 'xx'}}, gamma: [1, 2]});

      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(res.json.error).to.exist;
      expect(res.json.error.details).to.exist;
      expect(res.json.error.details.beta).to.exist;
      expect(res.json.error.details.beta.mismatch).to.equal('beta.obj.num');

    });

    it('Should respect ESM-defined schema and succed if everything passed properly', async () => {
      
      let res = await this.post('/esm/nested/', {alpha: 'hello', beta: {num: 10, obj: {num: 99, str: 'lol'}}, gamma: [1, 2]});

      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(res.json).to.exist;
      expect(res.json).to.deep.equal({
        alpha: 'hello',
        beta: {num: 10, obj: {num: 99, str: 'lol'}},
        gamma: [1, 2]
      });

    });

    it('Should respect the type "any" options property', async () => {
      
      let res = await this.post('/esm/any_options/', {value: 1});

      expect(res.statusCode).to.equal(200);
      expect(res.json).to.exist;
      expect(res.json).to.deep.equal(1);

      res = await this.post('/esm/any_options/', {value: "two"});

      expect(res.statusCode).to.equal(200);
      expect(res.json).to.exist;
      expect(res.json).to.deep.equal("two");

      res = await this.post('/esm/any_options/', {value: ["three", "four"]});

      expect(res.statusCode).to.equal(200);
      expect(res.json).to.exist;
      expect(res.json).to.deep.equal(["three", "four"]);

    });

    it('Should respect the type "any" options property with invalid param', async () => {
      
      let res = await this.post('/esm/any_options/', {value: 2});

      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(res.json.error).to.exist;
      expect(res.json.error.details).to.exist;
      expect(res.json.error.details.value).to.exist

    });

    it('Should respect the type "boolean|string" options with a boolean', async () => {
      
      let res = await this.post('/esm/alternate_types/', {value: true});

      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(res.json).to.exist;
      expect(res.json.value).to.equal(true)

    });

    it('Should respect the type "boolean|string" options with a string', async () => {
      
      let res = await this.post('/esm/alternate_types/', {value: 'true'});

      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(res.json).to.exist;
      expect(res.json.value).to.equal('true');

    });

    it('Should reject the type "boolean|string" options with an integer', async () => {
      
      let res = await this.post('/esm/alternate_types/', {value: 1});

      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(res.json.error).to.exist;
      expect(res.json.error.details).to.exist;
      expect(res.json.error.details.value).to.exist

    });

    it('Should sanitize the type "boolean|string" to a string', async () => {
      
      let res = await this.post('/esm/alternate_types/?value=lol', '');

      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(res.json).to.exist;
      expect(res.json.value).to.equal('lol');

    });

    it('Should sanitize the type "boolean|string" to a boolean', async () => {
      
      let res = await this.post('/esm/alternate_types/?value=true', '');

      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(res.json).to.exist;
      expect(res.json.value).to.equal(true);

    });

    it('Should sanitize the type "boolean|string" to a boolean (t)', async () => {
      
      let res = await this.post('/esm/alternate_types/?value=t', '');

      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(res.json).to.exist;
      expect(res.json.value).to.equal(true)

    });

    it('Should accept a string with size restriction between 2 and 5 with length', async () => {
      
      let res = await this.post('/esm/sizes/', {mystr: 'lol'});

      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(res.json).to.exist;
      expect(res.json.mystr).to.equal('lol')

    });

    it('Should reject a string with size restriction between 2 and 5 with length 1', async () => {
      
      let res = await this.post('/esm/sizes/', {mystr: 'l'});

      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(res.json.error).to.exist;
      expect(res.json.error.details['mystr'].message).to.contain('greater than or equal to 2')

    });

    it('Should reject a string with size restriction between 2 and 5 with length 6', async () => {
      
      let res = await this.post('/esm/sizes/', {mystr: 'lolwat'});

      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(res.json.error).to.exist;
      expect(res.json.error.details['mystr'].message).to.contain('less than or equal to 5')

    });

    it('Should reject an integer with invalid entry in range restriction {1,}', async () => {
      
      let res = await this.post('/esm/left_range/', {myval: 0});

      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(res.json.error).to.exist;
      expect(res.json.error.details['myval'].message).to.contain('greater than or equal to 1')

    });

    it('Should accept an integer with valid entry in range restriction {1,}', async () => {
      
      let res = await this.post('/esm/left_range/', {myval: 1});

      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(res.json).to.exist;
      expect(res.json).to.deep.equal({myval: 1})

    });

    it('Should reject an integer with invalid entry in range restriction {,1}', async () => {
      
      let res = await this.post('/esm/right_range/', {myval: 2});

      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(res.json.error).to.exist;
      expect(res.json.error.details['myval'].message).to.contain('less than or equal to 1')

    });

    it('Should accept an integer with valid entry in range restriction {,1}', async () => {
      
      let res = await this.post('/esm/right_range/', {myval: 1});

      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(res.json).to.exist;
      expect(res.json).to.deep.equal({myval: 1})

    });

  });

  after(() => FaaSGateway.close());

};
