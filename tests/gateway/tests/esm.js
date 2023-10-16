module.exports = (expect, FaaSGateway, parser, parseServerSentEvents, request) => {

  it('Should successfully execute a default-exported ESM function with GET', done => {
    
    request('GET', {}, '/esm/default/?str=ABC%20&repeat=10', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.equal('ABC '.repeat(10));

      done();

    });

  });

  it('Should successfully execute a default-exported ESM function with DELETE', done => {
    
    request('DELETE', {}, '/esm/default/?str=ABC%20&repeat=10', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.equal('ABC '.repeat(10));

      done();

    });

  });

  it('Should fail to execute a DELETE-exported ESM function with DELETE when body provided', done => {
    
    request('DELETE', {}, '/esm/default/', {str: 'ABC ', repeat: 10}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result.error.message).to.contain('SHOULD NOT generate content in a DELETE request');

      done();

    });

  });

  it('Should successfully execute a default-exported ESM function with POST', done => {
    
    request('POST', {}, '/esm/default/', {str: 'ABC ', repeat: 10}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.equal('ABC '.repeat(10));

      done();

    });

  });

  it('Should successfully execute a default-exported ESM function with PUT', done => {
    
    request('PUT', {}, '/esm/default/', {str: 'ABC ', repeat: 10}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.equal('ABC '.repeat(10));

      done();

    });

  });

  it('Should successfully execute a GET-exported ESM function with GET', done => {
    
    request('GET', {}, '/esm/named/?str=ABC%20&repeat=10', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.equal('ABC '.repeat(10));

      done();

    });

  });

  it('Should successfully execute a DELETE-exported ESM function with DELETE', done => {
    
    request('DELETE', {}, '/esm/named/?str=ABC%20&repeat=10', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.equal(' CBA');

      done();

    });

  });

  it('Should successfully execute a POST-exported ESM function with POST', done => {
    
    request('POST', {}, '/esm/named/', {str: 'ABC ', repeat: 10}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.equal(' CBA'.repeat(10));

      done();

    });

  });

  it('Should successfully execute a PUT-exported ESM function with PUT', done => {
    
    request('PUT', {}, '/esm/named/', {str: 'ABC ', repeat: 10}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.equal('ABC ');

      done();

    });

  });

  it('Should successfully execute an ESM function missing methods if the method exists', done => {
    
    request('POST', {}, '/esm/missing_method/', {str: 'ABC ', repeat: 10}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.equal(' CBA'.repeat(10));

      done();

    });

  });

  it('Should fail to execute an ESM function missing methods if the method does not exist', done => {
    
    request('PUT', {}, '/esm/missing_method/', {str: 'ABC ', repeat: 10}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(501);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      done();

    });

  });

  it('Should respect ESM-defined schema and fail if key not provided', done => {
    
    request('POST', {}, '/esm/nested/', {alpha: 'hello', beta: {}, gamma: [1, 2]}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(result.error).to.exist;
      expect(result.error.details).to.exist;
      expect(result.error.details.beta).to.exist;
      expect(result.error.details.beta.mismatch).to.equal('beta.num');

      done();

    });

  });

  it('Should respect ESM-defined schema and fail if key invalid', done => {
    
    request('POST', {}, '/esm/nested/', {alpha: 'hello', beta: {num: 'xx'}, gamma: [1, 2]}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(result.error).to.exist;
      expect(result.error.details).to.exist;
      expect(result.error.details.beta).to.exist;
      expect(result.error.details.beta.mismatch).to.equal('beta.num');

      done();

    });

  });

  it('Should respect ESM-defined schema and fail if nested key invalid', done => {
    
    request('POST', {}, '/esm/nested/', {alpha: 'hello', beta: {num: 10, obj: {num: 'xx'}}, gamma: [1, 2]}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(result.error).to.exist;
      expect(result.error.details).to.exist;
      expect(result.error.details.beta).to.exist;
      expect(result.error.details.beta.mismatch).to.equal('beta.obj.num');

      done();

    });

  });

  it('Should respect ESM-defined schema and succed if everything passed properly', done => {
    
    request('POST', {}, '/esm/nested/', {alpha: 'hello', beta: {num: 10, obj: {num: 99, str: 'lol'}}, gamma: [1, 2]}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(result).to.exist;
      expect(result).to.deep.equal({
        alpha: 'hello',
        beta: {num: 10, obj: {num: 99, str: 'lol'}},
        gamma: [1, 2]
      });

      done();

    });

  });

  it('Should respect the type "any" options property', done => {
    
    request('POST', {}, '/esm/any_options/', {value: 1}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(result).to.exist;
      expect(result).to.deep.equal(1);

      request('POST', {}, '/esm/any_options/', {value: "two"}, (err, res, result) => {

        expect(err).to.not.exist;
        expect(res.statusCode).to.equal(200);
        expect(result).to.exist;
        expect(result).to.deep.equal("two");

        request('POST', {}, '/esm/any_options/', {value: ["three", "four"]}, (err, res, result) => {

          expect(err).to.not.exist;
          expect(res.statusCode).to.equal(200);
          expect(result).to.exist;
          expect(result).to.deep.equal(["three", "four"]);

          done();

        });

      });

    });

  });

  it('Should respect the type "any" options property with invalid param', done => {
    
    request('POST', {}, '/esm/any_options/', {value: 2}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(result.error).to.exist;
      expect(result.error.details).to.exist;
      expect(result.error.details.value).to.exist;
      done();

    });

  });

  it('Should respect the type "boolean|string" options with a boolean', done => {
    
    request('POST', {}, '/esm/alternate_types/', {value: true}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(result).to.exist;
      expect(result.value).to.equal(true);
      done();

    });

  });

  it('Should respect the type "boolean|string" options with a string', done => {
    
    request('POST', {}, '/esm/alternate_types/', {value: 'true'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(result).to.exist;
      expect(result.value).to.equal('true');
      done();

    });

  });

  it('Should reject the type "boolean|string" options with an integer', done => {
    
    request('POST', {}, '/esm/alternate_types/', {value: 1}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(result.error).to.exist;
      expect(result.error.details).to.exist;
      expect(result.error.details.value).to.exist;
      done();

    });

  });

  it('Should sanitize the type "boolean|string" to a string', done => {
    
    request('POST', {}, '/esm/alternate_types/?value=lol', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(result).to.exist;
      expect(result.value).to.equal('lol');
      done();

    });

  });

  it('Should sanitize the type "boolean|string" to a boolean', done => {
    
    request('POST', {}, '/esm/alternate_types/?value=true', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(result).to.exist;
      expect(result.value).to.equal(true);
      done();

    });

  });

  it('Should sanitize the type "boolean|string" to a boolean (t)', done => {
    
    request('POST', {}, '/esm/alternate_types/?value=t', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(result).to.exist;
      expect(result.value).to.equal(true);
      done();

    });

  });

  it('Should accept a string with size restriction between 2 and 5 with length', done => {
    
    request('POST', {}, '/esm/sizes/', {mystr: 'lol'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(result).to.exist;
      expect(result.mystr).to.equal('lol');
      done();

    });

  });

  it('Should reject a string with size restriction between 2 and 5 with length 1', done => {
    
    request('POST', {}, '/esm/sizes/', {mystr: 'l'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(result.error).to.exist;
      expect(result.error.details['mystr'].message).to.contain('greater than or equal to 2');
      done();

    });

  });

  it('Should reject a string with size restriction between 2 and 5 with length 6', done => {
    
    request('POST', {}, '/esm/sizes/', {mystr: 'lolwat'}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(result.error).to.exist;
      expect(result.error.details['mystr'].message).to.contain('less than or equal to 5');
      done();

    });

  });

  it('Should reject an integer with invalid entry in range restriction {1,}', done => {
    
    request('POST', {}, '/esm/left_range/', {myval: 0}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(result.error).to.exist;
      expect(result.error.details['myval'].message).to.contain('greater than or equal to 1');
      done();

    });

  });

  it('Should accept an integer with valid entry in range restriction {1,}', done => {
    
    request('POST', {}, '/esm/left_range/', {myval: 1}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(result).to.exist;
      expect(result).to.deep.equal({myval: 1});
      done();

    });

  });

  it('Should reject an integer with invalid entry in range restriction {,1}', done => {
    
    request('POST', {}, '/esm/right_range/', {myval: 2}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(400);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(result.error).to.exist;
      expect(result.error.details['myval'].message).to.contain('less than or equal to 1');
      done();

    });

  });

  it('Should accept an integer with valid entry in range restriction {,1}', done => {
    
    request('POST', {}, '/esm/right_range/', {myval: 1}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
      expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');

      expect(result).to.exist;
      expect(result).to.deep.equal({myval: 1});
      done();

    });

  });

};
