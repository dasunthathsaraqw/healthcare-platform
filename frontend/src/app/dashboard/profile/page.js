"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  
  // UI State
  const [activeTab, setActiveTab] = useState("personal");
  const [message, setMessage] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Personal Data State
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    dateOfBirth: "",
    address: "",
  });

  // Medical Data State
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [newCondition, setNewCondition] = useState("");

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        address: user.address || "",
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : "",
      });
      setMedicalHistory(user.medicalHistory || []);
    }
  }, [user]);

  // --- HANDLERS FOR PERSONAL INFO ---
  const handlePersonalUpdate = async (e) => {
    e.preventDefault();
    setMessage("Saving personal details...");
    setIsUpdating(true);
    
    const result = await updateProfile(formData);
    if (result.success) {
      setMessage("Personal details updated successfully! ✅");
    } else {
      setMessage(`Failed to update. ❌ ${result.error}`);
    }
    setIsUpdating(false);
  };

  // --- HANDLERS FOR MEDICAL HISTORY ---
  const handleAddCondition = (e) => {
    e.preventDefault();
    if (newCondition.trim() && !medicalHistory.includes(newCondition.trim())) {
      setMedicalHistory([...medicalHistory, newCondition.trim()]);
      setNewCondition("");
    }
  };

  const handleRemoveCondition = (conditionToRemove) => {
    setMedicalHistory(medicalHistory.filter(c => c !== conditionToRemove));
  };

  const handleSaveMedical = async () => {
    setMessage("Saving medical history...");
    setIsUpdating(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      // We call the specific medical history endpoint we built earlier!
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/patients/history`,
        { conditions: medicalHistory },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("Medical history safely recorded! 🏥");
    } catch (error) {
      setMessage("Failed to save medical history. ❌");
    }
    setIsUpdating(false);
  };

  if (!user) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading secure patient portal...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 mt-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Identity Card */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
            <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl text-blue-600 font-bold">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">{user.name}</h2>
            <p className="text-sm text-gray-500 mb-4">{user.email}</p>
            <div className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full uppercase tracking-wide">
              {user.role} Account
            </div>
            
            <div className="mt-8 border-t pt-6 text-left">
              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">Account Status</p>
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                Active & Verified
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Tabs */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-100">
              <button 
                onClick={() => setActiveTab("personal")}
                className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === "personal" ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
              >
                Personal Details
              </button>
              <button 
                onClick={() => setActiveTab("medical")}
                className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === "medical" ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
              >
                Clinical History
              </button>
            </div>

            {/* Status Message */}
            {message && (
              <div className={`m-4 p-3 rounded text-sm ${message.includes('❌') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                {message}
              </div>
            )}

            <div className="p-6">
              {/* TAB 1: PERSONAL DETAILS */}
              {activeTab === "personal" && (
                <form onSubmit={handlePersonalUpdate} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Full Name</label>
                      <input type="text" name="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Date of Birth</label>
                      <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Phone Number</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Address</label>
                      <input type="text" name="address" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none" placeholder="City, Country" />
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button type="submit" disabled={isUpdating} className="bg-gray-900 text-white font-medium py-2.5 px-6 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50">
                      {isUpdating ? "Saving..." : "Update Profile"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: MEDICAL HISTORY */}
              {activeTab === "medical" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">Known Conditions & Allergies</h3>
                    <p className="text-sm text-gray-500 mb-4">Add your chronic conditions, allergies, or past major surgeries to help doctors assist you better.</p>
                    
                    {/* The Badges Display */}
                    <div className="flex flex-wrap gap-2 mb-4 p-4 min-h-[80px] bg-gray-50 border border-gray-200 rounded-lg">
                      {medicalHistory.length === 0 ? (
                        <span className="text-gray-400 text-sm italic">No medical history recorded.</span>
                      ) : (
                        medicalHistory.map((condition, index) => (
                          <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                            {condition}
                            <button type="button" onClick={() => handleRemoveCondition(condition)} className="ml-2 text-red-600 hover:text-red-900 focus:outline-none">
                              &times;
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    {/* Add New Condition Input */}
                    <form onSubmit={handleAddCondition} className="flex gap-2">
                      <input 
                        type="text" 
                        value={newCondition} 
                        onChange={(e) => setNewCondition(e.target.value)} 
                        placeholder="e.g., Asthma, Penicillin Allergy..." 
                        className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                      />
                      <button type="submit" className="bg-white border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors">
                        Add Tag
                      </button>
                    </form>
                  </div>

                  <div className="pt-6 border-t border-gray-100 flex justify-end">
                    <button onClick={handleSaveMedical} disabled={isUpdating} className="bg-red-600 text-white font-medium py-2.5 px-6 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                      {isUpdating ? "Saving..." : "Save Medical Data"}
                    </button>
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}