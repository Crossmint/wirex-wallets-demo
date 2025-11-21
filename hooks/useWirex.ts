import { useEffect, useState, useRef } from "react";
import { useAuth } from "@crossmint/client-sdk-react-ui";
import {
  getVirtualCards as getVirtualCardsAction,
  getWirexUser,
  WirexUser,
} from "@/actions/wirex";
import { OnboardingStep } from "@/components/wirex-onboard-flow";
import { VirtualCard } from "@/types/card";

export function useWirex() {
  const { user } = useAuth();
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

  // Track if initial check has been performed to prevent re-runs
  const hasCheckedInitialStatus = useRef(false);

  // Derived state - user is approved when verification status is "Approved"
  const isApproved = wirexUser?.verification_status === "Approved";

  useEffect(() => {
    const checkInitialStatus = async () => {
      // Only run once when user email becomes available
      if (!user?.email || hasCheckedInitialStatus.current) {
        if (!user?.email) {
          setIsCheckingStatus(false);
        }
        return;
      }

      hasCheckedInitialStatus.current = true;

      try {
        // Check if user already has a Wirex account
        const { user: wirexUser, exists } = await getWirexUser(user.email);
        if (!exists) {
          setCurrentStep("initial");
          return;
        }

        setWirexUser(wirexUser);
        console.log("Found existing Wirex user:", wirexUser);

        if (wirexUser.wallet_address) {
          setWalletAddress(wirexUser.wallet_address);
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
          setCurrentStep("completed");
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
  }, [user?.email]);

  useEffect(() => {
    fetchAndeSetVirtualCards();
  }, [isApproved, isCheckingStatus, user?.email]);

  const fetchAndeSetVirtualCards = async () => {
    if (!isApproved || !user?.email || isCheckingStatus) {
      return;
    }

    try {
      const virtualCards = await getVirtualCardsAction(user.email);
      setVirtualCards(virtualCards.data);
    } catch (err) {
      console.error("Error fetching virtual cards:", err);
    }
  };

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
    fetchVirtualCards: fetchAndeSetVirtualCards,
  };
}
