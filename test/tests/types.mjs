import chai from 'chai';
const expect = chai.expect;

import { InstantAPI } from '../helpers.mjs';

const FunctionParser = InstantAPI.FunctionParser;
const NodeJsFunctionParser = new FunctionParser.parsers['nodejs']();
const types = InstantAPI.types;

export const name = 'Types';
export default async function (setupResult) {

  it('should validate "string"', () => {

    expect(types.validate('string', 'abc')).to.equal(true);
    expect(types.validate('string', 1)).to.equal(false);
    expect(types.validate('string', 1.1)).to.equal(false);
    expect(types.validate('string', 1e300)).to.equal(false);
    expect(types.validate('string', true)).to.equal(false);
    expect(types.validate('string', {})).to.equal(false);
    expect(types.validate('string', [])).to.equal(false);
    expect(types.validate('string', Buffer.from([]))).to.equal(false);

    expect(types.validate('string', null)).to.equal(false);
    expect(types.validate('string', null, true)).to.equal(true);

  });

  it('should validate "number"', () => {

    expect(types.validate('number', 'abc')).to.equal(false);
    expect(types.validate('number', 1)).to.equal(true);
    expect(types.validate('number', 1.1)).to.equal(true);
    expect(types.validate('number', 1e300)).to.equal(true);
    expect(types.validate('number', true)).to.equal(false);
    expect(types.validate('number', {})).to.equal(false);
    expect(types.validate('number', [])).to.equal(false);
    expect(types.validate('number', Buffer.from([]))).to.equal(false);

    expect(types.validate('number', null)).to.equal(false);
    expect(types.validate('number', null, true)).to.equal(true);

  });

  it('should validate "float"', () => {

    expect(types.validate('float', 'abc')).to.equal(false);
    expect(types.validate('float', 1)).to.equal(true);
    expect(types.validate('float', 1.1)).to.equal(true);
    expect(types.validate('float', 1e300)).to.equal(true);
    expect(types.validate('float', true)).to.equal(false);
    expect(types.validate('float', {})).to.equal(false);
    expect(types.validate('float', [])).to.equal(false);
    expect(types.validate('float', Buffer.from([]))).to.equal(false);

    expect(types.validate('float', null)).to.equal(false);
    expect(types.validate('float', null, true)).to.equal(true);

  });

  it('should validate "integer"', () => {

    expect(types.validate('integer', 'abc')).to.equal(false);
    expect(types.validate('integer', 1)).to.equal(true);
    expect(types.validate('integer', 1.1)).to.equal(false);
    expect(types.validate('integer', 1e300)).to.equal(false);
    expect(types.validate('integer', true)).to.equal(false);
    expect(types.validate('integer', {})).to.equal(false);
    expect(types.validate('integer', [])).to.equal(false);
    expect(types.validate('integer', Buffer.from([]))).to.equal(false);

    expect(types.validate('integer', null)).to.equal(false);
    expect(types.validate('integer', null, true)).to.equal(true);

  });

  it('should validate "boolean"', () => {

    expect(types.validate('boolean', 'abc')).to.equal(false);
    expect(types.validate('boolean', 1)).to.equal(false);
    expect(types.validate('boolean', 1.1)).to.equal(false);
    expect(types.validate('boolean', 1e300)).to.equal(false);
    expect(types.validate('boolean', true)).to.equal(true);
    expect(types.validate('boolean', {})).to.equal(false);
    expect(types.validate('boolean', [])).to.equal(false);
    expect(types.validate('boolean', Buffer.from([]))).to.equal(false);

    expect(types.validate('boolean', null)).to.equal(false);
    expect(types.validate('boolean', null, true)).to.equal(true);

  });

  it('should validate "object"', () => {

    expect(types.validate('object', 'abc')).to.equal(false);
    expect(types.validate('object', 1)).to.equal(false);
    expect(types.validate('object', 1.1)).to.equal(false);
    expect(types.validate('object', 1e300)).to.equal(false);
    expect(types.validate('object', true)).to.equal(false);
    expect(types.validate('object', {})).to.equal(true);
    expect(types.validate('object', [])).to.equal(false);
    expect(types.validate('object', Buffer.from([]))).to.equal(false);

    expect(types.validate('object', null)).to.equal(false);
    expect(types.validate('object', null, true)).to.equal(true);

  });

  it('should validate "array"', () => {

    expect(types.validate('array', 'abc')).to.equal(false);
    expect(types.validate('array', 1)).to.equal(false);
    expect(types.validate('array', 1.1)).to.equal(false);
    expect(types.validate('array', 1e300)).to.equal(false);
    expect(types.validate('array', true)).to.equal(false);
    expect(types.validate('array', {})).to.equal(false);
    expect(types.validate('array', [])).to.equal(true);
    expect(types.validate('array', Buffer.from([]))).to.equal(false);

    expect(types.validate('array', null)).to.equal(false);
    expect(types.validate('array', null, true)).to.equal(true);

  });

  it('should validate "buffer"', () => {

    expect(types.validate('buffer', 'abc')).to.equal(false);
    expect(types.validate('buffer', 1)).to.equal(false);
    expect(types.validate('buffer', 1.1)).to.equal(false);
    expect(types.validate('buffer', 1e300)).to.equal(false);
    expect(types.validate('buffer', true)).to.equal(false);
    expect(types.validate('buffer', {})).to.equal(false);
    expect(types.validate('buffer', [])).to.equal(false);
    expect(types.validate('buffer', Buffer.from([]))).to.equal(true);

    expect(types.validate('buffer', null)).to.equal(false);
    expect(types.validate('buffer', null, true)).to.equal(true);

  });

  it('should validate "any"', () => {

    expect(types.validate('any', 'abc')).to.equal(true);
    expect(types.validate('any', 1)).to.equal(true);
    expect(types.validate('any', 1.1)).to.equal(true);
    expect(types.validate('any', 1e300)).to.equal(true);
    expect(types.validate('any', true)).to.equal(true);
    expect(types.validate('any', {})).to.equal(true);
    expect(types.validate('any', [])).to.equal(true);
    expect(types.validate('any', Buffer.from([]))).to.equal(true);

    expect(types.validate('any', null)).to.equal(true);
    expect(types.validate('any', null, true)).to.equal(true);

  });

  it('Should validate "enum"', () => {

    let members = [
      ['sunday', 0],
      ['1', 1],
      ['1.1', 2],
      ['1e300', 3],
      ['true', 4],
      ['{}', 5],
      ['[]', 6],
      ['Buffer.from([])', 7],
      ['null', 8]
    ];

    expect(types.validate('enum', 'sunday', false, members)).to.equal(true);
    expect(types.validate('enum', '1', false, members)).to.equal(true);
    expect(types.validate('enum', '1.1', false, members)).to.equal(true);
    expect(types.validate('enum', '1e300', false, members)).to.equal(true);
    expect(types.validate('enum', 'true', false, members)).to.equal(true);
    expect(types.validate('enum', '{}', false, members)).to.equal(true);
    expect(types.validate('enum', '[]', false, members)).to.equal(true);
    expect(types.validate('enum', 'Buffer.from([])', false, members)).to.equal(true);
    expect(types.validate('enum', 'null', false, members)).to.equal(true);
    expect(types.validate('enum', null, true, members)).to.equal(true);

    expect(types.validate('enum', 'abc', false, members)).to.equal(false);
    expect(types.validate('enum', 1, false, members)).to.equal(false);
    expect(types.validate('enum', 1.1, false, members)).to.equal(false);
    expect(types.validate('enum', 1e300, false, members)).to.equal(false);
    expect(types.validate('enum', true, false, members)).to.equal(false);
    expect(types.validate('enum', {}, false, members)).to.equal(false);
    expect(types.validate('enum', [], false, members)).to.equal(false);
    expect(types.validate('enum', Buffer.from([]), false, members)).to.equal(false);
    expect(types.validate('enum', null, false, members)).to.equal(false);

  });

  it('Should validate an "object" with a schema that has a "enum" member', () => {

    expect(
      types.validate('object', { offset: '0 minutes' }, false, [
        [
          {
            name: 'offset',
            type: 'enum',
            description: `How many minutes past the start of each hour you would like your API to execute`,
            members: [
              ['0 minutes', 0],
              ['15 minutes', 60 * 15],
              ['30 minutes', 60 * 30],
              ['45 minutes', 60 * 45]
            ]
          }
        ]
      ])
    ).to.equal(true);

    expect(
      types.validate('object', { offset: '0 min' }, false, [
        [
          {
            name: 'offset',
            type: 'enum',
            description: `How many minutes past the start of each hour you would like your API to execute`,
            members: [
              ['0 minutes', 0],
              ['15 minutes', 60 * 15],
              ['30 minutes', 60 * 30],
              ['45 minutes', 60 * 45]
            ]
          }
        ]
      ])
    ).to.equal(false);

  });

  it('Should validate an "array" with a schema that has a "enum" member', () => {

    expect(
      types.validate('array', ['0 minutes'], false, [
        [
          {
            name: 'offset',
            type: 'enum',
            description: `How many minutes past the start of each hour you would like your API to execute`,
            members: [
              ['0 minutes', 0],
              ['15 minutes', 60 * 15],
              ['30 minutes', 60 * 30],
              ['45 minutes', 60 * 45]
            ]
          }
        ]
      ])
    ).to.equal(true);

    expect(
      types.validate('array', ['0 min'], false, [
        [
          {
            name: 'offset',
            type: 'enum',
            description: `How many minutes past the start of each hour you would like your API to execute`,
            members: [
              ['0 minutes', 0],
              ['15 minutes', 60 * 15],
              ['30 minutes', 60 * 30],
              ['45 minutes', 60 * 45]
            ]
          }
        ]
      ])
    ).to.equal(false);

  });

  it('should throw on invalid schema type', () => {
    const throws = () => {
      types.validate('object', {}, false, {})
    }
    expect(throws).to.throw(/Array/)
  })

  it('should validate "object" with schema', () => {

    expect(types.validate('object', {})).to.equal(true);
    expect(
      types.validate(
        'object',
        {},
        false,
        [
          [
            {name: 'hello', type: 'string'}
          ]
        ]
      )
    ).to.equal(false);
    expect(
      types.validate(
        'object',
        {
          hello: 'what'
        },
        false,
        [
          [
            {name: 'hello', type: 'string'}
          ]
        ]
      )
    ).to.equal(true);

    let testSchema = [
      {name: 'hello', type: 'string'},
      {name: 'data', type: 'object', schema: [
        {name: 'a', type: 'string'},
        {name: 'b', type: 'string'}
      ]},
      {name: 'tf', type: 'boolean'}
    ];

    expect(
      types.validate(
        'object',
        {},
        false,
        [testSchema]
      )
    ).to.equal(false);
    expect(
      types.validate(
        'object',
        {
          hello: 'hey',
        },
        false,
        [testSchema]
      )
    ).to.equal(false);
    expect(
      types.validate(
        'object',
        {
          hello: 'hey',
          data: {a: 'a', b: 'b'},
          tf: true
        },
        false,
        [testSchema]
      )
    ).to.equal(true);
    expect(
      types.validate(
        'object',
        {
          hello: 'hey',
          data: {a: 1, b: 'b'},
          tf: true
        },
        false,
        [testSchema]
      )
    ).to.equal(false);


    expect(types.validate('object', null)).to.equal(false);
    expect(types.validate('object', null, true)).to.equal(true);

  });

  it('should validate "object.keyql.query"', () => {

    expect(
      types.validate('object.keyql.query', {
        first_name: 'Dolores',
        eye_color__in: ['blue', 'green']
      })
    ).to.equal(true);

  });

  it('should validate "object.keyql.limit"', () => {

    expect(
      types.validate('object.keyql.limit', {
        offset: 0,
        count: 0
      })
    ).to.equal(true);

  });

  it('should sanitize "object.keyql.query"', () => {

    try {
      types.sanitize('object.keyql.query', {
        first_name: 'Dolores',
        eye_color__in: ['blue', 'green']
      });
    } catch (err) {
      expect(err).to.not.exist;
    }

  });

  it('should sanitize "object.keyql.limit"', () => {

    try {
      types.sanitize('object.keyql.limit', {
        first_name: 'Dolores',
        eye_color__in: ['blue', 'green']
      });
    } catch (err) {
      expect(err).to.exist;
    }

    try {
      types.sanitize('object.keyql.limit', {
        count: 0,
        offset: 0
      });
    } catch (err) {
      expect(err).to.not.exist;
    }

  });

  it('should convert types from strings', () => {

    expect(types.convert('number', '1e300')).to.equal(1e300);
    expect(types.convert('float', '100.1')).to.equal(100.1);
    expect(types.convert('integer', '100')).to.equal(100);
    expect(types.convert('boolean', 'f')).to.equal(false);
    expect(types.convert('boolean', 'false')).to.equal(false);
    expect(types.convert('boolean', 't')).to.equal(true);
    expect(types.convert('boolean', 'true')).to.equal(true);
    expect(types.convert('object', '{"a":1}')).to.deep.equal({a: 1});
    expect(types.convert('array', '[1,2,3]')).to.deep.equal([1, 2, 3]);
    expect(types.convert('buffer', '{"_bytes":[1,2]}')).to.be.instanceof(Buffer);
    expect(types.convert('buffer', '{"_base64":"Y2FyZWVyc0BzdGRsaWIuY29t"}')).to.be.instanceof(Buffer);

  });

  it('should check types', () => {

    expect(types.check()).to.equal('any');
    expect(types.check(null)).to.equal('any');
    expect(types.check('hello')).to.equal('string');
    expect(types.check(1e300)).to.equal('number');
    expect(types.check(100.1)).to.equal('number');
    expect(types.check(100)).to.equal('number');
    expect(types.check(true)).to.equal('boolean');
    expect(types.check(false)).to.equal('boolean');
    expect(types.check({})).to.equal('object');
    expect(types.check([])).to.equal('array');
    expect(types.check(Buffer.from([]))).to.equal('buffer');

  });

  it('should introspect basic types', () => {

    expect(types.introspect(null)).to.deep.equal({
      type: 'any',
      defaultValue: null
    });
    expect(types.introspect(4)).to.deep.equal({
      type: 'number'
    });
    expect(types.introspect('hello')).to.deep.equal({
      type: 'string'
    });
    expect(types.introspect(Buffer.from(Array(99)))).to.deep.equal({
      type: 'buffer'
    });
    expect(types.introspect({a: 'a', b: 'b', c: null, d: 4})).to.deep.equal({
      type: 'object',
      schema: [{
        name: 'a',
        type: 'string',
        sampleValue: 'a'
      }, {
        name: 'b',
        type: 'string',
        sampleValue: 'b'
      }, {
        name: 'c',
        type: 'any',
        defaultValue: null
      }, {
        name: 'd',
        type: 'number',
        sampleValue: 4
      }]
    });
    expect(types.introspect([1, 2, 3])).to.deep.equal({
      type: 'array',
      schema: [{
        type: 'number'
      }]
    });
    expect(types.introspect([['one', 'two', 'three'], ['four'], ['five', 'six']])).to.deep.equal({
      type: 'array',
      schema: [{
        type: 'array',
        schema: [{
          type: 'string'
        }]
      }]
    });

  });

  it('Should introspect a nested object', () => {

    expect(
      types.introspect({
        hello: 'hey',
        data: {a: 'a', b: 'b'},
        nestedArray: [{c: 'c', d: 'd'}, {c: 'c', e: 'e'}],
        deeplyNestedArray: [
          [{f: 'f', g: 'g'}, {f: 'f', g: 'g'}, {g: 'g', h: 'h'}],
          [{f: 'f', g: 'g'}, {g: 'g', h: 'h'}, {g: 'g', h: 'h'}]
        ],
        tf: true
      })
    ).to.deep.equal({
      type: 'object',
      schema: [{
        name: 'hello',
        type: 'string',
        sampleValue: 'hey'
      }, {
        name: 'data',
        type: 'object',
        schema: [{
          name: 'a',
          type: 'string',
          sampleValue: 'a'
        }, {
          name: 'b',
          type: 'string',
          sampleValue: 'b'
        }]
      }, {
        name: 'nestedArray',
        type: 'array',
        schema: [{
          type: 'object',
          schema: [{
            type: 'string',
            name: 'c',
            sampleValue: 'c'
          }]
        }]
      }, {
        name: 'deeplyNestedArray',
        type: 'array',
        schema: [{
          type: 'array',
          schema: [{
            type: 'object',
            schema: [{
              type: 'string',
              name: 'g',
              sampleValue: 'g'
            }]
          }]
        }]
      }, {
        name: 'tf',
        type: 'boolean',
        sampleValue: true
      }]
    });

  });

  it('Should introspect heterogenous arrays', () => {

    expect(types.introspect(['one', 2, 3, 4])).to.deep.equal({
      type: 'array',
      schema: [{
        type: 'any'
      }]
    });
    expect(types.introspect({
      nested: ['one', 2, 3, 4],
      a: Buffer.from([])
    })).to.deep.equal({
      type: 'object',
      schema: [{
        type: 'array',
        name: 'nested',
        schema: [{
          type: 'any'
        }]
      }, {
        type: 'buffer',
        name: 'a',
        sampleValue: Buffer.from([])
      }]
    });

  });

  it('Should introspect more complex nullable values properly', () => {

    expect(types.introspect([1, 2, null, 4])).to.deep.equal({
      type: 'array',
      schema: [{
        type: 'number',
        defaultValue: null
      }]
    });
    expect(types.introspect([null, null, 1, null, 2, 3])).to.deep.equal({
      type: 'array',
      schema: [{
        type: 'number',
        defaultValue: null
      }]
    });
    expect(types.introspect([null])).to.deep.equal({
      type: 'array',
      schema: [{
        type: 'any',
        defaultValue: null
      }]
    });
    expect(types.introspect([1, 'two', null, 4])).to.deep.equal({
      type: 'array',
      schema: [{
        type: 'any',
        defaultValue: null
      }]
    });
    expect(types.introspect({
      nested: ['one', 2, 3, null],
      nestedObjects: [{
        one: 'one',
        two: 2,
        three: 3,
        four: 4,
        five: 'five'
      }, {
        one: null,
        two: null,
        three: null,
        four: 44,
        five: '5ive'
      }, {
        one: 'uno',
        two: 2,
        three: 'three',
        four: 444
      }]
    })).to.deep.equal({
      type: 'object',
      schema: [{
        type: 'array',
        name: 'nested',
        schema: [{
          type: 'any',
          defaultValue: null
        }]
      }, {
        type: 'array',
        name: 'nestedObjects',
        schema: [{
          type: 'object',
          schema: [{
            name: 'one',
            type: 'any',
            defaultValue: null,
            sampleValue: 'one'
          }, {
            name: 'two',
            type: 'any',
            defaultValue: null,
            sampleValue: 2
          }, {
            name: 'three',
            type: 'any',
            defaultValue: null,
            sampleValue: 3
          },
          {
            name: 'four',
            type: 'number',
            sampleValue: 4
          }]
        }]
      }]
    });

  });

  it('Should generateSchema for javascript', () => {

    try {
      types.generateSchema.javascript([1, 2, null, 4]);
    } catch (e) {
      expect(e).to.exist;
      expect(e.message).to.contain('from an object');
    }

    let result;

    result = types.generateSchema.javascript({list: [1, 2, 3, 4]});
    expect(result).to.equal([
      ` * @param {array} list`,
      ` * @ {number}`
    ].join('\n'));

    result = types.generateSchema.javascript({list: [1, 2, null, 4]});
    expect(result).to.equal([
      ` * @param {array} list`,
      ` * @ {?number}`
    ].join('\n'));

    result = types.generateSchema.javascript({list: [null, null, 1, null, 2, 3]});
    expect(result).to.equal([
      ` * @param {array} list`,
      ` * @ {?number}`
    ].join('\n'));

    result = types.generateSchema.javascript({list: [null]});
    expect(result).to.equal([
      ` * @param {array} list`,
      ` * @ {?any}`
    ].join('\n'));

    result = types.generateSchema.javascript({list: [1, 'two', null, 4]});
    expect(result).to.equal([
      ` * @param {array} list`,
      ` * @ {?any}`
    ].join('\n'));

    result = types.generateSchema.javascript({
      nested: ['one', 2, 3, null],
      nestedObjects: [{
        one: 'one',
        two: 2,
        three: 3,
        four: 4,
        five: 'five'
      }, {
        one: null,
        two: null,
        three: null,
        four: 44,
        five: '5ive'
      }, {
        one: 'uno',
        two: 2,
        three: 'three',
        four: 444
      }]
    });
    expect(result).to.deep.equal([
      ` * @param {array} nested`,
      ` * @ {?any}`,
      ` * @param {array} nestedObjects`,
      ` * @ {object}`,
      ` * @   {?any} one`,
      ` * @   {?any} two`,
      ` * @   {?any} three`,
      ` * @   {number} four`
    ].join('\n'));

    result = types.generateSchema.javascript({
      nested: ['one', 2, 3, null],
      nestedObjects: [{
        one: 'one',
        two: 2,
        three: 3,
        four: 4,
        five: 'five'
      }, {
        one: null,
        two: null,
        three: null,
        four: 44,
        five: '5ive'
      }, {
        one: 'uno',
        two: 2,
        three: 'three',
        four: 444
      }]
    }, 1);
    expect(result).to.deep.equal([
      ` * @ {array} nested`,
      ` * @   {?any}`,
      ` * @ {array} nestedObjects`,
      ` * @   {object}`,
      ` * @     {?any} one`,
      ` * @     {?any} two`,
      ` * @     {?any} three`,
      ` * @     {number} four`
    ].join('\n'));

  });

  it('Should parse valid Node.js variable names', () => {

    expect(NodeJsFunctionParser.validateFunctionParamName('test')).to.equal(true);
    expect(NodeJsFunctionParser.validateFunctionParamName('$pécial_character$$')).to.equal(true);

  });

  it('Should fail to parse invalid Node.js variable names', () => {

    expect(NodeJsFunctionParser.validateFunctionParamName('with spaces')).to.equal(false);
    expect(NodeJsFunctionParser.validateFunctionParamName('2*2')).to.equal(false);
    expect(NodeJsFunctionParser.validateFunctionParamName('2')).to.equal(false);
    expect(NodeJsFunctionParser.validateFunctionParamName('[]')).to.equal(false);
    expect(NodeJsFunctionParser.validateFunctionParamName('{}')).to.equal(false);
    expect(NodeJsFunctionParser.validateFunctionParamName('{object: literal}')).to.equal(false);
    expect(NodeJsFunctionParser.validateFunctionParamName({})).to.equal(false);
    expect(NodeJsFunctionParser.validateFunctionParamName(2)).to.equal(false);
    expect(NodeJsFunctionParser.validateFunctionParamName('2+2')).to.equal(false);
    expect(NodeJsFunctionParser.validateFunctionParamName('let')).to.equal(false);
    expect(NodeJsFunctionParser.validateFunctionParamName('const')).to.equal(false);
    expect(NodeJsFunctionParser.validateFunctionParamName('delete')).to.equal(false);

  });

};
