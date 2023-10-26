# Instant API

![travis-ci build](https://travis-ci.org/instant-dev/api.svg?branch=main)
![npm version](https://img.shields.io/npm/v/@instant.dev/api?label=)

# Build type-safe web APIs with JavaScript, instantly
## Spec generation and LLM streaming

**Instant API** is a framework for building APIs with JavaScript that implements
**type-safety at the HTTP interface**. By doing so, it eliminates the need for
schema validation libraries entirely. Simply write a JSDoc-compliant comment
block for a function that represents your API endpoint and stop worrying about
validation, sanitization and testing for user input. The OpenAPI specification
for your API is then automatically generated in both JSON and YAML at
`localhost:8000/.well-known/openapi.json` and
`localhost:8000/.well-known/openapi.yaml`, respectively.

Additionally, Instant API comes packaged with LLM-focused features to future-proof your
API in preparation for AI integration:

- First class support for Server-Sent Events using `text/event-stream` makes streaming LLM responses easy
- [LLM function calling](https://openai.com/blog/function-calling-and-other-api-updates) can be integrated
easily via JSON schema output at `localhost:8000/.well-known/schema.json`
- Experimental auto-generation of `localhost:8000/.well-known/ai-plugin.json`

You will find Instant API is a very full-featured framework despite being an
early release. It has been in development for six years as the engine behind the
[Autocode](https://autocode.com) serverless platform where it has horizontally scaled
to handle over 100M API requests per day. Happy hacking!

## Quick example: Standard API

Here's an example API endpoint built with Instant API. It would be available
at the URL `example.com/v1/weather/current` via HTTP GET. It has length
restrictions on `location`, range restrictions on `coords.lat` and `coords.lng`,
and `tags` is an array of string. The `@returns` definitions ensure that the API
contract with the user is upheld: if the wrong data is returned an error will be
thrown.

File: `/functions/v1/weather/current.mjs`

```javascript
/**
 * Retrieve the weather for a specific location
 * @param {?string{1..64}} location   Search by location
 * @param {?object}        coords     Provide specific latitude and longitude
 * @param {number{-90,90}} coords.lat Latitude
 * @param {number{-90,90}} coords.lng Longitude
 * @param {string[]}       tags       Nearby locations to include
 * @returns {object} weather             Your weather result
 * @returns {number} weather.temperature Current tmperature of the location
 * @returns {string} weather.unit        Fahrenheit or Celsius
 */
export async function GET (location = null, coords = null, tags = []) {

  if (!location && !coords) {
    // Prefixing an error message with a "###:" between 400 and 404
    //   automatically creates the correct client error:
    //     BadRequestError, UnauthorizedError, PaymentRequiredError,
    //     ForbiddenError, NotFoundError
    // Otherwise, will throw a RuntimeError with code 420
    throw new Error(`400: Must provide either location or coords`);
  } else if (location && coords) {
    throw new Error(`400: Can not provide both location and coords`);
  }

  // Fetch your own API data
  await getSomeWeatherDataFor(location, coords, tags);

  // mock a response
  return {
    temperature: 89.2
    units: `°F`
  };

}
```

## Quick example: LLM Streaming

LLM streaming is simple. It relies on a special `context` object and defining
`@stream` parameters to create a `text/event-stream` response. You can think
of `@stream` as similar to `@returns`, where you're specifying the schema
for the output to the user. If this contract is broken, your API will throw an
error. In order to send a stream to the user, we add a special `context` object
to the API footprint as the last parameter and use an exposed `context.stream()`
method.

File: `/functions/v1/ai-helper.mjs`

```javascript
import OpenAI from 'openai';
const openai = new OpenAI(process.env.OPENAI_API_KEY);

/**
 * Streams results for our lovable assistant
 * @param {string} query The question for our assistant
 * @stream {object}   chunk
 * @stream {string}   chunk.id
 * @stream {string}   chunk.object
 * @stream {integer}  chunk.created
 * @stream {string}   chunk.model
 * @stream {object[]} chunk.choices
 * @stream {integer}  chunk.choices[].index
 * @stream {object}   chunk.choices[].delta
 * @stream {?string}  chunk.choices[].delta.role
 * @stream {?string}  chunk.choices[].delta.content
 * @returns {object} message
 * @returns {string} message.content
 */
export async function GET (query, context) {
  const completion = await openai.chat.completions.create({
    messages: [
      {role: `system`, content: `You are a lovable, cute assistant that uses too many emojis.`},
      {role: `user`, content: query}
    ],
    model: `gpt-3.5-turbo`,
    stream: true
  });
  const messages = [];
  for await (const chunk of completion) {
    // Stream our response as text/event-stream when ?_stream parameter added
    context.stream('chunk', chunk); // chunk has the schema provided above
    messages.push(chunk?.choices?.[0]?.delta?.content || '');
  }
  return {content: messages.join('')};
};
```

By default, this method will return something like;

```json
{
  "content": "Hey there! 💁‍♀️ I'm doing great, thank you! 💖✨ How about you? 😊🌈"
}
```

However, if you append `?_stream` to query parameters or `{"_stream": true}` to
body parameters, it will turn into a `text/event-stream` with your `context.stream()`
events sandwiched between a `@begin` and `@response` event. The `@response` event
will be an object containing the details of what the HTTP response would have contained
had the API call been made normally.

```shell
id: 2023-10-25T04:29:59.115000000Z/2e7c7860-4a66-4824-98fa-a7cf71946f19
event: @begin
data: "2023-10-25T04:29:59.115Z"

[... more events ...]

event: chunk
data: {"id":"chatcmpl-8DPoluIgN4TDIuE1usFOKTLPiIUbQ","object":"chat.completion.chunk","created":1698208199,"model":"gpt-3.5-turbo-0613","choices":[{"index":0,"delta":{"content":" 💯"},"finish_reason":null}]}

[... more events ...]

event: @response
data: {"statusCode":200,"headers":{"X-Execution-Uuid":"2e7c7860-4a66-4824-98fa-a7cf71946f19","X-Instant-Api":"true","Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, POST, OPTIONS, HEAD, PUT, DELETE","Access-Control-Allow-Headers":"","Access-Control-Expose-Headers":"x-execution-uuid, x-instant-api, access-control-allow-origin, access-control-allow-methods, access-control-allow-headers, x-execution-uuid","Content-Type":"application/json"},"body":"{\"content\":\"Hey there! 🌞 I'm feeling 💯 today! Full of energy and ready to help you out. How about you? How are you doing? 🌈😊\"}"}
```

## Table of Contents

1. [Getting Started](#getting-started)
   1. [Quickstart](#quickstart)
   1. [Custom installation](#custom-installation)
1. [Endpoints and Type Safety](#endpoints-and-type-safety)
   1. [Creating Endpoints](#creating-endpoints)
   1. [Responding to HTTP methods](#responding-to-http-methods)
      1. [Endpoint lifecycle](#endpoint-lifecycle)
      1. [Typing your endpoint](#typing-your-endpoint)
          1. [Undocumented parameters](#undocumented-parameters)
          1. [Required parameters](#required-parameters)
          1. [Optional parameters](#optional-parameters)
      1. [`context` object](#context-object)
      1. [API endpoints: `functions/` directory](#api-endpoints-functions-directory)
         1. [Index routing with `index.mjs`](#index-routing-with-indexmjs)
         1. [Subdirectory routing with `404.mjs`](#subdirectory-routing-with-404mjs)
      1. [Static files: `www/` directory](#static-files-www-directory)
         1. [Index routing with `index.html`](#index-routing-with-indexhtml)
         1. [Subdirectory routing with `404.html`](#subdirectory-routing-with-404html)
   1. [Type Safety](#type-safety)
      1. [Supported types](#supported-types)
      1. [Type coercion](#type-coercion)
      1. [Combining types](#combining-types)
      1. [Enums and restricting to specific values](#enums-and-restricting-to-specific-values)
      1. [Sizes (lengths)](#sizes-lengths)
      1. [Ranges](#ranges)
      1. [Arrays](#arrays)
      1. [Object schemas](#object-schemas)
   1. [Parameter validation](#parameter-validation)
      1. [Query and Body parsing with `application/x-www-form-urlencoded`](#query-and-body-parsing-with-applicationx-www-form-urlencoded)
      1. [Query vs. Body parameters](#query-vs-body-parameters)
   1. [CORS (Cross-Origin Resource Sharing)](#cors-cross-origin-resource-sharing)
   1. [Returning responses](#returning-responses)
      1. [`@returns` type safety](#returns-type-safety)
      1. [Error responses](#error-responses)
      1. [Custom HTTP responses](#custom-http-responses)
      1. [Returning files with Buffer responses](#returning-files-with-buffer-responses)
      1. [Streaming responses](#streaming-responses)
      1. [Debug responses](#debug-responses)
   1. [Throwing errors](#throwing-errors)
1. [OpenAPI Specification Generation](#openapi-specification-generation)
   1. [OpenAPI Output Example](#openapi-output-example)
   1. [JSON Schema Output Example](#json-schema-output-example)
   1. [Hiding endpoints with `@private`](#hiding-endpoints-with-private)
1. [Streaming and LLM Support](#streaming-and-llm-support)
   1. [`@stream` type safety](#stream-type-safety)
   1. [Using `context.stream()`](#using-contextstream)
   1. [Using the `_stream` parameter](#using-the-_stream-parameter)
1. [Debugging](#debugging)
   1. [Using `context.log()` and `context.error()`](#using-contextlog-and-contexterror)
   1. [Using the `_debug` parameter](#using-the-_debug-parameter)
1. [Built-in Errors](#built-in-errors)
1. [Testing](#testing)
   1. [Quickstart for tests](#quickstart-for-tests)
   1. [Custom installation for tests](#custom-installation-for-tests)
   1. [Writing tests](#writing-tests)
   1. [Running tests](#running-tests)
1. [Deployment](#deployment)
   1. [via `instant deploy`](#via-instant-deploy)
   1. [Custom deployments](#custom-deployments)
1. [More Information](#more-information)
   1. [Logging](#logging)
   1. [Error monitoring](#error-monitoring)
   1. [Middleware](#middleware)
1. [Roadmap and Feedback](#roadmap-and-feedback)
1. [Acknowledgements](#acknowledgements)

## Getting Started

### Quickstart

The quickest way to get started with Instant API is via the
`instant.dev` [command line tools](https://github.com/instant-dev/instant.dev).
It is the easiest way to get your Instant API project set up, generate new endpoints,
manage tests and comes with built-in deployment tooling for Vercel or AWS.
It comes packaged with the [Instant ORM](https://github.com/instant-dev/orm) which
makes setting up a Postgres-based backend a breeze.

```shell
npm i instant.dev -g
cd ~/projects
mkdir my-new-project
cd my-new-project
instant init
```

From there, you can use more advanced features:

```shell
# Create an endpoint (test generated automatically)
instant g:endpoint first_endpoint

# Run your server
instant serve

# Run tests
instant test

# See all available commands
instant help
```

### Custom installation

**Note:** Most of this documentation will assume you are using the
[`instant.dev` CLI](https://github.com/instant-dev/). It is the recommended
get your Instant API project set up, generate new endpoints, manage tests and
comes with built-in deployment tooling for Vercel or AWS.

To use Instant API without the command line tools, you can do the following;

```shell
cd path/to/my/project
npm i @instant.dev/api --save
```

Then add the following to `package.json`:

```json
  "scripts": {
    "start": "node instant.mjs"
  },
```

And copy the following file to `instant.mjs`:

```javascript
// Third-party imports
import InstantAPI from '@instant.dev/api';

// Native imports
import cluster from 'cluster';
import os from 'os';

// Shorthand references
const Daemon = InstantAPI.Daemon;
const Gateway = InstantAPI.Daemon.Gateway;
const EncryptionTools = InstantAPI.EncryptionTools;

// Constants
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 8000;

if (cluster.isPrimary) {

  // Multi-process daemon
  const daemon = new Daemon(
    ENVIRONMENT !== 'development'
      ? os.cpus().length
      : 1
  );
  daemon.start(PORT);

} else {

  // Individual webserver startup
  const gateway = new Gateway({debug: ENVIRONMENT !== 'production'});
  gateway.load(process.cwd());       // load routes from filesystem
  gateway.listen(PORT);              // start server

}
```

To start your server, simply run:

```javascript
npm start
```

## Endpoints and Type Safety

Instant API relies on a Function as a Service model for endpoint execution: every
{Route, HTTP Method} combination is modeled as an exported function. To add parameter
validation a.k.a. type safety to your endpoints, you simply document your exported
functions with a slightly modified JSDoc specification comment block. For example,
the simplest endpoint possible would look like this;

File: `functions/index.js`

```javascript
export default async function () {
  return `hello world`;
}
```

And you could execute it with;

```shell
curl localhost:8000/
> "hello world"
```

Assuming you are running `instant serve` or `npm start` on port `8000`. See
[Getting started](#getting-started) for more details on starting your server.

### Creating endpoints

The easiest way to create endpoints for Instant API is via the `instant.dev`
[command line tools](https://github.com/instant-dev/instant). Once your project
has been initialized, you can write:

```shell
instant g:endpoint path/to/endpoint
```

And voila! A new blank endpoint has been created at `/functions/path/to/endpoint/index.mjs`.

If you want to create an endpoint manually, just create a new `.mjs` file in the `functions/`
directory and make sure it outputs a function corresponding to at least one HTTP method:
`GET`, `POST`, `PUT` or `DELETE`.


### Responding to HTTP methods

In the example above, we used `export default` to export a default function.
This function will respond to to all `GET`, `POST`, `PUT` and `DELETE` requests
with the same function. Alternatively, we can export functions for each method individually,
like so:

File: `functions/index.js`

```javascript
export async function GET () {
  return `this was a GET request!`;
}

export async function POST () {
  return `this was a POST request!`;
}
```

Any method not specified in this manner will automatically return an HTTP 501 error
(Not Implemented). You can test these endpoints like so;

```shell
curl -X GET localhost:8000/
> "this was a GET request!"

curl -X POST localhost:8000/
> "this was a POST request!"

curl -X PUT localhost:8000/
> {"error":...} # Returns NotImplementedError (501)
```

**Note:** Method names are **case sensitive**, they **must** be uppercase.
Instant API will throw an error if the exports aren't read properly.

#### Endpoint lifecycle

When endpoint files, like `functions/index.js` above, are accessed they
are imported **only once per process**. Code outside of `export` statements
is executed lazily the first time the function is executed. By default,
in a production server environment, Instant API will start one process per virtual core.

Each exported function will be executed every time it is called. For the most part,
you should only use the area external to your `export` statements for critical library
imports and frequently accessed object caching; **not for data persistence**.

Here's an example using [Instant ORM](https://github.com/instant-dev/orm):

```javascript
// DO THIS: Cache connections and commonly used objects, constructors

// Executed only once per process: lazily on first execution
import InstantORM from '@instant.dev/orm';
const Instant = await InstantORM.connectToPool(); // connect to postgres
const User = Instant.Model('User'); // access User model

/**
 * Find all users matching a provided username
 * @param {string} searchQuery Username portion to search for
 * @returns {object[]} users
 */
export async function GET (searchQuery) {
  // Executed each time endpoint called
  return await User.query()
    .where({username__icontains: searchUsername})
    .select();
}
```

Here's an example of what you should **not** do:

```javascript
// DO NOT DO THIS: data persistence not reliable in production workloads
//    Could be on a multi-core server or serverless deployment e.g. Vercel

let pageViews = 0;

/**
 * Track views -- poorly. Persistence unreliable!
 */
export async function GET () {
  return `This page has been viewed ${++pageViews} times`;
}
```

#### Typing your endpoint

Endpoints can be typed using a slightly modified JSDoc specification that is
easily interpreted and syntax highlighted by most modern code editors. You
type your endpoint by (1) providing a comment block immediately preceding
your exported function and / or (2) providing default values for your
exported function.

**Note:** Parameter documentation for typing is an all-or-none affair.
Instant API will refuse to start up if documented endpoints do not match the
function signature.

##### Undocumented parameters

By default, if you do not document your parameters **at all**, they will
be assumed to be type `any` and all be required. If you provided default
values, the parameters will be optional but will assume the type of their
default value.

```javascript
export async function GET (name, age = 25) {
  return `hello ${name} you are ${age}`;
}
```

In this case, `name` is **required** by can take on any type. `age` is **optional**
but must be a `number`.

```shell
curl -X GET localhost:8000/
> {"error":...} # Returns ParameterError (400) -- name is required

curl -X GET localhost:8000/?name=world
> "hello world you are 25"

curl -X GET 'localhost:8000/?name=world&age=lol'
> {"error":...} # Returns ParameterError (400) -- age should be a number

curl -X GET 'localhost:8000/?name=world&age=99'
> "hello world you are 99"
```

##### Required parameters

A parameter is **required** if you **do not provide a default value** in the function
signature. For example;

```javascript
/**
 * @param {string} name 
 */
export async function GET (name) {
  return `hello ${name}`;
}
```

Will return a `ParameterError` with status code `400` indicating the `name`
parameter is required if no `name` is passed in to the endpoint.

```shell
curl -X GET localhost:8000/
> {"error":...} # Returns ParameterError (400)

curl -X GET localhost:8000/?name=world
> "hello world"
```

##### Optional parameters

A parameter is **optional** if you:

- prefix the type with a `?`
- AND / OR provide a default value in the function signature

If you prefix the type with `?`, the default value is assumed to be `null`.
You **can not** use `undefined` as an acceptable endpoint parameter value.

For example;

```javascript
/**
 * @param {?string} name 
 * @param {number} age
 */
export async function GET (name, age = 4.2e9) {
  return `hello ${name}, you are ${age}`;
}
```

Even though `name` was not provided in the function signature, the `?` in
`{?string}` indicates that this parameter is optional. It will be given a
default value of `null`. When included in a template string, null will be
printed as the string `"null"`.

```shell
curl -X GET localhost:8000/
> "hello null, you are 4200000000"

curl -X GET localhost:8000/?name=world
> "hello world, you are 4200000000"

curl -X GET 'localhost:8000/?name=world&age=101'
> "hello world, you are 101"
```

#### `context` object

The `context` object is a "magic" parameter that can be appended to any
function signature. It **can not** be documented and you **can not**
use "context" as a parameter name. The other magic parameters are
`_stream` ([Streaming and LLM support](#streaming-and-llm-support)),
`_debug` ([Debug](#debugging)) and `_background`. However, only
`context` can be added to your function signature.

You can use `context` to access execution-specific information like so;

```javascript
export async function GET (context) {
  console.log(context.http.method);   // "GET"
  console.log(context.http.body);     // Request body (utf8)
  console.log(context.remoteAddress); // IP address
  return context;                     // ... and much more
}
```

It also comes with a `context.stream()` function which you can read about
in [Streaming and LLM support](#streaming-and-llm-support).

A full list of available properties is as follows;

```javascript
{
  "name": "endpoint_name",
  "alias": "request_pathname",
  "path": ["request_pathname", "split", "by", "/"],
  "params": {"jsonified": "params", "passed": "via_query_and_body"},
  "remoteAddress": "ipv4_or_v6_address",
  "uuid": "request_uuid",
  "http": {
    "url": "request_url",
    "method": "request_method",
    "headers": {"request": "headers"},
    "body": "request_body_utf8",
    "json": "request_body_json_if_applicable_else_null",
  },
  "stream": function stream (name, value) { /* ... */ }
}
```

#### API endpoints: `functions/` directory

By default, anything in the root `functions/` directory of an Instant API
project is exported as an API endpoint. All `.js`, `.cjs` and `.mjs` files
are valid. We have not covered CommonJS-styled exports here as they are supported
for legacy purposes and not recommended for forward-facing development.

Routing is handled by mapping the pathname of an HTTP request to the internal file
pathname of the function, not including `functions/` or the file extension. For example,
an HTTP request to `/v1/hello-world` will trigger `functions/v1/hello-world.js`.

There are four "magic" filenames that can be used to handle indices or subdirectories.
`index.mjs` / `__main__.mjs` will act as a handler for the root directory and
`404.mjs` / `__notfound__.mjs` will act as a handler for any subdirectory or file
that is not otherwise defined.

##### Index routing with `index.mjs`

Alias: `__main__.mjs`

Handler for the root directory. For example, 
`functions/v1/stuff/index.mjs` is accessible via `/v1/stuff`.

##### Subdirectory routing with `404.mjs`

Alias: `__notfound__.mjs`

Handler for subdirectories not otherwise defined. For example, with the following
directory structure:

```yaml
- functions/
  - v1/
    - stuff/
      - 404.mjs
      - abc.mjs
```

The following HTTP request pathnames would map to these endpoints;

- `/v1/stuff` -> `functions/v1/stuff/404.mjs`
- `/v1/stuff/abc` -> `functions/v1/stuff/abc.mjs`
- `/v1/stuff/abcd` -> `functions/v1/stuff/404.mjs`
- `/v1/stuff/abc/def` -> `functions/v1/stuff/404.mjs`

You can use this behavior to define custom routing schemes. If you want
custom 404 error pages we recommend using [Subdirectory routing with `404.html`](#subdirectory-routing-with-404html) instead.

#### Static files: `www/` directory

Instant API comes with built-in static file hosting support. Instead
of putting files in the `functions/` directory, put any file you want
in the `www/` directory to automatically have it hosted as a standalone static
file.

The rules for static hosting are as follows;

- The server root `/` maps directly to `www/`
- e.g. `/image.png` -> `www/image.png`
- All `.htm` and `.html` files will be available with AND without suffixes
- `/hello` -> `www/hello.html`
- `/hello.html` -> `www/hello.html`
- API and static routes **can not** conflict
- `functions/wat.mjs` would overlap with `www/wat.htm` and is **not** allowed

There are four "magic" filenames that can be used to handle indices or subdirectories.
`index.html` / `index.htm` will act as a handler for the root directory and
`404.html` / `404.htm` will act as a handler for any subdirectory or file
that is not otherwise defined.

##### Index routing with `index.html`

Alias: `index.htm`

Same behavior as `index.js` for API routes. Handler for the root pathname.

##### Subdirectory routing with `404.html`

Alias: `404.htm`

Same behavior as `404.js` for API routes. Handler for subdirectories that are
not otherwise defined. Ideal use case is for custom 404 error pages.

### Type Safety

Types are applied to parameter and schema validation based upon the comment block
preceding your exported endpoint function.

```javascript
/**
 * My GET endpoint
 * @param {any} myparam
 */
export async function GET (myparam) {
  // do something with myparam
}
```

#### Supported types

| Type | Definition | Example Parameter Input Values (JSON) |
| ---- | ---------- | -------------- |
| boolean | True or False | `true` or `false` |
| string | Basic text or character strings | `"hello"`, `"GOODBYE!"` |
| number | Any double-precision [Floating Point](https://en.wikipedia.org/wiki/IEEE_floating_point) value | `2e+100`, `1.02`, `-5` |
| float | Alias for `number` | `2e+100`, `1.02`, `-5` |
| integer | Subset of `number`, integers between `-2^53 + 1` and `+2^53 - 1` (inclusive) | `0`, `-5`, `2000` |
| object | Any JSON-serializable Object | `{}`, `{"a":true}`, `{"hello":["world"]}` |
| object.http | An object representing an HTTP Response. Accepts `headers`, `body` and `statusCode` keys | `{"body": "Hello World"}`, `{"statusCode": 404, "body": "not found"}`, `{"headers": {"Content-Type": "image/png"}, "body": Buffer.from(...)}` |
| array | Any JSON-serializable Array | `[]`, `[1, 2, 3]`, `[{"a":true}, null, 5]` |
| buffer | Raw binary octet (byte) data representing a file. | `{"_bytes": [8, 255]}` or `{"_base64": "d2h5IGRpZCB5b3UgcGFyc2UgdGhpcz8/"}` |
| any | Any value mentioned above | `5`, `"hello"`, `[]` |

#### Type coercion

The `buffer` type will automatically be converted to a `Buffer` from any `object` with a
**single key-value pair matching the footprints** `{"_bytes": []}` or `{"_base64": ""}`.

Otherwise, parameters provided to a function are expected to match their
defined types. Requests made over HTTP GET via query parameters or POST data
with type `application/x-www-form-urlencoded` will be automatically
converted from strings to their respective expected types, when possible.

Once converted, all types will undergo a final type validation. For example, passing
a JSON `array` like `["one", "two"]` to a parameter that expects an `object` will convert
from string to JSON successfully but fail the `object` type check.

| Type | Conversion Rule |
| ---- | --------------- |
| boolean | `"t"` and `"true"` become `true`, `"f"` and `"false"` become `false`, otherwise will be kept as string |
| string | No conversion: already a string |
| number | Determine float value, if NaN keep as string, otherwise convert |
| float | Determine float value, if NaN keep as string, otherwise convert |
| integer | Determine float value, if NaN keep as string, otherwise convert: may fail integer check |
| object | Parse as JSON, if invalid keep as string, otherwise convert: may fail object check |
| object.http | Parse as JSON, if invalid keep as string, otherwise convert: may fail object.http check |
| array | Parse as JSON, if invalid keep as string, otherwise convert: may fail array check |
| buffer | Parse as JSON, if invalid keep as string, otherwise convert: may fail buffer check |
| any | No conversion: keep as string |

#### Combining types

You can combine types using the pipe `|` operator. For example;

```javascript
/**
 * @param {string|integer} myparam String or an integer
 */
export async function GET (myparam) {
  // do something
} 
```

Will accept a `string` or an `integer`. Types defined this way will validate against
the provided types in order of appearance. In this case, since it is a GET request and
all parameters are passed in as strings via query parameters, `myparam` will **always**
be received a string because it will successfully pass the string type coercion and
validation first.

However, if you use a POST request:

```javascript
/**
 * @param {string|integer} myparam String or an integer
 */
export async function POST (myparam) {
  // do something
} 
```

Then you can pass in `{"myparam": "1"}` or `{"myparam": 1}` via the body which would both
pass type validation.

You can combine as many types as you'd like:

```javascript
@param {string|buffer|array|integer}
```

Including `any` in your list will, as expected, override any other type specifications.

#### Enums and restricting to specific values

Similar to combining types, you can also include specific JSON values in your type definitions:

```javascript
/**
 * @param {"one"|"two"|"three"|4} myparam String or an integer
 */
export async function GET (myparam) {
  // do something
} 
```

This allows you to restrict possible inputs to a list of allowed values. In the case above,
sending `?myparam=4` via HTTP GET **will** successfully parse to  `4` (`Number`), because it
will fail validation against the three string options.

You can combine specific values and types in your definitions freely:

```javascript
@param {"one"|"two"|integer}
```

Just note that certain combinations will invalidate other list items. Like `{1|2|integer}` will
accept any valid integer.

#### Sizes (lengths)

The types `string`, `array` and `buffer` support sizes (lengths) via the `{a..b}` modifier on the type.
For example;

```javascript
@param {string{..9}}  alpha
@param {string{2..6}} beta
@param {string{5..}}  gamma
```

Would expect `alpha` to have a maximum length of `9`, `beta` to have a minimum length of
`2` but a maximum length of `6`, and `gamma` to have a minimum length of `5`.

#### Ranges

The types `number`, `float` and `integer` support ranges via the `{a,b}` modifier on the type.
For example;

```javascript
@param {number{,1.2e9}} alpha
@param {number{-10,10}} beta
@param {number{0.870,}} gamma
```

Would expect `alpha` to have a maximum value of `1 200 000 000`, `beta` to have a minimum value of
`-10` but a maximum value of `10`, and `gamma` to have a minimum value of `0.87`.

#### Arrays

Arrays are supported via the `array` type. You can optionally specify a schema for the array
which applies to **every element in the array**. There are two formats for specifying array
schemas, you can pick which works best for you:

```javascript
@param {string[]}      arrayOfStrings1
@param {array<string>} arrayOfStrings2
```

For multi-dimensional arrays, you can use nesting:

```javascript
@param {integer[][]}           array2d
@param {array<array<integer>>} array2d_too
```

**Please note**: Combining types are not currently available in array schemas. Open up an
issue and let us know if you'd like them and what your use case is! In the meantime;

```javascript
@param {integer[]|string[]}
```

Would successfully define an array of integers or an array of strings.

#### Object schemas

To define object schemas, use the subsequent lines of the schema after your initial object
definition to define individual properties. For example, the object
`{"a": 1, "b": "two", "c": {"d": true, "e": []}` Could be defined like so:

```javascript
@param {object}  myObject
@param {integer} myObject.a
@param {string}  myObject.b
@param {object}  myObject.c
@param {boolean} myObject.c.d
@param {array}   myObject.c.e
```

To define object schemas that are members of arrays, you must identify the array component in the
property name with `[]`. For example:

```javascript
@param {object[]} topLevelArray
@param {integer}  topLevelArray[].value
@param {object}   myObject
@param {object[]} myObject.subArray
@param {string}   myObject.subArray[].name
```

### Parameter validation

Parameter validation occurs based on types as defined per [Type Safety](#type-safety).
The process for parameter validation takes the following steps:

1. Read parameters from the HTTP query string as type `application/x-www-form-urlencoded`
1. If applicable, read parameters from the HTTP body based on the request `Content-Type`
   - Supported content types:
     - `application/json`
     - `application/x-www-formurlencoded`
     - `multipart/form-data`
     - `application/xml`, `application/atom+xml`, `text/xml`
1. Query parameters **can not** conflict with body parameters, throw an error if they do
1. Perform type coercion on `application/x-www-form-urlencoded` inputs (query and body, if applicable)
1. Validate parameters against their expected types, throw an error if they do not match

During this process, you can encounter a `ParameterParseError` or a `ParameterError` both with
status code `400`. `ParameterParseError` means your parameters could not be parsed based on
the expected or provided content type, and `ParameterError` is a validation error against the
schema for your endpoint.

#### Query and Body parsing with `application/x-www-form-urlencoded`

Many different standards have been implemented and adopted over the years for
HTTP query parameters and how they can be used to specify objects and arrays.
To make things easy, Instant API supports all common query parameter parsing formats.

Here are some query parameter examples of parsing form-urlencoded data:

- Arrays
  - Duplicates: `?arr=1&arr=2` becomes `[1, 2]`
  - Array syntax: `?arr[]=1&arr[]=2` becomes `[1, 2]`
  - Index syntax: `?arr[0]=1&arr[2]=3` becomes `[1, null, 3]`
  - JSON syntax: `?arr=[1,2]` becomes `[1, 2]`
- Objects
  - Bracket syntax: `?obj[a]=1&obj[b]=2` becomes `{"a": 1, "b": 2}`
  - Dot syntax: `?obj.a=1&obj.b=2` becomes `{"a": 1, "b": 2}`
    - Nesting: `?obj.a.b.c.d=t` becomes `{"a": {"b": {"c": {"d": true}}}}`
  - JSON syntax: `?obj={"a":1,"b":2}` becomes `{"a": 1, "b": 2}`

#### Query vs. Body parameters

With Instant API, **query and body parameters can be used interchangeably**.
The general expectation is that `POST` and `PUT` endpoints should typically
only interface with the content body, but API consumers should be able to freely
manipulate query parameters if they want to play around.
For example, the endpoint defined by:

```javascript
/**
 * Hello world endpoint
 * @param {string} name
 * @param {number} age
 */
export async function POST (name, age) {
  return `hello ${name}, you are ${age}!`;
}
```

Could be triggered successfull via;

```shell
curl -X POST 'localhost:8000/hello-world?name=world&age=99'
curl -X POST 'localhost:8000/hello-world?name=world' --data '{"age":99}'
curl -X POST 'localhost:8000/hello-world' --data '{"name":"world","age":99}'
```

Generally speaking, our motivation for this pattern comes from two observations;

1. In decades of software development we have never seen a legitimate use case for
   query parameters and body parameters with the same name on a single endpoint
2. Exposing APIs this way is a lot easier for end users to play with

To prevent unexpected errors, naming collisions will throw an error at the gateway layer,
before your endpoint is executed.

### CORS (Cross-Origin Resource Sharing)

By default, all endpoints have a **completely open** CORS policy, they all return
the header `Access-Control-Allow-Origin: *`.

To restrict endpoints to specific URLs use the `@origin` directive. You can add
as many of these as you'd like.

```javascript
/**
 * My CORS-restricted endpoint
 * @origin staging.my-website.com
 * @origin http://localhost:8000
 * @origin https://my-website.com
 * @origin =process.env.ALLOWED_ORIGIN
 * @origin =process.env.ANOTHER_ALLOWED_ORIGIN
 * @param {number} age
 */
export async function POST (name, age) {
  return `hello ${name}, you are ${age}!`;
}
```

The CORS `Access-Control-Allow-Origin` policy will be set like so;

- If no protocol is specified, allow all traffic from the URL
- If port is specified, only allow traffic from the URL on the specified port
- If `http://` is specified, only allow `http` protocol traffic from the URL
- If `https://` is specified, only allow `https` protocol traffic from the URL
- If origin starts with `=process.env.`, it will rely on the specified environment variable

Note that `=process.env.ENV_NAME` entries will be loaded at startup time. Dynamically
changing `process.env` afterwards will have no effect on your allowed origins.

### Returning responses

Returning API responses from your endpoint is easy. Just add a `return` statement
with whatever data you would like to return.

```javascript
export async function GET () {
  return `hello world`; // works as expected
}
```

By default, all responses will be `JSON.stringify()`-ed and returned with the
`Content-Type` header set to `application/json`.

```shell
curl localhost:8000/hello-world
> "hello world"
```

There are two exceptions: returning an `object.http` object
(containing `statusCode`, `headers`, and `body`) allows you to provide a
[Custom HTTP response](#custom-http-responses) and returning a `Buffer`, which are
treated as [raw binary (file) data](#returning-files-with-buffer-responses).

#### `@returns` type safety

Similar to [Parameter validation](#parameter-validation), you can enforce a type
schema on the return value of your endpoint like so;

```javascript
/**
 * @returns {object} message
 * @returns {string} message.content
 */
export async function GET () {
  return {message: `hello world`};
}
```

The difference between `@returns` type safety as compared to `@param` validation
is that this type safety mechanism is run **after** your code has been executed.
If you fail a `@returns` type safety check, the user receives a `ValueError` with
status code `502`: a server error. The function may have executed successfully
but the value does not fulfill the promised API contract. This functionality exists
to ensure users can trust the type contract of your API. To avoid production snafus,
we recommend [writing tests](#writing-tests) to validate that your endpoints
return the values you expect them to.

#### Error responses

Any uncaught promises or thrown errors will result in a `RuntimeError` with a status
code of `420` (unknown) by default. To customize error codes, check out
[Throwing Errors](#throwing-errors).

#### Custom HTTP responses

To return a custom HTTP response, simply return an object with one or all of the following
keys: `statusCode` (integer), `headers` (object) and `body` (Buffer). You can specify
this in the `@returns` schema, however Instant API will automatically detect the type.

```javascript
/**
 * I'm a teapot
 */
export async function GET () {
  return {
    statusCode: 418,
    headers: {'Content-Type', 'text/plain'},
    body: Buffer.from(`I'm a teapot!`)
  };
}
```

#### Returning files with Buffer responses

If you would like to return a raw file from the file system, compose binary data into a
downloadable file, or dynamically generate an image (e.g. with Dall-E or Stable Diffusion)
you can build a custom HTTP response as per above - but Instant API makes it a little easier
than that.

If you return a `Buffer` object you can optionally specify a `contentType` to set the
`Content-Type` http header like so:

```javascript
import fs from 'fs';

/**
 * Return an image from the filesystem to be displayed
 */
export async function GET () {
  const buffer = fs.readFileSync('./path/to/image.png');
  buffer.contentType = 'image/png';
  return buffer;
}
```

#### Streaming responses

Instant API has first-class support for streaming using the `text/event-stream`
content type and the "magic" `_stream` parameter.
You can read more in [Streaming and LLM support](#streaming-and-llm-support).

#### Debug responses

In `development` environments, e.g. when `process.env.NODE_ENV=development`, you
can stream the results of any function using the "magic" `_debug` parameter.
This allows you to monitor function execution in the browser for long-running jobs.
You can read more in [Debugging](#debugging).

### Throwing Errors

Whenever a `throw` statement is executed or a Promise is uncaught within the context
of an Instant API endpoint, the default behavior is to return a `RuntimeError` with
a status code of `420`: your browser will refer to this as "unknown", we think of it
as "confused".

To specify a specific error code between 400 and 404, simply throw an error prefixed
with the code and a colon like so:

```javascript
/**
 * Errors out
 */
export async function GET () {
  throw new Error(`400: No good!`);
}
```

When you execute this function you would see a `BadRequestError` with a status code of `400`:

```json
{
  "error": {
    "type": "BadRequestError",
    "message": "No good!"
  }
}
```

The following error codes will automatically map to error types:

- 400: `BadRequestError`
- 401: `UnauthorizedError`
- 402: `PaymentRequiredError`
- 403: `ForbiddenError`
- 404: `NotFoundError`

## OpenAPI Specification Generation

OpenAPI specifications are extremely helpful for machine-readability but are
extremely verbose. Instant API allows you to manage all your type signatures
and parameter validation via JSDoc in a very terse manner while automatically
generating your OpenAPI specification for you. By default Instant API will
create three schema files based on your API:

- `localhost:8000/.well-known/openapi.json`
- `localhost:8000/.well-known/openapi.yaml`
- `localhost:8000/.well-known/schema.json`

The first two are [OpenAPI schemas](https://www.openapis.org/) and the
final one is a [JSON schema](https://json-schema.org/) which outputs a
`{"functions": [...]}` object. The latter is primarily intended for use
with [OpenAI function calling](https://openai.com/blog/function-calling-and-other-api-updates)
and other LLM integrations.

### OpenAPI Output Example

As a simple example, consider the following endpoint:

```javascript
/**
 * Gets a "Hello World" message
 * @param {string} name
 * @param {number{12,199}} age
 * @returns {string} message
 */
export async function GET (name, age) {
  return `hello ${name}, you are ${age} and you rock!`
}

/**
 * Creates a new hello world message
 * @param {object} body
 * @param {string} body.content
 * @returns {object}  result
 * @returns {boolean} result.created
 */
export async function POST (body) {
  console.log(`Create body ... `, body);
  return {created: true};
}
```

Once saved as part of your project, if you open `localhost:8000/.well-known/openapi.yaml`
in your browser, you should receive the following OpenAPI specification:

```yaml
openapi: "3.1.0"
info:
  version: "development"
  title: "(No name provided)"
  description: "(No description provided)"
servers:
  - url: "localhost"
    description: "Instant API Gateway"
paths:
  /hello-world/:
    get:
      summary: "Gets a \"Hello World\" message"
      description: "Gets a \"Hello World\" message"
      operationId: "service_localhost_hello_world_get"
      parameters:
        - in: "query"
          name: "name"
          schema:
            type: "string"
        - in: "query"
          name: "age"
          schema:
            type: "number"
            minimum: 12
            maximum: 199
      responses:
        200:
          content:
            application/json:
              schema:
                type: "string"
    post:
      summary: "Creates a new hello world message"
      description: "Creates a new hello world message"
      operationId: "service_localhost_hello_world_post"
      requestBody:
        content:
          application/json:
            schema:
              type: "object"
              properties:
                body:
                  type: "object"
                  properties:
                    content:
                      type: "string"
                  required:
                    - "content"
              required:
                - "body"
      responses:
        200:
          content:
            application/json:
              schema:
                type: "object"
                properties:
                  created:
                    type: "boolean"
                required:
                  - "created"
```

### JSON Schema Output Example

Using the same endpoint defined above would produce the following JSON schema
at `localhost:8000/.well-known/schema.json`:

```json
{
  "functions": [
    {
      "name": "hello-world_get",
      "description": "Gets a \"Hello World\" message",
      "route": "/hello-world/",
      "url": "localhost/hello-world/",
      "method": "GET",
      "parameters": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "age": {
            "type": "number",
            "minimum": 12,
            "maximum": 199
          }
        },
        "required": [
          "name",
          "age"
        ]
      }
    },
    {
      "name": "hello-world",
      "description": "Creates a new hello world message",
      "route": "/hello-world/",
      "url": "localhost/hello-world/",
      "method": "POST",
      "parameters": {
        "type": "object",
        "properties": {
          "body": {
            "type": "object",
            "properties": {
              "content": {
                "type": "string"
              }
            },
            "required": [
              "content"
            ]
          }
        },
        "required": [
          "body"
        ]
      }
    }
  ]
}
```

### Hiding endpoints with `@private`

Don't want all of your endpoints exposed to your end users? No problem.
Simply mark an endpoint as `@private`, like so:

```javascript
/**
 * My admin function
 * @private
 */
export async function POST (context) {
  await authenticateAdminUser(context);
  doSomethingAdministrative();
  return `ok!`;
}
```

This will prevent it from being shown in either your OpenAPI or JSON schema
outputs.

## Streaming and LLM Support

Instant API comes with built-in support for streaming
[Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
with the `text/event-stream` content type. This allows you to send
events to a user as they are received, and is ideal for developing
LLM-based APIs.

Streams are typed events that can be sent via a special `context.stream()`
method. They must be defined using the `@stream` directive in the JSDoc
descriptor for your API endpoint. Streams are typed like `@param` and `@returns`,
and these types are enforced: if you choose to `context.stream(name, payload)` the
wrong data format in `payload`, your function will throw an error.

By default, functions **will not stream** even when a `@stream` is defined
and `context.stream()` is called. They will simply accept parameters and output a
returned response. In order to activate streaming, you must pass a `_stream` parameter
in the HTTP query parameters or body content - this will initiate a Server-Sent Event
with content type `text/event-stream`.

An example of a simple custom streaming LLM agent endpoint built with Instant API
is below:

```javascript
import OpenAI from 'openai';
const openai = new OpenAI(process.env.OPENAI_API_KEY);

/**
 * Streams results for our lovable assistant
 * @param {string} query The question for our assistant
 * @stream {object}   chunk
 * @stream {string}   chunk.id
 * @stream {string}   chunk.object
 * @stream {integer}  chunk.created
 * @stream {string}   chunk.model
 * @stream {object[]} chunk.choices
 * @stream {integer}  chunk.choices[].index
 * @stream {object}   chunk.choices[].delta
 * @stream {?string}  chunk.choices[].delta.role
 * @stream {?string}  chunk.choices[].delta.content
 * @returns {object} message
 * @returns {string} message.content
 */
export async function GET (query, context) {
  const completion = await openai.chat.completions.create({
    messages: [
      {role: `system`, content: `You are a lovable, cute assistant that uses too many emojis.`},
      {role: `user`, content: query}
    ],
    model: `gpt-3.5-turbo`,
    stream: true
  });
  const messages = [];
  for await (const chunk of completion) {
    // Stream our response as text/event-stream when ?_stream parameter added
    context.stream('chunk', chunk); // chunk has the schema provided above
    messages.push(chunk?.choices?.[0]?.delta?.content || '');
  }
  return {content: messages.join('')};
};
```

### `@stream` type safety

All `@stream` definitions follow the same [Type Safety](#type-safety) rules
as `@param` and `@returns` directives.

### Using `context.stream()`

To send a streaming response to the client, use `context.stream(name, payload)`
where `name` is the name of the stream and `payload` adheres to the correct
type definition for the stream.

**Note:** You must import `context` properly by adding it as the final parameter
in your function arguments.

### Using the `_stream` parameter

By default, **API endpoints will not stream responses**. You must activate a
Server-Sent event by sending the `_stream` parameter. Provided the endpoint defined
above, here is what you would receive given different URL accession patterns:

```
localhost:8000/assistant?query=how%20are%20you%20today?
```

```json
{
  "content": "Hey there! 💁‍♀️ I'm doing great, thank you! 💖✨ How about you? 😊🌈"
}
```

Appending `_stream` to your query parameters gives you a live stream between a
`@begin` and `@response` event, the latter returning an `object.http` payload
containing the typical expected response for the event:

```
localhost:8000/assistant?query=how%20are%20you%20today?&_stream
```

```shell
id: 2023-10-25T04:29:59.115000000Z/2e7c7860-4a66-4824-98fa-a7cf71946f19
event: @begin
data: "2023-10-25T04:29:59.115Z"

[... more events ...]

event: chunk
data: {"id":"chatcmpl-8DPoluIgN4TDIuE1usFOKTLPiIUbQ","object":"chat.completion.chunk","created":1698208199,"model":"gpt-3.5-turbo-0613","choices":[{"index":0,"delta":{"content":" 💯"},"finish_reason":null}]}

[... more events ...]

event: @response
data: {"statusCode":200,"headers":{"X-Execution-Uuid":"2e7c7860-4a66-4824-98fa-a7cf71946f19","X-Instant-Api":"true","Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, POST, OPTIONS, HEAD, PUT, DELETE","Access-Control-Allow-Headers":"","Access-Control-Expose-Headers":"x-execution-uuid, x-instant-api, access-control-allow-origin, access-control-allow-methods, access-control-allow-headers, x-execution-uuid","Content-Type":"application/json"},"body":"{\"content\":\"Hey there! 🌞 I'm feeling 💯 today! Full of energy and ready to help you out. How about you? How are you doing? 🌈😊\"}"}
```

## Debugging

Sometimes, and especially when dealing with LLMs, you find you have long-running
endpoints that can be a pain to debug. Instant API exposes two methods, `context.log()`
and `context.error()` that can be streamed to browser output as a Server-Sent Event
**even if streaming is not enabled on your endpoint**. Debugging is only available
when `NODE_ENV=development`.

Simply append `_debug` to your query parameters (or add it to your request body)
to see `context.log()` and `context.error()` output in real-time.

### Using `context.log()` and `context.error()`

These methods are effectively wrappers for `context.stream('@stdout', payload)` and
`context.stream('@stderr', payload)` - only they don't require streams to be enabled
to use. They'll output as streams with the event types `@stdout` and `@stderr`, respectively,
when the `_debug` parameter is passed in.

### Using the `_debug` parameter

Given the following endpoint:

```javascript
const sleep = t => new Promise(res => setTimeout(() => res(), t));

export async function GET (context) {
  context.log(`Started!`);
  await sleep(100);
  context.error(`Oh no.`);
  await sleep(500);
  context.log(`OK!`);
  return {complete: true};
}
```

Calling it normally would result in:

```
localhost:8000/test-debug
```

```json
{
  "complete": true
}
```

But appending `_debug` in a `development` environment...

```
localhost:8000/test-debug?_debug
```

```shell
id: 2023-10-26T00:16:42.732000000Z/cae5a3c8-14df-4222-b762-fa3f16645fe7
event: @begin
data: "2023-10-26T00:16:42.732Z"

id: 2023-10-26T00:16:42.732000001Z/cae5a3c8-14df-4222-b762-fa3f16645fe7
event: @stdout
data: "Started!"

id: 2023-10-26T00:16:42.834000000Z/cae5a3c8-14df-4222-b762-fa3f16645fe7
event: @stderr
data: "Oh no."

id: 2023-10-26T00:16:43.337000000Z/cae5a3c8-14df-4222-b762-fa3f16645fe7
event: @stdout
data: "OK!"

event: @response
data: {"statusCode":200,"headers":{"X-Execution-Uuid":"cae5a3c8-14df-4222-b762-fa3f16645fe7","X-Debug":true,"X-Instant-Api":"true","Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, POST, OPTIONS, HEAD, PUT, DELETE","Access-Control-Allow-Headers":"","Access-Control-Expose-Headers":"x-execution-uuid, x-debug, x-instant-api, access-control-allow-origin, access-control-allow-methods, access-control-allow-headers, x-execution-uuid","Content-Type":"application/json"},"body":"{\"complete\":true}"}
```

## Built-in Errors

As you develop with Instant API, you may encounter various error types as you test
the limits and boundariess of the framework. They are typically in the format:

```json
{
  "error": {
    "type": "NamedError",
    "message": "error message",
    "stack": "",
    "details": {}
  }
}
```

Note that `error.stack` will **not** appear when `NODE_ENV=production`.
The `details` object may or may not be present. A list of errors you may encounter
are below:

| Error Type | Description | Details Object |
| ---------- | ----------- | -------------- |
| WellKnownError | Error loading a schema from `/.well-known/` pathname | N/A |
| ClientError | Generic 4xx, usually 400 (Bad Request) | N/A |
| ServerError | Generic 5xx, usually 500 (Internal Server Error) | N/A |
| BadRequestError | Returned when `throw new Error('400: [...]')` is called | N/A |
| UnauthorizedError | Returned when `throw new Error('401: [...]')` is called | N/A |
| PaymentRequiredError | Returned when `throw new Error('402: [...]')` is called | N/A |
| ForbiddenError | Returned when `throw new Error('403: [...]')` is called | N/A |
| NotFoundError | Returned when `throw new Error('404: [...]')` is called | N/A |
| ParameterParseError | Could not parse parameters based on content-type | N/A |
| ParameterError | `@param` validation failed | `{[field]: {message: 'string', invalid: true, mismatch: 'obj.a.b', expected: {type}, actual: {value, type}}}` |
| ValueError | `@returns` validation failed | Same as `ParameterError`, only with `"returns"` as the field |
| StreamParameterError | `@stream` validation failed | Same as `ParameterError`, only with the stream name as the field |
| StreamError | Stream specified with `context.stream()` does not exist | N/A |
| StreamListenerError | Specific stream `name` via `_stream: {name: true}` does not exist | N/A |
| OriginError | Invalid `@origin` specified | N/A |
| DebugError | Could not debug endpoint with `_debug`, usually permission issue | N/A |
| ExecutionModeError | Could not execute with `_stream` or `_background` because they are not enabled | N/A |
| TimeoutError | Endpoint took too long to execute. Configurable on gateway initialization. | N/A |
| FatalError | The gateway had a fatal crash event, status code `500` | N/A | 
| RuntimeError | An error was thrown during endpoint execution, status code `420` | N/A |
| InvalidResponseHeaderError | A header specified in an `object.http` return statement was invalid | Object containing invalid headers |
| AccessSourceError | Placeholder: Currently unused, intended for platform gateways. | N/A |
| AccessPermissionError | Placeholder: Currently unused, intended for platform gateways. | N/A |
| AccessAuthError | Placeholder: Currently unused, intended for platform gateways. | N/A |
| AccessSuspendedError | Placeholder: Currently unused, intended for platform gateways. | N/A |
| OwnerSuspendedError | Placeholder: Currently unused, intended for platform gateways. | N/A |
| OwnerPaymentRequiredError | Placeholder: Currently unused, intended for platform gateways. | N/A |
| RateLimitError | Placeholder: Currently unused, intended for platform gateways. | N/A |
| AuthRateLimitError | Placeholder: Currently unused, intended for platform gateways. | N/A |
| UnauthRateLimitError | Placeholder: Currently unused, intended for platform gateways. | N/A |
| SaveError | Placeholder: Currently unused, intended for platform gateways. | N/A |
| MaintenanceError | Placeholder: Currently unused, intended for platform gateways. | N/A |
| UpdateError | Placeholder: Currently unused, intended for platform gateways. | N/A |
| AutoformatError | Placeholder: Currently unused, intended error if formatting on static resources goes awry. | N/A |

## Testing

Instant API comes packaged with a `TestEngine` class for automated testing. It designed
to work best with [mocha](https://mochajs.org/) and [chai](https://www.chaijs.com/) but
can be used with any runtime.

### Quickstart for tests

The best way to get started with tests is via the `instant.dev`
[command line tools](https://github.com/instant-dev/instant). Once your project is initialized,
you can generate tests for your endpoints with:

```shell
instant g:test --function path/to/index.mjs
```

Where `./functions/path/to/index.mjs` is an endpoint. This will automatically create
a test for each exported function (HTTP method) on the endpoint in:
`./test/tests/functions/path/to/index.mjs`.

Additionally, if you are using [Instant ORM](https://github.com/instant-dev/orm), you can
generate tests for individual models using:

```shell
instant g:test --model users
```

Which will create a test in `./test/tests/models/user.js`.

Finally, To create blank (empty) tests use:

```shell
instant g:test path/to/my_test_name
```

Which will create an empty test in `./test/tests/path/to/my_test_name.mjs`.

Tests can be run via:

```shell
instant test
```

### Custom installation for tests

If you want to write your own tests without using the `instant.dev`
[command line tools](https://github.com/instant-dev/instant), you should
first install `mocha` and `chai`.

```shell
npm i mocha --save-dev
npm i chai --save-dev
```

Next, create the file `./test/run.mjs` with the following contents:

```javascript
import InstantAPI from '@instant.dev/api';

const Gateway = InstantAPI.Gateway;
const TestEngine = InstantAPI.TestEngine;
const PORT = 7357; // Leetspeak for "TEST"; can be anything

// Load environment variables; make sure NODE_ENV is "test"
process.env.NODE_ENV = `test`;

// Initialize and load tests; set PORT for request mocking
const testEngine = new TestEngine(PORT);
await testEngine.initialize('./test/tests');

// Setup; create objects and infrastructure for tests
// Arguments returned here will be sent to .finish()
testEngine.setup(async () => {

  console.log();
  console.log(`# Starting test gateway on localhost:${PORT} ... `);
  console.log();

  // Start Gateway; {debug: true} will print logs
  const gateway = new Gateway({debug: false});
  gateway.load(process.cwd());       // load routes from filesystem
  gateway.listen(PORT);              // start server

  return { gateway };

});

// Run tests; use first argument to specify a test
const args = process.argv.slice(3);
if (args[0]) {
  await testEngine.run(args[0]);
} else {
  await testEngine.runAll();
}

// Finish; close Gateway and disconnect from database
// Receive arguments from .setup()
testEngine.finish(async ({ gateway }) => {
  gateway.close();
});
```

Finally, you can then add the following to `package.json`:

```json
  "scripts": {
    "test": "mocha test/run.mjs"
  }
```

Tests can then be run via:

```shell
npm test
```

### Writing tests

All tests should be put in the `./test/tests` directory. This directory
will be used by `TestEngine` to load all of your tests. Tests are imported
**when they are run**, not when they are first initialized in `TestEngine`.

The structure of a test should look like this;

```javascript
// Imports, setup to begin with
import chai from 'chai';
const expect = chai.expect;

// Optional: Name your test file
export const name = `Some tests`;

/**
 * Your tests
 * @param {any} setupResult Result of the function passed to `.setup()` in `test/run.mjs`
 */
export default async function (setupResult) {

  before(async () => {
    // any necessary setup
  });

  it('Should test for truthiness of "true"', async () => {

    expect(true).to.equal(true);

  });

  after(async () => {
    // any necessary teardown
  });

};
```

### Running tests

Tests are run top-down, depth-first, alphabetically.
Given the following directory structure:

```yaml
- test/
  - tests/
    - a/
      - second.mjs
      - a/third.mjs
      - b/fourth.mjs
    - b/
      - fifth.mjs
    - first.mjs

```

- All tests in the root `test/tests` directory are executed first, alphabetically
- All directories in `test/tests` are organized alphabetically
- All tests in `test/tests/a/` would then run
- Then tests in `test/tests/a/a/`
- Then tests in `test/tests/a/b/`
- then tests in `test/tests/b/`

Giving a test order of:

```yaml
- test/tests/first.mjs
- test/tests/a/second.mjs
- test/tests/a/a/third.mjs
- test/tests/a/b/fourth.mjs
- test/tests/b/fifth.mjs
```

If you set up via `instant.dev` [command line tools](https://github.com/instant-dev/instant),
just run:

```shell
instant test
```

If you are running a custom installation, use:

```shell
npm test
```

## Deployment

Instant API can be deployed out-of-the-box to any host that respects the
`[package.json].scripts.start` field. This includes AWS Elastic Beanstalk and Heroku.
Vercel requires a little bit of finagling. However, the `instant.dev`
[command line tools](https://github.com/instant-dev/instant) will automatically
manage deployments to both AWS Elastic Beanstalk and Vercel for you.

### via `instant deploy`

Simple;

```shell
instant deploy:config # follow instructions; choose Vercel or AWS
instant deploy --env staging # for Elastic Beanstalk
instant deploy --env preview # for Vercel
instant deploy --env production # Works for either
```

### Custom deployments

We defer to platform-specific Node.js deployment instructions. If you would
like to contribute some helpful tips, please submit a PR on this README!

## More Information

### Gateway Configuration

You can configure some custom options in your `instant.mjs` startup script.

```javascript
import InstantAPI from '@instant.dev/api';

// ... other code ...

const Gateway = InstantAPI.Daemon.Gateway;

const gateway = new Gateway({
  port: 8000, //Defaults to 8170
  name: 'My API Server', // Defaults to "InstantAPI.Gateway"
  maxRequestSizeMB: 16, // Requests above this size will error. Defaults to 128MB.
  defaultTimeout: 10000 // Max execution time in ms. Defaults to 600000 (10 mins).
  debug: true // Whether to show logs or not, defaults to false
});
```

### Logging

Currently logging is controlled entirely via the `debug` parameter in
`new Gateway()` instatiation. When set to `true` this can very quickly overwhelm
log storage on high-volume API servers. We're interested in getting feedback
on your favorite log draining solutions and if there are elegant ways to integrate.
Submit an issue to talk to us about it!

### Error monitoring

The `Gateway` instant comes with a built-in `setErrorHandler()` method to
capture internal errors. You can add it to `instant.mjs` or your startup script easily.
Here's an example using [Sentry](https://sentry.io):

```javascript
import InstantAPI from '@instant.dev/api';
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: '__DSN__',
  // ...
});

// ... other code ...

const Gateway = InstantAPI.Daemon.Gateway;

const gateway = new Gateway({port: process.env.PORT});
gateway.setErrorHandler(e => Sentry.captureException(e));
gateway.load(process.cwd());
gateway.listen();
```

This will catch all internal errors with the exception of;

- Validation errors:
  - ExecutionModeError, ParameterParseError, ParameterError, StreamError, StreamParameterError
- Intentionally thrown client errors:
  - BadRequestError, UnauthorizedError, PaymentRequiredError, ForbiddenError, NotFoundError

### Middleware

For the most part, Instant API has pretty comprehensive body parsing and parameter
validation libraries built right in. However, you still might want to write or use
custome middleware for repeated tasks; like authenticating users based on `headers`.

We recommend a simple approach of a `middleware/` directory with files that each output
a function that takes `context` as a single argument:

e.g. in `./middleware/authenticate.mjs`

```javascript
export default async (context) {
  let headers = context.https.headers;
  let result = await authenticateUser(headers);
  if (result) {
    return true;
  } else {
    throw new Error(`401: Unauthorized, failed header validation`);
  }
}
```

Then in your endpoints, you can do the following;

```javascript
import authenticate from '../middleware/authenticate.mjs`;

export async function GET (context) => {
  await authenticate(context);
  return 'authenticated!';
}
```

## Roadmap and Feedback

We're just getting the first release of Instant API into the wild now, we're excited to hear feedback!
It's a pretty comprehensive framework we've been developing for years and we're happy with the feature
set, but please let us know if there are things we are missing by opening an issue.

# Acknowledgements

Special thank you to [Scott Gamble](https://x.com/threesided) who helps run all of the front-of-house work for instant.dev 💜!

| Destination | Link |
| ----------- | ---- |
| Home | [instant.dev](https://instant.dev) |
| GitHub | [github.com/instant-dev](https://github.com/instant-dev) |
| Discord | [discord.gg/puVYgA7ZMh](https://discord.gg/puVYgA7ZMh) |
| X / instant.dev | [x.com/instantdevs](https://x.com/instantdevs) |
| X / Keith Horwood | [x.com/keithwhor](https://x.com/keithwhor) |
| X / Scott Gamble | [x.com/threesided](https://x.com/threesided) |