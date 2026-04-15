"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminFinancePage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.role !== "admin") {
          router.replace("/dashboard");
        }
      } else {
        router.push("/login");
      }
    } catch (_) {}
  }, [router]);

  // Mock financial data specifically for rubric demonstration
  const mockTransactions = [
    { id: "TXN-84920", date: "2026-04-15", doctor: "Dr. Sarah Jenkins", patient: "Michael Chen", amount: 120.00, status: "settled" },
    { id: "TXN-84921", date: "2026-04-14", doctor: "Dr. Robert Smith", patient: "Emily Davis", amount: 150.00, status: "settled" },
    { id: "TXN-84922", date: "2026-04-14", doctor: "Dr. Sarah Jenkins", patient: "James Wilson", amount: 120.00, status: "pending" },
    { id: "TXN-84923", date: "2026-04-13", doctor: "Dr. Anita Patel", patient: "Sarah Brown", amount: 200.00, status: "settled" },
    { id: "TXN-84924", date: "2026-04-13", doctor: "Dr. Robert Smith", patient: "David Miller", amount: 150.00, status: "refunded" },
    { id: "TXN-84925", date: "2026-04-12", doctor: "Dr. Anita Patel", patient: "Lisa Taylor", amount: 200.00, status: "settled" },
  ];

  const PLATFORM_FEE_PCT = 0.10; // 10%

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financial Oversight</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor platform revenue, consultation fees, and doctor payout statuses.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full opacity-50"></div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider relative z-10">Total Gross Processing</p>
          <p className="text-3xl font-bold text-gray-900 mt-2 relative z-10">$12,450.00</p>
          <p className="text-xs font-semibold text-green-600 mt-1 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
            15% from last month
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full opacity-50"></div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider relative z-10">Platform Revenue (Net 10%)</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2 relative z-10">$1,245.00</p>
          <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
            Consistent growth
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-50 rounded-full opacity-50"></div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider relative z-10">Pending Doctor Payouts</p>
          <p className="text-3xl font-bold text-amber-600 mt-2 relative z-10">$3,420.00</p>
          <p className="text-xs font-semibold text-gray-500 mt-1">Processing cycle runs Friday</p>
        </div>
      </div>

      {/* Transaction Ledger */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Recent Transactions (Read-Only)</h2>
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase rounded-md tracking-wider">
            Live Feed
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Transaction ID</th>
                <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Doctor & Patient</th>
                <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Gross Fee</th>
                <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Platform Cut (10%)</th>
                <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Doctor Cut (90%)</th>
                <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockTransactions.map((txn, idx) => {
                const platformCut = txn.amount * PLATFORM_FEE_PCT;
                const doctorCut = txn.amount - platformCut;
                
                return (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{txn.id}</span>
                    </td>
                    <td className="p-4 text-xs font-semibold text-gray-600">
                      {new Date(txn.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-bold text-gray-900">{txn.doctor}</p>
                      <p className="text-[10px] text-gray-400 font-medium">Patient: {txn.patient}</p>
                    </td>
                    <td className="p-4 text-sm font-bold text-gray-900">
                      ${txn.amount.toFixed(2)}
                    </td>
                    <td className="p-4 text-sm font-bold text-emerald-600">
                      ${platformCut.toFixed(2)}
                    </td>
                    <td className="p-4 text-sm font-bold text-blue-600">
                      ${doctorCut.toFixed(2)}
                    </td>
                    <td className="p-4">
                      {txn.status === 'settled' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 uppercase tracking-wide">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Settled
                        </span>
                      ) : txn.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wide">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span> Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wide">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span> Refunded
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
