// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Test double for the Groth16Verifier. Returns a fixed boolean so contract
// tests can exercise CredentialRegistry logic without real ZK proofs.
contract MockVerifier {
    bool private _result;

    constructor(bool result_) {
        _result = result_;
    }

    function verifyProof(
        uint[2] calldata,
        uint[2][2] calldata,
        uint[2] calldata,
        uint[5] calldata
    ) external view returns (bool) {
        return _result;
    }
}
