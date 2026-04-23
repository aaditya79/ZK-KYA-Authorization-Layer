const { SERVICES, ACTIONS, buildCredential } = require("./credentialSchema.cjs");

const credential = buildCredential({

  issuer: "0x1111111111111111111111111111111111111111",

  agent: "0x2222222222222222222222222222222222222222",

  service: SERVICES.BANK,

  action: ACTIONS.PAY_BILL,

  maxAmount: 100,

  expiry: 1715000000,

  nonce: 1,

});

console.log(credential);