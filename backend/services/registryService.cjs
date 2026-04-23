const { JsonRpcProvider, Wallet, Contract } = require("ethers");

const RPC_URL = "http://127.0.0.1:8545";
const REGISTRY_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const REGISTRY_ABI = [
  "function issueCredential(address issuer,address agent,uint256 service,uint256 action,uint256 maxAmount,uint256 expiry,uint256 nonce,uint256 commitment,bytes signature) external",
  "function isRegistered(uint256 commitment) external view returns (bool)",
];

function getRegistryContract() {
  const provider = new JsonRpcProvider(RPC_URL);
  const wallet = new Wallet(PRIVATE_KEY, provider);
  return new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, wallet);
}

module.exports = {
  getRegistryContract,
};