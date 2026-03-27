import React, { useState } from "react";
import { parsePaymentUri } from "../utils/stellar/paymentUri";
import { PaymentRequest, PaymentResult } from "../types/payment";
import { PaymentReview } from "../components/Payment/PaymentReview";
import { PaymentProgress } from "../components/Payment/PaymentProgress";
import { PaymentResult as PaymentResultComponent } from "../components/Payment/PaymentResult";

export default function PaymentURIPage() {
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [progress, setProgress] = useState(false);

  const uri = window.location.search; // assume ?uri=...
  if (!request && uri) {
    const parsed = parsePaymentUri(new URLSearchParams(uri).get("uri") || "");
    setRequest(parsed);
  }

  const handleConfirm = async () => {
    setProgress(true);
    try {
      // TODO: integrate Stellar SDK transaction submission
      const txHash = "mock-tx-hash"; 
      setResult({ success: true, txHash });
    } catch (err: any) {
      setResult({ success: false, error: err.message });
    } finally {
      setProgress(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
  };

  const handleBackToSplit = (splitId?: string) => {
    if (splitId) {
      window.location.href = `/split/${splitId}`;
    } else {
      window.location.href = "/splits";
    }
  };

  if (!request) return <div>Invalid payment request</div>;
  if (progress) return <PaymentProgress />;
  if (result) return <PaymentResultComponent result={result} onRetry={handleRetry} onBackToSplit={handleBackToSplit} />;

  return <PaymentReview request={request} onConfirm={handleConfirm} onCancel={() => (window.location.href = "/splits")} />;
}
