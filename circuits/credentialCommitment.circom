pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/poseidon.circom";

template CredentialCommitment() {
    signal input issuer;
    signal input agent;
    signal input service;
    signal input action;
    signal input maxAmount;
    signal input expiry;
    signal input nonce;

    signal input commitment;

    component h = Poseidon(7);
    h.inputs[0] <== issuer;
    h.inputs[1] <== agent;
    h.inputs[2] <== service;
    h.inputs[3] <== action;
    h.inputs[4] <== maxAmount;
    h.inputs[5] <== expiry;
    h.inputs[6] <== nonce;

    commitment === h.out;
}

component main {public [commitment]} = CredentialCommitment();