const { hashCredential } = require("./hashCredential.cjs");
const { signCredential } = require("./signCredential.cjs");

async function createIssuancePayload(wallet, credential) {
  const commitment = await hashCredential(credential);
  const { digest, signature } = await signCredential(wallet, credential);

  return {
    credential,
    digest,
    signature,
    commitment,
  };
}

module.exports = {
  createIssuancePayload,
};