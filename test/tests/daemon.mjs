import chai from 'chai';
const expect = chai.expect;

import fs from 'fs';
import path from 'path';

import { InstantAPI } from '../helpers.mjs';

const Daemon = InstantAPI.Daemon;

const ROOT = 'test/files/daemon_watch';

export const name = 'Daemon';
export default async function (setupResult) {

  it('should parse .daemonignore: one path a line, comments, ./ and trailing slashes, never outside the root', () => {

    const ignore = Daemon.parseIgnore([
      '# not watched',
      './test/',
      'scripts//',
      '',
      '   task_output   ',
      '../elsewhere',
      '.'
    ].join('\n'));
    expect(ignore).to.deep.equal(['test', 'scripts', 'task_output']);
    expect(Daemon.parseIgnore('')).to.deep.equal([]);
    expect(Daemon.parseIgnore(null)).to.deep.equal([]);

  });

  it('should ignore a listed path and everything under it, and nothing that only starts the same', () => {

    const ignore = ['test', 'scripts/build.js'];
    expect(Daemon.isIgnored(ignore, 'test')).to.equal(true);
    expect(Daemon.isIgnored(ignore, 'test/tests/a.mjs')).to.equal(true);
    expect(Daemon.isIgnored(ignore, 'tests/a.mjs')).to.equal(false);
    expect(Daemon.isIgnored(ignore, 'scripts/build.js')).to.equal(true);
    expect(Daemon.isIgnored(ignore, 'scripts/other.js')).to.equal(false);
    expect(Daemon.isIgnored(ignore, 'functions/index.mjs')).to.equal(false);
    expect(Daemon.isIgnored([], 'test/a.mjs')).to.equal(false);

  });

  it('should read no ignore list where there is no .daemonignore', () => {

    expect(Daemon.readIgnore(path.join(process.cwd(), 'test/files/does_not_exist'))).to.deep.equal([]);

  });

  it('should not report changes under an ignored path, and still report the rest', async function () {

    this.timeout(10000);
    fs.rmSync(ROOT, { recursive: true, force: true });
    fs.mkdirSync(path.join(ROOT, 'kept'), { recursive: true });
    fs.mkdirSync(path.join(ROOT, 'skipped'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'kept/a.js'), '1');
    fs.writeFileSync(path.join(ROOT, 'skipped/b.js'), '1');
    const daemon = new Daemon('Test', 1);
    const changes = [];
    try {
      daemon.watch(ROOT, found => changes.push(...found), [path.join(ROOT, 'skipped')]);
      // Modification times are compared to the second
      await new Promise(resolve => setTimeout(resolve, 1100));
      fs.writeFileSync(path.join(ROOT, 'skipped/b.js'), '2');
      fs.writeFileSync(path.join(ROOT, 'skipped/new.js'), '1');
      fs.writeFileSync(path.join(ROOT, 'kept/a.js'), '2');
      await new Promise(resolve => setTimeout(resolve, 2200));
    } finally {
      daemon.unwatch();
      fs.rmSync(ROOT, { recursive: true, force: true });
    }
    const paths = changes.map(change => path.relative(process.cwd(), change.path));
    expect(paths).to.include(path.join(ROOT, 'kept/a.js'));
    expect(paths.filter(p => p.startsWith(path.join(ROOT, 'skipped')))).to.deep.equal([]);

  });

};
