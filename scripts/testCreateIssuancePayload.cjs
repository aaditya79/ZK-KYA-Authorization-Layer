const { Wallet } = require("ethers");
const { SERVICES, ACTIONS, buildCredential } = require("./credentialSchema.cjs");
const { createIssuancePayload } = require("./createIssuancePayload.cjs");

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

  const payload = await createIssuancePayload(wallet, credential);

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});