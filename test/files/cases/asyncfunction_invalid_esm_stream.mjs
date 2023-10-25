/**
 * Streams results for our lovable assistant
 * @param {string} query The question for our assistant
 * @stream {object}   chunk
 * @stream {string}   chunk.id
 * @stream {string}   chunk.object
 * @stream {integer}  chunk.created
 * @stream {string}   chunk.model
 * @stream {object[]} chunk.choices
 * @stream {integer}  chunk.choices.index
 * @stream {object}   chunk.choices.delta
 * @stream {?string}  chunk.choices.delta.role
 * @stream {?string}  chunk.choices.delta.content
 * @returns {object} message
 * @returns {string} message.content
 */
export async function GET (query, context) {
  const completion = [];
  for await (const chunk of completion) {
    context.stream('chunk', chunk);
    message += chunk?.choices?.[0]?.delta?.content || '';
  }
  return {message};
};