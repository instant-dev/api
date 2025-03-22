/**
* @stream {string} hello 
* @returns {buffer} mybuf
*/
module.exports = async (context) => {
  let buffer = Buffer.from('lol');
  context.stream('hello', 'world');
  buffer.contentType = 'image/png';
  return buffer;
};
