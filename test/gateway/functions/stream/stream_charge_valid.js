/**
* Valid function for streaming
* @charge 100
* @param {string} alpha Some value
* @stream {boolean} hello Some value
*/
module.exports = async (alpha, context) => {

  context.charge(100);

  return true;

};
