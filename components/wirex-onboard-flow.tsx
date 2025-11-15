import {
  StellarWallet,
  useAuth,
  useWallet,
  Wallet,
} from "@crossmint/client-sdk-react-ui";
import { useState } from "react";
import Image from "next/image";

import { getContracts } from "@/actions/contract";
import {
  createWirexUser,
  getWirexUser,
  getVerificationLink,
  sendSmsConfirmation,
  verifySmsConfirmation,
} from "@/actions/wirex";
import { useWirex } from "@/hooks/useWirex";

export type OnboardingStep =
  | "initial"
  | "onchain-onboarding"
  | "creating-wirex-user"
  | "kyc-verification"
  | "kyc-pending"
  | "sms-confirmation"
  | "completed";

export function WirexOnboardFlow() {
  const { user } = useAuth();
  const { getOrCreateWallet, wallet } = useWallet();
  const [otpCode, setOtpCode] = useState("");

  const {
    currentStep,
    setCurrentStep,
    walletAddress,
    setWalletAddress,
    error,
    setError,
    verificationLink,
    setVerificationLink,
    isCheckingStatus,
    wirexUser,
    setWirexUser,
    smsSessionId,
    setSmsSessionId,
  } = useWirex();

  console.log("wirexUser", wirexUser);

  const onChainOnboardUser = async () => {
    if (!user?.email) {
      setError("User email not found");
      return;
    }
    try {
      setCurrentStep("onchain-onboarding");
      setError(null);

      // Get contracts from our server action (server side)
      const { contracts, fundsOracle } = await getContracts();

      console.log("contracts", contracts);
      console.log("fundsOracle", fundsOracle);

      // Create a wallet for the user (client side)
      const crossmintWallet = (await getOrCreateWallet({
        chain: "stellar",
        plugins: [contracts.ExecutionDelayPolicy],
        signer: {
          type: "email",
          email: user?.email,
        },
        delegatedSigners: [{ signer: "external-wallet:" + fundsOracle }],
      })) as Wallet<"stellar">;

      setWalletAddress(crossmintWallet.address);

      // Before crossmint contract wallet is broadcasted, we need to create a dummy txn first
      const stellarWallet = StellarWallet.from(crossmintWallet);
      await stellarWallet.sendTransaction({
        contractId: "CBOZPWLMG5AOFP35REWBR6QEC7MBQ6TR26HODG5MLRXTW2DPH3ZOT3JD",
        method: "hello_requires_auth",
        args: {
          caller: crossmintWallet.address,
        },
      });
      // Create a user account with the wallet tied to the partner id
      const corpReg = await stellarWallet.sendTransaction({
        contractId: contracts.Accounts,
        method: "create_user_account_with_wallet",
        args: {
          parent_entity: "00000000000000000000000000000027",
          wallet: crossmintWallet.address,
          owner: crossmintWallet.address,
        },
      });

      console.log("corpReg", corpReg);

      // Move to Wirex user onboarding flow
      await createWirexUserFlow(crossmintWallet.address);
    } catch (err) {
      console.error("Error onboarding user:", err);
      setError(
        err instanceof Error ? err.message : "Failed to onboard on-chain"
      );
      setCurrentStep("initial");
    }
  };

  const createWirexUserFlow = async (walletAddr: string) => {
    if (!user?.email) return;

    try {
      setCurrentStep("creating-wirex-user");
      setError(null);

      // Try to get existing user first
      let wirexUser;
      try {
        wirexUser = await getWirexUser(user.email);
        console.log("Existing Wirex user found:", wirexUser);
      } catch (err) {
        // User doesn't exist, create new one
        console.log("Creating new Wirex user...");
        wirexUser = await createWirexUser(user.email, "US", walletAddr);
        console.log("Wirex user created:", wirexUser);
      }

      setWirexUser(wirexUser);

      // Get KYC verification link
      await initiateKycVerification();
    } catch (err) {
      console.error("Error creating Wirex user:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create Wirex user"
      );
      setCurrentStep("creating-wirex-user");
    }
  };

  const initiateKycVerification = async () => {
    if (!user?.email) return;

    try {
      setCurrentStep("kyc-verification");
      setError(null);

      const link = await getVerificationLink(user.email);
      setVerificationLink(link);
      console.log("Verification link:", link);

      // Automatically move to pending state
      setCurrentStep("kyc-pending");
    } catch (err) {
      console.error("Error getting verification link:", err);
      setError(
        err instanceof Error ? err.message : "Failed to get verification link"
      );
      setCurrentStep("kyc-verification");
    }
  };

  const handleSendSmsConfirmation = async () => {
    if (!user?.email) return;

    try {
      setError(null);

      const smsConfirmation = await sendSmsConfirmation(user.email);
      setSmsSessionId(smsConfirmation.session_id);
      console.log("SMS confirmation sent");
    } catch (err) {
      console.error("Error sending SMS confirmation:", err);
      setError(
        err instanceof Error ? err.message : "Failed to send SMS confirmation"
      );
      // Stay at sms-confirmation step to allow retry
    }
  };

  const handleVerifySmsConfirmation = async () => {
    if (!user?.email || !smsSessionId || !otpCode) return;

    try {
      setError(null);

      await verifySmsConfirmation(user.email, otpCode, smsSessionId);
      console.log("SMS confirmation completed");

      // Move to completed step
      setCurrentStep("completed");
    } catch (err) {
      console.error("Error verifying SMS confirmation:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to complete SMS confirmation"
      );
    }
  };

  const openVerificationLink = () => {
    if (verificationLink) {
      window.open(verificationLink, "_blank");
    }
  };

  // Show loading state while checking initial status
  if (isCheckingStatus) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Wirex Pay Onboarding</h2>
          <p className="text-gray-600 text-sm">
            Checking your onboarding status...
          </p>
        </div>
        <div className="bg-white border rounded-lg p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            <p className="text-gray-600 text-sm">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold mb-2">Wirex Pay Onboarding</h2>
        <p className="text-gray-600 text-sm">
          Complete the onboarding flow to start using Wirex Pay
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between relative">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-10" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-blue-500 -z-10 transition-all duration-500"
          style={{
            width: `${
              currentStep === "initial"
                ? "0%"
                : currentStep === "onchain-onboarding"
                ? "20%"
                : currentStep === "creating-wirex-user"
                ? "40%"
                : currentStep === "kyc-verification" ||
                  currentStep === "kyc-pending"
                ? "60%"
                : currentStep === "sms-confirmation"
                ? "80%"
                : "100%"
            }`,
          }}
        />

        {[
          { label: "Start", step: "initial" },
          { label: "On-Chain", step: "onchain-onboarding" },
          { label: "Wirex User", step: "creating-wirex-user" },
          { label: "KYC", step: "kyc-verification" },
          { label: "KYC Pending", step: "kyc-pending" },
          { label: "SMS Confirmation", step: "sms-confirmation" },
          { label: "Complete", step: "completed" },
        ].map((item, index) => (
          <div key={item.step} className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                currentStep === item.step
                  ? "bg-blue-500 text-white ring-4 ring-blue-100"
                  : index <
                    [
                      "initial",
                      "onchain-onboarding",
                      "creating-wirex-user",
                      "kyc-verification",
                      "kyc-pending",
                      "sms-confirmation",
                      "completed",
                    ].indexOf(currentStep)
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {index + 1}
            </div>
            <span className="text-xs mt-2 text-gray-600 text-center max-w-[60px]">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-red-600 mt-0.5">⚠️</div>
            <div className="flex-1">
              <h4 className="text-red-900 font-medium mb-1">Error</h4>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Content based on current step */}
      <div className="bg-white border rounded-lg p-6">
        {currentStep === "initial" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/rocket.svg"
                alt="Rocket"
                width={32}
                height={32}
                className="opacity-70"
              />
              <h3 className="text-lg font-semibold">Ready to Start</h3>
            </div>
            <p className="text-gray-600 mb-4">
              This will create your on-chain wallet and set up your Wirex Pay
              account. You'll need to complete KYC verification during the
              process.
            </p>
            <button
              onClick={onChainOnboardUser}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Start Onboarding
            </button>
          </div>
        )}

        {currentStep === "onchain-onboarding" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              <h3 className="text-lg font-semibold">
                Creating On-Chain Wallet
              </h3>
            </div>
            <p className="text-gray-600">
              Please complete the OTP flow to create your wallet and register
              on-chain...
            </p>
          </div>
        )}

        {currentStep === "creating-wirex-user" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              <h3 className="text-lg font-semibold">Creating Wirex Account</h3>
            </div>
            <p className="text-gray-600">
              Setting up your Wirex Pay account...
            </p>
            {walletAddress && (
              <div className="bg-gray-50 rounded p-3 text-xs font-mono break-all">
                {walletAddress}
              </div>
            )}
          </div>
        )}

        {currentStep === "kyc-verification" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/shield-check.svg"
                alt="Shield"
                width={32}
                height={32}
                className="opacity-70"
              />
              <h3 className="text-lg font-semibold">KYC Verification</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Click the button below to complete your identity verification.
            </p>
            <button
              onClick={openVerificationLink}
              disabled={!verificationLink}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Open Verification Link
              <Image
                src="/arrow-up-right.svg"
                alt="External"
                width={16}
                height={16}
              />
            </button>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-800 text-sm">
                💡 <strong>Note:</strong> After completing verification, the
                page should automatically update. If it doesn't, try refreshing
                the page.
              </p>
            </div>
          </div>
        )}

        {currentStep === "kyc-pending" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="animate-pulse">
                <Image
                  src="/shield-check.svg"
                  alt="Shield"
                  width={32}
                  height={32}
                  className="opacity-70"
                />
              </div>
              <h3 className="text-lg font-semibold">
                Waiting for Verification
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              Please complete your KYC verification. We're checking your status
              every 5 seconds...
            </p>
            {verificationLink && (
              <button
                onClick={openVerificationLink}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Re-open Verification Link
                <Image
                  src="/arrow-up-right.svg"
                  alt="External"
                  width={16}
                  height={16}
                />
              </button>
            )}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500" />
              Polling status...
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-800 text-sm">
                💡 <strong>Note:</strong> After completing verification, the
                page should automatically update. If it doesn't, try refreshing
                the page.
              </p>
            </div>
          </div>
        )}

        {currentStep === "sms-confirmation" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/circle-check-big.svg"
                alt="Check"
                width={32}
                height={32}
                className="opacity-70"
              />
              <h3 className="text-lg font-semibold">Almost Done!</h3>
            </div>
            <p className="text-gray-600 mb-4">
              {!smsSessionId
                ? "Your identity has been verified. Click below to send the SMS confirmation."
                : "Enter the confirmation code sent to your phone."}
            </p>
            {!smsSessionId ? (
              <button
                onClick={handleSendSmsConfirmation}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Send SMS Confirmation
              </button>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleVerifySmsConfirmation();
                    }
                  }}
                  placeholder="Enter OTP code"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                <button
                  onClick={handleVerifySmsConfirmation}
                  disabled={!otpCode}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Confirm Code
                </button>
              </div>
            )}
          </div>
        )}

        {currentStep === "completed" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/circle-check-big.svg"
                alt="Success"
                width={32}
                height={32}
                className="text-green-500"
              />
              <h3 className="text-lg font-semibold text-green-600">
                Onboarding Complete!
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              Your Wirex Pay account is now fully set up and ready to use.
            </p>
            {walletAddress && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-900 mb-2">
                  Your Wallet Address:
                </p>
                <div className="bg-white rounded p-3 text-xs font-mono break-all">
                  {walletAddress}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === "development" && (
        <div className="bg-gray-50 border rounded-lg p-4 text-xs space-y-1">
          <p className="font-mono">
            <strong>Current Step:</strong> {currentStep}
          </p>
          <p className="font-mono">
            <strong>User Email:</strong> {user?.email || "N/A"}
          </p>
          <p className="font-mono">
            <strong>Wallet Address:</strong> {walletAddress || "N/A"}
          </p>
          <p className="font-mono">
            <strong>Verification Link:</strong>{" "}
            {verificationLink ? "Yes" : "No"}
          </p>
          <p className="font-mono">
            <strong>Initial Check:</strong>{" "}
            {isCheckingStatus ? "In Progress" : "Complete"}
          </p>
          <p className="font-mono">
            <strong>User Actions:</strong>{" "}
            {wirexUser?.user_actions
              ? JSON.stringify(wirexUser.user_actions.map((a) => a.type))
              : "N/A"}
          </p>
          <p className="font-mono">
            <strong>User Status:</strong> {wirexUser?.user_status || "N/A"}
          </p>
          <p className="font-mono">
            <strong>Verification Status:</strong>{" "}
            {wirexUser?.verification_status || "N/A"}
          </p>
        </div>
      )}
    </div>
  );
}
