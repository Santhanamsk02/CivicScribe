import React from "react";
import { useNavigate } from "react-router-dom";
import { User, ShieldCheck } from "lucide-react";
import PageContainer from "../components/PageContainer.jsx";
import Card from "../components/Card.jsx";

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = (role) => {
    localStorage.setItem("userRole", role);
    window.dispatchEvent(new Event("storage")); // Trigger event for Navbar to update
    if (role === "OFFICER") {
      navigate("/officer", { replace: true });
    } else {
      navigate("/start", { replace: true });
    }
  };

  return (
    <PageContainer>
      <div className="flex min-h-[60vh] flex-col items-center justify-center py-12 text-center">
        <h1 className="text-[28px] font-semibold text-ink-900">Demo Login</h1>
        <p className="mt-2 text-[15px] text-ink-500 max-w-md">
          Select your role to continue. This is a demo environment, so no password is required.
        </p>

        <div className="mt-10 grid gap-6 w-full max-w-2xl sm:grid-cols-2">
          {/* Civilian Login */}
          <Card 
            className="cursor-pointer border-transparent transition-all hover:border-accent hover:shadow-md active:scale-[0.98] flex flex-col items-center text-center p-8 group"
            onClick={() => handleLogin("CIVILIAN")}
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-light text-accent transition-transform group-hover:scale-110">
              <User size={28} />
            </div>
            <h2 className="text-[18px] font-semibold text-ink-900">Citizen</h2>
            <p className="mt-2 text-[14px] text-ink-500">
              Report issues, file grievances, or request information under RTI.
            </p>
          </Card>

          {/* Officer Login */}
          <Card 
            className="cursor-pointer border-transparent transition-all hover:border-accent hover:shadow-md active:scale-[0.98] flex flex-col items-center text-center p-8 group"
            onClick={() => handleLogin("OFFICER")}
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ink-100 text-ink-700 transition-transform group-hover:scale-110 group-hover:bg-accent-light group-hover:text-accent">
              <ShieldCheck size={28} />
            </div>
            <h2 className="text-[18px] font-semibold text-ink-900">Officer</h2>
            <p className="mt-2 text-[14px] text-ink-500">
              View and manage incoming complaints and applications in the dashboard.
            </p>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
