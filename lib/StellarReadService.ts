import {
  Keypair,
  Account,
  Contract,
  nativeToScVal,
  scValToNative,
  TransactionBuilder,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";

// Hardcode here on purpose. Stellar NEEDS an account to do simulation. So let's git it some.
const readerAccount = new Account(
  "GBUF6CGOOTUQPBUONLNNAA226STOJCFDCOY3JK4FETVGJUL7ASINBV5T",
  "0"
);

type ContractInfo = {
  name: string;
  address: string;
};

let instance: StellarRpcReadService | null = null;

export class StellarRpcReadService {
  private server: Server;
  private pass: string = "";

  constructor(rpcUrl: string) {
    this.server = new Server(rpcUrl);
  }

  private async getPassphrase(): Promise<string> {
    if (this.pass !== "") {
      return this.pass;
    }
    const net = await this.server.getNetwork();
    this.pass = net.passphrase;
    return this.pass;
  }

  async getFundsOracle(contractsRegistry: string): Promise<string> {
    return this.readContract<string>(contractsRegistry, "oracle_funds");
  }

  async getContracts(
    contractsRegistry: string
  ): Promise<Record<string, string>> {
    let res = await this.readContract<ContractInfo[]>(
      contractsRegistry,
      "contracts"
    );
    return res.reduce((acc, contract) => {
      if (contract) {
        acc[contract.name] = contract.address;
      }
      return acc;
    }, {} as Record<string, string>);
  }

  async readContract<T = any>(
    contractId: string,
    method: string,
    params?: any
  ): Promise<T> {
    let simResult: any;
    try {
      const contract = new Contract(contractId as string);
      let operation: any;
      if (params) {
        operation = contract.call(method, nativeToScVal(params));
      } else {
        operation = contract.call(method);
      }
      const transaction = new TransactionBuilder(readerAccount, {
        fee: BASE_FEE,
        networkPassphrase: await this.getPassphrase(),
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();
      simResult = await this.server.simulateTransaction(transaction);
    } catch (error) {
      console.error("Error reading contract:", error);
      throw error;
    }
    if (simResult.error) {
      throw simResult.error;
    }
    return this.parseContractResult<T>(simResult);
  }

  private parseContractResult<T>(result: any): T {
    if (result.result && result.result.retval) {
      return scValToNative(result.result.retval) as T;
    }
    return null as T;
  }
}

export function getStellarRpcReadService(
  rpcUrl: string
): StellarRpcReadService {
  if (!instance) {
    instance = new StellarRpcReadService(rpcUrl);
  }
  return instance;
}
