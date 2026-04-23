pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

template CredentialAuthorization() {
    signal input issuer;
    signal input agent;
    signal input service;
    signal input action;
    signal input maxAmount;
    signal input expiry;
    signal input nonce;

    signal input commitment;

    signal input requestedService;
    signal input requestedAction;
    signal input requestedAmount;
    signal input currentTime;

    component h = Poseidon(7);
    h.inputs[0] <== issuer;
    h.inputs[1] <== agent;
    h.inputs[2] <== service;
    h.inputs[3] <== action;
    h.inputs[4] <== maxAmount;
    h.inputs[5] <== expiry;
    h.inputs[6] <== nonce;

    commitment === h.out;

    requestedService === service;
    requestedAction === action;

    component amountCheck = LessEqThan(252);
    amountCheck.in[0] <== requestedAmount;
    amountCheck.in[1] <== maxAmount;
    amountCheck.out === 1;

    component timeCheck = LessEqThan(252);
    timeCheck.in[0] <== currentTime;
    timeCheck.in[1] <== expiry;
    timeCheck.out === 1;
}

component main {public [commitment, requestedService, requestedAction, requestedAmount, currentTime]} = CredentialAuthorization();