/**
* Function with an invalid origin
* @origin =process.env.CASE_ORIGIN
* @returns {string}
*/
module.exports = (callback) => {

  return callback(null, 'origin');

};
