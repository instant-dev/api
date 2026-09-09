/**
* @param {string} filename
* @param {?string} contentType
* @param {?string} contentDisposition
* @returns {buffer} mybuf
*/
module.exports = async (filename = 'lol.png', contentType = null, contentDisposition = null) => {
  let buffer = Buffer.from('lol');
  buffer.filename = filename;
  if (contentType) {
    buffer.contentType = contentType;
  }
  if (contentDisposition) {
    buffer.contentDisposition = contentDisposition;
  }
  return buffer;
};
