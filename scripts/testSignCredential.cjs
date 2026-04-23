const { Wallet } = require("ethers");
const { SERVICES, ACTIONS, buildCredential } = require("./credentialSchema.cjs");
const { signCredential } = require("./signCredential.cjs");

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

  const { digest, signature } = await signCredential(wallet, credential);

  console.log("Issuer address:", wallet.address);
  console.log("Credential:", credential);
  console.log("Digest:", digest);
  console.log("Signature:", signature);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});