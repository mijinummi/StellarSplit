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
import { useState } from 'react';
import { PaymentURIHandler } from '../components/Payment/PaymentURIHandler';
import { useWallet } from '../hooks/use-wallet';
import { signAndSubmitPayment } from '../utils/stellar/wallet';
import type { ParsedStellarPaymentURI } from '../utils/stellar/paymentUri';

const PaymentURIPage = () => {
  const {
    canTransact,
    connect,
    hasFreighter,
    horizonUrl,
    isConnecting,
    isRefreshing,
    networkPassphrase,
    publicKey,
    refresh,
    requiredNetworkLabel,
    walletNetworkLabel,
    error: walletError,
    signTransaction,
  } = useWallet();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handlePay = async (payment: ParsedStellarPaymentURI) => {
    if (!payment.amount) {
      throw new Error('Payment amount is required.');
    }

    if (!publicKey) {
      throw new Error('Connect your wallet before confirming this payment.');
    }

    if (!canTransact) {
      throw new Error(`Switch Freighter to ${requiredNetworkLabel} before paying.`);
    }

    setStatus('idle');
    setError(null);

    const result = await signAndSubmitPayment({
      amount: payment.amount,
      destination: payment.destination,
      sourceAccount: publicKey,
      networkPassphrase,
      horizonUrl,
      memo: payment.memo,
      memoType: payment.memoType === 'return' ? 'text' : payment.memoType,
      signTransaction,
    });

    if (!result.success) {
      setStatus('error');
      setError(result.error ?? 'Could not submit payment.');
      throw new Error(result.error ?? 'Could not submit payment.');
    }

    setStatus('success');
  };

  return (
    <main className="mx-auto max-w-xl p-4">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Stellar Payment Request</h1>
      <p className="mb-4 text-sm text-gray-600">
        Review the payment details and continue in your wallet.
      </p>

      {!hasFreighter ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Freighter is not installed in this browser.
        </div>
      ) : null}

      {hasFreighter && publicKey && !canTransact ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Freighter is on {walletNetworkLabel}. Switch to {requiredNetworkLabel} before you sign.
        </div>
      ) : null}

      {walletError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {walletError}
        </div>
      ) : null}

      {!canTransact ? (
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {!publicKey ? (
            <button
              type="button"
              onClick={() => void connect()}
              disabled={isConnecting || !hasFreighter}
              className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isConnecting ? 'Connecting...' : 'Connect Freighter'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={isRefreshing}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh wallet'}
          </button>
        </div>
      ) : null}

      <PaymentURIHandler onPay={handlePay} />

      {status === 'success' ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Payment submitted successfully.
        </div>
      ) : null}

      {status === 'error' && error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}
    </main>
  );
};

export default PaymentURIPage;
