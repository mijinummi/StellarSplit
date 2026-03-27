export interface PaymentRequest {
  asset: string;
  amount: number;
  memo?: string;
  from: string;
  to: string;
  splitId?: string;
}

export interface PaymentResult {
  success: boolean;
  txHash?: string;
  error?: string;
}
