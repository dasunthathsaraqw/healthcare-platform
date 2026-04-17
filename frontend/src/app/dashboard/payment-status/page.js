"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_PAYMENT_API_URL || "http://localhost:8080/api";

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function PaymentStatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("");
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    const orderId = searchParams.get("order_id");

    if (!orderId) {
      // No order_id in URL — PayHere sometimes redirects without params
      // Check localStorage for last order
      const lastOrderId = localStorage.getItem("lastPayhereOrderId");
      if (lastOrderId) {
        checkStatus(lastOrderId);
      } else {
        setStatus("error");
        setMessage("No payment information found.");
      }
      return;
    }

    localStorage.setItem("lastPayhereOrderId", orderId);
    checkStatus(orderId);
  }, [searchParams]);

  const checkStatus = async (orderId) => {
    try {
      const { data } = await axios.get(
        `${API_BASE}/payments/status/${orderId}`,
        { headers: authHeaders() }
      );

      if (data.success) {
        setPayment(data.payment);
        if (data.status === "completed") {
          setStatus("success");
          setMessage("Payment successful! Your appointment has been confirmed.");
          localStorage.removeItem("lastPayhereOrderId");
          setTimeout(() => router.push("/dashboard/appointments"), 4000);
        } else if (data.status === "failed" || data.status === "cancelled") {
          setStatus("failed");
          setMessage("Payment was not completed. Your appointment slot has been released.");
        } else {
          // Still pending — webhook may not have fired yet, poll once more
          setStatus("pending");
          setMessage("Payment is being verified. Please wait...");
          setTimeout(() => checkStatus(orderId), 3000);
        }
      }
    } catch (err) {
      setStatus("error");
      setMessage("Unable to verify payment. Check your email for confirmation.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">

        {/* Checking */}
        {status === "checking" && (
          <>
            <div className="w-16 h-16 mx-auto mb-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying Payment</h2>
            <p className="text-gray-500">Please wait while we confirm your payment...</p>
          </>
        )}

        {/* Pending */}
        {status === "pending" && (
          <>
            <div className="w-16 h-16 mx-auto mb-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Processing Payment</h2>
            <p className="text-gray-500 mb-4">{message}</p>
          </>
        )}

        {/* Success */}
        {status === "success" && (
          <>
            <div className="w-20 h-20 mx-auto mb-5 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            {payment && (
              <div className="bg-gray-50 rounded-lg p-4 text-left mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Order ID:</span> {payment.payhereOrderId}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Amount:</span> Rs. {payment.amount?.toFixed(2)}
                </p>
                {payment.transactionId && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Transaction:</span> {payment.transactionId}
                  </p>
                )}
              </div>
            )}
            <p className="text-sm text-gray-400 mb-4">Redirecting to appointments...</p>
            <button
              onClick={() => router.push("/appointments")}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
            >
              View My Appointments
            </button>
          </>
        )}

        {/* Failed */}
        {(status === "failed" || status === "error") && (
          <>
            <div className="w-20 h-20 mx-auto mb-5 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {status === "failed" ? "Payment Failed" : "Something Went Wrong"}
            </h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/doctors")}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
              >
                Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentStatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    }>
      <PaymentStatusContent />
    </Suspense>
  );
}