# ZK-KYA: Zero-Knowledge Authorization for AI Agents

ZK-KYA is a privacy-preserving authorization layer that allows AI agents to prove they are authorized to perform actions **without revealing underlying credentials**.

Instead of exposing sensitive permission data, the system:
- Stores a **Poseidon commitment** on-chain
- Uses **Groth16 zero-knowledge proofs**
- Verifies authorization **on-chain via smart contracts**

---

## Demo Overview

This project simulates a full end-to-end flow:

1. **User → Agent**
   - User issues a scoped credential
   - Commitment is stored on-chain

2. **Agent → Verifier**
   - Agent generates a zk proof for a request
   - Proof verifies policy compliance without revealing the credential

3. **On-chain Verification**
   - Smart contract verifies the proof
   - Action is approved or rejected

---

## Key Features

- Privacy-preserving authorization
- On-chain commitment registry
- Groth16 zero-knowledge proofs
- Agent-based interaction model
- Finance demo (payment authorization)
- Healthcare demo (record access)

---

## Tech Stack

- Circom + snarkjs
- Solidity
- Hardhat
- Node.js + Express
- React

---

## Example Metrics

- Issuance gas: ~53.9k
- Witness generation: ~104 ms
- Proof generation: ~500 ms
- On-chain verification call: ~16 ms
- Proof size: ~807 bytes

---

## Architecture

User → Credential Issuance → Commitment Registry  
Agent → ZK Proof Generation → Verifier Contract  
Verifier → Accept / Reject  

---

## Contribution

We built a privacy-preserving credential delegation layer for AI agents using on-chain commitments and zero-knowledge proofs, enabling agents to prove authorization without revealing the underlying credential.

---

## Future Work

- Replay protection / nullifiers
- Credential revocation
- More expressive policy formats
- Production-grade key management
- Real agent integration

---

## Authors

Built as part of a blockchain and zero-knowledge systems project.