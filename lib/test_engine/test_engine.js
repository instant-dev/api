const fs = require('fs');
const os = require('os');
const path = require('path');
const minimatch = require('minimatch');

const TestEngineTools = require('./test_engine_tools.js');
const formatPath = pathname => `/` + pathname.split(path.sep).slice(1).join('/');

const DEFAULT_IGNORE = [
  '.DS_Store'
];

/**
 * Loads tests from a provided directory
 * Tests must export a default function or async function
 * Tests can optionally export a "name" to name the test
 */
class TestEngine {

  constructor (port) {
    if (!port) {
      throw new Error(`port is required for TestEngine instance`);
    }
    this.tests = [];
    this.testLookup = {};
    this.tools = new TestEngineTools(port);
    this.setupResult = null;
  }

  /**
   * Loads tests from a specified directory
   * Tests will be loaded top-down, alphabetically, by file name
   * e.g. all tests in ./tests/ will be executed before ./tests/more_tests/
   * You can not have non-test files in the directory specified;
   * use a higher-level directory for managing helper files
   * @param {string} dir Directory to load tests from
   * @returns {TestEngine}
   */
  async initialize (dir) {
    const cwd = dir.replaceAll('~', os.homedir());
    if (!fs.existsSync(cwd)) {
      throw new Error(`Can not initialize tests: "${dir}" does not exist`);
    } else if (!fs.statSync(cwd).isDirectory()) {
      throw new Error(`Can not initialize tests: "${dir}" is not a directory`);
    }
    this.tests = await this.__load__(cwd);
    for (const test of this.tests) {
      this.testLookup[test.filename] = test;
    }
    return this;
  }

  /**
   * Loads test files recursively
   * @private
   * @param {string} rootPath 
   * @param {string} dirPath 
   * @param {array<string>} ignore Files to ignore
   * @returns {array<object>}
   */
  async __load__ (rootPath, dirPath = '.', ignore = null) {
    let tests = [];
    if (!rootPath || typeof rootPath !== 'string') {
      throw new Error(`rootPath must be a non-empty string`);
    }
    if (rootPath.startsWith('.')) {
      rootPath = path.join(process.cwd(), rootPath);
    }
    if (ignore && !Array.isArray(ignore)) {
      throw new Error(`Invalid ignore file, received ${typeof ignore} instead of Array`);
    }
    let ignoreList = (ignore || []).concat(DEFAULT_IGNORE);
    if (fs.existsSync(path.join(rootPath, dirPath))) {
      let filenames = fs.readdirSync(path.join(rootPath, dirPath));
      let directories = [];
      let files = [];
      for (const filename of filenames) {
        let pathname = path.join(rootPath, dirPath, filename);
        let filePath = path.join(dirPath, filename);
        let fullPathNormalized = filePath.split(path.sep).join('/');
        for (let i = 0; i < ignoreList.length; i++) {
          if (minimatch(fullPathNormalized, ignoreList[i], {matchBase: true})) {
            continue;
          }
        }
        const stat = fs.statSync(pathname);
        if (stat.isDirectory()) {
          directories.push({pathname, filePath});
        } else {
          files.push({pathname, filePath});
        }
      }
      directories.sort();
      files.sort();
      for (const file of files) {
        try {
          if (!file.pathname.endsWith('.mjs') && !file.pathname.endsWith('.js')) {
            throw new Error(`Must be a valid JavaScript .js or .mjs file`);
          }
          tests.push({
            name: file.filePath.replace(/\.m?js$/gi, ''),
            filename: file.filePath,
            pathname: file.pathname
          });
        } catch (e) {
          console.error(e);
          throw new Error(`Error loading test "${file.pathname}": ${e.message}`);
        }
      }
      for (const directory of directories) {
        tests = tests.concat(await this.__load__(rootPath, directory.filePath, ignore));
      }
    }
    return tests;
  }

  /**
   * Sets up required test objects and infrastructure
   * @param {function} fn 
   */
  async setup (fn) {
    if (typeof fn !== 'function') {
      throw new Error(`.setup requires valid function`);
    }
    this.setupResult = await fn();
  }

  /**
   * Finishes all tests, cleans up objects and infrastructure
   * @param {function} fn 
   */
  async finish (fn) {
    if (typeof fn !== 'function') {
      throw new Error(`.finish requires valid function`);
    }
    if (global.after) {
      global.after(async () => {
        await fn(this.setupResult);
      });
    } else {
      await fn(this.setupResult);
    }
  }

  /**
   * Runs all tests
   * Arguments provided to this function will be passed to all tests when executed
   * @returns {TestEngine}
   */
  async runAll () {
    for (const test of this.tests) {
      await this.run(test.filename);
    }
    return this;
  }

  /**
   * Runs a specific test by name
   * Arguments provided to this function after the test name will be passed to all tests when executed
   * @param {string} name 
   * @returns {TestEngine}
   */
  async run (name) {
    if (typeof name !== 'string') {
      throw new Error(`name must be a valid string`);
    }
    if (name.startsWith('/')) {
      name = name.slice(1);
    }
    name = name.replace(/\.m?js$/gi, '');
    const test = this.testLookup[`${name}.js`] || this.testLookup[`${name}.mjs`];
    if (!test) {
      throw new Error(`No test matching "${name}" found`);
    }
    let script = await this.importTest(test);
    if (global.describe) {
      global.describe(script.name, async () => {
        await script.run.apply(this.tools, [this.setupResult]);
      });
    } else {
      await script.run.apply(this.tools, [this.setupResult]);
    }
    return this;
  }

  async importTest (test) {
    let name = test.name;
    let script;
    try {
      script = await import(formatPath(test.pathname));
      if (!script.default) {
        throw new Error(`Missing default export`);
      }
      if (script.name) {
        if (typeof script.name !== 'string') {
          throw new Error(`Export "name" must be a string`);
        } else {
          name = `${script.name} (${test.name})`;
        }
      }
      if (typeof script.default !== 'function') {
        throw new Error(`Default export must be a function`);
      }
    } catch (e) {
      throw new Error(`Could not import "${test.name}": ${e.message}`);
    }
    return {name, run: script.default};
  }

}

module.exports = TestEngine;