import chai from 'chai';
const expect = chai.expect;

import InstantAPI from '../index.js';
const TestEngine = InstantAPI.TestEngine;

import helpers from './helpers.js';

const testEngine = new TestEngine(helpers.PORT);
await testEngine.initialize('./test/tests');

const args = process.argv.slice(3);
if (args[0]) {
  await testEngine.run(args[0], expect);
} else {
  await testEngine.runAll(expect);
}