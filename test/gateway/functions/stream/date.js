/**
* Valid function for streaming
* @param {string} alpha Some value
* @stream {object} hello Some object
*/
module.exports = async (alpha, context) => {

  context.stream('hello', { date: new Date() });
  context.stream('hello', { deep: { date: new Date() } });

  return true;

};
