/**
* @returns {any}
*/
module.exports = (callback) => {

  Promise.resolve(null).then(() => {
    throw 'crap x2';
  });

};
