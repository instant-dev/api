/**
 * Test range on nested object schema params
 * @param {object}         limit
 * @param {integer{1,100}} limit.count
 * @param {integer{0,}}    limit.offset
 * @returns {any}
 */
module.exports = async (limit = { count: 100, offset: 0 }) => {
  return limit;
};
