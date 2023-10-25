# Instant API

![travis-ci build](https://travis-ci.org/instant-dev/api.svg?branch=main)
![npm version](https://img.shields.io/npm/v/@instant.dev/api?label=)

# Type-safe JavaScript API Framework
## Built-in spec generation and LLM streaming

Instant API is a framework for building APIs with JavaScript that implements
**type-safety at the HTTP interface**. By doing so, it eliminates the need for
schema validation libraries entirely. Simply write a JSDoc-compliant specification
for your API endpoint and stop worrying about validation and testing for user input.
The OpenAPI specification for your API is then automatically generated in both
JSON and YAML at `/.well-know/openapi.json` and `/.well-known/openapi.yaml`.

Additionally, Instant API comes packaged with LLM-focused features to future-proof your
API in preparation for AI integration. First class support for `text/event-stream` makes
streaming LLM responses easy,
[LLM function calling](https://openai.com/blog/function-calling-and-other-api-updates) is
a breeze via a list of your API functions available at at `/.well-known/functions.json`,
and experimental auto-generation of `/.well-known/ai-plugin.json` enables rapid integration
into AI platforms like OpenAI plugins.

## Features

Instant API comes with the following features;

- Parameter validation (query and body) based on JSDoc specification
  - e.g. `@param {string{5..25}} title` ensures titles is a string between 5 and 25 characters
- Function-based routing for endpoints: one function = one endpoint
  - `/functions/v1/path-to/file.mjs` => `example.com/v1/path-to/file`
- Automatic generation of OpenAPI specification for your endpoints
  - `/.well-known/openapi.json` and `/.well-known/openapi.yaml`
  - Mark endpoints as `@private` to prevent display
- Accepts all common body types interchangeably
  - `application/json`, `application/x-www-form-urlencoded`, `multipart/form-data`
- Built-in support for LLM streaming with `text/event-stream`
- Built-in support for common `application/x-www-form-urlencoded` patterns
  - For both query parameters and body content
  - Arrays: `a=1&a=2` OR `a[]=1&a[]=2` OR `a[0]=1&a[1]=2` OR `a=[1,2]`
  - Objects: `obj.a=1&obj.b=2` OR `obj[a]=1&obj[b]=2` OR `obj={"a":1,"b":2}`
- Built-in support for handling file data via `Buffer` objects
  - Can send files via `multipart/form-data` requests
  - Or as base64-encoded object via: `{"_base64": "[...b64 string...]"}`
- Simple integration with [Instant ORM](https://github.com/instant-dev/orm)
- Built-in testing framework to manage automated endpoint tests
- Hot-reloading when `NODE_ENV=development`

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
   1. Parameter validation
   1. Returning responses
      1. `@returns` type safety
      1. Custom HTTP Responses
      1. Streaming Responses
      1. Debug Responses
   1. Throwing errors
1. OpenAPI Specification Generation
1. Streaming and LLM Support
   1. `@stream` type safety
   1. Using `context.stream()`
   1. Using the `_stream` parameter
1. Debugging
   1. Using the `_debug` parameter
1. Advanced Endpoint Management
   1. Request handling
      1. GET / DELETE
      1. POST / PUT
      1. `application/json`,
      1. `application/x-www-form-urlencoded`
      1. `multipart/form-data`
   1. CORS (Cross-Origin Resource Sharing)
1. Built-in Errors
1. Testing
   1. via `instant test`
   1. Writing tests
   1. Running tests
1. Deployment
   1. via `instant deploy`
   1. Custom deployments
1. More Information
   1. Logging
   1. Error monitoring
   1. Middleware
1. Acknowledgements

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

Creating endpoints for Instant API is easy. Instant API relies on a Function as a Service
model for endpoint execution: every {Route, HTTP Method} combination is modeled as an
exported function. To add parameter validation a.k.a. type safety to your endpoints,
you simply document your exported functions with a slightly modified JSDoc specification
comment block. For example, the simplest endpoint possible would look like this;

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
import InstantAPI from '@instant.dev/api';
const Instant = await InstantAPI.connectToPool(); // connect to postgres
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

curl -X GET localhost:8000/?name=world&age=lol
> {"error":...} # Returns ParameterError (400) -- age should be a number

curl -X GET localhost:8000/?name=world&age=99
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

curl -X GET localhost:8000/?name=world&age=101
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


#### Query vs. Body parameters


####


### Returning responses



#### `@returns` type safety



#### Custom HTTP Responses



#### Streaming Responses



#### Debug Responses



### Throwing errors



## OpenAPI Specification Generation



## Streaming and LLM Support



### `@stream` type safety



### Using `context.stream()`



### Using the `_stream` parameter



## Debugging



### Using the `_debug` parameter



## Advanced Endpoint Management



### Request handling



#### GET / DELETE



#### POST / PUT



#### `application/json`,



#### `application/x-www-form-urlencoded`



#### `multipart/form-data`



### CORS (Cross-Origin Resource Sharing)



## Built-in Errors



## Testing



### via `instant test`



### Writing tests



### Running tests



## Deployment



### via `instant deploy`



### Custom deployments



## More Information



### Logging



### Error monitoring



### Middleware

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