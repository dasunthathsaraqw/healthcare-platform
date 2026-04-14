"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/dashboard");
    }
  }, [user, router]);

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/patients/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data.users);
    } catch (err) {
      console.error("Failed to load users");
    }
  };

  const fetchSystemLogs = async () => {
    try {
      // Direct call to the Notification Service!
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/notifications/logs`);
      setLogs(res.data.logs);
    } catch (err) {
      console.error("Failed to load logs");
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      fetchAllUsers();
      fetchSystemLogs();
      setLoading(false);
    }
  }, [user]);

  const verifyDoctor = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/patients/admin/doctors/${id}/verify`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAllUsers();
    } catch (err) {
      alert("Failed to verify doctor.");
    }
  };

  const toggleUserStatus = async (id) => {
    if(!confirm("Toggle user access?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/patients/admin/users/${id}/status`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAllUsers();
    } catch (err) {
      alert("Failed to toggle status.");
    }
  };

  if (!user || user.role !== "admin") return null;

  return (
    <div className="max-w-6xl mx-auto p-4 mt-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Platform Administration</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100 bg-gray-50">
          <button 
            onClick={() => setActiveTab("users")}
            className={`flex-1 py-4 text-sm font-bold tracking-wide transition-colors ${activeTab === "users" ? "bg-white text-blue-600 border-t-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          >
            User Management Engine
          </button>
          <button 
            onClick={() => setActiveTab("logs")}
            className={`flex-1 py-4 text-sm font-bold tracking-wide transition-colors ${activeTab === "logs" ? "bg-white text-blue-600 border-t-2 border-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          >
            Live Notification Logs
          </button>
        </div>

        <div className="p-0">
          {/* USERS TAB */}
          {activeTab === "users" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-4 text-xs font-semibold text-gray-600 uppercase">User</th>
                    <th className="p-4 text-xs font-semibold text-gray-600 uppercase">Role</th>
                    <th className="p-4 text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="p-4 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <p className="font-semibold text-gray-800">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'doctor' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4">
                        {u.role === 'doctor' && !u.isVerified && <span className="block mb-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded font-medium border border-yellow-200">⚠️ Needs Verification</span>}
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${u.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {u.isActive ? 'Active' : 'Banned'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {u.role === 'doctor' && !u.isVerified && <button onClick={() => verifyDoctor(u._id)} className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700">Verify</button>}
                          {u._id !== user._id && <button onClick={() => toggleUserStatus(u._id)} className={`px-3 py-1 text-xs font-medium rounded border ${u.isActive ? 'bg-white text-red-600 border-red-200 hover:bg-red-50' : 'bg-white text-green-600 border-green-200 hover:bg-green-50'}`}>{u.isActive ? 'Ban' : 'Unban'}</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* LOGS TAB */}
          {activeTab === "logs" && (
            <div className="overflow-x-auto bg-gray-900 p-4">
              <table className="w-full text-left font-mono text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="pb-2">Timestamp</th>
                    <th className="pb-2">Event</th>
                    <th className="pb-2">Recipient</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  {logs.length === 0 ? (
                    <tr><td colSpan="4" className="py-4 text-center text-gray-500">No logs found. Waiting for RabbitMQ events...</td></tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log._id} className="border-b border-gray-800 hover:bg-gray-800">
                        <td className="py-2">{new Date(log.createdAt).toLocaleTimeString()}</td>
                        <td className="py-2 text-blue-400">{log.eventTrigger}</td>
                        <td className="py-2">{log.recipientEmail}</td>
                        <td className="py-2">
                          <span className={log.status === 'SENT' ? 'text-green-400' : 'text-red-400'}>
                            [{log.status}]
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}