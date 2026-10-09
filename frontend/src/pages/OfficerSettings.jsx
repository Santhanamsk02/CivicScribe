import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, User, Mail, Phone, Briefcase, Save } from "lucide-react";
import PageContainer from "../components/PageContainer.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import LoadingState from "../components/LoadingState.jsx";

const API_BASE_URL = "http://127.0.0.1:8000/api";

export default function OfficerSettings() {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    designation: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/profile`)
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load profile", err);
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE_URL}/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(profile)
      });
      if (res.ok) {
        setMessage("Profile updated successfully!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Error updating profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <div className="mb-6">
        <Link
          to="/officer"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-ink-900 transition"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>

      <h1 className="text-[24px] font-semibold tracking-tight text-ink-900">
        Officer Profile Settings
      </h1>
      <p className="mt-1 text-[14px] text-ink-500 mb-8">
        Update your contact details to receive urgent civic issue alerts via call and SMS.
      </p>

      {loading ? (
        <LoadingState message="Loading profile..." />
      ) : (
        <Card className="max-w-xl">
          <form onSubmit={handleSave} className="flex flex-col gap-5">
            <div>
              <label className="block text-[13px] font-medium text-ink-700 mb-1">
                <span className="flex items-center gap-2"><User size={14} /> Full Name</span>
              </label>
              <input 
                type="text" 
                name="name" 
                value={profile.name} 
                onChange={handleChange} 
                className="w-full rounded-md border border-line bg-white p-2.5 text-[14px] outline-none focus:border-accent" 
                required 
              />
            </div>
            
            <div>
              <label className="block text-[13px] font-medium text-ink-700 mb-1">
                <span className="flex items-center gap-2"><Briefcase size={14} /> Designation</span>
              </label>
              <input 
                type="text" 
                name="designation" 
                value={profile.designation} 
                onChange={handleChange} 
                className="w-full rounded-md border border-line bg-white p-2.5 text-[14px] outline-none focus:border-accent" 
                required 
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-ink-700 mb-1">
                <span className="flex items-center gap-2"><Mail size={14} /> Email Address</span>
              </label>
              <input 
                type="email" 
                name="email" 
                value={profile.email} 
                onChange={handleChange} 
                className="w-full rounded-md border border-line bg-white p-2.5 text-[14px] outline-none focus:border-accent" 
                required 
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-ink-700 mb-1">
                <span className="flex items-center gap-2"><Phone size={14} /> Phone Number</span>
              </label>
              <input 
                type="tel" 
                name="phone" 
                value={profile.phone} 
                onChange={handleChange} 
                className="w-full rounded-md border border-line bg-white p-2.5 text-[14px] outline-none focus:border-accent" 
                required 
              />
              <p className="mt-1.5 text-[11px] text-ink-400">
                You will receive automated calls and SMS on this number for complaints with severity {">"} 50. Include country code (e.g. +91).
              </p>
            </div>

            <div className="mt-2 border-t border-line pt-4 flex items-center justify-between">
              <span className={`text-[13px] font-medium ${message.includes("success") ? "text-success" : "text-error"}`}>
                {message}
              </span>
              <Button type="submit" disabled={saving} className="flex items-center gap-2">
                <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </PageContainer>
  );
}
