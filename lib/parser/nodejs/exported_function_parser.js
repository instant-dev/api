const babelParser = require('@babel/parser');

const types = require('../../types.js');
const validateParameterName = require('./validate_parameter_name.js');

const RESERVED_NAMES = [
  '_stream',
  '_background',
  '_debug',
  'context'
];

const SUPPORTED_HTTP_METHODS = {
  'get': 'GET',
  'post': 'POST',
  'put': 'PUT',
  'del': 'DELETE'
};

const CommentDefinitionParser = require('./comment_definition_parser.js');

class ExportedFunctionParser {

  constructor() {
    this.language = 'nodejs';
    this.commentDefinitionParser = new CommentDefinitionParser();
    this.literals = {
      NumericLiteral: 'number',
      StringLiteral: 'string',
      BooleanLiteral: 'boolean',
      NullLiteral: 'any',
      ObjectExpression: 'object',
      ArrayExpression: 'array',
      UnaryExpression: 'number'
    };
    this.validateExpressions = {
      ObjectExpression: (node, stack) => {
        return node.properties.reduce((obj, prop) => {
          let key = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
          if (prop.method) {
            throw new Error(`(${stack.concat(key).join('.')}) Object literals in default values can not contain functions`);
          } else if (prop.computed) {
            throw new Error(`(${stack.concat(key).join('.')}) Object literals in default values can not contain computed properties`);
          } else {
            obj[key] = this.validateDefaultParameterExpression(key, prop.value, stack);
          }
          return obj;
        }, {});
      },
      ArrayExpression: (node, stack) => {
        return node.elements.map((el, i) => this.validateDefaultParameterExpression(i, el, stack));
      },
      UnaryExpression: (node, stack) => {
        if (node.argument.type === 'NumericLiteral') {
          if (node.operator === '-') {
            return -node.argument.value;
          } else if (node.operator === '+') {
            return node.argument.value;
          } else {
            throw new Error(`Invalid UnaryExpression`);
          }
        } else {
          throw new Error(`Invalid UnaryExpression`);
        }
      }
    };
  }

  validateDefaultParameterExpression(name, node, stack, obj) {

    stack = (stack || []).slice(0);
    stack.push(name);

    let type = node.type;

    if (!this.literals[type]) {
      throw new Error(`(${stack.join('.')}) Expected ${Object.keys(this.literals).join(', ')} in Right-Hand of AssignmentPattern, got ${type}.`);
    }

    if (this.validateExpressions[node.type]) {
      return this.validateExpressions[node.type](node, stack);
    } else {
      return node.type === 'NullLiteral' ? null : node.value;
    }

  }

  parseExportStatements (fileString) {

    let AST = babelParser.parse(
      fileString,
      {
        allowReturnOutsideFunction: true,
        allowAwaitOutsideFunction: true,
        sourceType: 'module'
      }
    );

    let body = AST.program.body;

    let exportDefaultStatements = body
      .filter(item => item.type === 'ExportDefaultDeclaration')
      .map(item => {
        return {
          leadingComments: item.leadingComments,
          declaration: item.declaration,
        };
      });

    if (exportDefaultStatements.length > 1) {
      throw new Error(`Too many "export default" statements`);
    }

    const statementObject = {default: exportDefaultStatements[0] || null};

    let exportNamedStatements = body
      .filter(item => item.type === 'ExportNamedDeclaration')
      .forEach(item => {
        let comments = item.leadingComments;
        const declaration = item.declaration;
        let name;
        let functionExpression;
        if (declaration.type === 'VariableDeclaration') {
          const varDeclarations = declaration.declarations;
          if (varDeclarations.length > 1) {
            throw new Error(
              `Named exports of type "VariableDeclaration" can only export one value, ` +
              `received ${varDeclarations.length} values.`
            );
          }
          let node = varDeclarations[0];
          name = node.id.name;
          functionExpression = node.init;
        } else if (declaration.type === 'FunctionDeclaration') {
          name = declaration.id.name;
          functionExpression = declaration;
        } else {
          throw new Error(
            `Named exports can only be of type "VariableDeclaration" and "FunctionDeclaration", ` +
            `received "${declaration.type}"`
          );
        }
        const allowedNames = Object.keys(SUPPORTED_HTTP_METHODS);
        if (!allowedNames.includes(name)) {
          throw new Error(
            `Named exports can only have the names "${allowedNames.join('", ')}", ` +
            `received "${name}"`
          )
        }
        statementObject[name] = {
          leadingComments: comments,
          declaration: functionExpression,
        };
      });

    return statementObject;

  }

  parseModuleExportsStatement (fileString, sourceType = 'script') {

    let AST = babelParser.parse(
      fileString,
      {
        allowReturnOutsideFunction: true,
        allowAwaitOutsideFunction: true,
        sourceType
      }
    );

    let body = AST.program.body;
    let statements = body.filter(item => {
      return (
        item.type === 'ExpressionStatement' &&
        item.expression &&
        item.expression.type === 'AssignmentExpression' &&
        item.expression.operator === '=' &&
        item.expression.left.type === 'MemberExpression' &&
        item.expression.left.object &&
        item.expression.left.object.name === 'module' &&
        item.expression.left.property &&
        item.expression.left.property.name === 'exports'
      )
    });

    if (statements.length > 1) {
      throw new Error(`Too many exports from file via "module.exports"`);
    }

    return statements[0] || null;

  }

  parseFunctionExpressionFromExportStatement (statement) {
    let declaration = statement.declaration;
    if (
      declaration.type !== 'FunctionExpression' &&
      declaration.type !== 'ArrowFunctionExpression' &&
      declaration.type !== 'FunctionDeclaration'
    ) {
      throw new Error(`"export" must export a valid Function`);
    }
    if (declaration.generator) {
      throw new Error(`"export" can not export a generator`);
    }
    return declaration;
  }

  parseFunctionExpressionFromModuleExportsStatement (statement) {
    let expression = statement.expression;
    if (
      expression.right.type !== 'FunctionExpression' &&
      expression.right.type !== 'ArrowFunctionExpression' &&
      expression.right.type !== 'FunctionDeclaration'
    ) {
      throw new Error(`"module.exports" must export a valid Function`);
    }
    if (expression.right.generator) {
      throw new Error(`"module.exports" can not export a generator`);
    }
    return expression.right;
  }

  parseParamsFromFunctionExpression (functionExpression, fileString) {

    if (!functionExpression) {
      return {
        async: true,
        inline: true,
        context: {},
        params: []
      };
    } else {
      let params = functionExpression.params;

      if (!functionExpression.async) {
        let lastParam = params.pop();
        if (!lastParam || lastParam.type !== 'Identifier' || lastParam.name !== 'callback') {
          throw new Error(`Non-async functions must have parameter named "callback" as the last argument`);
        }
      }

      let paramsObject = {};

      if (params.length) {
        let lastParam = params.pop();
        if (lastParam.type === 'Identifier' && lastParam.name === 'context') {
          paramsObject.context = {};
        } else {
          params.push(lastParam);
        }
      }

      return {
        async: functionExpression.async,
        inline: false,
        context: paramsObject.context || null,
        params: params.slice()
          .reverse()
          .map((param, i) => {
            let formattedParam;
            if (param.type === 'Identifier') {
              if (param.name === 'context') {
                throw new Error(`When specified, "context" must be the last provided (non-callback) argument`);
              }
              if (functionExpression.async && param.name === 'callback') {
                throw new Error(`Async functions can not have a parameter named "callback"`);
              }
              if (!this.validateFunctionParamName(param.name)) {
                throw new Error(`Invalid parameter name "${param.name}"`);
              }
              formattedParam = {name: param.name};
            } else if (param.type === 'AssignmentPattern') {
              if (param.left.type !== 'Identifier') {
                throw new Error('Expected Identifier in Left-Hand of AssignmentPattern');
              }
              if (param.left.name === 'context') {
                throw new Error(`When specified, "context" can not be assigned a default value`);
              }
              if (functionExpression.async && param.left.name === 'callback') {
                throw new Error(`Async functions can not have a parameter named "callback"`);
              }
              if (!this.validateFunctionParamName(param.left.name)) {
                throw new Error(`Invalid parameter name "${param.left.name}"`);
              }
              let defaultValue;
              try {
                defaultValue = this.validateDefaultParameterExpression(param.left.name, param.right);
              } catch (e) {
                throw new Error([
                  `Invalid default parameter: ${param.left.name} = ${fileString.slice(param.right.start, param.right.end)}`,
                  `(${e.message})`
                ].join(' '));
              }
              formattedParam = {
                name: param.left.name,
                type: this.literals[param.right.type],
                defaultValue: defaultValue
              };
            }
            paramsObject[formattedParam.name] = formattedParam;
            return formattedParam;
          })
          .reverse()
      };
    }

  }

  validateFunctionParamName (param) {
    return validateParameterName(param);
  }

  parseCommentFromStatement (statement) {
    if (!statement.leadingComments) {
      return '';
    }
    let comments = statement.leadingComments;
    let lastComment = comments.pop();
    if (lastComment.type !== 'CommentBlock') {
      return '';
    }
    if (lastComment.value[0] !== '*') {
      return '';
    }
    return lastComment.value.replace(/^\*+(?:\r?\n)*((?:\r?\n|.)*?)(?:\r?\n)*$/g, '$1');
  }

  compareParameters (functionParams, commentParams) {
    if (commentParams.length && commentParams.length !== functionParams.length) {
      throw new Error(`Commented parameters do not match function footprint (expected: ${commentParams.length}, actual: ${functionParams.length})`);
    }
    return functionParams.map((param, i) => {
      if (!commentParams.length) {
        param.description = '';
        param.type = param.type || types.defaultType;
      } else {
        let defParam = commentParams[i];
        if (!defParam) {
          throw new Error(`No comment parameter definition found for function parameter "${param.name}"`);
        }
        if (defParam.hasOwnProperty('defaultValue') && !param.hasOwnProperty('defaultValue')) {
          throw new Error(`Comment parameter definition "${defParam.name}" is marked as optional but does not have a default value`);
        }
        if (defParam.name !== param.name) {
          throw new Error(`Comment parameter definition "${defParam.name}" does not match function parameter "${param.name}"`);
        }
        var type = param.type === types.defaultType
          ? defParam.type
          : param.type;
        if (param.hasOwnProperty('defaultValue')) {
          if (
            !types.validate(
              defParam.type,
              param.defaultValue,
              param.defaultValue === null,
              (
                defParam.members ||
                  (defParam.alternateSchemas || []).concat(defParam.schema ? [defParam.schema] : [])
              ),
              defParam.options && defParam.options.values
            )
          ) {
            if (defParam.members) {
              throw new Error(`Parameter "${defParam.name}" does not have member ${JSON.stringify(param.defaultValue)}`);
            } else if (defParam.schema) {
              throw new Error(`Parameter "${defParam.name}" schema does not match ${JSON.stringify(param.defaultValue)}`);
            } else if (defParam.options && defParam.options.values) {
              throw new Error(`Parameter "${defParam.name}" options (${JSON.stringify(defParam.options.values)}) do not contain ${JSON.stringify(param.defaultValue)}`);
            } else {
              throw new Error(`Parameter "${defParam.name}" type "${defParam.type}" does not match the default value ${JSON.stringify(param.defaultValue)} ("${param.type}")`);
            }
          } else {
            try {
              types.sanitize(defParam.type, param.defaultValue, defParam.range);
            } catch (e) {
              throw new Error(`Parameter "${defParam.name}" defaultValue invalid: ${e.message}`);
            }
          }
        }
        param.type = defParam.type || types.defaultType;
        param.description = defParam.description;
        defParam.defaultMetafield && (param.defaultMetafield = defParam.defaultMetafield);
        defParam.options && (param.options = defParam.options);
        defParam.range && (param.range = defParam.range);
        defParam.schema && (param.schema = defParam.schema);
        defParam.alternateSchemas && (param.alternateSchemas = defParam.alternateSchemas);
        defParam.members && (param.members = defParam.members);
      }
      return param;
    });
  }

  parse (name, buffer, pathname) {

    const fileString = buffer.toString();

    let sourceType = 'script';
    if (pathname.endsWith('.mjs')) {
      sourceType = 'module';
    }

    const endpoints = {};

    if (sourceType === 'script') {
      let moduleStatement = this.parseModuleExportsStatement(fileString);
      if (moduleStatement) {
        endpoints['default'] = {
          comment: this.parseCommentFromStatement(moduleStatement),
          functionExpression: this.parseFunctionExpressionFromModuleExportsStatement(moduleStatement)
        }
      } else {
        endpoints['default'] = {
          comment: null,
          functionExpression: null
        };
      }
    } else {
      let exportStatements = this.parseExportStatements(fileString);
      if (exportStatements) {
        for (const key in exportStatements) {
          if (exportStatements[key]) {
            endpoints[key] = {
              comment: this.parseCommentFromStatement(exportStatements[key]),
              functionExpression: this.parseFunctionExpressionFromExportStatement(exportStatements[key])
            };
          } else {
            endpoints[key] = {
              comment: null,
              functionExpression: null
            };
          }
        }
      }
    }

    if (
      endpoints['default'] &&
      Object.keys(endpoints).length > 1
    ) {
      if (endpoints['default'].functionExpression !== null) {
        throw new Error(
          `Can not export named declarations "${Object.keys(SUPPORTED_HTTP_METHODS).join('", "')}" ` +
          `if a default export is specified.`
        );
      } else {
        delete endpoints['default'];
      }
    }

    return Object.keys(endpoints).map(method => {

      let comment = endpoints[method].comment;
      let functionExpression = endpoints[method].functionExpression;

      let commentDefinition = this.commentDefinitionParser.parse(name, comment);
      let functionDefinition = this.parseParamsFromFunctionExpression(functionExpression, fileString);

      let description = commentDefinition.description || '';
      let origins = commentDefinition.origins || null;
      let background = commentDefinition.background || null;
      let streams = commentDefinition.streams || null;
      let context = commentDefinition.context || functionDefinition.context;
      let isAsync = functionDefinition.async;
      let isInline = functionDefinition.inline;
      let params = this.compareParameters(functionDefinition.params, commentDefinition.params);
      let returns = commentDefinition.returns;

      const appendMethod = SUPPORTED_HTTP_METHODS[method] || '';

      return {
        name: name + (appendMethod ? `#${appendMethod}` : ``),
        pathname: pathname,
        format: {
          language: this.language,
          async: isAsync,
          inline: isInline
        },
        description: description,
        metadata: {},
        origins: origins,
        background: background,
        streams: streams,
        context: context,
        params: params,
        returns: returns
      };

    });

  }

}

module.exports = ExportedFunctionParser;
