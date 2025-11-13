import { getContracts } from "@/actions/contract";
import {
  StellarWallet,
  useAuth,
  useWallet,
} from "@crossmint/client-sdk-react-ui";
import { useState } from "react";

export function WirexCompleteFlow() {
  const { user } = useAuth();
  const { getOrCreateWallet, status: walletStatus } = useWallet();
  const [isChainOnboarding, setIsChainOnboarding] = useState(false);

  console.log("logged in as user", user);

  const onChainOnboardUser = async () => {
    if (!user?.email) {
      console.error("User email not found");
      return;
    }
    try {
      setIsChainOnboarding(true);
      // Get contracts from our server action (server side)
      const { contracts, fundsOracle } = await getContracts();

      console.log("contracts", contracts);
      console.log("fundsOracle", fundsOracle);

      // Create a wallet for the user (client side)
      const wallet = (await getOrCreateWallet({
        chain: "stellar",
        signer: {
          type: "email",
          email: user?.email,
        },
        delegatedSigners: [{ signer: "external-wallet:" + fundsOracle }],
      })) as StellarWallet;

      // Install the execution delay policy
      const stellarWallet = StellarWallet.from(wallet);
      const policyInstall = await stellarWallet.sendTransaction({
        contractId: wallet.address,
        method: "install_plugin",
        args: {
          plugin: contracts.ExecutionDelayPolicy,
        },
      });

      // Create a user account with the wallet tied to the partner id
      const corpReg = await stellarWallet.sendTransaction({
        contractId: contracts.Accounts,
        method: "create_user_account_with_wallet",
        args: {
          parent_entity: "0x00000000000000000000000000000027",
          wallet: wallet.address,
        },
      });

      console.log("policyInstall", policyInstall);
      console.log("corpReg", corpReg);
    } catch (err) {
      console.error("Error onboarding user:", err);
    } finally {
      setIsChainOnboarding(false);
    }
  };

  return (
    <div>
      <h2>Deploy and interact with Wirex Pay API</h2>

      <h4>
        You will be prompted to complete the transaction OTP flow to complete
        the onboarding
      </h4>
      {/* button here for hitting deploy server action */}
      <button
        onClick={onChainOnboardUser}
        disabled={isChainOnboarding}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        {isChainOnboarding ? "Onboarding..." : "Onboard"}
      </button>
    </div>
  );
}
