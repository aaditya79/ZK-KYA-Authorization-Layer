#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CIRCUITS_DIR="$PROJECT_ROOT/circuits"
BUILD_DIR="$CIRCUITS_DIR/build"
KEYS_DIR="$CIRCUITS_DIR/keys"
CIRCUIT_NAME="credentialAuthorization"
PTAU_FILE="$PROJECT_ROOT/powersOfTau28_hez_final_12.ptau"
PTAU_URL="https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau"

echo "========================================"
echo " ZK-KYA Circuit Build + Trusted Setup"
echo "========================================"
echo ""

# ── Step 1: Create output directories ─────────────────────────────────────────
echo "[1/6] Creating output directories..."
mkdir -p "$BUILD_DIR" "$KEYS_DIR"
echo "      build/ -> $BUILD_DIR"
echo "      keys/  -> $KEYS_DIR"
echo ""

# ── Step 2: Powers of Tau (phase 1) ───────────────────────────────────────────
echo "[2/6] Checking Powers of Tau file..."
if [ -f "$PTAU_FILE" ]; then
  echo "      Found: $PTAU_FILE (skipping download)"
else
  echo "      Downloading powersOfTau28_hez_final_12.ptau (~288 MB)..."
  echo "      Source: $PTAU_URL"
  curl -L --progress-bar -o "$PTAU_FILE" "$PTAU_URL"
  echo "      Download complete."
fi
echo ""

# ── Step 3: Compile circuit ────────────────────────────────────────────────────
echo "[3/6] Compiling $CIRCUIT_NAME.circom..."
circom "$CIRCUITS_DIR/$CIRCUIT_NAME.circom" \
  --r1cs \
  --wasm \
  --sym \
  -l "$PROJECT_ROOT/node_modules" \
  --output "$BUILD_DIR"
echo "      r1cs:  $BUILD_DIR/$CIRCUIT_NAME.r1cs"
echo "      wasm:  $BUILD_DIR/${CIRCUIT_NAME}_js/$CIRCUIT_NAME.wasm"
echo "      sym:   $BUILD_DIR/$CIRCUIT_NAME.sym"
echo ""

# ── Step 4: Groth16 phase-2 setup (initial zkey) ─────────────────────────────
echo "[4/6] Groth16 phase-2 setup (generating initial zkey)..."
snarkjs groth16 setup \
  "$BUILD_DIR/$CIRCUIT_NAME.r1cs" \
  "$PTAU_FILE" \
  "$KEYS_DIR/${CIRCUIT_NAME}_0000.zkey"
echo "      Initial zkey: $KEYS_DIR/${CIRCUIT_NAME}_0000.zkey"
echo ""

# ── Step 5: Phase-2 contribution (demo/dev entropy) ──────────────────────────
echo "[5/6] Contributing to phase-2 ceremony (demo entropy)..."
echo "zk-kya-demo-entropy" | snarkjs zkey contribute \
  "$KEYS_DIR/${CIRCUIT_NAME}_0000.zkey" \
  "$KEYS_DIR/${CIRCUIT_NAME}_final.zkey" \
  --name="ZK-KYA Demo Contribution" \
  -v
echo "      Final zkey: $KEYS_DIR/${CIRCUIT_NAME}_final.zkey"
echo ""

# ── Step 6: Export verification key ──────────────────────────────────────────
echo "[6/6] Exporting verification key..."
snarkjs zkey export verificationkey \
  "$KEYS_DIR/${CIRCUIT_NAME}_final.zkey" \
  "$KEYS_DIR/verification_key.json"
echo "      Verification key: $KEYS_DIR/verification_key.json"
echo ""

# ── Summary ───────────────────────────────────────────────────────────────────
echo "========================================"
echo " Setup complete."
echo "========================================"
echo ""
echo "  WASM witness generator:"
echo "    $BUILD_DIR/${CIRCUIT_NAME}_js/$CIRCUIT_NAME.wasm"
echo ""
echo "  Final proving key:"
echo "    $KEYS_DIR/${CIRCUIT_NAME}_final.zkey"
echo ""
echo "  Verification key:"
echo "    $KEYS_DIR/verification_key.json"
echo ""
echo "  NOTE: This trusted setup uses a single deterministic contribution"
echo "  and is suitable for development and demo use only."
echo ""
echo "  You can now start the backend: cd backend && node server.cjs"
echo ""
