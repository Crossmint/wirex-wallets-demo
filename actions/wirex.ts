"use server";

const WIREX_AUTH_URL = "https://wirex-pay-dev.eu.auth0.com/oauth/token";
const WIREX_API_BASE = "https://api-business.wirexpaychain.tech/api/v1";
const WIREX_CHAIN_ID = "9223372036854775806";
const WIREX_AUDIENCE = "https://api-business.wirexpaychain.tech";

const WIREX_CLIENT_ID = process.env.WIREX_CLIENT_ID;
const WIREX_CLIENT_SECRET = process.env.WIREX_CLIENT_SECRET;

interface WirexAuthResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export type UserStatus = "Pending" | "Active" | "Blocked" | "Deleted";
export type VerificationStatus =
  | "None"
  | "Applied"
  | "InReview"
  | "Approved"
  | "Cancelled"
  | "Rejected"
  | "Pending";

export interface WirexUser {
  id: string;
  email: string;
  wallet_address: string;
  residence_address: {
    line1: string;
    line2: string;
    country: string;
    city: string;
    zip_code: string;
    state: string;
  };
  personal_info: {
    first_name: string;
    last_name: string;
    nationality: string;
  };
  verification_status: VerificationStatus;
  user_status: UserStatus;
  phone_number_data: {
    phone_number: string;
    is_confirmed: boolean;
  };
  freshdesk_id: string;
  user_actions: Array<{
    type: string;
    relative_path: string;
  }>;
  capabilities: Array<{
    type: string;
    verification_requirements: Array<{
      type: string;
      order: number;
    }>;
    prerequisites: string[] | null;
    status: string;
    status_reason: string;
  }>;
}

// Cache the token in memory (in production, use a proper cache like Redis)
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Step 1: Authenticate with Wirex and get an access token
 */
async function getWirexToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const response = await fetch(WIREX_AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: WIREX_CLIENT_ID,
      client_secret: WIREX_CLIENT_SECRET,
      audience: WIREX_AUDIENCE,
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to authenticate with Wirex: ${error}`);
  }

  const data: WirexAuthResponse = await response.json();

  // Cache the token (subtract 60 seconds for safety margin)
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return data.access_token;
}

/**
 * Step 2: Create a new Wirex user
 */
export async function createWirexUser(
  email: string,
  country: string,
  walletAddress: string
): Promise<WirexUser> {
  const token = await getWirexToken();

  const response = await fetch(`${WIREX_API_BASE}/user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Chain-Id": WIREX_CHAIN_ID,
    },
    body: JSON.stringify({
      email,
      country,
      wallet_address: walletAddress,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Wirex user: ${error}`);
  }

  return await response.json();
}

/**
 * Step 2.5: Get existing Wirex user
 */
export async function getWirexUser(email: string): Promise<WirexUser> {
  const token = await getWirexToken();

  const response = await fetch(`${WIREX_API_BASE}/user`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Chain-Id": WIREX_CHAIN_ID,
      "X-User-Email": email,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Wirex user: ${error}`);
  }

  return await response.json();
}

/**
 * Step 3: Get KYC verification link
 */
export async function getVerificationLink(email: string): Promise<string> {
  const token = await getWirexToken();

  const response = await fetch(`${WIREX_API_BASE}/user/verification-link`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Chain-Id": WIREX_CHAIN_ID,
      "X-User-Email": email,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get verification link: ${error}`);
  }

  const data: { redirect_uri: string } = await response.json();
  console.log("Verification link:", data);
  return data.redirect_uri;
}

/**
 * Step 4: Send SMS confirmation
 */
export async function sendSmsConfirmation(email: string): Promise<void> {
  const token = await getWirexToken();

  const response = await fetch(`${WIREX_API_BASE}/confirmation/sms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Chain-Id": WIREX_CHAIN_ID,
      "X-User-Email": email,
    },
    body: JSON.stringify({
      action_type: "ConfirmPhone",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send SMS confirmation: ${error}`);
  }
}

/**
 * Get the Bearer token for SDK initialization
 * This exposes the token to the client for SDK use
 */
export async function getWirexBearerToken(): Promise<string> {
  return await getWirexToken();
}
