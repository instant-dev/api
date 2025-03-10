/**
* Error on platform keys
*/
module.exports = async (context) => {

  const value = context.platform.ui('hello').key('cool');

  return { key: value };

};
