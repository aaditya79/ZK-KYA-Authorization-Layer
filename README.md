# 🔐 ZK-KYA
### Privacy-Preserving Authorization Layer for AI Agents

A full-stack system that enables AI agents to prove they are authorized to perform actions **without revealing the underlying credentials**, using zero-knowledge proofs and on-chain verification.

---

## 🚀 Overview

ZK-KYA introduces a new paradigm for agent authorization:

- Credentials are **committed on-chain** using Poseidon hashing
- Agents generate **zero-knowledge proofs (Groth16)** to prove authorization
- Smart contracts verify proofs without exposing sensitive data
- Invalid requests (exceeded limits, expired credentials) are **rejected at proof generation** — no valid witness can be produced

This allows secure delegation of permissions in domains like **finance** and **healthcare**, while preserving privacy.

---

## ✨ What It Does

The system simulates a real-world authorization flow:

1. A user issues a scoped credential to an agent
2. The credential is hashed into a **Poseidon commitment** and stored on-chain
3. The agent makes a request (e.g., payment or record access)
4. A **ZK proof** is generated to prove the request is valid
5. A smart contract verifies the proof
6. The request is either **authorized or rejected**

## 🖥️ Video Demonstration

https://youtu.be/Qdqfr4XhGxo

---

## 🧠 Key Features

- 🔒 Zero-knowledge authorization (no raw credential exposure)
- ⛓️ On-chain verification via Solidity smart contracts
- 🤖 Agent-based request abstraction (finance + healthcare)
- ⚡ Real-time proof generation + verification
- 📊 Live metrics (issuance gas, verification gas, proof size, latency, R1CS constraints)
- 🎯 Task-level simulation (not just raw inputs)
- ⚠️ Expired credential rejection — circuit enforces expiry at witness generation
- 🚫 Exceeded-limit rejection — circuit enforces spending cap as a constraint
- 📐 Groth16 vs PLONK benchmark — side-by-side proving time and proof size comparison

---

## 🏗️ Architecture

```text
User
  ↓
Credential Issuance
  ↓
Poseidon Commitment (On-chain)
  ↓
Agent Request
  ↓
ZK Proof Generation (Circom + Groth16)
  ↓
Smart Contract Verification
  ↓
Authorized / Rejected
```

---

## 🤖 Agent Simulation

The system includes task-level agent abstraction:

**Finance Agent**
- Pay utility bills
- Enforces max transaction constraints

**Healthcare Agent**
- Access patient records
- No amount field required

Agents do **not see raw credentials** — they only operate via proofs.

---

## 🔑 What Remains Private

- Full credential contents are never revealed
- Only a Poseidon commitment is stored on-chain
- Proof verifies validity, not the data itself
- Sensitive policy logic remains hidden

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|-----------|
| ZK Circuits | Circom + snarkjs |
| Blockchain | Solidity + Hardhat |
| Backend | Node.js + Express |
| Frontend | React (Vite) |
| Crypto | Poseidon Hash |

---

## 📊 Prototype Metrics

| Metric | Value |
|--------|-------|
| Issuance Gas | ~56.9k |
| Witness Generation | ~100 ms |
| Groth16 Proof Generation | ~450 ms |
| PLONK Proof Generation | ~2,360 ms |
| On-chain Verify Call | ~16 ms |
| Verification Gas (est.) | ~318k |
| Groth16 Proof Size | ~800 bytes |
| PLONK Proof Size | ~2,250 bytes |
| R1CS Constraints | 890 |

---

## 📁 Project Structure

```
zk-kya/
├── frontend/        # React UI
├── backend/         # Express API
├── contracts/       # Solidity contracts
├── circuits/        # Circom ZK circuits
├── scripts/         # Proof + credential scripts
├── ignition/        # Deployment modules
├── artifacts/       # Contract artifacts
└── README.md
```

---

## 🔧 First-Time Setup

The ZK circuit must be compiled and the Groth16 trusted setup must be run before the backend can generate proofs. This is a one-time step per clone.

**Prerequisites:** [`circom`](https://docs.circom.io/getting-started/installation/) and [`snarkjs`](https://github.com/iden3/snarkjs) must be available on your PATH.

```bash
# Install snarkjs globally if you haven't already
npm install -g snarkjs

# From the project root:
npm install
npm run setup:circuit
```

`npm run setup:circuit` does the following automatically:

1. Generates a local Powers of Tau file (`powersOfTau28_hez_final_12.ptau`) using `snarkjs powersoftau` — no external download required
2. Compiles `circuits/credentialAuthorization.circom` → `.r1cs`, `.wasm`, `.sym`
3. Runs the Groth16 phase-2 ceremony → `circuits/keys/credentialAuthorization_final.zkey`
4. Exports the Groth16 verification key → `circuits/keys/verification_key.json`
5. Runs PLONK setup (no per-circuit ceremony needed) → `circuits/keys/credentialAuthorization_plonk.zkey`
6. Exports the PLONK verification key → `circuits/keys/plonk_verification_key.json`

The build outputs land in `circuits/build/` and `circuits/keys/`, both of which are gitignored. **Do not start the backend until this step completes.**

> **Note:** After every `npx hardhat node` restart, run `node scripts/deploy.cjs` and restart the backend — the chain resets and contracts must be redeployed. The circuit keys do not need to be regenerated.

---

## ⚙️ Setup

**1. Clone repo**
```bash
git clone https://github.com/aaditya79/ZK-KYA-Auth-Layer.git
cd ZK-KYA-Auth-Layer
```

**2. Install dependencies**
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

**3. Run circuit setup** *(first time only — see First-Time Setup above)*
```bash
npm run setup:circuit
```

**4. Start a local Hardhat node and deploy contracts**
```bash
npx hardhat node          # in one terminal
node scripts/deploy.cjs   # in another terminal (writes deployments.json)
```

**5. Run backend**
```bash
cd backend
node server.cjs
```

**6. Run frontend**
```bash
cd frontend
npm run dev
```

Open: `http://localhost:5173`

---

## 🖊️ Usage Flow

1. Click **"Issue Credential"**
2. Select Finance or Healthcare mode
3. Simulate an agent request
4. Click **Authorize**
5. Observe:
   - Proof generation
   - On-chain verification
   - Final result

---

## 🎯 Contribution

We built a **privacy-preserving credential delegation layer** that allows AI agents to prove authorization without revealing credentials, combining:

- Cryptography (ZK proofs)
- Blockchain verification
- Agent-based systems

---

## ⚠️ Notes

- This is a **prototype / research demo**
- Not production-ready
- No real financial or medical data is used

---

## 👥 Team

- Aaditya Pai
- Yegan Dhaivakumar
- Jie Wang
- Rujing Li

*Columbia University — MS Data Science*
