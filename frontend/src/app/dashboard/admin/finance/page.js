"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import toast, { Toaster } from "react-hot-toast";

export default function AdminFinancePage() {
  const router = useRouter();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.role !== "admin") {
          router.replace("/dashboard");
        } else {
          fetchTransactions();
        }
      } else {
        router.push("/login");
      }
    } catch (_) {
      router.push("/login");
    }
  }, [router]);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/payments/admin/all");
      setTransactions(res.data.payments || []);
    } catch (err) {
      setError("Failed to load payment data");
      toast.error("Could not load payment transactions.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats from transactions
  const calculateStats = () => {
    const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const platformFee = totalRevenue * 0.10; // 10% platform fee
    const pendingCount = transactions.filter(t => t.status === "pending").length;
    const settledCount = transactions.filter(t => t.status === "completed" || t.status === "settled").length;
    const failedCount = transactions.filter(t => t.status === "failed" || t.status === "cancelled").length;

    return {
      totalRevenue,
      platformRevenue: platformFee,
      pendingPayouts: totalRevenue - platformFee, // Assuming payouts are after platform fee
      successfulTransactions: settledCount,
      failedTransactions: failedCount,
      pendingTransactions: pendingCount,
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-100 rounded w-64"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-8 bg-gray-100 rounded w-24 mb-2"></div>
              <div className="h-3 bg-gray-100 rounded w-40"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-4">
        <div className="text-center py-16">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchTransactions}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: "10px",
            background: "#1e293b",
            color: "#f8fafc",
            fontSize: "14px",
            fontWeight: 500,
          },
          error: { iconTheme: { primary: "#ef4444", secondary: "#f8fafc" } },
        }}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financial Oversight</h1>
            <p className="text-sm text-gray-500 mt-1">Monitor platform revenue, consultation fees, and doctor payout statuses.</p>
          </div>
          <button
            onClick={fetchTransactions}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full opacity-50"></div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider relative z-10">Total Gross Revenue</p>
            <p className="text-3xl font-bold text-gray-900 mt-2 relative z-10">${stats.totalRevenue.toFixed(2)}</p>
            <p className="text-xs font-semibold text-green-600 mt-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              {transactions.length} transactions
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full opacity-50"></div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider relative z-10">Platform Revenue (10%)</p>
            <p className="text-3xl font-bold text-emerald-600 mt-2 relative z-10">${stats.platformRevenue.toFixed(2)}</p>
            <p className="text-xs font-semibold text-emerald-600 mt-1">Net earnings</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-50 rounded-full opacity-50"></div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider relative z-10">Pending Payouts</p>
            <p className="text-3xl font-bold text-amber-600 mt-2 relative z-10">${stats.pendingPayouts.toFixed(2)}</p>
            <p className="text-xs font-semibold text-gray-500 mt-1">{stats.pendingTransactions} pending</p>
          </div>
        </div>

        {/* Transaction Ledger */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Recent Transactions</h2>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-green-600 font-semibold">✓ {stats.successfulTransactions} Successful</span>
              <span className="text-red-600 font-semibold">✗ {stats.failedTransactions} Failed</span>
              <span className="text-amber-600 font-semibold">⏳ {stats.pendingTransactions} Pending</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Transaction ID</th>
                  <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Patient</th>
                  <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Platform Fee (10%)</th>
                  <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Doctor Payout (90%)</th>
                  <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  transactions.map((txn, idx) => {
                    const platformCut = txn.amount * 0.10;
                    const doctorCut = txn.amount - platformCut;

                    return (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4">
                          <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{txn.payhereOrderId}</span>
                        </td>
                        <td className="p-4 text-sm font-semibold text-gray-900">
                          {txn.metadata?.patientName || "Patient"}
                        </td>
                        <td className="p-4 text-sm font-bold text-gray-900">
                          ${txn.amount?.toFixed(2)}
                        </td>
                        <td className="p-4 text-sm font-bold text-emerald-600">
                          ${platformCut.toFixed(2)}
                        </td>
                        <td className="p-4 text-sm font-bold text-blue-600">
                          ${doctorCut.toFixed(2)}
                        </td>
                        <td className="p-4">
                          {txn.status === 'completed' || txn.status === 'settled' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 uppercase tracking-wide">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Settled
                            </span>
                          ) : txn.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wide">
                              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span> Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 uppercase tracking-wide">
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> Failed
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-xs font-semibold text-gray-600">
                          {new Date(txn.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
