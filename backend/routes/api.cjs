const express = require("express");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const { JsonRpcProvider, Wallet } = require("ethers");
const { buildCredential } = require("../../scripts/credentialSchema.cjs");
const { createIssuancePayload } = require("../../scripts/createIssuancePayload.cjs");
const { addressToBigInt } = require("../../scripts/hashCredential.cjs");
const { getRegistryContract } = require("../services/registryService.cjs");

const router = express.Router();

const RPC_URL = "http://127.0.0.1:8545";
const PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const PROJECT_ROOT = path.join(__dirname, "..", "..");
const BUILD_DIR = path.join(PROJECT_ROOT, "circuits", "build");
const KEYS_DIR = path.join(PROJECT_ROOT, "circuits", "keys");
const AUTH_JS_DIR = path.join(BUILD_DIR, "credentialAuthorization_js");

function ensureCommonJsPackage(dirPath) {
  const pkgPath = path.join(dirPath, "package.json");
  if (!fs.existsSync(pkgPath)) {
    fs.writeFileSync(pkgPath, JSON.stringify({ type: "commonjs" }, null, 2));
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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

// snarkjs throws "Assert Failed" when a circuit constraint isn't satisfied during witness generation
function isConstraintError(err) {
  const msg = (err.message || "") + (err.stderr || "");
  return (
    msg.includes("Assert Failed") ||
    msg.includes("assert failed") ||
    msg.includes("Constraint doesn")
  );
}

function buildAuthInput(credential, commitment, requestedService, requestedAction, requestedAmount, currentTime) {
  return {
    issuer: addressToBigInt(credential.issuer).toString(),
    agent: addressToBigInt(credential.agent).toString(),
    service: credential.service.toString(),
    action: credential.action.toString(),
    maxAmount: credential.maxAmount.toString(),
    expiry: credential.expiry.toString(),
    nonce: credential.nonce.toString(),
    commitment: commitment.toString(),
    requestedService: requestedService.toString(),
    requestedAction: requestedAction.toString(),
    requestedAmount: requestedAmount.toString(),
    currentTime: currentTime.toString(),
  };
}

async function runGroth16Proof(authInput, prefix) {
  const inputPath = path.join(BUILD_DIR, `${prefix}_input.json`);
  const witnessPath = path.join(BUILD_DIR, `${prefix}_witness.wtns`);
  const proofPath = path.join(BUILD_DIR, `${prefix}_proof.json`);
  const publicPath = path.join(BUILD_DIR, `${prefix}_public.json`);
  const wasmPath = path.join(AUTH_JS_DIR, "credentialAuthorization.wasm");
  const witnessGenPath = path.join(AUTH_JS_DIR, "generate_witness.js");
  const zkeyPath = path.join(KEYS_DIR, "credentialAuthorization_final.zkey");

  writeJson(inputPath, authInput);
  ensureCommonJsPackage(AUTH_JS_DIR);

  const witnessStart = Date.now();
  execSync(
    `node "${witnessGenPath}" "${wasmPath}" "${inputPath}" "${witnessPath}"`,
    { stdio: "pipe", cwd: PROJECT_ROOT }
  );
  const witnessMs = Date.now() - witnessStart;

  const proofStart = Date.now();
  execSync(
    `snarkjs groth16 prove "${zkeyPath}" "${witnessPath}" "${proofPath}" "${publicPath}"`,
    { stdio: "pipe", cwd: PROJECT_ROOT }
  );
  const proofMs = Date.now() - proofStart;

  const proof = loadJson(proofPath);
  const publicSignals = loadJson(publicPath);
  const callData = toSolidityCallData(proof, publicSignals);
  const proofSize = fs.statSync(proofPath).size;

  return { callData, proofSize, witnessMs, proofMs, witnessPath };
}

router.get("/health", async (_req, res) => {
  res.json({ ok: true, message: "backend is running" });
});

router.post("/issue-credential", async (req, res) => {
  try {
    const provider = new JsonRpcProvider(RPC_URL);
    const wallet = new Wallet(PRIVATE_KEY, provider);
    const registry = getRegistryContract();

    const mode = req.body.mode || "finance";
    const latestBlock = await provider.getBlock("latest");
    const forceExpired = req.body.forceExpired || false;
    const expiry = forceExpired
      ? Number(latestBlock.timestamp) - 3600
      : req.body.expiry || Number(latestBlock.timestamp) + 3600;

    let service, action, maxAmount;
    if (mode === "healthcare") {
      service = 2;
      action = 2;
      maxAmount = 0;
    } else {
      service = 1;
      action = 1;
      maxAmount = req.body.maxAmount || 100;
    }

    const credential = buildCredential({
      issuer: wallet.address,
      agent: req.body.agent || "0x2222222222222222222222222222222222222222",
      service,
      action,
      maxAmount,
      expiry,
      nonce: req.body.nonce || Date.now(),
    });

    const payload = await createIssuancePayload(wallet, credential);

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
    const registered = await registry.isRegistered(payload.commitment);

    return res.json({
      ok: true,
      mode,
      credential: payload.credential,
      commitment: payload.commitment,
      txHash: receipt.hash,
      gasUsed: receipt.gasUsed.toString(),
      registered,
    });
  } catch (err) {
    console.error("ISSUE ERROR:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/authorize-payment", async (req, res) => {
  try {
    const registry = getRegistryContract();

    const mode = req.body.mode || "finance";
    const credential = req.body.credential;
    const commitment = req.body.commitment;
    const currentTime = req.body.currentTime ?? Math.floor(Date.now() / 1000);

    let requestedService, requestedAction, requestedAmount;
    if (mode === "healthcare") {
      requestedService = 2;
      requestedAction = 2;
      requestedAmount = 0;
    } else {
      requestedService = 1;
      requestedAction = 1;
      requestedAmount = req.body.requestedAmount ?? 50;
    }

    const authInput = buildAuthInput(
      credential, commitment,
      requestedService, requestedAction, requestedAmount, currentTime
    );

    const { callData, proofSize, witnessMs, proofMs } = await runGroth16Proof(authInput, "api_auth");
    const { pA, pB, pC, pubSignals } = callData;

    const verifyStart = Date.now();
    const verified = await registry.verifyProof(pA, pB, pC, pubSignals);
    const verifyMs = Date.now() - verifyStart;

    let verifyGas = null;
    try {
      const gasEstimate = await registry.verifyProof.estimateGas(pA, pB, pC, pubSignals);
      verifyGas = gasEstimate.toString();
    } catch (_) {}

    const response = {
      ok: true,
      mode,
      verified,
      publicSignals: pubSignals,
      metrics: { witnessMs, proofMs, verifyMs, proofSize, constraints: 890, verifyGas },
    };
    if (!verified) response.reason = "proof_rejected";

    return res.json(response);
  } catch (err) {
    // Constraint violation: witness fails because request violates credential bounds
    if (isConstraintError(err)) {
      return res.json({
        ok: true,
        verified: false,
        reason: "constraint_violation",
      });
    }
    console.error("AUTHORIZE ERROR:", err.message);
    return res.status(500).json({ ok: false, error: err.message, reason: "server_error" });
  }
});

// Issues a credential that is already expired, then attempts to prove it.
// Circuit rejects at witness generation because currentTime > expiry.
router.post("/demo-expired", async (_req, res) => {
  try {
    const provider = new JsonRpcProvider(RPC_URL);
    const wallet = new Wallet(PRIVATE_KEY, provider);
    const registry = getRegistryContract();

    const latestBlock = await provider.getBlock("latest");
    const currentTime = Number(latestBlock.timestamp);
    const expiry = currentTime - 3600; // 1 hour in the past

    const credential = buildCredential({
      issuer: wallet.address,
      agent: "0x2222222222222222222222222222222222222222",
      service: 1,
      action: 1,
      maxAmount: 100,
      expiry,
      nonce: Date.now(),
    });

    const payload = await createIssuancePayload(wallet, credential);

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
    await tx.wait();

    const authInput = buildAuthInput(credential, payload.commitment, 1, 1, 50, currentTime);

    try {
      const { callData, proofSize, witnessMs, proofMs } = await runGroth16Proof(authInput, "demo_expired");
      const { pA, pB, pC, pubSignals } = callData;
      const verified = await registry.verifyProof(pA, pB, pC, pubSignals);
      return res.json({ ok: true, verified, reason: verified ? null : "proof_rejected", metrics: { witnessMs, proofMs, proofSize } });
    } catch (proofErr) {
      if (isConstraintError(proofErr)) {
        return res.json({
          ok: true,
          verified: false,
          reason: "expired_credential",
          credential: payload.credential,
          commitment: payload.commitment,
        });
      }
      throw proofErr;
    }
  } catch (err) {
    console.error("DEMO-EXPIRED ERROR:", err.message);
    return res.status(500).json({ ok: false, error: err.message, reason: "server_error" });
  }
});

// Benchmarks Groth16 vs PLONK proving times on the same input and circuit.
// Requires PLONK keys to be generated via `npm run setup:circuit`.
router.post("/benchmark-plonk", async (_req, res) => {
  const plonkZkeyPath = path.join(KEYS_DIR, "credentialAuthorization_plonk.zkey");
  const plonkVkeyPath = path.join(KEYS_DIR, "plonk_verification_key.json");

  if (!fs.existsSync(plonkZkeyPath)) {
    return res.status(400).json({
      ok: false,
      error: "PLONK keys not found. Run `npm run setup:circuit` to generate them.",
    });
  }

  try {
    const provider = new JsonRpcProvider(RPC_URL);
    const wallet = new Wallet(PRIVATE_KEY, provider);
    const latestBlock = await provider.getBlock("latest");
    const currentTime = Number(latestBlock.timestamp);
    const expiry = currentTime + 3600;

    const credential = buildCredential({
      issuer: wallet.address,
      agent: "0x2222222222222222222222222222222222222222",
      service: 1,
      action: 1,
      maxAmount: 100,
      expiry,
      nonce: Date.now(),
    });

    const payload = await createIssuancePayload(wallet, credential);
    const authInput = buildAuthInput(credential, payload.commitment, 1, 1, 50, currentTime);

    const inputPath = path.join(BUILD_DIR, "plonk_bench_input.json");
    const witnessPath = path.join(BUILD_DIR, "plonk_bench_witness.wtns");
    const wasmPath = path.join(AUTH_JS_DIR, "credentialAuthorization.wasm");
    const witnessGenPath = path.join(AUTH_JS_DIR, "generate_witness.js");

    writeJson(inputPath, authInput);
    ensureCommonJsPackage(AUTH_JS_DIR);

    // Shared witness generation
    const witnessStart = Date.now();
    execSync(
      `node "${witnessGenPath}" "${wasmPath}" "${inputPath}" "${witnessPath}"`,
      { stdio: "pipe", cwd: PROJECT_ROOT }
    );
    const witnessMs = Date.now() - witnessStart;

    // Groth16
    const groth16ZkeyPath = path.join(KEYS_DIR, "credentialAuthorization_final.zkey");
    const groth16VkeyPath = path.join(KEYS_DIR, "verification_key.json");
    const groth16ProofPath = path.join(BUILD_DIR, "bench_groth16_proof.json");
    const groth16PublicPath = path.join(BUILD_DIR, "bench_groth16_public.json");

    const groth16Start = Date.now();
    execSync(
      `snarkjs groth16 prove "${groth16ZkeyPath}" "${witnessPath}" "${groth16ProofPath}" "${groth16PublicPath}"`,
      { stdio: "pipe", cwd: PROJECT_ROOT }
    );
    const groth16Ms = Date.now() - groth16Start;
    const groth16Size = fs.statSync(groth16ProofPath).size;

    let groth16Verified = false;
    try {
      execSync(
        `snarkjs groth16 verify "${groth16VkeyPath}" "${groth16PublicPath}" "${groth16ProofPath}"`,
        { stdio: "pipe", cwd: PROJECT_ROOT }
      );
      groth16Verified = true;
    } catch (_) {}

    // PLONK
    const plonkProofPath = path.join(BUILD_DIR, "bench_plonk_proof.json");
    const plonkPublicPath = path.join(BUILD_DIR, "bench_plonk_public.json");

    const plonkStart = Date.now();
    execSync(
      `snarkjs plonk prove "${plonkZkeyPath}" "${witnessPath}" "${plonkProofPath}" "${plonkPublicPath}"`,
      { stdio: "pipe", cwd: PROJECT_ROOT }
    );
    const plonkMs = Date.now() - plonkStart;
    const plonkSize = fs.statSync(plonkProofPath).size;

    let plonkVerified = false;
    try {
      execSync(
        `snarkjs plonk verify "${plonkVkeyPath}" "${plonkPublicPath}" "${plonkProofPath}"`,
        { stdio: "pipe", cwd: PROJECT_ROOT }
      );
      plonkVerified = true;
    } catch (_) {}

    return res.json({
      ok: true,
      witnessMs,
      groth16: { proofMs: groth16Ms, proofSize: groth16Size, verified: groth16Verified },
      plonk: { proofMs: plonkMs, proofSize: plonkSize, verified: plonkVerified },
    });
  } catch (err) {
    console.error("PLONK BENCHMARK ERROR:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
