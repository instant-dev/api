/**
* @returns {any}
*/
module.exports = (callback) => {

  throw new Error('401: crap');
  callback(new Error('error'));

};
