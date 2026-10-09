import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X, Search, AlertCircle } from "lucide-react";
import Button from "./Button.jsx";
import Input from "./Input.jsx";
import { getCase } from "../api/client.js";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/cases", label: "My Cases" },
  { to: "/how-it-works", label: "How It Works" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [caseNumber, setCaseNumber] = useState("");
  const [tracking, setTracking] = useState(false);
  const [trackError, setTrackError] = useState(null);
  const [role, setRole] = useState(() => localStorage.getItem("userRole"));
  
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleStorageChange = () => setRole(localStorage.getItem("userRole"));
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("userRole");
    setRole(null);
    navigate("/login");
  };

  const linkClass = ({ isActive }) =>
    `text-[14px] font-medium transition-colors duration-150 ${
      isActive ? "text-ink-900" : "text-ink-500 hover:text-ink-900"
    }`;

  const openTrackModal = () => {
    setOpen(false);
    setTrackModalOpen(true);
    setCaseNumber("");
    setTrackError(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const closeTrackModal = () => {
    setTrackModalOpen(false);
    setCaseNumber("");
    setTrackError(null);
    setTracking(false);
  };

  useEffect(() => {
    if (!trackModalOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") closeTrackModal();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [trackModalOpen]);

  const handleTrackSubmit = async (e) => {
    e.preventDefault();
    const query = caseNumber.trim();
    if (!query) {
      setTrackError("Please enter a case number.");
      return;
    }
    setTracking(true);
    setTrackError(null);
    try {
      const data = await getCase(query);
      if (data && data.case_number) {
        closeTrackModal();
        navigate(role === "OFFICER" ? `/officer/cases/${data.case_number}` : `/case/${data.case_number}`);
      } else {
        setTrackError("Case not found. Please check the case number.");
      }
    } catch {
      setTrackError("Case not found. Please check the case number.");
    } finally {
      setTracking(false);
    }
  };

  const navLinks = role === "OFFICER" 
    ? [ { to: "/officer", label: "Dashboard" }, { to: "/officer/settings", label: "Settings" } ]
    : [
        { to: "/", label: "Home" },
        { to: "/cases", label: "My Cases" },
        { to: "/how-it-works", label: "How It Works" },
      ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-content items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex flex-col leading-tight" onClick={() => setOpen(false)}>
          <span className="text-[17px] font-semibold text-ink-900" style={{ fontFamily: '"Source Serif 4", Georgia, serif' }}>
            The Grievance Scribe
          </span>
          <span className="text-[11px] text-ink-500">
            Civic assistance for grievances and RTI applications
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass} end={link.to === "/"}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={openTrackModal}
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-[14px] font-medium text-ink-900 hover:border-ink-500 transition"
          >
            <Search size={14} aria-hidden="true" />
            Track Case
          </button>
          
          {role ? (
            <button
              onClick={handleLogout}
              className="text-[13px] font-medium text-ink-500 hover:text-ink-900 underline underline-offset-2"
            >
              Logout
            </button>
          ) : (
            <Link to="/login">
              <Button className="px-4 py-2 text-[13px]">
                Login
              </Button>
            </Link>
          )}
        </div>

        <button
          className="flex items-center justify-center rounded-md p-2 text-ink-900 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <nav
          aria-label="Primary mobile"
          className="border-t border-line bg-paper px-4 py-3 md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.to === "/"}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2.5 text-[15px] font-medium ${
                      isActive ? "bg-white text-ink-900" : "text-ink-500"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
            <li>
              <button
                onClick={openTrackModal}
                className="mt-1 block w-full rounded-md border border-line bg-white px-3 py-2.5 text-left text-[15px] font-medium text-ink-900"
              >
                Track Case
              </button>
            </li>
            
            <li className="mt-2 border-t border-line pt-2">
              {role ? (
                <button
                  onClick={() => {
                    handleLogout();
                    setOpen(false);
                  }}
                  className="block w-full rounded-md px-3 py-2.5 text-left text-[15px] font-medium text-danger"
                >
                  Logout
                </button>
              ) : (
                <Link to="/login" onClick={() => setOpen(false)}>
                  <Button className="mt-2 w-full text-center">Login</Button>
                </Link>
              )}
            </li>
          </ul>
        </nav>
      )}

      {/* Track Case Search Modal */}
      {trackModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-4 backdrop-blur-xs"
          role="presentation"
          onClick={closeTrackModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="track-case-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Search size={17} className="text-accent" />
                <h2 id="track-case-modal-title" className="text-[17px] font-semibold text-ink-900">
                  Track a Case
                </h2>
              </div>
              <button
                type="button"
                onClick={closeTrackModal}
                className="rounded p-1 text-ink-400 hover:text-ink-900"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTrackSubmit} className="mt-4 flex flex-col gap-4">
              <p className="text-[13px] text-ink-500">
                Enter your case number to view the application draft and status.
              </p>

              <Input
                ref={inputRef}
                label="Case Number"
                placeholder="e.g. GS-12345678"
                value={caseNumber}
                onChange={(e) => {
                  setCaseNumber(e.target.value);
                  if (trackError) setTrackError(null);
                }}
                disabled={tracking}
              />

              {trackError && (
                <div className="flex items-center gap-2 rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-[13px] text-danger">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{trackError}</span>
                </div>
              )}

              <div className="mt-2 flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    closeTrackModal();
                    navigate("/cases");
                  }}
                  className="text-[12px] font-medium text-ink-500 hover:text-ink-900 underline underline-offset-2"
                >
                  View cases on this device
                </button>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={closeTrackModal} disabled={tracking}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={tracking || !caseNumber.trim()}>
                    {tracking ? "Searching..." : "Track Case"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
