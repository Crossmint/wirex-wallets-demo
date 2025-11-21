export type VirtualCard = {
  id: string;
  card_wallet_address: string;
  status: "Active" | "Inactive" | "Blocked" | "Closed";
  limit: {
    daily_limit: number;
    daily_usage: number;
    currency: string;
  };
  generation: string;
  allowed_actions: Array<{
    type: "GetDetails" | "Close" | "SetLimit" | "Block" | "GetCvv";
    relative_path: string;
  }>;
  created_at: string;
  card_data: {
    name_on_card: string;
    payment_system: "Visa" | "Mastercard" | string;
    card_number_last_4: string;
    expiry_date: string;
    format: "Virtual" | "Physical";
    card_name: string;
  };
};

export type VirtualCardDetails = {
  card_number: string;
  cvv: string;
};
