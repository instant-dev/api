/**
* My ESM function (GET)
* @param {string} name
* @returns {string}
*/
export async function GET (name) {
  return `hello ${name} - GET`;
}

/**
* My ESM function (POST)
* @param {string} name
* @returns {string}
*/
export async function POST (name) {
  return `hello ${name} - POST`;
}

/**
* My ESM function (PUT)
* @param {string} name
* @returns {string}
*/
export async function PUT (name) {
  return `hello ${name} - PUT`;
}

/**
* My ESM function (DELETE)
* @param {string} name
* @returns {string}
*/
export async function DELETE (name) {
  return `hello ${name} - DELETE`;
}
