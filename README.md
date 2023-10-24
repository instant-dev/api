# Instant API

![travis-ci build](https://travis-ci.org/instant-dev/api.svg?branch=main)
![npm version](https://img.shields.io/npm/v/@instant.dev/api?label=)

## Type-safe JavaScript API Framework with built-in LLM Streaming Support

Instant API is a framework for building APIs with JavaScript that implements
**type-safety at the HTTP interface**. By doing so, it eliminates the need for
schema validation libraries entirely. Simply write a JSDoc-compliant specification
for your API endpoint and never worry about validating user input manually ever
again.

Instant API comes with the following features;

- Parameter validation (query and body) based on JSDoc specification
  - e.g. `@param {string{5..25}} title` ensures titles is a string between 5 and 25 characters
- Serverless-style routing for endpoints: one function = one endpoint
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
at the URL `example.com/v1/weather/current` via HTTP GET.

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
    // Prefixing an error message with a "{code}:" between 400 and 404
    //   automatically creates the correct associated Client Error:
    //   BadRequestError, UnauthorizedError, PaymentRequiredError,
    //   ForbiddenError, NotFoundError
    // Otherwise, will return a RuntimeError with code 400
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

LLM streaming is simple. It relies on a special `context` object
and defining `@stream` parameters to create a `text/event-stream` response.

File: `/functions/v1/ai-helper.mjs`

```javascript
/**
 * AI Helper: Ask me anything!
 * @param {string} query Question to ask the helper
 * @returns {object}
 */
export async function GET (query) {

  // TODO: Write docs

}
```

## Table of Contents

1. Getting Started
   1. Quickstart
   1. Custom installation
1. Endpoints and Type Safety
   1. Endpoint structure
      1. Creating an endpoint
      1. API endpoints: `functions/` directory
         1. Index routing with `index.js`
         1. Wildcard routing with `404.js`
      1. Static files: `www/` directory
         1. Index routing with `index.html`
         1. Wildcard routing with `404.html`
   1. Supported types
      1. any
      1. boolean
      1. string
      1. number
      1. float
      1. integer
      1. boolean
      1. array
      1. object
         1. object.http
      1. buffer
      1. other
         1. enum
   1. Parameter validation
   1. Returning responses
      1. Return type safety
      1. Custom HTTP Response
      1. Streaming Response
   1. Throwing errors
1. OpenAPI Specification Generation
1. Streaming and LLM Support
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

## Getting Started

### Quickstart

The quickest way to get started with Instant API is via the
[`instant.dev` command line tools](https://github.com/instant-dev/instant.dev).
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

# See all available command
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