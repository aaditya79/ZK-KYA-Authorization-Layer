const { JsonRpcProvider, Wallet, Contract } = require("ethers");
const fs = require("fs");
const path = require("path");

const RPC_URL = "http://127.0.0.1:8545";
const PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const VERIFIER_ABI = [
  "function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[5] calldata _pubSignals) external view returns (bool)",
];

function getVerifierContract() {
  const deploymentsPath = path.join(__dirname, "..", "..", "deployments.json");
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const provider = new JsonRpcProvider(RPC_URL);
  const wallet = new Wallet(PRIVATE_KEY, provider);
  return new Contract(deployments.Groth16Verifier, VERIFIER_ABI, wallet);
}

module.exports = {
  getVerifierContract,
};