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

// ============================================
// Test Suite
// ============================================

// describe("Create Wallet", function () {
//   // Configuration
//   const RPC_URL =
//     "https://wirex-stellar-testnet-34SCaj4sg.zeeve.net/spn0aX54NRWB1IO4DBmUBLQP/rpc";
//   const API_KEY =
//     "sk_staging_9uRqsVgGdZx1rnCJBjAWjUnq5dGwBgFk4L5ZV3zVZ2TWo6jWErcNxeTTpgUCAkTXLExdh7wsAJTSeB8AjRdwYkde3i348N9onnjZye5aRcnYL2Vzej9m2xZRckCe6LucyUKc9K9GToAqsrUHn3Njv3FPDAuy6s5vNVAYXQpYpByXaiQZBLh34THfrhvDzpnvZfUQ5A9pedjPMeTrkRVFhqaL";
//   const CONTRACTS_REGISTRY =
//     "CDSRXSN6E236VQ7JGCHMARD6OVIWQ24X3QNZYIWI7VOKXMF2UH5XXY6N";

//   it("Should create wallet", async function () {
//     try {
//       const keypair = Keypair.fromSecret("{{YOUR_SECRET}}");

//       const crossmint = createCrossmint({
//         apiKey: API_KEY,
//         experimental_customAuth: {
//           externalWalletSigner: {
//             type: "external-wallet",
//             address: keypair.publicKey(),
//             onSignStellarTransaction: async (transaction) => {
//               const bytes = Buffer.from(transaction, "base64");
//               const signature = keypair.sign(bytes);
//               return Buffer.from(signature).toString("base64");
//             },
//           },
//         },
//       });

//       const readService = getStellarRpcReadService(RPC_URL);
//       const contracts = await readService.getContracts(CONTRACTS_REGISTRY);
//       const fundsOracle = await readService.getFundsOracle(CONTRACTS_REGISTRY);
//       const wallets = CrossmintWallets.from(crossmint);
//       const wallet = await wallets.createWallet({
//         chain: "stellar",
//         signer: {
//           type: "external-wallet",
//           address: keypair.publicKey(),
//         },
//         delegatedSigners: [{ signer: "external-wallet:" + fundsOracle }],
//       });

//       console.log(wallet.address);
//       const stellarWallet = StellarWallet.from(wallet);

//       const policyInstall = await stellarWallet.sendTransaction({
//         contractId: wallet.address,
//         method: "install_plugin",
//         args: {
//           plugin: contracts.ExecutionDelayPolicy,
//         },
//       });

//       expect(policyInstall.hash).not.to.be.null;

//       const corpReg = await stellarWallet.sendTransaction({
//         contractId: contracts.Accounts,
//         method: "create_user_account_with_wallet",
//         args: {
//           parent_entity: "00000000000000000000000000000024",
//           wallet: wallet.address,
//           owner: keypair.publicKey(),
//         },
//       });

//       expect(corpReg.hash).not.to.be.null;
//     } catch (e) {
//       console.error(e);
//       throw e;
//     }
//   });
// });
