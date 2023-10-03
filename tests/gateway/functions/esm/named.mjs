/**
 * Repeats a phrase
 * @param {string} str
 * @param {integer} repeat
 * @returns {string}
 */
export async function GET (str, repeat) {

  return str.repeat(repeat);

};

/**
 * Repeats a phrase backwards
 * @param {string} str
 * @param {integer} repeat
 * @returns {string}
 */
export async function POST (str, repeat) {

  return str.split('').reverse().join('').repeat(repeat);

};

/**
 * Outputs a phrase once
 * @param {string} str
 * @returns {string}
 */
export const PUT = async (str) => {

  return str;

};

/**
 * Outputs a phrase once backwards
 * @param {string} str
 * @returns {string}
 */
export const DELETE = async (str) => {

  return str.split('').reverse().join('');

};
