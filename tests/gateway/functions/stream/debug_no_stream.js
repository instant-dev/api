/**
* Not a streaming function, can debug with streaming
* @param {string} alpha Some value
*/
module.exports = async (alpha, context) => {

  context.log('what?', 'who?');

  await new Promise(resolve => setTimeout(() => resolve(), 20));

  context.error('oh no');

  await new Promise(resolve => setTimeout(() => resolve(), 20));

  context.log('finally');

  return true;

};
