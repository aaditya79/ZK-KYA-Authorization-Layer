"use strict";

/**
 * Circuit constraint tests for credentialAuthorization.circom.
 *
 * Each test runs witness generation only — if snarkjs throws "Assert Failed"
 * the circuit constraint is violated, which is exactly what we want to verify
 * for invalid inputs.
 *
 * Requires circuit artifacts built by `npm run setup:circuit`.
 * All tests are skipped with a clear message if artifacts are missing.
 */

const assert = require("node:assert/strict");
const { describe, it, before } = require("node:test");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execSync } = require("child_process");
const circomlibjs = require("circomlibjs");

const PROJECT_ROOT = path.join(__dirname, "..");
const BUILD_DIR = path.join(PROJECT_ROOT, "circuits", "build");
const AUTH_JS_DIR = path.join(BUILD_DIR, "credentialAuthorization_js");
const WASM_PATH = path.join(AUTH_JS_DIR, "credentialAuthorization.wasm");
const WITNESS_GEN = path.join(AUTH_JS_DIR, "generate_witness.js");

const ARTIFACTS_READY =
  fs.existsSync(WASM_PATH) && fs.existsSync(WITNESS_GEN);

// ── Helpers ───────────────────────────────────────────────────────────────────

let poseidon;

function addressToBigInt(addr) {
  return BigInt(addr.toLowerCase());
}

function computeCommitment(cred) {
  const hash = poseidon([
    addressToBigInt(cred.issuer),
    addressToBigInt(cred.agent),
    BigInt(cred.service),
    BigInt(cred.action),
    BigInt(cred.maxAmount),
    BigInt(cred.expiry),
    BigInt(cred.nonce),
  ]);
  return poseidon.F.toString(hash);
}

// Runs witness generation for the given input object.
// Returns { success: true } on valid inputs, or
// { success: false, constraintViolation: true } when the circuit rejects.
function runWitness(input) {
  // Use a temp dir so parallel test runs don't collide.
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "zk-kya-test-"));
  const inputPath = path.join(tmpDir, "input.json");
  const witnessPath = path.join(tmpDir, "witness.wtns");
  const pkgPath = path.join(AUTH_JS_DIR, "package.json");

  // The witness generator expects a commonjs package.json in its directory.
  if (!fs.existsSync(pkgPath)) {
    fs.writeFileSync(pkgPath, JSON.stringify({ type: "commonjs" }, null, 2));
  }

  try {
    fs.writeFileSync(inputPath, JSON.stringify(input, null, 2));
    execSync(
      `node "${WITNESS_GEN}" "${WASM_PATH}" "${inputPath}" "${witnessPath}"`,
      { stdio: "pipe", cwd: PROJECT_ROOT },
    );
    return { success: true };
  } catch (err) {
    const msg =
      String(err.message || "") +
      String(err.stderr || "") +
      String(err.stdout || "");
    const constraintViolation =
      msg.includes("Assert Failed") ||
      msg.includes("assert failed") ||
      msg.includes("Constraint doesn");
    return { success: false, constraintViolation };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

// A valid base credential. Tests mutate specific fields to trigger violations.
function makeValidCredential() {
  const nowSec = Math.floor(Date.now() / 1000);
  return {
    issuer: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    agent: "0x2222222222222222222222222222222222222222",
    service: 1,
    action: 1,
    maxAmount: 100,
    expiry: nowSec + 3600,
    nonce: 42,
  };
}

function makeInput(cred, overrides = {}) {
  const nowSec = Math.floor(Date.now() / 1000);
  return {
    issuer: addressToBigInt(cred.issuer).toString(),
    agent: addressToBigInt(cred.agent).toString(),
    service: cred.service.toString(),
    action: cred.action.toString(),
    maxAmount: cred.maxAmount.toString(),
    expiry: cred.expiry.toString(),
    nonce: cred.nonce.toString(),
    commitment: computeCommitment(cred),
    requestedService: cred.service.toString(),
    requestedAction: cred.action.toString(),
    requestedAmount: "50",
    currentTime: nowSec.toString(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("credentialAuthorization circuit", async function () {
  if (!ARTIFACTS_READY) {
    console.log(
      "\n  [SKIP] Circuit artifacts not found — run `npm run setup:circuit` first.\n",
    );
    return;
  }

  before(async function () {
    poseidon = await circomlibjs.buildPoseidon();
  });

  it("accepts valid inputs and generates a witness", function () {
    const cred = makeValidCredential();
    const { success } = runWitness(makeInput(cred));
    assert.equal(success, true, "Expected witness generation to succeed");
  });

  it("rejects an expired credential (currentTime > expiry)", function () {
    const cred = makeValidCredential();
    const nowSec = Math.floor(Date.now() / 1000);
    // Override: expiry 1 hour in the past, currentTime = now
    const input = makeInput(cred, {
      expiry: (nowSec - 3600).toString(),
      currentTime: nowSec.toString(),
    });
    // Commitment must still match the (modified) expiry, or we'd get a
    // commitment mismatch before the time check. Recompute it.
    const modifiedCred = { ...cred, expiry: nowSec - 3600 };
    input.commitment = computeCommitment(modifiedCred);

    const { success, constraintViolation } = runWitness(input);
    assert.equal(success, false, "Expected witness generation to fail");
    assert.equal(
      constraintViolation,
      true,
      "Expected a circuit constraint violation (expiry check)",
    );
  });

  it("rejects a request whose amount exceeds maxAmount", function () {
    const cred = makeValidCredential(); // maxAmount = 100
    const input = makeInput(cred, { requestedAmount: "200" }); // 200 > 100

    const { success, constraintViolation } = runWitness(input);
    assert.equal(success, false, "Expected witness generation to fail");
    assert.equal(
      constraintViolation,
      true,
      "Expected a circuit constraint violation (amount check)",
    );
  });

  it("rejects a request for the wrong service", function () {
    const cred = makeValidCredential(); // service = 1
    const input = makeInput(cred, { requestedService: "2" }); // mismatch

    const { success, constraintViolation } = runWitness(input);
    assert.equal(success, false, "Expected witness generation to fail");
    assert.equal(
      constraintViolation,
      true,
      "Expected a circuit constraint violation (service check)",
    );
  });

  it("rejects a request for the wrong action", function () {
    const cred = makeValidCredential(); // action = 1
    const input = makeInput(cred, { requestedAction: "2" }); // mismatch

    const { success, constraintViolation } = runWitness(input);
    assert.equal(success, false, "Expected witness generation to fail");
    assert.equal(
      constraintViolation,
      true,
      "Expected a circuit constraint violation (action check)",
    );
  });

  it("rejects a tampered commitment (preimage mismatch)", function () {
    const cred = makeValidCredential();
    // Pass a commitment that doesn't match Poseidon(cred fields)
    const input = makeInput(cred, { commitment: "12345" });

    const { success, constraintViolation } = runWitness(input);
    assert.equal(success, false, "Expected witness generation to fail");
    assert.equal(
      constraintViolation,
      true,
      "Expected a circuit constraint violation (commitment hash check)",
    );
  });

  it("accepts a request exactly at the spending limit (boundary case)", function () {
    const cred = makeValidCredential(); // maxAmount = 100
    const input = makeInput(cred, { requestedAmount: "100" }); // == maxAmount

    const { success } = runWitness(input);
    assert.equal(
      success,
      true,
      "Expected witness generation to succeed (amount == maxAmount is allowed)",
    );
  });

  it("accepts a request exactly at the expiry boundary", function () {
    const cred = makeValidCredential();
    // currentTime == expiry is the boundary — the circuit uses LessEqThan so it should pass.
    const input = makeInput(cred, {
      currentTime: cred.expiry.toString(),
    });

    const { success } = runWitness(input);
    assert.equal(
      success,
      true,
      "Expected witness generation to succeed (currentTime == expiry is allowed)",
    );
  });
});
