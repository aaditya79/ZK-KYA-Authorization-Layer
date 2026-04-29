// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IGroth16Verifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[5] calldata _pubSignals
    ) external view returns (bool);
}

contract CredentialRegistry {
    mapping(uint256 => bool) public registeredCommitments;
    address public verifier;

    event CredentialIssued(
        address indexed issuer,
        address indexed agent,
        uint256 indexed commitment
    );

    constructor(address _verifier) {
        verifier = _verifier;
    }

    function getMessageHash(
        address issuer,
        address agent,
        uint256 service,
        uint256 action,
        uint256 maxAmount,
        uint256 expiry,
        uint256 nonce
    ) public pure returns (bytes32) {
        return keccak256(
            abi.encode(
                issuer,
                agent,
                service,
                action,
                maxAmount,
                expiry,
                nonce
            )
        );
    }

    function getEthSignedMessageHash(bytes32 messageHash)
        public
        pure
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
    }

    function recoverSigner(bytes32 ethSignedMessageHash, bytes memory signature)
        public
        pure
        returns (address)
    {
        require(signature.length == 65, "invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        return ecrecover(ethSignedMessageHash, v, r, s);
    }

    function verifySignature(
        address issuer,
        address agent,
        uint256 service,
        uint256 action,
        uint256 maxAmount,
        uint256 expiry,
        uint256 nonce,
        bytes memory signature
    ) public pure returns (bool) {
        bytes32 messageHash = getMessageHash(
            issuer,
            agent,
            service,
            action,
            maxAmount,
            expiry,
            nonce
        );

        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        return recoverSigner(ethSignedMessageHash, signature) == issuer;
    }

    function issueCredential(
        address issuer,
        address agent,
        uint256 service,
        uint256 action,
        uint256 maxAmount,
        uint256 expiry,
        uint256 nonce,
        uint256 commitment,
        bytes memory signature
    ) external {
        require(
            verifySignature(
                issuer,
                agent,
                service,
                action,
                maxAmount,
                expiry,
                nonce,
                signature
            ),
            "invalid signature"
        );

        require(!registeredCommitments[commitment], "commitment already exists");

        registeredCommitments[commitment] = true;

        emit CredentialIssued(issuer, agent, commitment);
    }

    function isRegistered(uint256 commitment) external view returns (bool) {
        return registeredCommitments[commitment];
    }

    // Public signals layout (matches credentialAuthorization.circom):
    //   [0] commitment
    //   [1] requestedService
    //   [2] requestedAction
    //   [3] requestedAmount
    //   [4] currentTime
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[5] calldata _pubSignals
    ) external view returns (bool) {
        uint256 commitment = _pubSignals[0];
        if (!registeredCommitments[commitment]) {
            return false;
        }
        return IGroth16Verifier(verifier).verifyProof(_pA, _pB, _pC, _pubSignals);
    }
}