# 🔐 ZK-KYA
### Privacy-Preserving Authorization Layer for AI Agents

A full-stack system that enables AI agents to prove they are authorized to perform actions **without revealing the underlying credentials**, using zero-knowledge proofs and on-chain verification.

---

## 🚀 Overview

ZK-KYA introduces a new paradigm for agent authorization:

- Credentials are **committed on-chain** using Poseidon hashing
- Agents generate **zero-knowledge proofs (Groth16)** to prove authorization
- Smart contracts verify proofs without exposing sensitive data

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

---

## 🧠 Key Features

- 🔒 Zero-knowledge authorization (no raw credential exposure)
- ⛓️ On-chain verification via Solidity smart contracts
- 🤖 Agent-based request abstraction (finance + healthcare)
- ⚡ Real-time proof generation + verification
- 📊 Live metrics (gas, latency, proof size)
- 🎯 Task-level simulation (not just raw inputs)

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
| Issuance Gas | ~53.9k |
| Witness Generation | ~104 ms |
| Proof Generation | ~500 ms |
| On-chain Verification | ~16 ms |
| Proof Size | ~807 bytes |
| Constraints | ~890 |

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

## ⚙️ Setup

**1. Clone repo**
```bash
git clone https://github.com/aaditya79/ZK-KYA-Auth-Layer.git
cd ZK-KYA-Auth-Layer
```

**2. Install dependencies**
```bash
cd backend && npm install
cd ../frontend && npm install
```

**3. Run backend**
```bash
cd backend
node server.js
```

**4. Run frontend**
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
