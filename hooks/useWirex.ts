import { getWirexUser, WirexUser } from "@/actions/wirex";
import { OnboardingStep } from "@/components/wirex-onboard-flow";
import { useAuth, useWallet } from "@crossmint/client-sdk-react-ui";
import { useEffect, useState } from "react";

export function useWirex() {
  const { user } = useAuth();
  const { wallet } = useWallet();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("initial");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [wirexUser, setWirexUser] = useState<WirexUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verificationLink, setVerificationLink] = useState<string | null>(null);
  const [smsSessionId, setSmsSessionId] = useState<string | null>(null);

  useEffect(() => {
    const checkInitialStatus = async () => {
      if (!user?.email) {
        setIsCheckingStatus(false);
        return;
      }

      try {
        // Check if user already has a Wirex account
        const wirexUser = await getWirexUser(user.email);
        setWirexUser(wirexUser);
        console.log("Found existing Wirex user:", wirexUser);

        if (wallet?.address) {
          setWalletAddress(wallet.address);
        }

        // Determine step based on user_actions
        const userActions = wirexUser.user_actions || [];
        const hasVerifyKYCAction = userActions.some(
          (action) => action.type === "Verify"
        );
        const hasConfirmPhoneAction = userActions.some(
          (action) => action.type === "ConfirmPhone"
        );

        if (userActions.length === 0) {
          // No pending actions - user is fully onboarded
          setCurrentStep("completed");
        } else if (hasVerifyKYCAction) {
          if (
            wirexUser.verification_status === "Pending" ||
            wirexUser.verification_status === "InReview"
          ) {
            setCurrentStep("kyc-pending");
          } else {
            setCurrentStep("kyc-verification");
          }
        } else if (hasConfirmPhoneAction) {
          setCurrentStep("sms-confirmation");
        } else {
          setCurrentStep("completed");
        }
      } catch (err) {
        console.log("No existing Wirex user found, starting fresh");
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkInitialStatus();
  }, [user?.email, wallet?.address]);

  return {
    currentStep,
    setCurrentStep,
    walletAddress,
    setWalletAddress,
    error,
    setError,
    verificationLink,
    setVerificationLink,
    isCheckingStatus,
    setIsCheckingStatus,
    smsSessionId,
    setSmsSessionId,
    wirexUser,
    setWirexUser,
  };
}
