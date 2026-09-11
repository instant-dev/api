/**
 * Test range on nested returns schema
 * @param {integer} count
 * @returns {object}
 * @ {object} limit
 * @   {integer{1,100}} count
 */
module.exports = async (count) => {
  return { limit: { count } };
};
