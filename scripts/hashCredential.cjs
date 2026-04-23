const circomlibjs = require("circomlibjs");

function addressToBigInt(address) {
  return BigInt(address.toLowerCase());
}

async function hashCredential(credential) {
  const poseidon = await circomlibjs.buildPoseidon();

  const inputs = [
    addressToBigInt(credential.issuer),
    addressToBigInt(credential.agent),
    BigInt(credential.service),
    BigInt(credential.action),
    BigInt(credential.maxAmount),
    BigInt(credential.expiry),
    BigInt(credential.nonce),
  ];

  const hash = poseidon(inputs);
  return poseidon.F.toString(hash);
}

module.exports = {
  hashCredential,
  addressToBigInt,
};