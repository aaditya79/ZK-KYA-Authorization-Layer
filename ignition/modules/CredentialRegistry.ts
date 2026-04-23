import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CredentialRegistryModule = buildModule("CredentialRegistryModule", (m) => {

  const credentialRegistry = m.contract("CredentialRegistry");

  return { credentialRegistry };

});

export default CredentialRegistryModule;