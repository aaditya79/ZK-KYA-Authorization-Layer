const { JsonRpcProvider, Wallet, ContractFactory } = require("ethers");
const fs = require("fs");
const path = require("path");

const RPC_URL = "http://127.0.0.1:8545";
const PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

function loadArtifact(solFile, contractName) {
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    `${solFile}.sol`,
    `${contractName}.json`
  );
  return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
}

async function deployContract(wallet, solFile, contractName, constructorArgs = []) {
  const artifact = loadArtifact(solFile, contractName);
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(...constructorArgs);
  await contract.waitForDeployment();
  return await contract.getAddress();
}

async function main() {
  const provider = new JsonRpcProvider(RPC_URL);
  const wallet = new Wallet(PRIVATE_KEY, provider);

  // Verifier must be deployed first — its address is passed to the registry constructor.
  console.log("Deploying Groth16Verifier...");
  const verifierAddress = await deployContract(
    wallet,
    "AuthorizationVerifier",
    "Groth16Verifier"
  );
  console.log("Groth16Verifier:", verifierAddress);

  console.log("Deploying CredentialRegistry...");
  const registryAddress = await deployContract(
    wallet,
    "CredentialRegistry",
    "CredentialRegistry",
    [verifierAddress]
  );
  console.log("CredentialRegistry:", registryAddress);

  const deployments = {
    CredentialRegistry: registryAddress,
    Groth16Verifier: verifierAddress,
  };

  const outPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(outPath, JSON.stringify(deployments, null, 2));
  console.log("Addresses written to deployments.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
