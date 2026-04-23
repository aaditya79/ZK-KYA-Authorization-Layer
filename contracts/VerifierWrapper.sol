// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

interface IAuthorizationVerifier {

    function verifyProof(

        uint[2] calldata _pA,

        uint[2][2] calldata _pB,

        uint[2] calldata _pC,

        uint[5] calldata _pubSignals

    ) external view returns (bool);

}

contract VerifierWrapper {

    address public verifier;

    bool public lastResult;

    event VerificationAttempt(bool result);

    constructor(address _verifier) {

        verifier = _verifier;

    }

    function verifyAndRecord(

        uint[2] calldata _pA,

        uint[2][2] calldata _pB,

        uint[2] calldata _pC,

        uint[5] calldata _pubSignals

    ) external returns (bool) {

        bool ok = IAuthorizationVerifier(verifier).verifyProof(_pA, _pB, _pC, _pubSignals);

        lastResult = ok;

        emit VerificationAttempt(ok);

        return ok;

    }

}