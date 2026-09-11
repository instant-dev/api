/**
 * Test size on nested object schema params
 * @param {object} user
 * @ {string{..32}} username
 * @ {string{2..}}  nickname
 * @returns {any}
 */
module.exports = async (user) => {
  return user;
};
