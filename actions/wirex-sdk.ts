"use server";

/**
 * THIS FILE IS SUBJECT TO BE DELETED AFTER INTEGRATION
 */

import { WirexPay } from "@wirexapp/wirex-pay-sdk";

const WIREX_API_BASE = "https://api-business.wirexpaychain.tech/api/v1";

export function initWirexSDK(token: string) {
  WirexPay.init({
    token,
    subscribeToSocket: true,
    apiUrl: WIREX_API_BASE,
  });
  return WirexPay;
}

export async function getUserInfoSDK(token: string) {
  try {
    const sdk = initWirexSDK(token);
    const userInfo = await sdk.user.getUserInfo();
    return userInfo;
  } catch (error) {
    console.error("Error getting user info via SDK:", error);
    throw error;
  }
}

export async function getVerificationLinkSDK(token: string) {
  try {
    const sdk = initWirexSDK(token);
    const response = await sdk.user.getVerificationLink();
    return response.redirect_uri;
  } catch (error) {
    console.error("Error getting verification link via SDK:", error);
    throw error;
  }
}

export async function createSmsConfirmationSDK(
  token: string,
  actionType: "ConfirmPhone" | "GetCardDetails" = "ConfirmPhone"
) {
  try {
    const sdk = initWirexSDK(token);
    const response = await sdk.actionConfirmation.createSmsConfirmation({
      action_type: actionType,
    });
    return response;
  } catch (error) {
    console.error("Error creating SMS confirmation via SDK:", error);
    throw error;
  }
}

export async function completeSmsConfirmationSDK(
  token: string,
  code: string,
  sessionId: string
) {
  try {
    const sdk = initWirexSDK(token);
    const response = await sdk.actionConfirmation.completeSmsConfirmation({
      code,
      session_id: sessionId,
    });
    return response;
  } catch (error) {
    console.error("Error completing SMS confirmation via SDK:", error);
    throw error;
  }
}

export async function getWalletSDK(token: string) {
  try {
    const sdk = initWirexSDK(token);
    const wallet = await sdk.wallet.getWallet();
    return wallet;
  } catch (error) {
    console.error("Error getting wallet via SDK:", error);
    throw error;
  }
}

export async function subscribeToUserChangesSDK(
  token: string,
  callback: (data: any) => void
) {
  try {
    const sdk = initWirexSDK(token);
    sdk.user.subscribeToUserChange(callback);
  } catch (error) {
    console.error("Error subscribing to user changes via SDK:", error);
    throw error;
  }
}
