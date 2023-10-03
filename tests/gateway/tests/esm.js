module.exports = (expect, FaaSGateway, parser, parseServerSentEvents, request) => {

  it('Should successfully execute a default-exported ESM function with GET', done => {
    
    request('GET', {}, '/esm/default/?str=ABC%20&repeat=10', '', (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
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
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.equal('ABC '.repeat(10));

      done();

    });

  });

  it('Should successfully execute a default-exported ESM function with POST', done => {
    
    request('POST', {}, '/esm/default/', {str: 'ABC ', repeat: 10}, (err, res, result) => {

      expect(err).to.not.exist;
      expect(res.statusCode).to.equal(200);
      expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
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
      expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
      expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
      expect(res.headers['content-type']).to.equal('application/json');
      expect(result).to.equal('ABC ');

      done();

    });

  });

};
