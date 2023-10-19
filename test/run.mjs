import chai from 'chai';
const expect = chai.expect;

import InstantAPI from '../index.js';
const TestEngine = InstantAPI.TestEngine;

const testEngine = new TestEngine();
await testEngine.initialize('./test/tests');

const args = process.argv.slice(3);
if (args[0]) {
  await testEngine.run(args[0], expect);
} else {
  await testEngine.runAll(expect);
}