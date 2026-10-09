import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronDown, ChevronUp, FileSearch, CheckCircle2 } from "lucide-react";
import PageContainer from "../components/PageContainer.jsx";
import Card from "../components/Card.jsx";
import Badge from "../components/Badge.jsx";
import Button from "../components/Button.jsx";
import StepIndicator from "../components/StepIndicator.jsx";
import CaseTimeline from "../components/CaseTimeline.jsx";
import LoadingState from "../components/LoadingState.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useRequest } from "../context/RequestContext.jsx";
import { getCase, ApiError } from "../api/client.js";

function formatDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

export default function CaseCreated() {
  const { caseNumber } = useParams();
  const { caseRecord, update } = useRequest();
  const [record, setRecord] = useState(
    caseRecord && caseRecord.case_number === caseNumber ? caseRecord : null
  );
  const [loading, setLoading] = useState(!record || !record.original_request);
  const [notFound, setNotFound] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [showDraft, setShowDraft] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    if (!record) setLoading(true);
    setNotFound(false);
    getCase(caseNumber)
      .then((data) => {
        if (!active) return;
        setRecord(data);
        update({ caseRecord: data });
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setNotFound(true);
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseNumber]);

  if (loading) {
    return (
      <PageContainer narrow>
        <LoadingState message="Loading case details..." />
      </PageContainer>
    );
  }

  if (notFound || !record) {
    return (
      <PageContainer narrow>
        <EmptyState
          icon={FileSearch}
          title="Case not found"
          description="We couldn't find a case with this number. It may have been mistyped."
          action={
            <Link to="/cases">
              <Button variant="secondary">Back to My Cases</Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer narrow>
      <div className="mb-8">
        <StepIndicator current="created" />
      </div>

      <h1 className="text-[22px] font-semibold text-ink-900">
        Your case has been created
      </h1>

      <div className="mt-4 rounded-md border border-line bg-paper-warm/70 p-4 text-[13px] leading-relaxed text-ink-700">
        <p className="font-semibold text-ink-900">Important Note</p>
        <p className="mt-1">
          Your application has been saved as a case. It has not been submitted to a government authority through this system.
        </p>
      </div>

      <Card className="mt-6">
        <p className="mb-4 text-[13px] font-medium text-ink-500">Case status</p>
        <CaseTimeline status={record.status} />
      </Card>

      <Card className="mt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] font-medium text-ink-500">Case number</p>
            <p className="mt-1 text-[26px] font-semibold tracking-tight text-ink-900">
              {record.case_number}
            </p>
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => {
              setLoading(true);
              getCase(caseNumber)
                .then(data => { setRecord(data); update({ caseRecord: data }); })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
            }}
            disabled={loading}
          >
            Refresh Status
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Badge tone="accent">{record.status}</Badge>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-line pt-5 sm:grid-cols-3">
          <div>
            <p className="text-[12px] text-ink-500">Request type</p>
            <p className="mt-1 text-[14px] text-ink-900">
              {record.request_type || "—"}
            </p>
          </div>
          <div>
            <p className="text-[12px] text-ink-500">Category</p>
            <p className="mt-1 text-[14px] text-ink-900">{record.category || "—"}</p>
          </div>
          <div>
            <p className="text-[12px] text-ink-500">Created</p>
            <p className="mt-1 text-[14px] text-ink-900">
              {formatDate(record.created_at) || "—"}
            </p>
          </div>
        </div>
      </Card>

      {record.extracted_facts?.resolved_image_url && (
        <Card className="mt-5 border-success/30 bg-success/5">
          <div className="flex items-center gap-2 border-b border-success/20 pb-3">
            <CheckCircle2 size={16} className="text-success" />
            <h2 className="text-[15px] font-semibold text-ink-900">
              Resolution Proof
            </h2>
          </div>
          
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[12px] font-medium uppercase tracking-wide text-ink-400 mb-2">
                Resolved Status Photo
              </p>
              <img src={record.extracted_facts.resolved_image_url} alt="Resolution" className="w-full rounded-md border border-line" />
            </div>
            
            {record.extracted_facts.resolution_verification && (
              <div>
                <p className="text-[12px] font-medium uppercase tracking-wide text-ink-400 mb-2">
                  AI Verification
                </p>
                <div className="rounded border border-success/30 bg-white p-3 text-[13px] leading-relaxed text-ink-700">
                  <p className="font-semibold text-success mb-1 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Verified Resolved
                  </p>
                  <p className="mt-1">{record.extracted_facts.resolution_verification.reason}</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card className="mt-5">
        <button
          className="flex w-full items-center justify-between text-left"
          onClick={() => setShowRequest((v) => !v)}
          aria-expanded={showRequest}
        >
          <span className="text-[14px] font-medium text-ink-900">
            Original request
          </span>
          {showRequest ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showRequest && (
          <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-700">
            {record.original_request}
          </p>
        )}
      </Card>

      <Card className="mt-5">
        <button
          className="flex w-full items-center justify-between text-left"
          onClick={() => setShowDraft((v) => !v)}
          aria-expanded={showDraft}
        >
          <span className="text-[14px] font-medium text-ink-900">
            Application draft
          </span>
          {showDraft ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showDraft && (
          <pre
            className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-700"
            style={{ fontFamily: "inherit" }}
          >
            {record.draft}
          </pre>
        )}
      </Card>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="secondary" onClick={() => navigate("/")}>
          Back to Home
        </Button>
        <Button onClick={() => navigate("/cases")}>Track Case</Button>
      </div>
    </PageContainer>
  );
}
