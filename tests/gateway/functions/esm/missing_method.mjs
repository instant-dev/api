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
