import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
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
  const [details, setDetails] = useState(
    applicantDetails || {
      fullName: "",
      address: "",
      phone: "",
      email: "",
    }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!draft || !analysis?.type) {
      navigate("/start", { replace: true });
    }
  }, [draft, analysis, navigate]);

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
