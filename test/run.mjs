import { PORT, InstantAPI } from './helpers.mjs';
const TestEngine = InstantAPI.TestEngine;

const testEngine = new TestEngine(PORT);
await testEngine.initialize('./test/tests');

testEngine.setup(async () => {
  let startTime = new Date().valueOf();
  return { startTime };
});

const args = process.argv.slice(3);
if (args[0]) {
  await testEngine.run(args[0]);
} else {
  await testEngine.runAll();
}

testEngine.finish(async ({ startTime }) => {
  let time = new Date().valueOf() - startTime;
  console.log(`Tests finished in ${time} ms`);
});