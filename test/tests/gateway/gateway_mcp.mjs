import chai from 'chai';
const expect = chai.expect;

import { ROOT, PORT, InstantAPI } from '../../helpers.mjs';

const { Gateway } = InstantAPI;

const FaaSGateway = new Gateway({
  debug: false,
  defaultTimeout: 1000
});

export const name = 'Gateway (MCP)';
export default async function (setupResult) {

  before(() => {
    const preloadFiles = {
      'functions/sample_preload.js': Buffer.from(`module.exports = async () => { return true; };`)
    };
    FaaSGateway.load(ROOT, preloadFiles);
    FaaSGateway.listen(PORT);
  });

  it('Should fail to return a MCP endpoint if MCP is not enabled', async () => {

    let res = await this.post('/server.mcp', {});

    expect(res.statusCode).to.equal(404);

  });

  it('Should return a valid MCP endpoint once MCP is enabled', async () => {

    process.env.MCP_ENABLED = 'true';

    let res = await this.post('/server.mcp', {});

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/json');

    expect(res.json).to.exist;

  });

  it('Should return 405 method not allowed for GET requests', async () => {

    let res = await this.get('/server.mcp', {});

    expect(res.statusCode).to.equal(405);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/json');

    expect(res.json).to.exist;

  });

  it('Should return 405 method not allowed for PUT requests', async () => {

    let res = await this.get('/server.mcp', {});

    expect(res.statusCode).to.equal(405);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/json');

    expect(res.json).to.exist;

  });

  it('Should return 405 method not allowed for DELETE requests', async () => {

    let res = await this.get('/server.mcp', {});

    expect(res.statusCode).to.equal(405);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/json');

    expect(res.json).to.exist;

  });
  
  it('Should return a valid MCP endpoint, but return invalid JSONRPC request message', async () => {

    let res = await this.post('/server.mcp', {});

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/json');

    expect(res.json).to.exist;
    expect(res.json[0]).to.exist;
    expect(res.json[0].jsonrpc).to.equal('2.0');
    expect(res.json[0].id).to.equal(null);
    expect(res.json[0].error).to.exist;
    expect(res.json[0].error.code).to.equal(-32600);
    expect(res.json[0].error.message).to.contain('invalid "jsonrpc"');

  });

  it('Should return a valid MCP endpoint, but return invalid JSONRPC request message with wrong version', async () => {

    let res = await this.post('/server.mcp', { jsonrpc: '1.0' });

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/json');

    expect(res.json).to.exist;
    expect(res.json[0]).to.exist;
    expect(res.json[0].jsonrpc).to.equal('2.0');
    expect(res.json[0].id).to.equal(null);
    expect(res.json[0].error).to.exist;
    expect(res.json[0].error.code).to.equal(-32600);
    expect(res.json[0].error.message).to.contain('invalid "jsonrpc"');

  });

  it('Should return a valid MCP endpoint, but return invalid JSONRPC request with invalid id', async () => {

    let res = await this.post('/server.mcp', { jsonrpc: '2.0', id: true });

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/json');

    expect(res.json).to.exist;
    expect(res.json[0]).to.exist;
    expect(res.json[0].jsonrpc).to.equal('2.0');
    expect(res.json[0].id).to.equal(null);
    expect(res.json[0].error).to.exist;
    expect(res.json[0].error.code).to.equal(-32600);
    expect(res.json[0].error.message).to.contain('invalid "id"');

  });

  it('Should return a valid MCP endpoint, but return invalid JSONRPC request with invalid method that is not a string', async () => {

    let res = await this.post('/server.mcp', { jsonrpc: '2.0', id: 1, method: 777 });

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/json');

    expect(res.json).to.exist;
    expect(res.json[0]).to.exist;
    expect(res.json[0].jsonrpc).to.equal('2.0');
    expect(res.json[0].id).to.equal(1);
    expect(res.json[0].error).to.exist;
    expect(res.json[0].error.code).to.equal(-32600);
    expect(res.json[0].error.message).to.contain('invalid "method"');

  });

  it('Should return a valid MCP endpoint, but return invalid JSONRPC request with invalid params', async () => {

    let res = await this.post('/server.mcp', { jsonrpc: '2.0', id: 1, method: 'ping', params: 777 });

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/json');

    expect(res.json).to.exist;
    expect(res.json[0]).to.exist;
    expect(res.json[0].jsonrpc).to.equal('2.0');
    expect(res.json[0].id).to.equal(1);
    expect(res.json[0].error).to.exist;
    expect(res.json[0].error.code).to.equal(-32600);
    expect(res.json[0].error.message).to.contain('invalid "params"');

  });

  it('Should return a valid MCP endpoint, but return invalid JSONRPC request with not supported method', async () => {

    let res = await this.post('/server.mcp', { jsonrpc: '2.0', id: 1, method: 'invalid', params: {} });

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/json');

    expect(res.json).to.exist;
    expect(res.json[0]).to.exist;
    expect(res.json[0].jsonrpc).to.equal('2.0');
    expect(res.json[0].id).to.equal(1);
    expect(res.json[0].error).to.exist;
    expect(res.json[0].error.code).to.equal(-32601);
    expect(res.json[0].error.message).to.contain('Method "invalid" not found');

  });

  it('Should return 202 accepted for notifications from client', async () => {

    let res = await this.request('POST', '/server.mcp', { method: 'notification/*' });

    expect(res.statusCode).to.equal(202);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('text/plain');

    expect(res.body.toString()).to.equal('');

  });

  it('Should return 202 accepted for response from client', async () => {

    let res = await this.request('POST', '/server.mcp', { method: 'response', result: 'test' });

    expect(res.statusCode).to.equal(202);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('text/plain');

    expect(res.body.toString()).to.equal('');

  });

  it('Should return 202 accepted for response error from client', async () => {

    let res = await this.request('POST', '/server.mcp', { method: 'response', error: 'test' });

    expect(res.statusCode).to.equal(202);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('text/plain');

    expect(res.body.toString()).to.equal('');

  });

  it('Should return a ping response', async () => {

    let res = await this.post('/server.mcp', { jsonrpc: '2.0', id: 1, method: 'ping', params: {} });

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/json');

    expect(res.json).to.exist;
    expect(res.json[0]).to.exist;
    expect(res.json[0].jsonrpc).to.equal('2.0');
    expect(res.json[0].id).to.equal(1);
    expect(res.json[0].result).to.exist;
    expect(res.json[0].result).to.deep.equal({});
  });

  it('Should return multiple ping responses', async () => {

    let res = await this.post('/server.mcp', [
      { jsonrpc: '2.0', id: 1, method: 'ping', params: {} },
      { jsonrpc: '2.0', id: 2, method: 'ping', params: {} }
    ]);

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/json');

    expect(res.json).to.exist;
    expect(res.json[0]).to.exist;
    expect(res.json[0].jsonrpc).to.equal('2.0');
    expect(res.json[0].id).to.equal(1);
    expect(res.json[0].result).to.exist;
    expect(res.json[0].result).to.deep.equal({});
    expect(res.json[1]).to.exist;
    expect(res.json[1].jsonrpc).to.equal('2.0');
    expect(res.json[1].id).to.equal(2);
    expect(res.json[1].result).to.exist;
    expect(res.json[1].result).to.deep.equal({});

  });

  it('Should return an initialize response', async () => {

    let res = await this.post('/server.mcp', { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/json');

    expect(res.json).to.exist;
    expect(res.json[0]).to.exist;
    expect(res.json[0].jsonrpc).to.equal('2.0');
    expect(res.json[0].id).to.equal(1);
    expect(res.json[0].result).to.exist;
    expect(res.json[0].result.protocolVersion).to.equal('2025-03-26');
    expect(res.json[0].result.capabilities).to.exist;
    expect(res.json[0].result.capabilities.tools).to.exist;
    expect(res.json[0].result.capabilities.tools).to.deep.equal({});
    expect(res.json[0].result.capabilities.resources).to.exist;
    expect(res.json[0].result.capabilities.resources).to.deep.equal({});
    expect(res.json[0].result.serverInfo).to.exist;
    expect(res.json[0].result.serverInfo.name).to.equal('MyMCPServer');
    expect(res.json[0].result.serverInfo.version).to.equal('1.0');

  });

  it('Should return an tools/list response', async () => {

    let res = await this.post('/server.mcp', { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/json');

    expect(res.json).to.exist;
    expect(res.json[0]).to.exist;
    expect(res.json[0].jsonrpc).to.equal('2.0');
    expect(res.json[0].id).to.equal(1);
    expect(res.json[0].result).to.exist;
    expect(res.json[0].result.tools).to.exist;
    expect(res.json[0].result.tools.length).to.be.greaterThan(0);
    expect(res.json[0].result.tools[0].name).to.exist;
    expect(res.json[0].result.tools[0].description).to.exist;
    expect(res.json[0].result.tools[0].inputSchema).to.exist;
    expect(res.json[0].result.tools[0].annotations).to.exist;
    expect(res.json[0].result.tools[0].annotations.title).to.exist;
    expect(res.json[0].result.tools[0].annotations.title).to.be.a('string');
    expect(res.json[0].result.nextCursor).to.exist;
    expect(res.json[0].result.nextCursor).to.be.a('string');
    expect(res.json[0].result.nextCursor).to.equal('');

    const tools = res.json[0].result.tools;
    const tool = tools.find(tool => tool.name === 'my_function');
    expect(tool).to.exist;
    expect(tool.name).to.equal('my_function');
    expect(tool.description).to.equal('My function');
    expect(tool.inputSchema).to.exist;
    expect(tool.inputSchema.type).to.equal('object');
    expect(tool.inputSchema.properties).to.exist;
    expect(tool.inputSchema.properties.a).to.exist;
    expect(tool.inputSchema.properties.a.type).to.equal('number');
    expect(tool.inputSchema.properties.a.default).to.equal(1);
    expect(tool.inputSchema.properties.b).to.exist;
    expect(tool.inputSchema.properties.b.type).to.equal('number');
    expect(tool.inputSchema.properties.b.default).to.equal(2);
    expect(tool.inputSchema.properties.c).to.exist;
    expect(tool.inputSchema.properties.c.type).to.equal('number');
    expect(tool.inputSchema.properties.c.default).to.equal(3);
    expect(tool.annotations).to.exist;
    expect(tool.annotations.title).to.equal('My function');

  });

  it('Should return an tools/call response, but fail without a name parameter', async () => {

    let res = await this.post('/server.mcp', { jsonrpc: '2.0', id: 1, method: 'tools/call', params: {} });

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/json');

    expect(res.json).to.exist;
    expect(res.json[0]).to.exist;
    expect(res.json[0].jsonrpc).to.equal('2.0');
    expect(res.json[0].id).to.equal(1);
    expect(res.json[0].error).to.exist;
    expect(res.json[0].error.code).to.equal(-32602);
    expect(res.json[0].error.message).to.contain('Invalid "name" parameter');

  });

  it('Should return an tools/call response, but fail without an arguments parameter', async () => {

    let res = await this.post('/server.mcp', { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'test' } });

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/json');

    expect(res.json).to.exist;
    expect(res.json[0]).to.exist;
    expect(res.json[0].jsonrpc).to.equal('2.0');
    expect(res.json[0].id).to.equal(1);
    expect(res.json[0].error).to.exist;
    expect(res.json[0].error.code).to.equal(-32602);
    expect(res.json[0].error.message).to.contain('Invalid "arguments" parameter');

  });

  it('Should return an tools/call response, but fail if tool not found', async () => {

    let res = await this.post('/server.mcp', { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'test-not-found', arguments: {} } });

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/json');

    expect(res.json).to.exist;
    expect(res.json[0]).to.exist;
    expect(res.json[0].jsonrpc).to.equal('2.0');
    expect(res.json[0].id).to.equal(1);
    expect(res.json[0].error).to.exist;
    expect(res.json[0].error.code).to.equal(-32601);
    expect(res.json[0].error.message).to.contain('No such tool: "test-not-found"');

  });

  it('Should return an tools/call response and succeed for "my_function" tool', async () => {

    let res = await this.post('/server.mcp', { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'my_function', arguments: {} } });

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/json');

    expect(res.json).to.exist;
    expect(res.json[0]).to.exist;
    expect(res.json[0].jsonrpc).to.equal('2.0');
    expect(res.json[0].id).to.equal(1);
    expect(res.json[0].result).to.exist;
    expect(res.json[0].result.content).to.exist;
    expect(res.json[0].result.content.length).to.equal(1);
    expect(res.json[0].result.content[0].type).to.equal('text');
    expect(res.json[0].result.content[0].text).to.equal('6');
    expect(res.json[0].result.isError).to.equal(false);

  });

  it('Should return an tools/call response and succeed for "my_function" tool multiple times with different arguments', async () => {

    let res = await this.post(
      '/server.mcp',
      [
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'my_function', arguments: { a: 1, b: 2, c: 1 } }
        },
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: { name: 'my_function', arguments: { a: 3, b: 3, c: 3 } }
        },
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: { name: 'my_function', arguments: { a: 'noooo', b: 3, c: 3 } }
        }
      ]
    );
    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/json');

    expect(res.json).to.exist;
    expect(res.json[0]).to.exist;
    expect(res.json[0].jsonrpc).to.equal('2.0');
    expect(res.json[0].id).to.equal(1);
    expect(res.json[0].result).to.exist;
    expect(res.json[0].result.content).to.exist;
    expect(res.json[0].result.content.length).to.equal(1);
    expect(res.json[0].result.content[0].type).to.equal('text');
    expect(res.json[0].result.content[0].text).to.equal('4');
    expect(res.json[0].result.isError).to.equal(false);

    expect(res.json[1]).to.exist;
    expect(res.json[1].jsonrpc).to.equal('2.0');
    expect(res.json[1].id).to.equal(2);
    expect(res.json[1].result).to.exist;
    expect(res.json[1].result.content).to.exist;
    expect(res.json[1].result.content.length).to.equal(1);
    expect(res.json[1].result.content[0].type).to.equal('text');
    expect(res.json[1].result.content[0].text).to.equal('9');
    expect(res.json[1].result.isError).to.equal(false);

    expect(res.json[2]).to.exist;
    expect(res.json[2].jsonrpc).to.equal('2.0');
    expect(res.json[2].id).to.equal(3);
    expect(res.json[2].result).to.exist;
    expect(res.json[2].result.content).to.exist;
    expect(res.json[2].result.content.length).to.equal(1);
    expect(res.json[2].result.content[0].type).to.equal('text');
    expect(res.json[2].result.content[0].text).to.contain('error');
    expect(res.json[2].result.isError).to.equal(true);

  });

  it('Should return an tools/call response with an image and a buffer', async () => {

    let res = await this.post(
      '/server.mcp',
      [
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'buffer_return_content_type', arguments: {} }
        },
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: { name: 'buffer_return', arguments: {} }
        }
      ]
    );

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/json');

    expect(res.json).to.exist;
    expect(res.json[0]).to.exist;
    expect(res.json[0].jsonrpc).to.equal('2.0');
    expect(res.json[0].id).to.equal(1);
    expect(res.json[0].result).to.exist;
    expect(res.json[0].result.content).to.exist;
    expect(res.json[0].result.content.length).to.equal(1);
    expect(res.json[0].result.content[0].type).to.equal('image');
    expect(res.json[0].result.content[0].data).to.equal(Buffer.from('lol').toString('base64'));
    expect(res.json[0].result.content[0].mimeType).to.equal('image/png');
    expect(res.json[0].result.isError).to.equal(false);

    expect(res.json[1]).to.exist;
    expect(res.json[1].jsonrpc).to.equal('2.0');
    expect(res.json[1].id).to.equal(2);
    expect(res.json[1].result).to.exist;
    expect(res.json[1].result.content).to.exist;
    expect(res.json[1].result.content.length).to.equal(1);
    expect(res.json[1].result.content[0].type).to.equal('resource');
    expect(res.json[1].result.content[0].resource.uri).to.equal('temporary://none');
    expect(res.json[1].result.content[0].resource.mimeType).to.equal('application/octet-stream');
    expect(res.json[1].result.content[0].resource.blob).to.equal(Buffer.from('lol').toString('base64'));
    expect(res.json[1].result.isError).to.equal(false);

  });

  it('Should return a resources/list response', async () => {

    let res = await this.post('/server.mcp', { jsonrpc: '2.0', id: 1, method: 'resources/list', params: {} });

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/json');

    expect(res.json).to.exist;
    expect(res.json[0]).to.exist;
    expect(res.json[0].jsonrpc).to.equal('2.0');
    expect(res.json[0].id).to.equal(1);
    expect(res.json[0].result).to.exist;
    expect(res.json[0].result.resources).to.exist;
    expect(res.json[0].result.resources.length).to.be.greaterThan(0);

    const resource = res.json[0].result.resources.find(resource => resource.uri === 'file://video.mp4');
    expect(resource).to.exist;
    expect(resource.mimeType).to.equal('video/mp4');
    expect(resource.name).to.equal('video.mp4');
    expect(resource.description).to.equal('video.mp4');

  });

  it('Should return a resources/read response', async () => {

    let res = await this.post('/server.mcp', { jsonrpc: '2.0', id: 1, method: 'resources/read', params: { uri: 'file://video.mp4' } });

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/json');

    expect(res.json).to.exist;
    expect(res.json[0]).to.exist;
    expect(res.json[0].jsonrpc).to.equal('2.0');
    expect(res.json[0].id).to.equal(1);
    expect(res.json[0].result).to.exist;
    expect(res.json[0].result.contents).to.exist;
    expect(res.json[0].result.contents.length).to.equal(1);
    expect(res.json[0].result.contents[0].uri).to.equal('file://video.mp4');
    expect(res.json[0].result.contents[0].mimeType).to.equal('video/mp4');
    expect(res.json[0].result.contents[0].blob.length).to.be.greaterThan(0);

  });

  it('Should return a resources/templates/list response', async () => {

    let res = await this.post('/server.mcp', { jsonrpc: '2.0', id: 1, method: 'resources/templates/list', params: {} });

    expect(res.statusCode).to.equal(200);
    expect(res.headers).to.haveOwnProperty('access-control-allow-origin');
    expect(res.headers).to.haveOwnProperty('access-control-allow-methods');
    expect(res.headers).to.haveOwnProperty('access-control-allow-headers');
    expect(res.headers).to.haveOwnProperty('access-control-expose-headers');
    expect(res.headers['content-type']).to.equal('application/json');

    expect(res.json).to.exist;
    expect(res.json[0]).to.exist;
    expect(res.json[0].jsonrpc).to.equal('2.0');
    expect(res.json[0].id).to.equal(1);
    expect(res.json[0].result).to.exist;
    expect(res.json[0].result.resourceTemplates).to.exist;
    expect(res.json[0].result.resourceTemplates.length).to.be.greaterThan(0);

  });

  after(() => {
    delete process.env.MCP_ENABLED;
    FaaSGateway.close();
  });

};
