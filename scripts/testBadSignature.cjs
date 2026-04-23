const { JsonRpcProvider, Wallet, Contract } = require("ethers");
const { SERVICES, ACTIONS, buildCredential } = require("./credentialSchema.cjs");
const { createIssuancePayload } = require("./createIssuancePayload.cjs");

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const RPC_URL = "http://127.0.0.1:8545";

const PRIVATE_KEY_0 =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const PRIVATE_KEY_1 =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

const ABI = [
  "function issueCredential(address issuer,address agent,uint256 service,uint256 action,uint256 maxAmount,uint256 expiry,uint256 nonce,uint256 commitment,bytes signature) external",
];

async function main() {
  const provider = new JsonRpcProvider(RPC_URL);

  const issuerWallet = new Wallet(PRIVATE_KEY_0, provider);
  const wrongSignerWallet = new Wallet(PRIVATE_KEY_1, provider);

  const latestBlock = await provider.getBlock("latest");
  const expiry = Number(latestBlock.timestamp) + 3600;

  const credential = buildCredential({
    issuer: issuerWallet.address,
    agent: "0x2222222222222222222222222222222222222222",
    service: SERVICES.BANK,
    action: ACTIONS.PAY_BILL,
    maxAmount: 100,
    expiry,
    nonce: 999,
  });

  const payload = await createIssuancePayload(wrongSignerWallet, credential);

  const contract = new Contract(CONTRACT_ADDRESS, ABI, issuerWallet);

  try {
    const tx = await contract.issueCredential(
      payload.credential.issuer,
      payload.credential.agent,
      payload.credential.service,
      payload.credential.action,
      payload.credential.maxAmount,
      payload.credential.expiry,
      payload.credential.nonce,
      payload.commitment,
      payload.signature
    );

    await tx.wait();
    console.log("Unexpected success");
  } catch (err) {
    console.log("Expected failure: invalid signature");
    console.log(err.shortMessage || err.message);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});