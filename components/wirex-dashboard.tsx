import { StellarWallet, useWallet } from "@crossmint/client-sdk-react-ui";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Plus, RefreshCw, Wallet } from "lucide-react";
import {
  fundTestnetCard,
  getCardCvvAndNumber,
  issueVirtualCard,
  verifyWalletSignature,
} from "@/actions/wirex";
import { useWirex } from "@/hooks/useWirex";
import { VirtualCardDetails } from "@/types/card";

export function WirexDashboard() {
  const { getOrCreateWallet, wallet, status } = useWallet();
  const {
    virtualCards,
    wirexUser,
    fetchVirtualCards,
    isCheckingStatus,
    walletBalances,
    fetchWalletBalances,
  } = useWirex();
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [cardDetails, setCardDetails] = useState<
    Record<string, VirtualCardDetails>
  >({});
  const [unmaskingCard, setUnmaskingCard] = useState<string | null>(null);
  const [isWalletInitialized, setIsWalletInitialized] = useState(false);
  const [isIssuingCard, setIsIssuingCard] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [fundResult, setFundResult] = useState<{
    hash: string;
    status: string;
  } | null>(null);

  useEffect(() => {
    if (wirexUser?.wallet_address == null || isWalletInitialized) {
      return;
    }

    // Populate the wallet only once
    const initWallet = async () => {
      try {
        await getOrCreateWallet({
          chain: "stellar",
          signer: { type: "email" },
        });
        setIsWalletInitialized(true);
      } catch (err) {
        console.error("Error initializing wallet:", err);
      }
    };

    initWallet();
  }, [wirexUser?.wallet_address, isWalletInitialized, getOrCreateWallet]);

  const issueVirtualCardHandler = async () => {
    if (!wirexUser?.email) {
      console.error("User email not found");
      return;
    }

    setIsIssuingCard(true);
    try {
      await issueVirtualCard(
        wirexUser.email,
        wirexUser.personal_info.first_name +
          " " +
          wirexUser.personal_info.last_name
      );
      await fetchVirtualCards();
      console.log("Virtual card issued successfully");
    } catch (err) {
      console.error("Error issuing virtual card:", err);
    } finally {
      setIsIssuingCard(false);
    }
  };

  const handleUnmaskCard = async (cardId: string) => {
    if (wallet == null || wirexUser == null) {
      console.error("Wallet not found");
      return;
    }

    setUnmaskingCard(cardId);
    try {
      const stellarWallet = StellarWallet.from(wallet);
      const messageArgs = {
        actionType: "GetCardDetails" as const,
        nonce: Date.now(),
      };
      const message = `By signing this I confirm that I am executing action ${messageArgs.actionType} at ${messageArgs.nonce}`;
      const data = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Buffer.from(new Uint8Array(hashBuffer));
      const encoded = hashArray.toString("base64");

      let sigResult = await stellarWallet.signer.signTransaction(encoded);
      const payload = {
        action_type: messageArgs.actionType,
        nonce: messageArgs.nonce,
        message_signature: sigResult.signature as string,
      };

      const actionToken = await verifyWalletSignature(payload, wirexUser.email);

      const details = await getCardCvvAndNumber(
        wirexUser.email,
        cardId,
        actionToken
      );

      // Store the card details in state
      setCardDetails((prev) => ({
        ...prev,
        [cardId]: details,
      }));
    } catch (err) {
      console.error("Error unmasking card:", err);
    } finally {
      setUnmaskingCard(null);
    }
  };

  const handleMaskCard = (cardId: string) => {
    setCardDetails((prev) => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
  };

  const handleFundCard = async () => {
    if (!wallet?.address) {
      console.error("Crossmint wallet not found");
      return;
    }

    setIsFunding(true);
    setFundResult(null);
    try {
      const result = await fundTestnetCard(wallet.address);
      setFundResult(result);
      console.log("Fund result:", result);
      // Refresh wallet balances after funding
      await fetchWalletBalances();
    } catch (err) {
      console.error("Error funding card:", err);
    } finally {
      setIsFunding(false);
    }
  };

  // Show loading state while wallet is being created or virtual cards are being fetched
  const isLoadingWallet =
    status === "in-progress" || (!wallet && wirexUser?.wallet_address);
  const isLoadingCards = isCheckingStatus || (wirexUser && !virtualCards);

  if (isLoadingWallet || isLoadingCards) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          <p className="text-gray-600 text-sm">
            {isLoadingWallet
              ? "Setting up your wallet..."
              : "Loading your cards..."}
          </p>
        </div>
      </div>
    );
  }

  const cards = virtualCards || [];
  const selectedCard = cards[selectedCardIndex];

  return (
    <div className="w-full max-w-[500px] self-center space-y-6">
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Your Cards</h2>
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={issueVirtualCardHandler}
            disabled={!wirexUser?.email || isIssuingCard}
          >
            {isIssuingCard ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Create Card</span>
              </>
            )}
          </button>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-16 px-4">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No cards yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first virtual card to get started with Wirex
            </p>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              onClick={issueVirtualCardHandler}
              disabled={!wirexUser?.email || isIssuingCard}
            >
              {isIssuingCard ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-300 border-t-white rounded-full animate-spin" />
                  <span>Creating Card...</span>
                </>
              ) : (
                "Create Your First Card"
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full space-y-6">
          {/* Featured Card Display */}
          <div className="space-y-4">
            <div className="relative rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 text-white shadow-xl aspect-[1.586/1] max-w-[500px] p-8">
              {/* Card Header */}
              <div className="flex items-start justify-between mb-8">
                <div>
                  <p className="text-xs font-medium text-blue-100 uppercase tracking-wide">
                    {selectedCard.card_data.format}
                  </p>
                  <p className="text-base font-semibold mt-1">
                    {selectedCard.card_data.card_name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      selectedCard.status === "Active"
                        ? "bg-green-500/20 text-green-100 border border-green-400/30"
                        : "bg-gray-500/20 text-gray-100 border border-gray-400/30"
                    }`}
                  >
                    {selectedCard.status}
                  </span>
                </div>
              </div>

              {/* Card Number */}
              <div className="mb-8">
                <p className="text-2xl font-mono tracking-wider">
                  {cardDetails[selectedCard.id]
                    ? cardDetails[selectedCard.id].card_number
                    : "•••• •••• •••• " +
                      selectedCard.card_data.card_number_last_4}
                </p>
              </div>

              {/* Card Details */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-blue-100 mb-1">Cardholder</p>
                  <p className="text-sm font-medium">
                    {selectedCard.card_data.name_on_card}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-100 mb-1">Expires</p>
                  <p className="text-sm font-medium">
                    {selectedCard.card_data.expiry_date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-100 mb-1">CVV</p>
                  <p className="text-sm font-medium">
                    {cardDetails[selectedCard.id]
                      ? cardDetails[selectedCard.id].cvv
                      : "•••"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold">
                    {selectedCard.card_data.payment_system}
                  </p>
                </div>
              </div>

              {/* Limit Info */}
              {selectedCard.limit && (
                <div className="mt-6 pt-4 border-t border-white/20">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-blue-100">Daily Limit</span>
                    <span className="font-medium">
                      {selectedCard.limit.daily_limit === -1
                        ? "Unlimited"
                        : `${selectedCard.limit.daily_limit} ${selectedCard.limit.currency}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-blue-100">Daily Usage</span>
                    <span className="font-medium">
                      {selectedCard.limit.daily_usage}{" "}
                      {selectedCard.limit.currency}
                    </span>
                  </div>
                </div>
              )}

              {/* Background decoration */}
              <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
              <div className="absolute -left-8 -top-8 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
            </div>

            {/* Card Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  cardDetails[selectedCard.id]
                    ? handleMaskCard(selectedCard.id)
                    : handleUnmaskCard(selectedCard.id)
                }
                disabled={unmaskingCard === selectedCard.id}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {unmaskingCard === selectedCard.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : cardDetails[selectedCard.id] ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    <span>Hide Details</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    <span>Show Details</span>
                  </>
                )}
              </button>
              <button
                onClick={handleFundCard}
                disabled={isFunding || !wallet?.address}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-green-600 hover:bg-green-700 text-white border border-green-700 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isFunding ? (
                  <>
                    <div className="w-4 h-4 border-2 border-green-300 border-t-white rounded-full animate-spin" />
                    <span>Funding...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    <span>Fund Card (USDC)</span>
                  </>
                )}
              </button>
            </div>
            {fundResult && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                <p className="font-medium">Funded successfully!</p>
                <p className="text-xs font-mono mt-1 break-all">
                  TX: {fundResult.hash}
                </p>
                <p className="text-xs text-green-600 mt-2">
                  Note: The Wirex API may take a few extra seconds to reflect the updated balance.
                </p>
              </div>
            )}

            {/* Wallet Balance Dropdown */}
            <details className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <summary className="flex items-center justify-between cursor-pointer px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <span>Wallet Balances</span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    fetchWalletBalances();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Refresh balance"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </summary>
              <div className="px-4 pb-4">
                {walletBalances ? (
                  <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 overflow-x-auto max-h-64 overflow-y-auto">
                    {JSON.stringify(walletBalances, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-gray-400">Loading...</p>
                )}
              </div>
            </details>
          </div>

          {/* Card List */}
          {cards.length > 1 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">
                All Cards ({cards.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cards.map((card: any, index: number) => (
                  <button
                    key={card.id}
                    onClick={() => setSelectedCardIndex(index)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      index === selectedCardIndex
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {card.card_data.card_name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {card.card_data.format}
                        </p>
                      </div>
                      <span
                        className={`ml-2 px-1.5 py-0.5 text-xs font-medium rounded ${
                          card.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {card.status}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-gray-600">
                      •••• {card.card_data.card_number_last_4}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
