"use server";

import { getStellarRpcReadService } from "@/lib/StellarReadService";

const RPC_URL =
  "https://wirex-stellar-testnet-34SCaj4sg.zeeve.net/spn0aX54NRWB1IO4DBmUBLQP/rpc";
const CONTRACTS_REGISTRY =
  "CDSRXSN6E236VQ7JGCHMARD6OVIWQ24X3QNZYIWI7VOKXMF2UH5XXY6N";

export async function getContracts() {
  try {
    const readService = getStellarRpcReadService(RPC_URL);
    const contracts = await readService.getContracts(CONTRACTS_REGISTRY);
    const fundsOracle = await readService.getFundsOracle(CONTRACTS_REGISTRY);

    return {
      contracts: {
        ExecutionDelayPolicy: contracts.ExecutionDelayPolicy,
        Accounts: contracts.Accounts,
      },
      fundsOracle: fundsOracle,
    };
  } catch (err) {
    console.error("Error getting contracts:", err);
    return {
      contracts: {
        ExecutionDelayPolicy: "",
        Accounts: "",
      },
      fundsOracle: "",
    };
  }
}
