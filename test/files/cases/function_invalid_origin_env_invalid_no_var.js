/**
* Function with an invalid origin
* @origin =process.env.CASE_ORIGIN_INVALID
* @returns {string}
*/
module.exports = (callback) => {

  return callback(null, 'origin');

};
