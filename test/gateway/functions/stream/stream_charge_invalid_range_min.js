/**
* Valid function for streaming
* @charge 100
* @param {string} alpha Some value
* @stream {boolean} hello Some value
*/
module.exports = async (alpha, context) => {

  context.stream('@charge', -10);

  return true;

};
