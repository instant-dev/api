const io = require('io');
const wellKnowns = require('./well_knowns.js');

const ERROR_CODES = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603
};

const modelContextProtocol = {

  ERROR_CODES,

  endpoints: {
    'server.mcp': {
      'initialize': (definitions, mcpRequest) => {
        return {
          jsonrpc: '2.0',
          id: mcpRequest.id ?? null,
          result: {
            protocolVersion: '2025-03-26',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name:    'MyMCPServer',
              version: '1.0'
            }
          }
        };
      },
      'ping': (definitions, mcpRequest) => {
        return {
          jsonrpc: '2.0',
          id: mcpRequest.id ?? null,
          result: {}
        };
      },
      'tools/list': (definitions, mcpRequest) => {
        const tools = [];
        const JSONSchema = wellKnowns.generateJSONSchema(definitions);
        for (const endpoint of JSONSchema) {
          const description = endpoint.description || endpoint.name;
          const title = description.split(/\n|\./)[0].trim();
          tools.push({
            name: endpoint.name,
            description: endpoint.description,
            inputSchema: endpoint.parameters,
            annotations: {
              title: title,
              // readOnlyHint?: boolean;    // If true, the tool does not modify its environment
              // destructiveHint?: boolean; // If true, the tool may perform destructive updates
              // idempotentHint?: boolean;  // If true, repeated calls with same args have no additional effect
              // openWorldHint?: boolean;   // If true, tool interacts with external entities
            }
          });
        }
        return {
          jsonrpc: '2.0',
          id: mcpRequest.id ?? null,
          result: {
            tools,
            nextCursor: ''
          }
        };
      },
      'tools/call': async (definitions, mcpRequest, req, findDefinition) => {
        const { name, arguments } = mcpRequest.params;
        if (typeof name !== 'string') {
          return {
            jsonrpc: '2.0',
            id: mcpRequest.id ?? null,
            error: { code: ERROR_CODES.InvalidParams, message: `Invalid "name" parameter, must be a string` }
          };
        } else if (typeof arguments !== 'object' || arguments === null || Array.isArray(arguments)) {
          return {
            jsonrpc: '2.0',
            id: mcpRequest.id ?? null,
            error: { code: ERROR_CODES.InvalidParams, message: `Invalid "arguments" parameter, must be an object` }
          };
        }
        const JSONSchema = wellKnowns.generateJSONSchema(definitions);
        const endpoint = JSONSchema.find(endpoint => endpoint.name === name);
        if (!endpoint) {
          return {
            jsonrpc: '2.0',
            id: mcpRequest.id ?? null,
            error: { code: ERROR_CODES.MethodNotFound, message: `No such tool: "${name}"` }
          };
        }
        const definition = findDefinition(definitions, endpoint.route, endpoint.method);
        console.log(`Found definition ::`, definition);
        const host = req.headers['host'];
        const baseUrl = host === 'localhost' || host.startsWith('localhost:') ? `http://${host}` : `https://${host}`;
        const url = baseUrl + endpoint.route;
        const method = endpoint.method.toLowerCase();
        const result = await io[method](
          url,
          req.headers['authorization'],
          {},
          arguments
        );
        console.log(`result is?`, result);
        return {
          jsonrpc: '2.0',
          id: mcpRequest.id ?? null,
          result: {}
        };
      }
    }
  }

};

module.exports = modelContextProtocol;
