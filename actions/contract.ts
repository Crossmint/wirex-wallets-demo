"use server";

import { getStellarRpcReadService } from "@/lib/StellarReadService";

const RPC_URL =
  "https://wirex-stellar-testnet-34SCaj4sg.zeeve.net/spn0aX54NRWB1IO4DBmUBLQP/rpc";
const CONTRACTS_REGISTRY =
  "CBMN6DUCFRTX6BMTA6DQESWAD75CJH7TW2UKNQRO33TLB2RS2Y3DCVXE";

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
