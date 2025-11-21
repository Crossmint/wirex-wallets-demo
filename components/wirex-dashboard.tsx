import {
  getCardCvvAndNumber,
  issueVirtualCard,
  verifyWalletSignature,
} from "@/actions/wirex";
import { useWirex } from "@/hooks/useWirex";
import { StellarWallet, useWallet } from "@crossmint/client-sdk-react-ui";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Plus, Wallet } from "lucide-react";
import { VirtualCardDetails } from "@/types/card";

export function WirexDashboard() {
  const { getOrCreateWallet, wallet, status } = useWallet();
  const { virtualCards, wirexUser, walletAddress } = useWirex();
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [cardDetails, setCardDetails] = useState<
    Record<string, VirtualCardDetails>
  >({});
  const [unmaskingCard, setUnmaskingCard] = useState<string | null>(null);

  useEffect(() => {
    if (wirexUser?.wallet_address == null) {
      return;
    }

    // Populate the wallet
    getOrCreateWallet({ chain: "stellar", signer: { type: "email" } });
  }, [wirexUser]);

  const issueVirtualCardHandler = async () => {
    if (!wirexUser?.email) {
      console.error("User email not found");
      return;
    }

    try {
      await issueVirtualCard(
        wirexUser.email,
        wirexUser.personal_info.first_name +
          " " +
          wirexUser.personal_info.last_name
      );
      console.log("Virtual card issued successfully");
    } catch (err) {
      console.error("Error issuing virtual card:", err);
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

  //   const handleMintWirexToken = async () => {
  //     if (wallet == null) {
  //       console.error("Wallet not found");
  //       return;
  //     }

  //     setIsFunding(true);
  //     try {
  //       const stellarWallet = StellarWallet.from(wallet);
  //       const amountInStroops = 5 * 10_000_000; // 5 dollars in stroops

  //       // CD7NDHRV5T63GKQQYJW2SCIWRH4CU4RMCUZH4VGTMVDQXB5DPZOVH3RP - wirex eurc contract addy
  //       const mintTx = await stellarWallet.sendTransaction({
  //         contractId: "CAGQ5E33PMSTGNNCDXQIUDIHYNF26NX4YS67UHKNVTUVTQLWBLDLR5EB", // wirex usdc contract addy
  //         method: "mint",
  //         args: {
  //           to: wallet.address,
  //           amount: amountInStroops,
  //         },
  //       });

  //       console.log("✅ Wirex token minted:", mintTx);
  //       return mintTx;
  //     } catch (err) {
  //       console.error("Error minting Wirex token:", err);
  //       throw err;
  //     } finally {
  //       setIsFunding(false);
  //     }
  //   };

  //   const sendFromWalletToTreasury = async () => {
  //     if (wallet == null) {
  //       console.error("Wallet not found");
  //       return;
  //     }

  //     try {
  //       const stellarWallet = StellarWallet.from(wallet);
  //       const wirexUSDCContractTokenAddress =
  //         "CAGQ5E33PMSTGNNCDXQIUDIHYNF26NX4YS67UHKNVTUVTQLWBLDLR5EB";
  //       const tx = await stellarWallet.sendTransaction({
  //         contractId: wirexUSDCContractTokenAddress,
  //         method: "transfer",
  //         args: {
  //           from: wallet.address,
  //           to: "GBF64R6BJCNC2E5OV4ANKZUNUJUY773WFTBF36ZNB4TSN7FCIWAUODON",
  //           amount: 5 * 10_000_000,
  //         },
  //       });
  //       console.log("✅ Tokens sent from wallet to treasury");
  //       return tx;
  //     } catch (err) {
  //       console.error("Error sending tokens from wallet to treasury:", err);
  //     }
  //   };

  if (status === "in-progress") {
    return <div>Loading...</div>;
  }

  const cards = virtualCards || [];
  const selectedCard = cards[selectedCardIndex];

  return (
    <div className="w-full max-w-[500px] self-center space-y-6">
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Your Cards</h2>
        <div className="flex items-center gap-3">
          {/* <button
            onClick={sendFromWalletToTreasury}
            className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            send tokens from my wallet to the treasury
          </button>
          <button
            className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleMintWirexToken}
            disabled={!wirexUser?.wallet_address || isFunding}
          >
            {isFunding ? (
              <>
                <div className="w-4 h-4 border-2 border-green-300 border-t-green-600 rounded-full animate-spin" />
                <span>Funding...</span>
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4" />
                <span>Fund $5</span>
              </>
            )}
          </button> */}
          <button
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={issueVirtualCardHandler}
            disabled={!wirexUser?.email}
          >
            <Plus className="w-4 h-4" />
            Create Card
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
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={issueVirtualCardHandler}
              disabled={!wirexUser?.email}
            >
              Create Your First Card
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

            {/* Unmask Button */}
            <button
              onClick={() =>
                cardDetails[selectedCard.id]
                  ? handleMaskCard(selectedCard.id)
                  : handleUnmaskCard(selectedCard.id)
              }
              disabled={unmaskingCard === selectedCard.id}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {unmaskingCard === selectedCard.id ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                  <span>Loading...</span>
                </>
              ) : cardDetails[selectedCard.id] ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span>Hide Card Details</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span>Show Full Card Number</span>
                </>
              )}
            </button>
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
