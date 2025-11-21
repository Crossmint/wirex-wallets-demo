import { useEffect, useState } from "react";
import { useAuth, useWallet } from "@crossmint/client-sdk-react-ui";
import {
  getVirtualCards as getVirtualCardsAction,
  getWirexUser,
  WirexUser,
} from "@/actions/wirex";
import { OnboardingStep } from "@/components/wirex-onboard-flow";
import { VirtualCard } from "@/types/card";

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
  const [virtualCards, setVirtualCards] = useState<Array<VirtualCard> | null>(
    null
  );

  // Derived state - user is approved when verification status is "Approved"
  const isApproved = wirexUser?.verification_status === "Approved";

  useEffect(() => {
    const checkInitialStatus = async () => {
      if (!user?.email) {
        setIsCheckingStatus(false);
        return;
      }

      try {
        // Check if user already has a Wirex account
        const { user: wirexUser, exists } = await getWirexUser(user.email);
        if (!exists) {
          setCurrentStep("initial");
          return;
        }

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

        const approved = wirexUser.verification_status === "Approved";

        if (approved && !hasConfirmPhoneAction) {
          setCurrentStep("completed");
        } else if (userActions.length === 0) {
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

  async function fetchAndeSetVirtualCards() {
    if (!isApproved || !user?.email) {
      console.log("User is not approved, cannot get virtual cards");
      return;
    }
    const virtualCards = await getVirtualCardsAction(user.email);
    setVirtualCards(virtualCards.data);
  }

  useEffect(() => {
    if (isApproved && !isCheckingStatus) {
      fetchAndeSetVirtualCards();
    }
  }, [isApproved, isCheckingStatus]);

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
    isApproved,
    virtualCards,
  };
}
