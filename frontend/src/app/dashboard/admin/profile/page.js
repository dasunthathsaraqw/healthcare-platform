"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        if (parsed.role !== "admin") {
          router.replace("/dashboard");
        }
      } else {
        router.push("/login");
      }
    } catch (_) {}
  }, [router]);

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const statCards = [
    { label: "Total Platform Users", value: "1,248", trend: "+12% this month", icon: "👥", color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active Doctors", value: "84", trend: "+3 new this week", icon: "👨‍⚕️", color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Daily Transactions", value: "$4,290", trend: "+8% vs yesterday", icon: "💳", color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "System Uptime", value: "99.99%", trend: "Last 30 days", icon: "⚡", color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Profile & System Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your administrative credentials and view global platform health.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${stat.bg}`}>
                {stat.icon}
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${stat.bg} ${stat.color}`}>
                Live
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-500">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
            <p className="text-xs text-gray-400 mt-2 font-medium">{stat.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Admin Credential Card */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="text-2xl">🛡️</span> Security Clearance
            </h2>
            <p className="text-slate-300 text-xs mt-1">Level 4 Platform Administrator</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Administrator Name</p>
              <p className="text-sm font-bold text-gray-900 mt-1">{user.name}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Primary Email</p>
              <p className="text-sm font-bold text-gray-900 mt-1">{user.email}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Account Status</p>
              <span className="inline-flex items-center mt-1 px-2.5 py-1 rounded-md text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Global Activity Graph Mock */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold text-gray-900">Platform Traffic (7 Days)</h2>
            <select className="px-3 py-1.5 rounded-lg text-xs outline-none border border-gray-200 bg-gray-50 text-gray-700">
              <option>Bandwidth</option>
              <option>Requests</option>
            </select>
          </div>
          <div className="h-48 flex items-end justify-between gap-2 px-2">
            {[40, 65, 45, 80, 55, 90, 75].map((height, i) => (
              <div key={i} className="w-full relative group">
                <div 
                  className="bg-blue-100 hover:bg-blue-500 rounded-t-lg transition-all duration-300 w-full"
                  style={{ height: `${height}%` }}
                ></div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-400">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
