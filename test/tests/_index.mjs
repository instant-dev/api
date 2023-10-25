import chai from 'chai';
const expect = chai.expect;

import { InstantAPI } from '../helpers.mjs';

const EncryptionTools = InstantAPI.EncryptionTools;

export const name = 'Main tests';
export default async function (setupResult) {

  it('should load EncryptionTools', () => {

    expect(EncryptionTools).to.exist;

  });

};
