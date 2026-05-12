import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { keccak256, encodeAbiParameters, parseAbiParameters } from "viem";
import { network } from "hardhat";

// Mirrors CredentialRegistry.getMessageHash: keccak256(abi.encode(...))
function getMessageHash(
  issuer: `0x${string}`,
  agent: `0x${string}`,
  service: bigint,
  action: bigint,
  maxAmount: bigint,
  expiry: bigint,
  nonce: bigint,
): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters(
        "address, address, uint256, uint256, uint256, uint256, uint256",
      ),
      [issuer, agent, service, action, maxAmount, expiry, nonce],
    ),
  );
}

describe("CredentialRegistry", async function () {
  const { viem } = await network.create();
  const [issuerClient, otherClient] = await viem.getWalletClients();

  const issuer = issuerClient.account.address;
  const agent = "0x2222222222222222222222222222222222222222" as `0x${string}`;
  const service = 1n;
  const action = 1n;
  const maxAmount = 100n;
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const nonce = 42n;

  // Arbitrary commitment value — the contract stores whatever we give it.
  // The ZK circuit (not the contract) enforces commitment = Poseidon(...).
  const COMMITMENT_A = 999n;
  const COMMITMENT_B = 998n;
  const COMMITMENT_UNREG = 777n;

  async function sign(client: typeof issuerClient): Promise<`0x${string}`> {
    const msgHash = getMessageHash(
      issuer,
      agent,
      service,
      action,
      maxAmount,
      expiry,
      nonce,
    );
    return client.signMessage({ message: { raw: msgHash } });
  }

  // Deploy a MockVerifier that always returns true, then wire it into the registry.
  const mockVerifier = await viem.deployContract("MockVerifier", [true]);
  const registry = await viem.deployContract("CredentialRegistry", [
    mockVerifier.address,
  ]);

  // ── issuance ──────────────────────────────────────────────────────────────

  it("issues a credential when the issuer signature is valid", async function () {
    const sig = await sign(issuerClient);
    await registry.write.issueCredential([
      issuer,
      agent,
      service,
      action,
      maxAmount,
      expiry,
      nonce,
      COMMITMENT_A,
      sig,
    ]);
    assert.equal(await registry.read.isRegistered([COMMITMENT_A]), true);
  });

  it("returns false for isRegistered on an unknown commitment", async function () {
    assert.equal(await registry.read.isRegistered([COMMITMENT_UNREG]), false);
  });

  it("rejects issuance when the signature is from the wrong signer", async function () {
    const badSig = await sign(otherClient); // signed by someone other than issuer
    try {
      await registry.write.issueCredential([
        issuer,
        agent,
        service,
        action,
        maxAmount,
        expiry,
        nonce,
        COMMITMENT_B,
        badSig,
      ]);
      assert.fail("Expected revert");
    } catch (err: any) {
      assert.ok(
        String(err).includes("invalid signature"),
        `Expected "invalid signature" in error, got: ${err}`,
      );
    }
  });

  it("rejects issuance when the commitment is already registered", async function () {
    // COMMITMENT_A was registered in the first test — issuing it again must revert.
    const sig = await sign(issuerClient);
    try {
      await registry.write.issueCredential([
        issuer,
        agent,
        service,
        action,
        maxAmount,
        expiry,
        nonce,
        COMMITMENT_A,
        sig,
      ]);
      assert.fail("Expected revert");
    } catch (err: any) {
      assert.ok(
        String(err).includes("commitment already exists"),
        `Expected "commitment already exists" in error, got: ${err}`,
      );
    }
  });

  // ── proof verification ────────────────────────────────────────────────────

  it("verifyProof returns false immediately for an unregistered commitment", async function () {
    // The registry short-circuits before calling the verifier when the commitment
    // is not registered, so any proof data works here.
    const dummyPubSignals = [
      COMMITMENT_UNREG,
      service,
      action,
      50n,
      BigInt(Math.floor(Date.now() / 1000)),
    ] as readonly [bigint, bigint, bigint, bigint, bigint];
    const result = await registry.read.verifyProof([
      [0n, 0n],
      [
        [0n, 0n],
        [0n, 0n],
      ],
      [0n, 0n],
      dummyPubSignals,
    ]);
    assert.equal(result, false);
  });

  it("verifyProof returns true for a registered commitment when the verifier approves", async function () {
    // COMMITMENT_A is registered. MockVerifier always returns true, so the
    // registry should return true regardless of the proof bytes.
    const pubSignals = [
      COMMITMENT_A,
      service,
      action,
      50n,
      BigInt(Math.floor(Date.now() / 1000)),
    ] as readonly [bigint, bigint, bigint, bigint, bigint];
    const result = await registry.read.verifyProof([
      [0n, 0n],
      [
        [0n, 0n],
        [0n, 0n],
      ],
      [0n, 0n],
      pubSignals,
    ]);
    assert.equal(result, true);
  });

  // ── replay protection ─────────────────────────────────────────────────────

  it("blocks replay: same authorization cannot be submitted twice", async function () {
    // COMMITMENT_A is registered. Send a write tx to record the nullifier.
    const pubSignals = [
      COMMITMENT_A,
      service,
      action,
      50n,
      BigInt(Math.floor(Date.now() / 1000)),
    ] as readonly [bigint, bigint, bigint, bigint, bigint];

    await registry.write.verifyProof([
      [0n, 0n],
      [
        [0n, 0n],
        [0n, 0n],
      ],
      [0n, 0n],
      pubSignals,
    ]);

    // Second call with the same (commitment, service, action, amount) → nullifier already used.
    const result = await registry.read.verifyProof([
      [0n, 0n],
      [
        [0n, 0n],
        [0n, 0n],
      ],
      [0n, 0n],
      pubSignals,
    ]);
    assert.equal(result, false);
  });

  it("allows a different amount after a nullifier is spent", async function () {
    // The nullifier for (COMMITMENT_A, service, action, 50) is spent from the test above.
    // A request for a different amount produces a different nullifier and should succeed.
    const pubSignalsNewAmount = [
      COMMITMENT_A,
      service,
      action,
      75n, // different amount → different nullifier key
      BigInt(Math.floor(Date.now() / 1000)),
    ] as readonly [bigint, bigint, bigint, bigint, bigint];

    const result = await registry.read.verifyProof([
      [0n, 0n],
      [
        [0n, 0n],
        [0n, 0n],
      ],
      [0n, 0n],
      pubSignalsNewAmount,
    ]);
    assert.equal(result, true);
  });

  it("verifyProof returns false for a registered commitment when the verifier rejects", async function () {
    // Deploy a MockVerifier that always returns false and a separate registry.
    const rejectingVerifier = await viem.deployContract("MockVerifier", [
      false,
    ]);
    const strictRegistry = await viem.deployContract("CredentialRegistry", [
      rejectingVerifier.address,
    ]);

    const sig = await sign(issuerClient);
    await strictRegistry.write.issueCredential([
      issuer,
      agent,
      service,
      action,
      maxAmount,
      expiry,
      nonce,
      COMMITMENT_A,
      sig,
    ]);

    const pubSignals = [
      COMMITMENT_A,
      service,
      action,
      50n,
      BigInt(Math.floor(Date.now() / 1000)),
    ] as readonly [bigint, bigint, bigint, bigint, bigint];
    const result = await strictRegistry.read.verifyProof([
      [0n, 0n],
      [
        [0n, 0n],
        [0n, 0n],
      ],
      [0n, 0n],
      pubSignals,
    ]);
    assert.equal(result, false);
  });
});
