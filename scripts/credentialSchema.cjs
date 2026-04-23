const SERVICES = {

  BANK: 1,

  HEALTH: 2,

};

const ACTIONS = {

  PAY_BILL: 1,

  READ_RECORD: 2,

};

function buildCredential({

  issuer,

  agent,

  service,

  action,

  maxAmount,

  expiry,

  nonce,

}) {

  if (!issuer) throw new Error("issuer is required");

  if (!agent) throw new Error("agent is required");

  if (!service) throw new Error("service is required");

  if (!action) throw new Error("action is required");

  if (maxAmount === undefined) throw new Error("maxAmount is required");

  if (!expiry) throw new Error("expiry is required");

  if (!nonce) throw new Error("nonce is required");

  return {

    issuer: issuer.toLowerCase(),

    agent: agent.toLowerCase(),

    service,

    action,

    maxAmount: BigInt(maxAmount).toString(),

    expiry: Number(expiry),

    nonce: BigInt(nonce).toString(),

  };

}

module.exports = {

  SERVICES,

  ACTIONS,

  buildCredential,

};