import React from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import { useRequest } from "./context/RequestContext.jsx";

import Home from "./pages/Home.jsx";
import Start from "./pages/Start.jsx";
import Analyze from "./pages/Analyze.jsx";
import Details from "./pages/Details.jsx";
import Draft from "./pages/Draft.jsx";
import Review from "./pages/Review.jsx";
import CaseCreated from "./pages/CaseCreated.jsx";
import Cases from "./pages/Cases.jsx";
import HowItWorks from "./pages/HowItWorks.jsx";
import OfficerDashboard from "./pages/OfficerDashboard.jsx";
import OfficerCaseDetail from "./pages/OfficerCaseDetail.jsx";
import OfficerSettings from "./pages/OfficerSettings.jsx";
import Login from "./pages/Login.jsx";

function RequireRole({ role, children }) {
  const currentRole = localStorage.getItem("userRole");
  if (currentRole !== role) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireStart({ children }) {
  const { originalText } = useRequest();
  if (!originalText) return <Navigate to="/start" replace />;
  return children;
}

function RequireAnalysis({ children }) {
  const { originalText, analysis } = useRequest();
  if (!originalText) return <Navigate to="/start" replace />;
  if (!analysis?.type) return <Navigate to="/analyze" replace />;
  return children;
}

function RequireFacts({ children }) {
  const { originalText, analysis, facts } = useRequest();
  if (!originalText) return <Navigate to="/start" replace />;
  if (!analysis?.type) return <Navigate to="/analyze" replace />;
  if (!facts) return <Navigate to="/details" replace />;
  return children;
}

function RequireDraft({ children }) {
  const { originalText, analysis, facts, draft } = useRequest();
  if (!originalText) return <Navigate to="/start" replace />;
  if (!analysis?.type) return <Navigate to="/analyze" replace />;
  if (!facts) return <Navigate to="/details" replace />;
  if (!draft) return <Navigate to="/draft" replace />;
  return children;
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink-900">
      <Navbar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          
          {/* Civilian Protected Routes */}
          <Route path="/start" element={<RequireRole role="CIVILIAN"><Start /></RequireRole>} />
          <Route path="/analyze" element={<RequireRole role="CIVILIAN"><RequireStart><Analyze /></RequireStart></RequireRole>} />
          <Route path="/details" element={<RequireRole role="CIVILIAN"><RequireAnalysis><Details /></RequireAnalysis></RequireRole>} />
          <Route path="/draft" element={<RequireRole role="CIVILIAN"><RequireFacts><Draft /></RequireFacts></RequireRole>} />
          <Route path="/review" element={<RequireRole role="CIVILIAN"><RequireDraft><Review /></RequireDraft></RequireRole>} />
          <Route path="/cases" element={<RequireRole role="CIVILIAN"><Cases /></RequireRole>} />
          <Route path="/case/:caseNumber" element={<RequireRole role="CIVILIAN"><CaseCreated /></RequireRole>} />
          
          {/* Officer Protected Routes */}
          <Route path="/officer" element={<RequireRole role="OFFICER"><OfficerDashboard /></RequireRole>} />
          <Route path="/officer/settings" element={<RequireRole role="OFFICER"><OfficerSettings /></RequireRole>} />
          <Route path="/officer/cases/:caseNumber" element={<RequireRole role="OFFICER"><OfficerCaseDetail /></RequireRole>} />
          
          {/* Public / Unprotected */}
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <footer className="border-t border-line py-4 text-center text-[12px] text-ink-400 flex items-center justify-center gap-2">
        <span>The Grievance Scribe</span>
        <span className="text-ink-300">&middot;</span>
        <Link to="/officer" className="hover:text-ink-700 hover:underline">
          Officer Access
        </Link>
      </footer>
    </div>
  );
}
