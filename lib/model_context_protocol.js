const io = require('io');
const wellKnowns = require('./well_knowns.js');

const ERROR_CODES = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
  ResourceNotFound: -32002
};

const modelContextProtocol = {

  ERROR_CODES,

  endpoints: {
    'server.mcp': {
      'initialize': (definitions, mcpRequest, data, port, headers) => {
        return {
          jsonrpc: '2.0',
          id: mcpRequest.id ?? null,
          result: {
            protocolVersion: '2025-03-26',
            capabilities: {
              tools: {},
              resources: {}
            },
            serverInfo: {
              name: data.mcp_server_name || 'MyMCPServer',
              version: data.mcp_server_version || '1.0'
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
      'tools/call': async (definitions, mcpRequest, data, port, headers) => {
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
        const useHeaders = {'content-type': 'application/json'};
        if (headers['authorization']) {
          useHeaders['authorization'] = headers['authorization'];
        }
        const result = await io.request(
          endpoint.method,
          `http://localhost:${port}${endpoint.route}`,
          (endpoint.method === 'GET' || endpoint.method === 'DELETE') ? arguments : {},
          useHeaders,
          (endpoint.method === 'POST' || endpoint.method === 'PUT') ? JSON.stringify(arguments) : null
        );
        const contentType = result.headers['content-type'].split(';')[0];
        const type = contentType.split('/')[0];
        const content = [];
        if (type === 'text' || contentType === 'application/json') {
          content.push({
            type: 'text',
            text: result.body.toString()
          });
        } else if (type === 'image') {
          content.push({
            type,
            data: result.body.toString('base64'),
            mimeType: contentType
          });
        } else {
          content.push({
            type: 'resource',
            resource: {
              uri: 'temporary://none',
              mimeType: contentType,
              blob: result.body.toString('base64')
            }
          });
        }
        const isError = result.statusCode >= 400;
        return {
          jsonrpc: '2.0',
          id: mcpRequest.id ?? null,
          result: {
            content,
            isError
          }
        };
      },
      'resources/list': (definitions, mcpRequest) => {
        const resources = [];
        const staticFiles = Object.keys(definitions)
          .map(key => definitions[key])
          .filter(definition => definition.format.language === 'static');
        for (const file of staticFiles) {
          const name = file.name.split('/').pop();
          resources.push({
            uri: `file://${file.name}`,
            name: name,
            description: name,
            mimeType: file.metadata.contentType
          });
        }
        return {
          jsonrpc: '2.0',
          id: mcpRequest.id ?? null,
          result: {
            resources,
            nextCursor: ''
          }
        };
      },
      'resources/read': async (definitions, mcpRequest, data, port, headers) => {
        const { uri } = mcpRequest.params;
        if (typeof uri !== 'string') {
          return {
            jsonrpc: '2.0',
            id: mcpRequest.id ?? null,
            error: { code: ERROR_CODES.InvalidParams, message: `Invalid "uri" parameter, must be a string` }
          };
        } else if (!uri.startsWith('file://')) {
          return {
            jsonrpc: '2.0',
            id: mcpRequest.id ?? null,
            error: { code: ERROR_CODES.InvalidParams, message: `Invalid "uri" parameter, must start with "file://"` }
          };
        }
        const pathname = uri.slice('file://'.length);
        const file = definitions[pathname];
        if (!file || file.format.language !== 'static') {
          return {
            jsonrpc: '2.0',
            id: mcpRequest.id ?? null,
            error: { code: ERROR_CODES.ResourceNotFound, message: `Resource not found: "${uri}"` }
          };
        }
        const useHeaders = {};
        if (headers['authorization']) {
          useHeaders['authorization'] = headers['authorization'];
        }
        const result = await io.request(
          'GET',
          `http://localhost:${port}${pathname}`,
          {},
          useHeaders,
          null
        );
        const resource ={
          uri: `file://${pathname}`,
          mimeType: file.metadata.contentType
        };
        if (file.metadata.contentType.startsWith('text/') || file.metadata.contentType === 'application/json') {
          resource.text = result.body.toString();
        } else {
          resource.blob = result.body.toString('base64');
        }
        return {
          jsonrpc: '2.0',
          id: mcpRequest.id ?? null,
          result: {
            contents: [
              resource
            ]
          }
        };
      },
    }
  }

};

module.exports = modelContextProtocol;
