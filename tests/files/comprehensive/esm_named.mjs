/**
 * Repeats a phrase
 * @param {string} str
 * @param {integer} repeat
 * @returns {string}
 */
export async function get (str, repeat) {

  return str.repeat(repeat);

};

/**
 * Repeats a phrase backwards
 * @param {string} str
 * @param {integer} repeat
 * @returns {string}
 */
export async function post (str, repeat) {

  return str.split('').reverse().join('').repeat(repeat);

};

/**
 * Outputs a phrase once
 * @param {string} str
 * @returns {string}
 */
export const put = async (str) => {

  return str;

};

/**
 * Outputs a phrase once backwards
 * @param {string} str
 * @returns {string}
 */
export const del = async (str) => {

  return str.split('').reverse().join('');

};
