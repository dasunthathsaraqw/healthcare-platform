"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <ProtectedRoute allowedRoles={["patient"]}>
      <div className="min-h-screen bg-gray-100">
        {/* Navigation */}
        <nav className="bg-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">
                  Healthcare Platform
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <Link
                  href="/doctors"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Find Doctors
                </Link>
                <Link
                  href="/appointments"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  My Appointments
                </Link>
                <Link
                  href="/profile"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    window.location.href = "/login";
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Dashboard Content */}
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Welcome Section */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome, {user?.name}!
            </h2>
            <p className="text-gray-600 mt-2">
              Manage your appointments, view medical records, and consult with
              doctors.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <Link
              href="/doctors"
              className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition"
            >
              <div className="text-3xl mb-2">👨‍⚕️</div>
              <h3 className="text-lg font-semibold">Book Appointment</h3>
              <p className="text-gray-600 text-sm mt-2">
                Find and book appointments with doctors
              </p>
            </Link>

            <Link
              href="/appointments"
              className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition"
            >
              <div className="text-3xl mb-2">📅</div>
              <h3 className="text-lg font-semibold">My Appointments</h3>
              <p className="text-gray-600 text-sm mt-2">
                View upcoming and past appointments
              </p>
            </Link>

            <Link
              href="/reports"
              className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition"
            >
              <div className="text-3xl mb-2">📋</div>
              <h3 className="text-lg font-semibold">Medical Reports</h3>
              <p className="text-gray-600 text-sm mt-2">
                Upload and view medical reports
              </p>
            </Link>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
