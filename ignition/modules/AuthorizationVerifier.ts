import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const AuthorizationVerifierModule = buildModule("AuthorizationVerifierModule", (m) => {

  const authorizationVerifier = m.contract("Groth16Verifier");

  return { authorizationVerifier };

});

export default AuthorizationVerifierModule;