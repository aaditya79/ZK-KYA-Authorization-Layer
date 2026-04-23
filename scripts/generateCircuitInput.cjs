const fs = require("fs");
const path = require("path");
const { Wallet } = require("ethers");
const { SERVICES, ACTIONS, buildCredential } = require("./credentialSchema.cjs");
const { hashCredential, addressToBigInt } = require("./hashCredential.cjs");

async function main() {
  const wallet = Wallet.createRandom();

  const credential = buildCredential({
    issuer: wallet.address,
    agent: "0x2222222222222222222222222222222222222222",
    service: SERVICES.BANK,
    action: ACTIONS.PAY_BILL,
    maxAmount: 100,
    expiry: 1715000000,
    nonce: 1,
  });

  const commitment = await hashCredential(credential);

  const input = {
    issuer: addressToBigInt(credential.issuer).toString(),
    agent: addressToBigInt(credential.agent).toString(),
    service: credential.service.toString(),
    action: credential.action.toString(),
    maxAmount: credential.maxAmount.toString(),
    expiry: credential.expiry.toString(),
    nonce: credential.nonce.toString(),
    commitment: commitment.toString(),
  };

  const outPath = path.join(__dirname, "..", "circuits", "build", "input.json");
  fs.writeFileSync(outPath, JSON.stringify(input, null, 2));

  console.log("Credential:", credential);
  console.log("Commitment:", commitment);
  console.log(`Wrote input to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});