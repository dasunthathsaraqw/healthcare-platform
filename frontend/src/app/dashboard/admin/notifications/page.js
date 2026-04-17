"use client";
import { useState, useEffect } from "react";
import api from "@/services/api";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

function NotificationSkeleton({ rows = 5 }) {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-48 flex-1"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [patients, setPatients] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    recipientType: "all", // "all" or "specific"
    recipientId: "",
    subject: "",
    message: "",
    sendEmail: true,
    sendSMS: false,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.role !== "admin") {
          router.replace("/dashboard");
        } else {
          fetchNotifications();
          fetchPatients();
        }
      } else {
        router.push("/login");
      }
    } catch (_) {
      router.push("/login");
    }
  }, [router]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get("/patients/admin/notifications");
      setNotifications(res.data.notifications || []);
    } catch (err) {
      toast.error("Could not load notifications.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await api.get("/patients/admin/users?role=patient");
      setPatients(res.data.users || []);
    } catch (err) {
      console.error("Could not load patients:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.message.trim()) {
      toast.error("Subject and message are required");
      return;
    }

    setSending(true);
    try {
      const payload = {
        recipientId: formData.recipientType === "specific" ? formData.recipientId : null,
        subject: formData.subject,
        message: formData.message,
        sendEmail: formData.sendEmail,
        sendSMS: formData.sendSMS,
      };

      await api.post("/patients/admin/notifications/send", payload);
      toast.success("Notification sent successfully!");
      
      // Reset form
      setFormData({
        recipientType: "all",
        recipientId: "",
        subject: "",
        message: "",
        sendEmail: true,
        sendSMS: false,
      });
      
      // Refresh notifications
      fetchNotifications();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
          success: { iconTheme: { primary: "#22c55e", secondary: "#f8fafc" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "#f8fafc" } },
        }}
      />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Send Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">Send announcements or direct messages to patients.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Send Notification Form */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Compose Notification</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Recipient Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recipients</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="recipientType"
                      value="all"
                      checked={formData.recipientType === "all"}
                      onChange={(e) => handleInputChange("recipientType", e.target.value)}
                      className="mr-2 text-gray-900"
                    />
                    <span className="text-sm text-gray-900">All Patients</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="recipientType"
                      value="specific"
                      checked={formData.recipientType === "specific"}
                      onChange={(e) => handleInputChange("recipientType", e.target.value)}
                      className="mr-2 text-gray-900"
                    />
                    <span className="text-sm text-gray-900">Specific Patient</span>
                  </label>
                </div>
                
                {formData.recipientType === "specific" && (
                  <select
                    value={formData.recipientId}
                    onChange={(e) => handleInputChange("recipientId", e.target.value)}
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a patient...</option>
                    {patients.map((patient) => (
                      <option key={patient._id} value={patient._id}>
                        {patient.name} ({patient.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => handleInputChange("subject", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Notification subject"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => handleInputChange("message", e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your message to the patients..."
                  required
                />
              </div>

              {/* Send Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Send via</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.sendEmail}
                      onChange={(e) => handleInputChange("sendEmail", e.target.checked)}
                      className="mr-2 text-gray-900"
                    />
                    <span className="text-sm text-gray-900">Email</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.sendSMS}
                      onChange={(e) => handleInputChange("sendSMS", e.target.checked)}
                      className="mr-2 text-gray-900"
                    />
                    <span className="text-sm text-gray-900">SMS</span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={sending}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send Notification
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Notification History */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Notifications</h2>
            
            {loading ? (
              <NotificationSkeleton />
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-4xl mb-3">📭</p>
                <p>No notifications sent yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {notifications.map((notification) => (
                  <div key={notification._id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">{notification.subject}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        notification.status === 'SENT' ? 'bg-green-100 text-green-700' :
                        notification.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {notification.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{notification.message}</p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>
                        {notification.recipientId ? 'Specific Patient' : 'All Patients'}
                      </span>
                      <span>{new Date(notification.sentAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
