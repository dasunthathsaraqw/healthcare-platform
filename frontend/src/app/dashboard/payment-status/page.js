"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";

const API_BASE = "http://localhost:8080/api";

function authHeaders() {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function PaymentStatusContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState("checking");
    const [message, setMessage] = useState("");
    const [paymentDetails, setPaymentDetails] = useState(null);

    useEffect(() => {
        const orderId = searchParams.get("order_id");
        const paymentId = searchParams.get("payment_id");
        const statusCode = searchParams.get("status_code");

        console.log("📊 Payment Status Page - Params:", { orderId, paymentId, statusCode });

        if (!orderId) {
            setStatus("error");
            setMessage("No payment information found. Please contact support.");
            return;
        }

        const checkStatus = async () => {
            try {
                // Wait a moment for webhook to process
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const token = localStorage.getItem("token");
                if (!token) {
                    setStatus("error");
                    setMessage("Please login to view payment status");
                    setTimeout(() => router.push("/login"), 2000);
                    return;
                }

                const { data } = await axios.get(
                    `${API_BASE}/payments/status/${orderId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                console.log("📊 Payment status response:", data);

                if (data.success) {
                    setPaymentDetails(data.payment);
                    
                    if (data.status === "completed") {
                        setStatus("success");
                        setMessage("Payment successful! Your appointment has been confirmed.");
                        setTimeout(() => router.push("/dashboard"), 4000);
                    } else if (data.status === "failed" || data.status === "cancelled") {
                        setStatus("error");
                        setMessage("Payment failed or was cancelled. Please try again.");
                    } else if (data.status === "pending") {
                        setStatus("pending");
                        setMessage("Payment is being processed. You will receive a confirmation shortly.");
                    } else {
                        setStatus("error");
                        setMessage("Unknown payment status. Please contact support.");
                    }
                } else {
                    throw new Error(data.message || "Failed to verify payment");
                }
                
            } catch (error) {
                console.error("❌ Status check error:", error);
                
                // If status code from URL indicates success, show optimistic message
                const urlStatusCode = searchParams.get("status_code");
                if (urlStatusCode === "2") {
                    setStatus("success");
                    setMessage("Payment completed! Redirecting to dashboard...");
                    setTimeout(() => router.push("/dashboard"), 3000);
                } else {
                    setStatus("error");
                    setMessage("Unable to verify payment status. Please check your email for confirmation.");
                }
            }
        };

        checkStatus();
    }, [searchParams, router]);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                
                {status === "checking" && (
                    <>
                        <div className="w-16 h-16 mx-auto mb-4">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying Payment</h2>
                        <p className="text-gray-600">Please wait while we confirm your payment...</p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
                        <p className="text-gray-600 mb-4">{message}</p>
                        {paymentDetails && (
                            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                                <p className="text-sm text-gray-600">Amount Paid: <span className="font-bold">LKR {paymentDetails.amount}</span></p>
                                <p className="text-sm text-gray-600">Transaction ID: <span className="font-mono text-xs">{paymentDetails.transactionId || "Processing"}</span></p>
                            </div>
                        )}
                        <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
                    </>
                )}

                {(status === "error" || status === "pending") && (
                    <>
                        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                            status === "error" ? "bg-red-100" : "bg-yellow-100"
                        }`}>
                            <svg className={`w-8 h-8 ${
                                status === "error" ? "text-red-600" : "text-yellow-600"
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            {status === "error" ? "Payment Issue" : "Payment Pending"}
                        </h2>
                        <p className="text-gray-600 mb-6">{message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => router.push("/doctors")}
                                className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
                            >
                                Back to Doctors
                            </button>
                            <button
                                onClick={() => router.push("/dashboard")}
                                className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
                            >
                                View Dashboard
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// Wrap with Suspense - REQUIRED for useSearchParams in Next.js App Router
export default function PaymentStatusPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600" />
            </div>
        }>
            <PaymentStatusContent />
        </Suspense>
    );
}