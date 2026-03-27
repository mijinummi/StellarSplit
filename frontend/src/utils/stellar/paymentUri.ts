import { PaymentRequest } from "../../types/payment";

export function parsePaymentUri(uri: string): PaymentRequest {
  // Example: stellar:pay?asset=USD&amount=50&memo=Lunch&to=GABC...
  const url = new URL(uri);
  return {
    asset: url.searchParams.get("asset") || "XLM",
    amount: Number(url.searchParams.get("amount")),
    memo: url.searchParams.get("memo") || undefined,
    from: url.searchParams.get("from") || "",
    to: url.searchParams.get("to") || "",
    splitId: url.searchParams.get("splitId") || undefined,
  };
}
