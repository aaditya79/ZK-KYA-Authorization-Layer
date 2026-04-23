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
    expiry: 1715003600,
    nonce: 2,
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
    requestedService: SERVICES.BANK.toString(),
    requestedAction: ACTIONS.PAY_BILL.toString(),
    requestedAmount: "150",
    currentTime: "1715000000",
  };

  const outPath = path.join(__dirname, "..", "circuits", "build", "bad_auth_input.json");
  fs.writeFileSync(outPath, JSON.stringify(input, null, 2));

  console.log("Wrote bad input to", outPath);
  console.log(JSON.stringify(input, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});