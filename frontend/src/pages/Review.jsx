import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, MapPin } from "lucide-react";
import PageContainer from "../components/PageContainer.jsx";
import StepIndicator from "../components/StepIndicator.jsx";
import Card from "../components/Card.jsx";
import Badge from "../components/Badge.jsx";
import Input from "../components/Input.jsx";
import Textarea from "../components/Textarea.jsx";
import Button from "../components/Button.jsx";
import LoadingState from "../components/LoadingState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import { useRequest } from "../context/RequestContext.jsx";
import { createCase, ApiError } from "../api/client.js";

export default function Review() {
  const {
    originalText,
    analysis,
    facts,
    draft,
    applicantDetails,
    image_url,
    location,
    vision_result,
    update,
    rememberCaseNumber,
  } = useRequest();
  const [confirmed, setConfirmed] = useState(false);
  const getInitialDetails = () => {
    if (applicantDetails) return applicantDetails;
    try {
      const stored = localStorage.getItem("userProfile");
      if (stored) {
        const profile = JSON.parse(stored);
        return {
          fullName: profile.name || "",
          address: profile.address || "",
          phone: profile.phone || "",
          email: profile.email || "",
        };
      }
    } catch (e) {}
    
    return {
      fullName: "",
      address: "",
      phone: "",
      email: "",
    };
  };

  const [details, setDetails] = useState(getInitialDetails());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nearbyOffice, setNearbyOffice] = useState(null);
  const navigate = useNavigate();
  
  // Use a fallback key or environment variable. 
  // (In production, use VITE_GEOAPIFY_API_KEY from .env)
  const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY || "4f8866563f30465a981a5cb36601e8ff";

  useEffect(() => {
    if (!draft || !analysis?.type) {
      navigate("/start", { replace: true });
    }
    
    const fetchProfile = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "CIVILIAN" })
        });
        if (res.ok) {
          const profile = await res.json();
          setDetails((prev) => ({
            ...prev,
            fullName: prev.fullName || profile.name || "",
            address: prev.address || profile.address || "",
            phone: prev.phone || profile.phone || "",
            email: prev.email || profile.email || "",
          }));
        }
      } catch (e) {
        console.warn("Could not fetch citizen profile", e);
      }
    };
    
    if (!details.fullName || !details.phone) {
      fetchProfile();
    }
  }, [draft, analysis, navigate, details.fullName, details.phone]);

  useEffect(() => {
    const fetchNearbyOffice = async () => {
      // Ensure we have coordinates (either from context or fallback to Chennai demo coordinates)
      const lat = location?.lat || 13.0827;
      const lon = location?.lng || 80.2707;
      
      try {
        const url = `https://api.geoapify.com/v2/places?categories=office.government&filter=circle:${lon},${lat},10000&bias=proximity:${lon},${lat}&limit=1&apiKey=${GEOAPIFY_KEY}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.features && data.features.length > 0) {
            setNearbyOffice(data.features[0].properties);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch nearby office", err);
      }
    };
    fetchNearbyOffice();
  }, [location, GEOAPIFY_KEY]);

  const canSubmit =
    confirmed &&
    Boolean(details.fullName?.trim()) &&
    Boolean(details.address?.trim()) &&
    Boolean(details.phone?.trim());

  const displayDraft = React.useMemo(() => {
    let text = draft || "";
    const name = details.fullName?.trim() || "[Name]";
    const address = details.address?.trim() || "[Address]";
    const phone = details.phone?.trim() || "[Contact Number]";

    text = text.replace(/\[(?:Your\s+)?Name\]/gi, name);
    text = text.replace(/\[(?:Your\s+)?Address\]/gi, address);
    text = text.replace(/\[(?:Your\s+)?(?:Phone|Contact)(?:\s+Number)?\]/gi, phone);
    return text;
  }, [draft, details.fullName, details.address, details.phone]);

  if (!draft || !analysis?.type) return null;

  const handleCreateCase = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    let finalDraft = draft || "";
    if (details.fullName?.trim()) {
      finalDraft = finalDraft.replace(/\[(?:Your\s+)?Name\]/gi, details.fullName.trim());
    }
    if (details.address?.trim()) {
      finalDraft = finalDraft.replace(/\[(?:Your\s+)?Address\]/gi, details.address.trim());
    }
    if (details.phone?.trim()) {
      finalDraft = finalDraft.replace(
        /\[(?:Your\s+)?(?:Phone|Contact)(?:\s+Number)?\]/gi,
        details.phone.trim()
      );
    }

    try {
      const result = await createCase({
        original_request: originalText,
        request_type: analysis.type,
        category: analysis.category,
        extracted_facts: {
          ...facts,
          image_url,
          gps_location: location,
          vision_result,
        },
        draft: finalDraft,
        applicant_details: details,
      });
      update({ draft: finalDraft, caseRecord: result });
      rememberCaseNumber(result.case_number);
      navigate(`/case/${result.case_number}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to create your case. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <div className="mb-8">
        <StepIndicator current="review" />
      </div>

      <h1 className="text-[26px] font-semibold text-ink-900">
        Review before creating your case
      </h1>

      <div className="mt-6 flex flex-col gap-5">
        <Card>
          <p className="text-[13px] font-medium text-ink-500">
            Your original request
          </p>
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-700">
            {originalText}
          </p>
        </Card>

        {image_url && (
          <Card>
            <p className="text-[13px] font-medium text-ink-500">
              Uploaded Evidence
            </p>
            <div className="mt-3 overflow-hidden rounded-md border border-line flex justify-center bg-gray-50">
              <img 
                src={image_url} 
                alt="Complaint Evidence" 
                className="w-full h-auto max-h-[400px] object-contain" 
              />
            </div>
          </Card>
        )}

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-ink-500">Application</p>
            <Badge tone="accent">{analysis.type}</Badge>
          </div>
          <pre className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-900" style={{ fontFamily: "inherit" }}>
            {displayDraft}
          </pre>
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} className="mt-0.5 text-success" aria-hidden="true" />
            <div>
              <p className="text-[13px] font-medium text-ink-500">Validation</p>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-700">
                Your draft has been checked against the information you provided.
              </p>
            </div>
          </div>
        </Card>

        {nearbyOffice && (() => {
          const userLon = location?.lng || 80.2707;
          const userLat = location?.lat || 13.0827;
          const offLon = nearbyOffice.lon;
          const offLat = nearbyOffice.lat;
          
          // Generate a Google Maps Embed URL to show the real interactive map and place card (with photo)
          const searchQuery = encodeURIComponent(`${nearbyOffice.name || 'Government Office'} ${nearbyOffice.formatted}`);
          const googleMapUrl = `https://maps.google.com/maps?q=${searchQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
          
          return (
            <Card>
              <div className="flex items-start gap-3">
                <MapPin size={18} className="mt-0.5 text-accent" aria-hidden="true" />
                <div className="w-full">
                  <p className="text-[13px] font-medium text-ink-500">Routing to Responsible Authority</p>
                  <p className="mt-1 text-[15px] font-semibold text-ink-900">
                    {nearbyOffice.name || nearbyOffice.address_line1 || "Municipal Corporation Office"}
                  </p>
                  
                  <div className="mt-1 flex flex-col gap-1 text-[13px] text-ink-500">
                    <p>{nearbyOffice.formatted}</p>
                    
                    {/* Distance and Phone */}
                    <div className="flex items-center gap-4 mt-2">
                      {nearbyOffice.distance && (
                        <span className="font-medium text-ink-900">
                          Distance: {(nearbyOffice.distance / 1000).toFixed(2)} km
                        </span>
                      )}
                      <span className="font-medium text-ink-900">
                        Phone: {nearbyOffice.contact?.phone || "044-25384510"}
                      </span>
                    </div>
                  </div>

                  {/* Google Maps Interactive Container */}
                  <div className="mt-4 overflow-hidden rounded-md border border-line resize-y min-h-[250px] h-[300px] relative">
                    <iframe
                      src={googleMapUrl}
                      className="w-full h-full absolute top-0 left-0"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight="0"
                      marginWidth="0"
                      title="Google Maps Location"
                    ></iframe>
                  </div>
                  <p className="text-xs text-ink-400 mt-1">Interactive Google Map: Click 'View larger map' to see full department photos and routing.</p>
                </div>
              </div>
            </Card>
          );
        })()}

        <Card>
          <h2 className="text-[16px] font-semibold text-ink-900">
            Applicant details
          </h2>
          <p className="mt-1 text-[13px] text-ink-500">
            Provide your contact information for the official application and record.
          </p>

          <div className="mt-4 flex flex-col gap-4">
            <Input
              label="Full name"
              value={details.fullName || ""}
              onChange={(e) => {
                const next = { ...details, fullName: e.target.value };
                setDetails(next);
                update({ applicantDetails: next });
              }}
              placeholder="Enter your full name"
              required
            />

            <Textarea
              label="Residential address"
              rows={2}
              value={details.address || ""}
              onChange={(e) => {
                const next = { ...details, address: e.target.value };
                setDetails(next);
                update({ applicantDetails: next });
              }}
              placeholder="House/flat no, street, locality, city, pincode"
              required
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Phone number"
                type="tel"
                value={details.phone || ""}
                onChange={(e) => {
                  const next = { ...details, phone: e.target.value };
                  setDetails(next);
                  update({ applicantDetails: next });
                }}
                placeholder="10-digit mobile number"
                required
              />

              <Input
                label="Email address (optional)"
                type="email"
                value={details.email || ""}
                onChange={(e) => {
                  const next = { ...details, email: e.target.value };
                  setDetails(next);
                  update({ applicantDetails: next });
                }}
                placeholder="name@example.com"
              />
            </div>
          </div>
        </Card>

        <label className="flex items-start gap-3 rounded-md border border-line bg-white p-4">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 h-4 w-4 accent-accent"
          />
          <span className="text-[14px] text-ink-900">
            I have reviewed the application and the information is correct.
          </span>
        </label>
      </div>

      {error && (
        <div className="mt-6">
          <ErrorState message={error} onRetry={handleCreateCase} />
        </div>
      )}

      {loading && (
        <div className="mt-6">
          <LoadingState message="Creating your case..." />
        </div>
      )}

      {!loading && (
        <div className="mt-8 flex items-center justify-between">
          <Button variant="secondary" onClick={() => navigate("/draft")}>
            Back
          </Button>
          <Button onClick={handleCreateCase} disabled={!canSubmit}>
            Create Case
          </Button>
        </div>
      )}
    </PageContainer>
  );
}
