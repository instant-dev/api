/**
* Valid function for streaming
* @param {string} alpha Some value
* @stream {boolean} hello Some value
*/
module.exports = async (alpha, context) => {

  context.stream('@charge', 100);

  return true;

};
