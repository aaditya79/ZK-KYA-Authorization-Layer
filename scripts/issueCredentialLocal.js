const { JsonRpcProvider, Wallet, Contract } = require("ethers");
const { SERVICES, ACTIONS, buildCredential } = require("./credentialSchema.cjs");
const { createIssuancePayload } = require("./createIssuancePayload");

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const RPC_URL = "http://127.0.0.1:8545";

// Hardhat Account #0 private key
const PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const ABI = [
  "function issueCredential(address issuer,address agent,uint256 service,uint256 action,uint256 maxAmount,uint256 expiry,uint256 nonce,uint256 commitment,bytes signature) external",
  "function isRegistered(uint256 commitment) external view returns (bool)",
];

async function main() {
  const provider = new JsonRpcProvider(RPC_URL);
  const wallet = new Wallet(PRIVATE_KEY, provider);
  const contract = new Contract(CONTRACT_ADDRESS, ABI, wallet);

  const latestBlock = await provider.getBlock("latest");
  const expiry = Number(latestBlock.timestamp) + 3600;

  const credential = buildCredential({
    issuer: wallet.address,
    agent: "0x2222222222222222222222222222222222222222",
    service: SERVICES.BANK,
    action: ACTIONS.PAY_BILL,
    maxAmount: 100,
    expiry,
    nonce: 1,
  });

  const payload = await createIssuancePayload(wallet, credential);

  console.log("Submitting credential...");
  console.log(JSON.stringify(payload, null, 2));

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

  const receipt = await tx.wait();

  const registered = await contract.isRegistered(payload.commitment);

  console.log("\nTransaction hash:", receipt.hash);
  console.log("Gas used:", receipt.gasUsed.toString());
  console.log("Commitment registered:", registered);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});