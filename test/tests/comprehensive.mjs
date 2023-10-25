import chai from 'chai';
const expect = chai.expect;

import { InstantAPI } from '../helpers.mjs';

const FunctionParser = InstantAPI.FunctionParser;
const parser = new FunctionParser();

export const name = 'Comprehensive definition tests';
export default async function (setupResult) {

  let definitions = parser.load('./test/files/comprehensive');
  let ignoredDefinitions = parser.load('./test/files/ignore', null, null, ['ignoreme.js']);

  it('Should read all functions correctly', () => {

    expect(definitions).to.haveOwnProperty('');
    expect(definitions).to.haveOwnProperty('test');
    expect(definitions).to.haveOwnProperty('returns');
    expect(definitions).to.haveOwnProperty('default');
    expect(definitions).to.haveOwnProperty('default_return');
    expect(definitions).to.haveOwnProperty('multiline_description');
    expect(definitions).to.haveOwnProperty('named_return');
    expect(definitions).to.haveOwnProperty('noname_return');
    expect(definitions).to.haveOwnProperty('nullable_return');
    expect(definitions).to.haveOwnProperty('dir');
    expect(definitions).to.haveOwnProperty('dir:notfound');
    expect(definitions).to.haveOwnProperty('dir/test');
    expect(definitions).to.haveOwnProperty('dir/sub');
    expect(definitions).to.haveOwnProperty('dir/sub/test');
    expect(definitions).to.haveOwnProperty('schema/basic');
    expect(definitions).to.haveOwnProperty('schema/optional');
    expect(definitions).to.haveOwnProperty('schema/nested');
    expect(definitions).to.haveOwnProperty('schema/array');
    expect(definitions).to.haveOwnProperty('enum');
    expect(definitions).to.haveOwnProperty('enum_return');
    expect(definitions).to.haveOwnProperty('enum_nested');
    expect(definitions).to.haveOwnProperty('enum_nested_optional');
    expect(definitions).to.haveOwnProperty('enum_schema');
    expect(definitions).to.haveOwnProperty('options');
    expect(definitions).to.haveOwnProperty('keyql_options');
    expect(definitions).to.haveOwnProperty('alternate_schemas');
    expect(definitions).to.haveOwnProperty('inline');
    expect(definitions).to.haveOwnProperty('esm_default');
    expect(definitions).to.haveOwnProperty('esm_named#GET');
    expect(definitions).to.haveOwnProperty('esm_named#POST');
    expect(definitions).to.haveOwnProperty('esm_named#PUT');
    expect(definitions).to.haveOwnProperty('esm_named#DELETE');
    expect(definitions).to.not.haveOwnProperty('esm_named');
    expect(definitions).to.haveOwnProperty('esdoc_support');

    expect(Object.keys(definitions).length).to.equal(33);

  });

  it('Should read all functions correctly with ignore parameter set', () => {

    expect(Object.keys(ignoredDefinitions).length).to.equal(1);
    expect(ignoredDefinitions).to.haveOwnProperty('');

  });

  it('Should have correct filenames', () => {

    expect(definitions[''].pathname).to.equal('__main__.js');
    expect(definitions['test'].pathname).to.equal('test.js');
    expect(definitions['returns'].pathname).to.equal('returns.js');
    expect(definitions['default'].pathname).to.equal('default.js');
    expect(definitions['multiline_description'].pathname).to.equal('multiline_description.js');
    expect(definitions['dir'].pathname).to.equal('dir/index.js');
    expect(definitions['dir:notfound'].pathname).to.equal('dir/404.js');
    expect(definitions['dir/test'].pathname).to.equal('dir/test.js');
    expect(definitions['dir/sub'].pathname).to.equal('dir/sub/__main__.js');
    expect(definitions['dir/sub/test'].pathname).to.equal('dir/sub/test.js');
    expect(definitions['schema/basic'].pathname).to.equal('schema/basic.js');
    expect(definitions['schema/optional'].pathname).to.equal('schema/optional.js');
    expect(definitions['schema/nested'].pathname).to.equal('schema/nested.js');
    expect(definitions['schema/array'].pathname).to.equal('schema/array.js');
    expect(definitions['enum'].pathname).to.equal('enum.js');
    expect(definitions['enum_return'].pathname).to.equal('enum_return.js');
    expect(definitions['enum_nested'].pathname).to.equal('enum_nested.js');
    expect(definitions['enum_nested_optional'].pathname).to.equal('enum_nested_optional.js');
    expect(definitions['options'].pathname).to.equal('options.js');
    expect(definitions['inline'].pathname).to.equal('inline.js');
    expect(definitions['esm_named#GET'].pathname).to.equal('esm_named.mjs');
    expect(definitions['esm_named#POST'].pathname).to.equal('esm_named.mjs');
    expect(definitions['esm_named#PUT'].pathname).to.equal('esm_named.mjs');
    expect(definitions['esm_named#DELETE'].pathname).to.equal('esm_named.mjs');

  });

  it('Should have correct descriptions', () => {

    expect(definitions[''].description).to.equal('');
    expect(definitions['test'].description).to.equal('Test function');
    expect(definitions['returns'].description).to.equal('');
    expect(definitions['default'].description).to.equal('Test default parameters');
    expect(definitions['multiline_description'].description).to.equal('Test multi line descriptions\nThis is a second line\nThis is a third line\n\nThis is a fourth line\n');
    expect(definitions['dir/test'].description).to.equal('');
    expect(definitions['dir/sub'].description).to.equal('Test function');
    expect(definitions['dir/sub/test'].description).to.equal('');
    expect(definitions['schema/basic'].description).to.equal('Test Schema Input');
    expect(definitions['schema/optional'].description).to.equal('Test Optional Schema Input');
    expect(definitions['schema/nested'].description).to.equal('Test Nested Schema Input');
    expect(definitions['schema/array'].description).to.equal('Test Array Schema Input');
    expect(definitions['enum'].description).to.equal('Test Enum');
    expect(definitions['enum_return'].description).to.equal('Test Enum Returns');
    expect(definitions['enum_nested'].description).to.equal('Test Nested Enum');
    expect(definitions['enum_nested_optional'].description).to.equal('Test Optional Nested Enum');
    expect(definitions['options'].description).to.equal('Populate options properly');
    expect(definitions['inline'].description).to.equal('');

  });

  it('Should have correct context', () => {

    expect(definitions[''].context).to.equal(null);
    expect(definitions['test'].context).to.exist;
    expect(definitions['returns'].context).to.equal(null);
    expect(definitions['default'].context).to.exist;
    expect(definitions['multiline_description'].context).to.equal(null);
    expect(definitions['dir/test'].context).to.exist;
    expect(definitions['dir/sub'].context).to.equal(null);
    expect(definitions['dir/sub/test'].context).to.exist;
    expect(definitions['schema/basic'].context).to.equal(null);
    expect(definitions['schema/optional'].context).to.equal(null);
    expect(definitions['schema/nested'].context).to.equal(null);
    expect(definitions['schema/array'].context).to.equal(null);
    expect(definitions['enum'].context).to.equal(null);
    expect(definitions['enum_return'].context).to.exist;
    expect(definitions['enum_nested'].context).to.exist;
    expect(definitions['enum_nested_optional'].context).to.exist;
    expect(definitions['options'].context).to.equal(null);
    expect(definitions['inline'].context).to.exist;


  });

  it('Should have correct returns descriptions', () => {

    expect(definitions[''].returns.description).to.equal('');
    expect(definitions['test'].returns.description).to.equal('');
    expect(definitions['returns'].returns.description).to.equal('hello');
    expect(definitions['default'].returns.description).to.equal('');
    expect(definitions['dir/test'].returns.description).to.equal('');
    expect(definitions['dir/sub'].returns.description).to.equal('A return description!');
    expect(definitions['dir/sub/test'].returns.description).to.equal('');
    expect(definitions['schema/basic'].returns.description).to.equal('');
    expect(definitions['schema/optional'].returns.description).to.equal('');
    expect(definitions['schema/nested'].returns.description).to.equal('');
    expect(definitions['schema/array'].returns.description).to.equal('');
    expect(definitions['enum'].returns.description).to.equal('');
    expect(definitions['enum_return'].returns.description).to.equal('a or b');
    expect(definitions['enum_nested'].returns.description).to.equal('A boolean value');
    expect(definitions['enum_nested_optional'].returns.description).to.equal('A boolean value');
    expect(definitions['options'].returns.description).to.equal('a Boolean?');
    expect(definitions['inline'].returns.description).to.equal('');

  });

  it('Should have correct returns types', () => {

    expect(definitions[''].returns.type).to.equal('any');
    expect(definitions['test'].returns.type).to.equal('boolean');
    expect(definitions['returns'].returns.type).to.equal('number');
    expect(definitions['default'].returns.type).to.equal('string');
    expect(definitions['dir/test'].returns.type).to.equal('any');
    expect(definitions['dir/sub'].returns.type).to.equal('boolean');
    expect(definitions['dir/sub/test'].returns.type).to.equal('any');
    expect(definitions['schema/basic'].returns.type).to.equal('string');
    expect(definitions['schema/optional'].returns.type).to.equal('string');
    expect(definitions['schema/nested'].returns.type).to.equal('string');
    expect(definitions['schema/array'].returns.type).to.equal('string');
    expect(definitions['enum'].returns.type).to.equal('any');
    expect(definitions['enum_return'].returns.type).to.equal('enum');
    expect(definitions['enum_nested'].returns.type).to.equal('boolean');
    expect(definitions['enum_nested'].returns.type).to.equal('boolean');
    expect(definitions['options'].returns.type).to.equal('boolean');
    expect(definitions['inline'].returns.type).to.equal('any');

  });

  it('Should read "" (default) parameters', () => {

    let params = definitions[''].params;
    expect(params.length).to.equal(0);

  });

  it('Should read "test" parameters', () => {

    let params = definitions['test'].params;
    expect(params.length).to.equal(1);
    expect(params[0].name).to.equal('a');
    expect(params[0].type).to.equal('boolean');
    expect(params[0].description).to.equal('alpha');

  });

  it('Should read "default" parameters', () => {

    let params = definitions['default'].params;
    expect(params.length).to.equal(2);
    expect(params[0].name).to.equal('name');
    expect(params[0].type).to.equal('string');
    expect(params[0].description).to.equal('A name');
    expect(params[0].defaultValue).to.equal('hello');
    expect(params[1].name).to.equal('obj');
    expect(params[1].type).to.equal('object');
    expect(params[1].description).to.equal('An object');
    expect(params[1].defaultValue).to.exist;
    expect(params[1].defaultValue).to.haveOwnProperty('result');
    expect(params[1].defaultValue.result).to.haveOwnProperty('a-string-key');
    expect(params[1].defaultValue.result['a-string-key']).to.equal(1);
    expect(params[1].defaultValue.result[1]).to.equal('one');

  });

  it('Should read "dir/test" parameters', () => {

    let params = definitions['dir/test'].params;
    expect(params.length).to.equal(6);
    expect(params[0].name).to.equal('a');
    expect(params[0].type).to.equal('boolean');
    expect(params[0].description).to.equal('');
    expect(params[1].name).to.equal('b');
    expect(params[1].type).to.equal('string');
    expect(params[1].description).to.equal('');
    expect(params[2].name).to.equal('c');
    expect(params[2].type).to.equal('number');
    expect(params[2].description).to.equal('');
    expect(params[3].name).to.equal('d');
    expect(params[3].type).to.equal('any');
    expect(params[3].description).to.equal('');
    expect(params[4].name).to.equal('e');
    expect(params[4].type).to.equal('array');
    expect(params[4].description).to.equal('');
    expect(params[5].name).to.equal('f');
    expect(params[5].type).to.equal('object');
    expect(params[5].description).to.equal('');

  });

  it('Should read "dir/test" default values', () => {

    let params = definitions['dir/test'].params;
    expect(params.length).to.equal(6);
    expect(params[0].defaultValue).to.equal(true);
    expect(params[1].defaultValue).to.equal('false');
    expect(params[2].defaultValue).to.equal(1);
    expect(params[3].defaultValue).to.equal(null);
    expect(params[4].defaultValue).to.be.an('array');
    expect(params[4].defaultValue).to.deep.equal([]);
    expect(params[5].defaultValue).to.be.an('object');
    expect(params[5].defaultValue).to.deep.equal({});

  });

  it('Should read "dir/sub" parameters', () => {

    let params = definitions['dir/sub'].params;
    expect(params.length).to.equal(6);
    expect(params[0].name).to.equal('a');
    expect(params[0].type).to.equal('boolean');
    expect(params[0].description).to.equal('alpha');
    expect(params[1].name).to.equal('b');
    expect(params[1].type).to.equal('string');
    expect(params[1].description).to.equal('beta');
    expect(params[2].name).to.equal('c');
    expect(params[2].type).to.equal('number');
    expect(params[2].description).to.equal('gamma');
    expect(params[3].name).to.equal('d');
    expect(params[3].type).to.equal('any');
    expect(params[3].description).to.equal('delta');
    expect(params[4].name).to.equal('e');
    expect(params[4].type).to.equal('array');
    expect(params[4].description).to.equal('epsilon');
    expect(params[5].name).to.equal('f');
    expect(params[5].type).to.equal('object');
    expect(params[5].description).to.equal('zeta');

  });

  it('Should read "dir/sub" default values', () => {

    let params = definitions['dir/sub'].params;
    expect(params.length).to.equal(6);
    expect(params[0].defaultValue).to.equal(true);
    expect(params[1].defaultValue).to.equal('false');
    expect(params[2].defaultValue).to.equal(1);
    expect(params[3].defaultValue).to.equal(null);
    expect(params[4].defaultValue).to.be.an('array');
    expect(params[4].defaultValue).to.deep.equal([1, 2, 3, {four: 'five'}]);
    expect(params[5].defaultValue).to.be.an('object');
    expect(params[5].defaultValue).to.deep.equal({one: 'two', three: [4, 5]});

  });

  it('Should read "dir/sub/test" parameters', () => {

    let params = definitions['dir/sub/test'].params;
    expect(params.length).to.equal(0);

  });

  it('Should read "schema/basic" parameters', () => {

    let params = definitions['schema/basic'].params;
    expect(params.length).to.equal(3);
    expect(params[0].name).to.equal('before');
    expect(params[0].type).to.equal('string');
    expect(params[0].description).to.equal('');
    expect(params[2].name).to.equal('after');
    expect(params[2].type).to.equal('string');
    expect(params[2].description).to.equal('');
    expect(params[1].name).to.equal('obj');
    expect(params[1].type).to.equal('object');
    expect(params[1].description).to.equal('');
    expect(params[1].schema).to.exist;
    expect(params[1].schema[0].name).to.equal('name');
    expect(params[1].schema[0].type).to.equal('string');
    expect(params[1].schema[1].name).to.equal('enabled');
    expect(params[1].schema[1].type).to.equal('boolean');
    expect(params[1].schema[2].name).to.equal('data');
    expect(params[1].schema[2].type).to.equal('object');
    expect(params[1].schema[2].schema[0].name).to.equal('a');
    expect(params[1].schema[2].schema[0].type).to.equal('string');
    expect(params[1].schema[2].schema[1].name).to.equal('b');
    expect(params[1].schema[2].schema[1].type).to.equal('string');
    expect(params[1].schema[3].name).to.equal('timestamp');
    expect(params[1].schema[3].type).to.equal('number');

  });

  it('Should read "schema/optional" parameters', () => {

    let params = definitions['schema/optional'].params;
    expect(params.length).to.equal(3);

    expect(params[0].name).to.equal('before');
    expect(params[0].defaultValue).to.equal(null);
    expect(params[0].type).to.equal('string');
    expect(params[0].description).to.equal('');

    expect(params[1].name).to.equal('obj');
    expect(params[1].type).to.equal('object');
    expect(params[1].description).to.equal('');
    expect(params[1].schema).to.exist;
    expect(params[1].schema[0].name).to.equal('name');
    expect(params[1].schema[0].defaultValue).to.equal(null);
    expect(params[1].schema[0].type).to.equal('string');
    expect(params[1].schema[1].name).to.equal('enabled');
    expect(params[1].schema[1].defaultValue).to.equal(null);
    expect(params[1].schema[1].type).to.equal('boolean');
    expect(params[1].schema[2].name).to.equal('data');
    expect(params[1].schema[2].type).to.equal('object');
    expect(params[1].schema[2].schema[0].name).to.equal('a');
    expect(params[1].schema[2].schema[0].defaultValue).to.equal(null);
    expect(params[1].schema[2].schema[0].type).to.equal('string');
    expect(params[1].schema[2].schema[1].name).to.equal('b');
    expect(params[1].schema[2].schema[1].type).to.equal('string');
    expect(params[1].schema[3].name).to.equal('timestamp');
    expect(params[1].schema[3].type).to.equal('number');

    expect(params[2].name).to.equal('after');
    expect(params[2].type).to.equal('string');
    expect(params[2].description).to.equal('');

  });

  it('Should read "schema/nested" parameters', () => {

    let params = definitions['schema/nested'].params;

    expect(params).to.deep.equal([
      {
        name: 'before',
        type: 'string',
        description: ''
      },
      {
        name: 'obj',
        type: 'object',
        description: '',
        schema: [
          {
            name: 'str',
            type: 'string',
            description: ''
          },
          {
            name: 'bool',
            type: 'boolean',
            description: ''
          },
          {
            name: 'obj',
            type: 'object',
            description: '',
            schema: [
              {
                name: 'str',
                type: 'string',
                description: ''
              },
              {
                name: 'obj',
                type: 'object',
                description: '',
                schema: [
                  {
                    name: 'str',
                    type: 'string',
                    description: ''
                  }
                ]
              }
            ]
          },
          {
            name: 'num',
            type: 'number',
            description: ''
          }
        ]
      },
      {
        name: 'after',
        type: 'string',
        description: ''
      }
    ]);

  });

  it('Should read "schema/array" parameters', () => {

    let params = definitions['schema/array'].params;

    expect(params).to.deep.equal([
      {
        name: 'arr1',
        type: 'array',
        description: '',
        schema: [
          {
            name: 'str',
            type: 'string',
            description: ''
          }
        ]
      },
      {
        name: 'arr2',
        type: 'array',
        description: '',
        schema: [
          {
            name: 'obj',
            type: 'object',
            description: '',
            schema: [
              {
                name: 'str',
                type: 'string',
                description: ''
              },
              {
                name: 'obj',
                type: 'object',
                description: '',
                schema: [
                  {
                    name: 'str',
                    type: 'string',
                    description: ''
                  },

                ]
              }
            ]
          }
        ]
      }
    ]);

  });

  it('Should read "enum_schema" parameters', () => {

    let params = definitions['enum_schema'].params;

    expect(params).to.deep.equal([
      {
        name: 'before',
        type: 'string',
        description: 'a param'
      },
      {
        name: 'valueRange',
        type: 'object',
        description: 'The data to be inserted',
        schema: [
          {
            type: 'string',
            name: 'range',
            description: ''
          },
          {
            type: 'enum',
            name: 'majorDimension',
            description: '',
            members: [
              ['ROWS', "ROWS"],
              ['COLUMNS', "COLUMNS"]
            ]
          },
          {
            type: 'array',
            name: 'values',
            description: 'An array of arrays, the outer array representing all the data and each inner array representing a major dimension. Each item in the inner array corresponds with one cell'
          }
        ]
      },
      {
        name: 'after',
        type: 'string',
        description: 'a param'
      }
    ]);

  });

  it('Should read "inline" parameters', () => {

    let params = definitions['inline'].params;
    expect(params.length).to.equal(0);

  });

  it('Should have a named return value and description', () => {

    let definition = definitions['named_return'];
    expect(definition.returns.name).to.equal('returnName');
    expect(definition.returns.description).to.equal('And a return description');

  });

  it('Should have a nullable return value', () => {

    let definition = definitions['nullable_return'];
    expect(definition.returns.description).to.equal('not sure');
    expect(definition.returns.type).to.equal('string');
    expect(definition.returns.name).to.equal('maybestring');
    expect(definition.returns.defaultValue).to.equal(null);

  });

  it('Should have a return value, description and type even with no name', () => {

    let definition = definitions['noname_return'];
    expect(definition.returns.name).to.equal('');
    expect(definition.returns.description).to.equal('');
    expect(definition.returns.type).to.equal('buffer');

  });

  it('Should read "enum" parameters', () => {

    let params = definitions['enum'].params;

    expect(params).to.deep.equal([
      {
        name: 'before',
        type: 'any',
        defaultValue: null,
        description: ''
      },
      {
        name: 'basic',
        type: 'enum',
        description: 'some basic types',
        members: [['num', 0], ['double', '1'], ['float', 1.2], ['numstr', '123']]
      },
      {
        name: 'after',
        type: 'any',
        defaultValue: null,
        description: ''
      }
    ]);

  });

  it('Should read "enum_nested" parameters', () => {

    let params = definitions['enum_nested'].params;

    expect(params).to.deep.equal([
      {
        name: 'obj',
        type: 'object',
        description: '',
        schema: [
          {
            name: 'selector',
            type: 'string',
            description: 'The selector to query'
          },
          {
            name: 'operator',
            type: 'enum',
            description: 'Which data to retrieve: can be "text", "html" or "attr"',
            members: [['text', 'text'], ['html', 'html'], ['attr', 'attr']]
          },
          {
            name: 'attr',
            type: 'string',
            defaultValue: null,
            description: 'If method is "attr", which attribute to retrieve'
          }
        ]
      },
      {
        name: 'arr',
        type: 'array',
        description: '',
        schema: [
          {
            name: 'obj',
            type: 'object',
            description: '',
            schema: [
              {
                name: 'selector',
                type: 'string',
                description: 'The selector to query'
              },
              {
                name: 'operator',
                type: 'enum',
                description: 'Which data to retrieve: can be "text", "html" or "attr"',
                members: [['text', 'text'], ['html', 'html'], ['attr', 'attr']]
              },
              {
                name: 'attr',
                type: 'string',
                defaultValue: null,
                description: 'If method is "attr", which attribute to retrieve'
              }
            ]
          }
        ]
      },
      {
        name: 'obj2',
        type: 'object',
        description: '',
        schema: [
          {
            name: 'operator',
            type: 'enum',
            description: 'Which data to retrieve: can be "text", "html" or "attr"',
            members: [['text', 'text'], ['html', 'html'], ['attr', 'attr']]
          },
          {
            name: 'selector',
            type: 'string',
            description: 'The selector to query'
          },
          {
            name: 'attr',
            type: 'string',
            defaultValue: null,
            description: 'If method is "attr", which attribute to retrieve'
          }
        ]
      },
      {
        name: 'arr2',
        type: 'array',
        description: '',
        schema: [
          {
            name: 'obj',
            type: 'object',
            description: '',
            schema: [
              {
                name: 'operator',
                type: 'enum',
                description: 'Which data to retrieve: can be "text", "html" or "attr"',
                members: [['text', 'text'], ['html', 'html'], ['attr', 'attr']]
              },
              {
                name: 'selector',
                type: 'string',
                description: 'The selector to query'
              },
              {
                name: 'attr',
                type: 'string',
                defaultValue: null,
                description: 'If method is "attr", which attribute to retrieve'
              }
            ]
          }
        ]
      }
    ]);

  });

  it('Should read "enum_nested_optional" parameters', () => {

    let params = definitions['enum_nested_optional'].params;

    expect(params).to.deep.equal([
      {
        name: 'descriptionHtml',
        type: 'string',
        defaultValue: null,
        description: 'The description of the product, complete with HTML formatting.'
      },
      {
        name: 'metafields',
        type: 'array',
        defaultValue: null,
        description: 'The metafields to associate with this product.',
        schema: [
          {
            name: 'MetafieldInput',
            type: 'object',
            description: 'Specifies the input fields for a metafield.',
            schema: [
              {
                name: 'value',
                type: 'string',
                description: 'The value of a metafield.',
                defaultValue: null
              },
              {
                name: 'valueType',
                type: 'enum',
                description: 'Metafield value types.',
                members: [['STRING', 'STRING'], ['INTEGER', 'INTEGER'], ['JSON_STRING', 'JSON_STRING']],
                defaultValue: null
              }
            ]
          }
        ]
      },
      {
        name: 'privateMetafields',
        type: 'array',
        description: 'The private metafields to associated with this product.',
        defaultValue: null,
        schema: [
          {
            name: 'PrivateMetafieldInput',
            type: 'object',
            description: 'Specifies the input fields for a PrivateMetafield.',
            schema: [
              {
                name: 'owner',
                type: 'any',
                description: 'The owning resource.',
                defaultValue: null
              },
              {
                name: 'valueInput',
                type: 'object',
                description: 'The value and value type of the metafield, wrapped in a ValueInput object.',
                schema: [
                  {
                    name: 'value',
                    type: 'string',
                    description: 'The value of a private metafield.'
                  },
                  {
                    name: 'valueType',
                    type: 'enum',
                    description: 'Private Metafield value types.',
                    members: [['STRING', 'STRING'], ['INTEGER', 'INTEGER'], ['JSON_STRING', 'JSON_STRING']]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        name: 'variants',
        type: 'array',
        description: 'A list of variants associated with the product.',
        defaultValue: null,
        schema: [
          {
            name: 'ProductVariantInput',
            type: 'object',
            description: 'Specifies a product variant to create or update.',
            schema: [
              {
                name: 'barcode',
                type: 'string',
                description: 'The value of the barcode associated with the product.',
                defaultValue: null
              },
              {
                name: 'inventoryPolicy',
                type: 'enum',
                description: 'The inventory policy for a product variant controls whether customers can continue to buy the variant when it is out of stock. When the value is `continue`, customers are able to buy the variant when it\'s out of stock. When the value is `deny`, customers can\'t buy the variant when it\'s out of stock.',
                members: [['DENY', 'DENY'], ['CONTINUE', 'CONTINUE']],
                defaultValue: null
              },
              {
                name: 'metafields',
                type: 'array',
                description: 'Additional customizable information about the product variant.',
                defaultValue: null,
                schema: [
                  {
                    name: 'MetafieldInput',
                    type: 'object',
                    description: 'Specifies the input fields for a metafield.',
                    schema: [
                      {
                        name: 'description',
                        type: 'string',
                        description: 'The description of the metafield .',
                        defaultValue: null
                      },
                      {
                        name: 'valueType',
                        type: 'enum',
                        description: 'Metafield value types.',
                        members: [['STRING', 'STRING'], ['INTEGER', 'INTEGER'], ['JSON_STRING', 'JSON_STRING']],
                        defaultValue: null
                      }
                    ]
                  }
                ]
              },
              {
                name: 'privateMetafields',
                type: 'array',
                description: 'The private metafields to associated with this product.',
                defaultValue: null,
                schema: [
                  {
                    name: 'PrivateMetafieldInput',
                    type: 'object',
                    description: 'Specifies the input fields for a PrivateMetafield.',
                    schema: [
                      {
                        name: 'owner',
                        type: 'any',
                        description: 'The owning resource.',
                        defaultValue: null
                      },
                      {
                        name: 'valueInput',
                        type: 'object',
                        description: 'The value and value type of the metafield, wrapped in a ValueInput object.',
                        schema: [
                          {
                            name: 'value',
                            type: 'string',
                            description: 'The value of a private metafield.'
                          },
                          {
                            name: 'valueType',
                            type: 'enum',
                            description: 'Private Metafield value types.',
                            members: [['STRING', 'STRING'], ['INTEGER', 'INTEGER'], ['JSON_STRING', 'JSON_STRING']]
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                name: 'taxCode',
                type: 'string',
                description: 'The tax code associated with the variant.',
                defaultValue: null
              },
              {
                name: 'weightUnit',
                type: 'enum',
                description: 'Units of measurement for weight.',
                members: [['KILOGRAMS', 'KILOGRAMS'], ["GRAMS", "GRAMS"], ["POUNDS", "POUNDS"], ["OUNCES", "OUNCES"]],
                defaultValue: null
              }
            ]
          }
        ]
      },
      {
        name: 'media',
        type: 'array',
        description: 'List of new media to be added to the product.',
        defaultValue: null,
        schema: [
          {
            name: 'CreateMediaInput',
            type: 'object',
            description: 'Specifies the input fields required to create a media object.',
            schema: [
              {
                name: 'originalSource',
                type: 'string',
                description: 'The original source of the media object. May be an external URL or signed upload URL.'
              },
              {
                name: 'mediaContentType',
                type: 'enum',
                description: 'The possible content types for a media object.',
                members: [['VIDEO', 'VIDEO'], ['EXTERNAL_VIDEO', 'EXTERNAL_VIDEO'], ['MODEL_3D', 'MODEL_3D'], ['IMAGE', 'IMAGE']]
              }
            ]
          }
        ]
      }
    ]);

  });

  it('Should read "options" parameters', () => {

    let params = definitions['options'].params;
    expect(params.length).to.equal(2);

    expect(params[0].name).to.equal('database');
    expect(params[0].type).to.equal('string');
    expect(params[0].description).to.equal('A database');
    expect(params[0].defaultMetafield).to.equal('db.databaseId');
    expect(params[0].options).to.exist;
    expect(Object.keys(params[0].options).length).to.equal(2);
    expect(params[0].options.lib).to.equal('db.schema.databases.list');
    expect(params[0].options.extract).to.exist;
    expect(params[0].options.extract.labels).to.equal('$[].name');
    expect(params[0].options.extract.values).to.equal('$[].id');

    expect(params[1].name).to.equal('table');
    expect(params[1].type).to.equal('string');
    expect(params[1].description).to.equal('A table');
    expect(Object.keys(params[1].options).length).to.equal(3);
    expect(params[1].options.lib).to.equal('db.schema.databases.retrieve');
    expect(params[1].options.map).to.exist;
    expect(Object.keys(params[1].options.map).length).to.equal(1);
    expect(params[1].options.map).to.haveOwnProperty('databaseId');
    expect(params[1].options.map.databaseId).to.equal('database');
    expect(params[1].options.extract).to.exist;
    expect(params[1].options.extract.labels).to.equal('$[].name');
    expect(params[1].options.extract.values).to.equal('$[].name');

  });

  it('Should read "options" parameters in keyql', () => {

    let params = definitions['keyql_options'].params;
    expect(params.length).to.equal(3);

    expect(params[0].name).to.equal('query');
    expect(params[0].type).to.equal('object.keyql.query');
    expect(params[0].description).to.equal('Query API based on these parameters');
    expect(params[0].options).to.exist;
    expect(Object.keys(params[0].options).length).to.equal(1);
    expect(params[0].options.values).to.be.an('array');
    expect(params[0].options.values.length).to.equal(3);
    expect(params[0].options.values[0]).to.equal('status');
    expect(params[0].options.values[1]).to.equal('hello');
    expect(params[0].options.values[2]).to.equal('goodbye');

    expect(params[1].name).to.equal('query2');
    expect(params[1].type).to.equal('object.keyql.query');
    expect(params[1].description).to.equal('Query API based on these parameters');
    expect(params[1].options).to.exist;
    expect(Object.keys(params[1].options).length).to.equal(2);
    expect(params[1].options.lib).to.equal('db.schema.database.fields');
    expect(params[1].options.extract).to.exist;
    expect(params[1].options.extract.labels).to.equal('$.fields[].name');
    expect(params[1].options.extract.values).to.equal('$.fields[].id');

    expect(params[2].name).to.equal('keyqlquery');
    expect(params[2].type).to.equal('array');
    expect(params[2].schema).to.exist;
    expect(params[2].schema.length).to.equal(1);
    expect(params[2].schema[0].name).to.equal('queryobj');
    expect(params[2].schema[0].type).to.equal('object.keyql.query');
    expect(params[2].schema[0].description).to.equal('Query API based on these parameters');
    expect(params[2].schema[0].options).to.exist;
    expect(Object.keys(params[2].schema[0].options).length).to.equal(1);
    expect(params[2].schema[0].options.values).to.be.an('array');
    expect(params[2].schema[0].options.values.length).to.equal(3);
    expect(params[2].schema[0].options.values[0]).to.equal('status');
    expect(params[2].schema[0].options.values[1]).to.equal('hello');
    expect(params[2].schema[0].options.values[2]).to.equal('goodbye');

  });

  it('Should read "alternate_schemas" parameters', () => {

    let params = definitions['alternate_schemas'].params;
    let returns = definitions['alternate_schemas'].returns;
    let schemaCheck = [
      {
        name: 'fileOrFolder',
        description: '',
        type: 'object',
        schema: [
          {
            name: 'name',
            description: '',
            type: 'string'
          },
          {
            name: 'size',
            description: '',
            type: 'integer'
          }
        ],
        alternateSchemas: [
          [
            {
              name: 'name',
              description: '',
              type: 'string'
            },
            {
              name: 'files',
              description: '',
              type: 'array'
            },
            {
              name: 'options',
              description: '',
              type: 'object',
              schema: [
                {
                  name: 'type',
                  description: '',
                  type: 'string'
                }
              ],
              alternateSchemas: [
                [
                  {
                    name: 'type',
                    description: '',
                    type: 'number'
                  }
                ]
              ]
            }
          ]
        ]
      }
    ];

    expect(params).to.deep.equal(schemaCheck);
    expect(returns).to.deep.equal(schemaCheck[0]);

  });

  it('Should read "esdoc_support" parameters', () => {

    let params = definitions['esdoc_support'].params;
    let returns = definitions['esdoc_support'].returns;
    let schemaCheck = [
      {
        name: 'alpha',
        description: '',
        type: 'string'
      },
      {
        name: 'beta',
        description: '',
        type: 'object',
        schema: [
          {
            name: 'num',
            description: '',
            type: 'number'
          },
          {
            name: 'obj',
            description: '',
            type: 'object',
            schema: [
              {
                name: 'num',
                description: '',
                type: 'number',
                range: {min: 1, max: 100}
              },
              {
                name: 'float',
                description: '',
                type: 'number',
                range: {min: 1.1, max: 2.1}
              },
              {
                name: 'str',
                description: '',
                type: 'string',
                size: {min: 2, max: 7}
              }
            ]
          }
        ]
      },
      {
        name: 'gamma',
        description: '',
        type: 'array',
        size: {min: 1, max: 3},
        schema: [
          {
            name: '',
            description: '',
            type: 'array',
            schema: [
              {
                name: '',
                description: '',
                type: 'number',
                range: {min: 20, max: 30}
              }
            ]
          }
        ]
      },
      {
        name: 'boolstring',
        description: '',
        type: 'boolean',
        alternateTypes: [
          {
            name: '',
            description: '',
            type: 'string'
          }
        ]
      },
      {
        name: 'mystery',
        description: '',
        type: 'any',
        options: {
          values: ["jazzhands", 5.9]
        },
        alternateTypes: [
          {
            name: '',
            description: '',
            type: 'array',
            size: {min: 5, max: 5}
          },
          {
            name: '',
            description: '',
            type: 'boolean'
          }
        ]
      },
      {
        name: 'hg',
        description: '',
        type: 'string',
        defaultValue: 5.2,
        options: {
          values: ['hello', 'goodbye']
        },
        alternateTypes: [
          {
            name: '',
            description: '',
            type: 'number'
          }
        ]
      },
      {
        name: 'a1',
        description: '',
        type: 'array',
        schema: [
          {
            name: '',
            description: '',
            type: 'string'
          }
        ]
      },
      {
        name: 'a2',
        description: '',
        type: 'array',
        size: {min: 2, max: 7},
        schema: [
          {
            name: '',
            description: '',
            type: 'array',
            size: {min: 5, max: 5},
            schema: [
              {
                name: '',
                description: '',
                type: 'buffer'
              }
            ]
          }
        ]
      }
    ];

    let returnsCheck = {
      name: 'response',
      description: '',
      type: 'object',
      schema: [
        {
          name: 'a',
          description: '',
          type: 'number'
        },
        {
          name: 'b',
          description: '',
          type: 'object',
          schema: [
            {
              name: 'c',
              description: '',
              type: 'string'
            }
          ]
        }
      ]
    };

    expect(params).to.deep.equal(schemaCheck);
    expect(returns).to.deep.equal(returnsCheck);

  });

};
