"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function PaymentCancelContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const statusCode = searchParams.get("status_code");

  const getMessage = () => {
    if (statusCode === "-1") return "You cancelled the payment process.";
    if (statusCode === "-2") return "The payment failed. Please try again.";
    if (statusCode === "-3") return "There was a chargeback issue.";
    return "Payment was not completed.";
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-5 bg-yellow-100 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Cancelled</h2>
        <p className="text-gray-600 mb-2">{getMessage()}</p>
        <p className="text-sm text-gray-400 mb-6">
          Your appointment slot has been released. You can rebook anytime.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/doctors")}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
          >
            Book Again
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PaymentCancelContent />
    </Suspense>
  );
}