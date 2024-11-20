/**
* Error on platform keys
*/
module.exports = async (context) => {

  const value = context.platform.getKey('hello', 'cool');

  return { key: value };

};
