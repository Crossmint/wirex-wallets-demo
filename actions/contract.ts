"use server";

import { getStellarRpcReadService } from "@/lib/StellarReadService";

const RPC_URL =
  "https://wirex-stellar-testnet-34SCaj4sg.zeeve.net/spn0aX54NRWB1IO4DBmUBLQP/rpc";
const CONTRACTS_REGISTRY =
  "CBI44PUQEKP2IAD77ZPCTN2QX2IOWOSY5VYHI3SPBN4CAZY6BHR7KIVE";

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
