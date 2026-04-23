const { keccak256, AbiCoder, getBytes } = require("ethers");

const abi = AbiCoder.defaultAbiCoder();

function encodeCredential(credential) {
  return abi.encode(
    ["address", "address", "uint256", "uint256", "uint256", "uint256", "uint256"],
    [
      credential.issuer,
      credential.agent,
      credential.service,
      credential.action,
      credential.maxAmount,
      credential.expiry,
      credential.nonce,
    ]
  );
}

function getCredentialDigest(credential) {
  const encoded = encodeCredential(credential);
  return keccak256(encoded);
}

async function signCredential(wallet, credential) {
  const digest = getCredentialDigest(credential);
  const signature = await wallet.signMessage(getBytes(digest));

  return {
    digest,
    signature,
  };
}

module.exports = {
  encodeCredential,
  getCredentialDigest,
  signCredential,
};