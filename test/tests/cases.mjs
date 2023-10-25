import chai from 'chai';
const expect = chai.expect;

import fs from 'fs';
import path from 'path';

import { InstantAPI } from '../helpers.mjs';

const CASE_PATH = './test/files/cases';
const cases = fs.readdirSync(CASE_PATH).map(filename => {
  if (!filename.match(/\.[cm]?js$/)) {
    throw new Error(`Invalid case ${filename} in "./test/files/cases", file must be (.js|.mjs|.cjs)`);
  }
  let name = filename.replace(/\.[cm]?js$/, '');
  let names = name.split('_').map(n => n[0].toUpperCase() + n.substr(1));
  return {
    name: [names[0], `(${names[1]})`].concat(names.slice(2)).join(' '),
    valid: names[1] === 'Valid',
    pathname: filename,
    buffer: fs.readFileSync(path.join(CASE_PATH, filename))
  }
});

const FunctionParser = InstantAPI.FunctionParser;
const parser = new FunctionParser();

export const name = 'Function export validation';
export default async function (setupResult) {

  cases.forEach(functionCase => {

    it(`Should check ${functionCase.name}`, () => {

      let err;

      try {
        parser.parseDefinition(functionCase.pathname, functionCase.buffer);
      } catch (e) {
        if (functionCase.valid) {
          console.error(e);
        }
        err = e;
      }

      functionCase.valid ?
        expect(err).to.not.exist :
        expect(err).to.exist;

    });

  });

};
