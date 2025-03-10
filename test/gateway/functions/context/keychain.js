/**
* Error on keychain keys
*/
module.exports = async (context) => {

  const value = context.keychain.key('hello');

  return { key: value };

};
