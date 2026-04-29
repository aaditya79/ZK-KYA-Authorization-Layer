const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { JsonRpcProvider, Wallet, Contract } = require("ethers");
const { SERVICES, ACTIONS, buildCredential } = require("./credentialSchema.cjs");
const { createIssuancePayload } = require("./createIssuancePayload.cjs");
const { addressToBigInt } = require("./hashCredential.cjs");

const RPC_URL = "http://127.0.0.1:8545";

const deployments = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "deployments.json"), "utf8")
);
const REGISTRY_ADDRESS = deployments.CredentialRegistry;
const VERIFIER_ADDRESS = deployments.Groth16Verifier;

const PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const REGISTRY_ABI = [
  "function issueCredential(address issuer,address agent,uint256 service,uint256 action,uint256 maxAmount,uint256 expiry,uint256 nonce,uint256 commitment,bytes signature) external",
  "function isRegistered(uint256 commitment) external view returns (bool)",
];

const VERIFIER_ABI = [
  "function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[5] calldata _pubSignals) external view returns (bool)",
];

const BUILD_DIR = path.join(__dirname, "..", "circuits", "build");
const KEYS_DIR = path.join(__dirname, "..", "circuits", "keys");
const AUTH_JS_DIR = path.join(BUILD_DIR, "credentialAuthorization_js");

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function fileSizeBytes(filePath) {
  return fs.statSync(filePath).size;
}

function ensureCommonJsPackage(dirPath) {
  const pkgPath = path.join(dirPath, "package.json");
  if (!fs.existsSync(pkgPath)) {
    fs.writeFileSync(pkgPath, JSON.stringify({ type: "commonjs" }, null, 2));
  }
}

function runCommand(command, label) {
  const start = Date.now();
  execSync(command, { stdio: "inherit", cwd: path.join(__dirname, "..") });
  const end = Date.now();
  return {
    label,
    ms: end - start,
  };
}

function toSolidityCallData(proof, publicSignals) {
  const pA = [proof.pi_a[0], proof.pi_a[1]];
  const pB = [
    [proof.pi_b[0][1], proof.pi_b[0][0]],
    [proof.pi_b[1][1], proof.pi_b[1][0]],
  ];
  const pC = [proof.pi_c[0], proof.pi_c[1]];
  const pubSignals = publicSignals.map(String);

  return { pA, pB, pC, pubSignals };
}

async function main() {
  const provider = new JsonRpcProvider(RPC_URL);
  const wallet = new Wallet(PRIVATE_KEY, provider);

  const registry = new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, wallet);
  const verifier = new Contract(VERIFIER_ADDRESS, VERIFIER_ABI, wallet);

  const latestBlock = await provider.getBlock("latest");
  const currentTime = Number(latestBlock.timestamp);
  const expiry = currentTime + 3600;

  const credential = buildCredential({
    issuer: wallet.address,
    agent: "0x2222222222222222222222222222222222222222",
    service: SERVICES.BANK,
    action: ACTIONS.PAY_BILL,
    maxAmount: 100,
    expiry,
    nonce: 123456,
  });

  const requestedService = SERVICES.BANK;
  const requestedAction = ACTIONS.PAY_BILL;
  const requestedAmount = 50;

  const payload = await createIssuancePayload(wallet, credential);

  console.log("\n=== STEP 1: ISSUE CREDENTIAL ON-CHAIN ===");
  const issueStart = Date.now();

  const tx = await registry.issueCredential(
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
  const issueEnd = Date.now();

  const registered = await registry.isRegistered(payload.commitment);

  console.log("Issuer:", payload.credential.issuer);
  console.log("Agent:", payload.credential.agent);
  console.log("Commitment:", payload.commitment);
  console.log("Issuance tx hash:", receipt.hash);
  console.log("Issuance gas used:", receipt.gasUsed.toString());
  console.log("Issuance elapsed ms:", issueEnd - issueStart);
  console.log("Commitment registered:", registered);

  console.log("\n=== STEP 2: GENERATE AUTH INPUT FROM THE SAME ISSUED CREDENTIAL ===");

  const authInput = {
    issuer: addressToBigInt(credential.issuer).toString(),
    agent: addressToBigInt(credential.agent).toString(),
    service: credential.service.toString(),
    action: credential.action.toString(),
    maxAmount: credential.maxAmount.toString(),
    expiry: credential.expiry.toString(),
    nonce: credential.nonce.toString(),
    commitment: payload.commitment.toString(),
    requestedService: requestedService.toString(),
    requestedAction: requestedAction.toString(),
    requestedAmount: requestedAmount.toString(),
    currentTime: currentTime.toString(),
  };

  const authInputPath = path.join(BUILD_DIR, "demo_auth_input.json");
  const authWitnessPath = path.join(BUILD_DIR, "demo_auth_witness.wtns");
  const authProofPath = path.join(BUILD_DIR, "demo_auth_proof.json");
  const authPublicPath = path.join(BUILD_DIR, "demo_auth_public.json");
  const authWasmPath = path.join(
    AUTH_JS_DIR,
    "credentialAuthorization.wasm"
  );
  const witnessGeneratorPath = path.join(
    AUTH_JS_DIR,
    "generate_witness.js"
  );
  const zkeyPath = path.join(
    KEYS_DIR,
    "credentialAuthorization_final.zkey"
  );

  writeJson(authInputPath, authInput);
  console.log("Auth input written to:", authInputPath);
  console.log("Auth input commitment:", authInput.commitment);

  console.log("\n=== STEP 3: GENERATE WITNESS ===");
  ensureCommonJsPackage(AUTH_JS_DIR);
  const witnessTiming = runCommand(
    `node "${witnessGeneratorPath}" "${authWasmPath}" "${authInputPath}" "${authWitnessPath}"`,
    "witness generation"
  );
  console.log("Witness generated:", authWitnessPath);
  console.log("Witness generation ms:", witnessTiming.ms);

  console.log("\n=== STEP 4: GENERATE PROOF ===");
  const proveTiming = runCommand(
    `snarkjs groth16 prove "${zkeyPath}" "${authWitnessPath}" "${authProofPath}" "${authPublicPath}"`,
    "proof generation"
  );
  console.log("Proof generated:", authProofPath);
  console.log("Public signals written:", authPublicPath);
  console.log("Proof generation ms:", proveTiming.ms);

  console.log("\n=== STEP 5: VERIFY PROOF ON-CHAIN ===");
  const proof = loadJson(authProofPath);
  const publicSignals = loadJson(authPublicPath);
  const { pA, pB, pC, pubSignals } = toSolidityCallData(proof, publicSignals);

  const verifyStart = Date.now();
  const ok = await verifier.verifyProof(pA, pB, pC, pubSignals);
  const verifyEnd = Date.now();

  const proofSize = fileSizeBytes(authProofPath);
  const publicSize = fileSizeBytes(authPublicPath);

  console.log("Public signals:", pubSignals);
  console.log("Proof file size (bytes):", proofSize);
  console.log("Public signals file size (bytes):", publicSize);
  console.log("Verifier call elapsed ms:", verifyEnd - verifyStart);
  console.log("On-chain proof verification result:", ok);

  console.log("\n=== CONSISTENCY CHECK ===");
  console.log(
    "Issued commitment equals proof public commitment:",
    String(payload.commitment) === String(pubSignals[0])
  );

  console.log("\n=== DEMO SUMMARY ===");
  console.log({
    credential: {
      issuer: credential.issuer,
      agent: credential.agent,
      service: credential.service,
      action: credential.action,
      maxAmount: credential.maxAmount,
      expiry: credential.expiry,
      nonce: credential.nonce,
    },
    request: {
      requestedService,
      requestedAction,
      requestedAmount,
      currentTime,
    },
    commitment: payload.commitment,
    issuanceTxHash: receipt.hash,
    issuanceGasUsed: receipt.gasUsed.toString(),
    issuanceElapsedMs: issueEnd - issueStart,
    commitmentRegistered: registered,
    witnessGenerationMs: witnessTiming.ms,
    proofGenerationMs: proveTiming.ms,
    proofFileSizeBytes: proofSize,
    publicSignalsFileSizeBytes: publicSize,
    proofVerifiedOnChain: ok,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});