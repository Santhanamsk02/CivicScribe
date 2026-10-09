import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import PageContainer from "../components/PageContainer.jsx";
import StepIndicator from "../components/StepIndicator.jsx";
import Card from "../components/Card.jsx";
import Badge from "../components/Badge.jsx";
import FactField from "../components/FactField.jsx";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";
import LoadingState from "../components/LoadingState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import { useRequest } from "../context/RequestContext.jsx";
import { findMissingInfo, generateDraft, ApiError } from "../api/client.js";

export default function Details() {
  const { facts, analysis, missingInfo, update } = useRequest();
  const [localFacts, setLocalFacts] = useState(() => {
    const f = { ...facts };
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!f.previous_complaint_date || !dateRegex.test(f.previous_complaint_date)) {
      f.previous_complaint_date = new Date().toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD
    }
    return f;
  });
  const [missingQuestions, setMissingQuestions] = useState(
    missingInfo?.questions || []
  );
  const [clarificationAnswers, setClarificationAnswers] = useState({});
  const [loadingMissing, setLoadingMissing] = useState(!missingInfo);
  const [missingError, setMissingError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [draftError, setDraftError] = useState(null);
  const navigate = useNavigate();

  const isGrievance = analysis?.type?.toUpperCase() === "GRIEVANCE";
  const isRti = analysis?.type?.toUpperCase() === "RTI";

  const factFields = [
    { key: "issue", label: "Issue", type: "textarea" },
    { key: "location", label: "Location", type: "text" },
    { key: "duration", label: "Duration", type: "text" },
    { key: "previous_complaint", label: "Previous complaint", type: "boolean" },
    { key: "previous_complaint_authority", label: "Authority", type: "text" },
    { key: "previous_complaint_date", label: "Date", type: "date" },
    { key: "problem_details", label: "Problem details", type: "list" },
    ...(isGrievance
      ? [{ key: "requested_action", label: "Requested action", type: "textarea" }]
      : isRti
      ? [{ key: "requested_information", label: "Requested information", type: "textarea" }]
      : [
          { key: "requested_action", label: "Requested action", type: "textarea" },
          { key: "requested_information", label: "Requested information", type: "textarea" },
        ]),
  ];

  const setFact = (key) => (value) => {
    setLocalFacts((prev) => {
      const next = { ...prev, [key]: value };
      update({ facts: next });
      return next;
    });
  };

  const fetchMissingDetails = async () => {
    if (!analysis?.type) return;
    setLoadingMissing(true);
    setMissingError(null);
    try {
      const result = await findMissingInfo(
        analysis.type,
        analysis.category,
        localFacts
      );
      setMissingQuestions(result?.questions || []);
      update({ missingInfo: result });
    } catch (err) {
      setMissingError(
        err instanceof ApiError
          ? err.message
          : "Unable to check for additional details."
      );
    } finally {
      setLoadingMissing(false);
    }
  };

  useEffect(() => {
    fetchMissingDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinueToDraft = async () => {
    setGenerating(true);
    setDraftError(null);

    const mergedFacts = { ...localFacts };
    const answeredItems = [];

    missingQuestions.forEach((q, i) => {
      const questionText = typeof q === "string" ? q : q.question || "";
      const answerText = clarificationAnswers[i]?.trim();
      if (answerText) {
        answeredItems.push(`${questionText}: ${answerText}`);
      }
    });

    if (answeredItems.length > 0) {
      mergedFacts.clarifications = answeredItems;
      answeredItems.forEach((item, idx) => {
        mergedFacts[`additional_detail_${idx + 1}`] = item;
      });
    }

    try {
      const { draft, sources } = await generateDraft(
        analysis.type,
        analysis.category,
        mergedFacts
      );
      update({ facts: mergedFacts, draft, sources: sources || [] });
      navigate("/draft");
    } catch (err) {
      setDraftError(
        err instanceof ApiError
          ? err.message
          : "Unable to connect to the drafting service."
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <PageContainer>
      <div className="mb-8">
        <StepIndicator current="details" />
      </div>

      <h1 className="text-[26px] font-semibold text-ink-900">
        Let's make sure we have the important details.
      </h1>
      <p className="mt-2 text-[15px] text-ink-500">
        We've organized the information from your description. Check it before
        continuing.
      </p>

      {/* Request Type and Category */}
      <div className="mt-6 flex flex-wrap items-center gap-6 rounded-lg border border-line bg-white p-4">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-wide text-ink-500">
            Request Type
          </p>
          <div className="mt-1">
            <Badge tone="accent">{analysis?.type || "GRIEVANCE"}</Badge>
          </div>
        </div>
        <div className="h-8 w-px bg-line" />
        <div>
          <p className="text-[12px] font-medium uppercase tracking-wide text-ink-500">
            Category
          </p>
          <p className="mt-1 text-[14px] font-semibold text-ink-900">
            {analysis?.category || "General"}
          </p>
        </div>
      </div>

      {/* Your Details */}
      <div className="mt-8">
        <h2 className="text-[18px] font-semibold text-ink-900">Your details</h2>
        <Card className="mt-4 grid gap-5 sm:grid-cols-2">
          {factFields.map((field) => (
            <div
              key={field.key}
              className={
                field.type === "textarea" || field.type === "list"
                  ? "sm:col-span-2"
                  : ""
              }
            >
              <FactField
                label={field.label}
                type={field.type}
                value={localFacts[field.key]}
                onChange={setFact(field.key)}
              />
            </div>
          ))}
        </Card>
      </div>

      {/* Additional Details (Dynamic API Missing Information) */}
      <div className="mt-8 border-t border-line pt-6">
        <h2 className="text-[18px] font-semibold text-ink-900">
          Additional details
        </h2>

        {loadingMissing && (
          <div className="mt-4">
            <LoadingState message="Checking whether any important details are missing..." />
          </div>
        )}

        {missingError && !loadingMissing && (
          <div className="mt-4">
            <ErrorState
              message={missingError}
              onRetry={fetchMissingDetails}
            />
          </div>
        )}

        {!loadingMissing && !missingError && missingQuestions.length > 0 && (
          <Card className="mt-4">
            <p className="text-[15px] font-medium text-ink-900">
              A few details would make your application clearer.
            </p>
            <div className="mt-5 flex flex-col gap-5">
              {missingQuestions.map((q, i) => (
                <Input
                  key={i}
                  label={typeof q === "string" ? q : q.question}
                  value={clarificationAnswers[i] || ""}
                  onChange={(e) =>
                    setClarificationAnswers((prev) => ({
                      ...prev,
                      [i]: e.target.value,
                    }))
                  }
                  placeholder="Provide detail (optional)..."
                />
              ))}
            </div>
          </Card>
        )}

        {!loadingMissing && !missingError && missingQuestions.length === 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-success/20 bg-success-light px-4 py-3 text-[14px] text-success">
            <CheckCircle2 size={16} aria-hidden="true" />
            Your information is sufficient to prepare the draft.
          </div>
        )}
      </div>

      {draftError && (
        <div className="mt-6">
          <ErrorState message={draftError} onRetry={handleContinueToDraft} />
        </div>
      )}

      {generating && (
        <div className="mt-6">
          <LoadingState message="Preparing your application..." />
        </div>
      )}

      {!generating && (
        <div className="mt-8 flex items-center justify-between">
          <Button variant="secondary" onClick={() => navigate("/analyze")}>
            Back
          </Button>
          <Button
            onClick={handleContinueToDraft}
            disabled={loadingMissing}
          >
            Continue to Draft
          </Button>
        </div>
      )}
    </PageContainer>
  );
}
