const cluster = require('cluster');
const os = require('os');
const http = require('http');
const fs = require('fs');
const path = require('path');
const colors = require('colors/safe');

const Gateway = require('./gateway.js');

const WATCH_FOR_CHANGES = (
  !process.env.DISABLE_HOT_RELOAD &&
  (process.env.NODE_ENV || 'development') === 'development'
);

// Paths (relative to the project root) whose changes never restart the Daemon
const IGNORE_FILENAME = '.daemonignore';

/**
* Multi-process HTTP Daemon that resets when files changed (in development)
* @class
*/
class Daemon {

  constructor (name, cpus) {

    this.name = name || 'HTTP';

    this._watchers = null;

    this._error = null;
    this._server = null;
    this._port = null;

    this._paused = false;

    this.cpus = parseInt(cpus) || os.cpus().length;
    this.children = [];

    process.on('exit', (code) => {

      this.log(`Shutdown: Exited with code ${code}`);

    });

  }

  log (message) {
    console.log(colors.grey(`[${colors.blue(`${this.name}.Daemon`)}] ${message}`));
  }

  /**
  * Starts the Daemon. If all application services fail, will launch a
  *   dummy error app on the port provided.
  * @param {Number} port
  */
  start (port) {

    this._port = port || 3000;

    this.log(`Startup: Initializing`);

    if (WATCH_FOR_CHANGES) {

      this.watch('', (changes) => {
        changes.forEach(change => {
          this.log(`${change.event[0].toUpperCase()}${change.event.substr(1)}: ${change.path}`);
        });
        this.children.forEach(child => child.send({invalidate: true}));
        this.children = [];
        !this.children.length && this.unwatch() && this.start();
      });

    }

    this._server && this._server.close();
    this._server = null;

    for (var i = 0; i < this.cpus; i++) {

      let child = cluster.fork();
      this.children.push(child);

      child.on('message', this.message.bind(this));
      child.on('exit', this.exit.bind(this, child));

    }

    this.log(`Startup: Spawning ${this.cpus} HTTP Worker${this.cpus > 1 ? `s` : ``}`);

  }

  /**
  * Daemon failed to load, set it in idle state (accept connections, give dummy response)
  */
  idle () {

    let port = this._port || 3000;

    this._server = http
      .createServer((req, res) => {
        this.error(req, res, this._error);
      })
      .listen(port);

    this.log(`Idle: Unable to spawn HTTP Workers, listening on port ${port}`);

  }

  error (req, res, error) {

    const env = process.env.NODE_ENV || 'development';
    res.writeHead(500, {'Content-Type': 'text/plain'});
    res.end(
      `Application Error: ` +
      (
        error
          ? (env === 'development' ? error.stack : error.message)
          : 'Could not load application'
      )
    );

  }

  message (data) {

    if (data.error) {
      this.logError(data.error);
    }

  }

  /**
  * Shut down a child process given a specific exit code. (Reboot if clean shutdown.)
  * @param {child_process} child
  * @param {Number} code Exit status codes
  */
  exit (child, code) {

    let index = this.children.indexOf(child);

    if (index === -1) {
      return;
    }

    this.children.splice(index, 1);

    if (code === 0) {
      child = cluster.fork();
      this.children.push(child);
      child.on('message', this.message.bind(this));
      child.on('exit', this.exit.bind(this, child));
    }

    if (this.children.length === 0) {
      this.idle();
    }

  }

  /**
  * Log an error on the Daemon
  * @param {Error} error
  */
  logError (error) {

    this._error = error;
    this._server = null;
    console.error(`${error.name}: ${error.message}`);
    console.error(error.stack);

  }

  /**
  * Reads the paths to leave unwatched from `.daemonignore` in `root`: one
  *   per line, relative to `root`, a directory covering everything under
  *   it. Blank lines and lines starting with `#` are skipped, as are
  *   leading `./` and trailing slashes. No file, nothing ignored.
  * @param {string} root Project root
  * @returns {Array<string>} Normalized relative paths
  */
  static readIgnore (root) {

    let pathname = path.join(root || process.cwd(), IGNORE_FILENAME);
    let text;
    try {
      text = fs.readFileSync(pathname).toString();
    } catch (e) {
      return [];
    }
    return Daemon.parseIgnore(text);

  }

  /**
  * Parses the contents of a `.daemonignore` file (see `readIgnore`)
  * @param {string} text
  * @returns {Array<string>} Normalized relative paths
  */
  static parseIgnore (text) {

    return (text || '')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => path.normalize(line).replace(/^(\.[\\/])+/, '').replace(/[\\/]+$/, ''))
      .filter(line => line && line !== '.' && !line.startsWith('..'));

  }

  /**
  * Whether a path (relative to the project root) is ignored: it is one of
  *   `ignore`, or lies under one
  * @param {Array<string>} ignore Normalized relative paths (`parseIgnore`)
  * @param {string} relativePath
  * @returns {boolean}
  */
  static isIgnored (ignore, relativePath) {

    if (!ignore || !ignore.length) {
      return false;
    }
    let normalized = path.normalize(relativePath);
    return ignore.some(entry => normalized === entry || normalized.startsWith(entry + path.sep));

  }

  /**
  * Stops watching a directory tree for changes
  */
  unwatch () {

    clearInterval(this._watchers.interval);
    this._watchers = null;
    return true;

  }

  /**
  * Watches a directory tree for changes
  * @param {string} root Directory tree to watch
  * @param {function} onChange Method to be executed when a change is detected
  * @param {Array<string>} [ignore] Paths relative to the working directory to leave unwatched; defaults to `.daemonignore`'s
  */
  watch (root, onChange, ignore = Daemon.readIgnore(process.cwd())) {

    let cwd = process.cwd();

    function watchDir (dirname, watchers) {

      if (!watchers) {

        watchers = Object.create(null);
        watchers.directories = Object.create(null);
        watchers.interval = null;

      }

      let pathname = path.join(cwd, dirname);
      let files = fs.readdirSync(pathname);

      watchers.directories[dirname] = Object.create(null);

      files.forEach(function (name) {

        if (
          name === 'node_modules' ||
          name.indexOf('.') === 0 ||
          name === 'dump.rdb'
        ) {
          return;
        }

        let filename = path.join(dirname, name);
        if (Daemon.isIgnored(ignore, filename)) {
          return;
        }
        let fullPath = path.join(cwd, filename);

        let stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          watchDir(filename, watchers);
          return;
        }

        watchers.directories[dirname][name] = stat;

      });

      return watchers;

    }

    let watchers = watchDir(root || '');
    let self = this;

    watchers.iterate = function (changes) {
      if (!fs.existsSync(path.join(process.cwd(), '.daemon.pause'))) {
        // Skip a cycle if just unpaused...
        if (!this._paused) {
          if (changes.length) {
            onChange.call(self, changes);
          }
        } else {
          this._paused = false;
        }
      } else {
        this._paused = true;
      }
    };

    watchers.interval = setInterval(function() {

      let changes = [];

      Object.keys(watchers.directories).forEach(function (dirname) {

        let dir = watchers.directories[dirname];
        let dirPath = path.join(cwd, dirname);

        if (!fs.existsSync(dirPath)) {

          delete watchers.directories[dirname];
          changes.push({event: 'removed', path: dirPath});

        } else {

          let files = fs.readdirSync(dirPath);
          let added = [];

          let contents = Object.create(null);

          files.forEach(function (filename) {

            if (
              filename === 'node_modules' ||
              filename.indexOf('.') === 0 ||
              filename === 'dump.rdb' ||
              Daemon.isIgnored(ignore, path.join(dirname, filename))
            ) {
              return;
            }

            let fullPath = path.join(dirPath, filename);
            let stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
              let checkPath = path.join(dirname, filename);
              if (!watchers.directories[checkPath]) {
                watchDir(checkPath, watchers);
              }
            } else {
              if (!dir[filename]) {
                added.push([filename, stat]);
                changes.push({event: 'added', path: fullPath});
                return;
              }

              if (stat.mtime.toString() !== dir[filename].mtime.toString()) {
                dir[filename] = stat;
                changes.push({event: 'modified', path: fullPath});
              }

              contents[filename] = true;
            }

          });

          Object.keys(dir).forEach(function (filename) {

            let fullPath = path.join(cwd, dirname, filename);

            if (!contents[filename]) {
              delete dir[filename];
              changes.push({event: 'removed', path: fullPath});
            }

          });

          added.forEach(function (change) {
            let [filename, stat] = change;
            dir[filename] = stat;
          });

        }

      });

      watchers.iterate(changes);

    }, 1000);

    return this._watchers = watchers;

  }

}

class InstantDaemon extends Daemon {
  constructor (cpus, name = 'InstantAPI') {
    super(name, cpus);
  }
}

InstantDaemon.Gateway = class InstantDaemonGateway extends Gateway {

  constructor (cfg) {
    super(cfg);
    process.on('uncaughtException', e => {
      if (typeof process.send === 'function') {
        process.send({
          error: {
            name: e.name,
            message: e.message,
            stack: e.stack
          }
        });
      }
      process.exit(1);
    });
    process.on('message', data => data.invalidate && process.exit(0));
    process.on('exit', code => this.log(null, `Shutdown: Exited with code ${code}`));
  }

  listen (port, callback, opts) {
    super.listen(port, callback, opts);
    if (typeof process.send === 'function') {
      process.send({message: 'ready'});
    }
    return this.server;
  }

}

module.exports = InstantDaemon;
