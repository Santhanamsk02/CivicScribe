import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageContainer from "../components/PageContainer.jsx";
import StepIndicator from "../components/StepIndicator.jsx";
import Badge from "../components/Badge.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import LoadingState from "../components/LoadingState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import { useRequest } from "../context/RequestContext.jsx";
import { extractFacts, ApiError } from "../api/client.js";

export default function Analyze() {
  const { originalText, analysis, facts, image_url, vision_result, location, update } = useRequest();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  if (!analysis) return null;

  const handleContinue = async () => {
    if (facts) {
      navigate("/details");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await extractFacts(originalText);
      update({ facts: res.facts });
      navigate("/details");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to connect to the drafting service."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer narrow>
      <div className="mb-8">
        <StepIndicator current="understand" />
      </div>

      <h1 className="text-[26px] font-semibold text-ink-900">
        Understanding your request
      </h1>

      <Card className="mt-6">
        <p className="text-[13px] font-medium text-ink-500">Request type</p>
        <div className="mt-2">
          <Badge tone="accent" className="text-[14px]">
            {analysis.type}
          </Badge>
        </div>

        <p className="mt-5 text-[13px] font-medium text-ink-500">Category</p>
        <p className="mt-1 text-[15px] text-ink-900">{analysis.category}</p>

        <div className="mt-5 border-t border-line pt-5">
          <p className="text-[13px] font-medium text-ink-500">
            Why we classified it this way
          </p>
          <p className="mt-1 text-[15px] leading-relaxed text-ink-700">
            {analysis.reason}
          </p>
        </div>

        <div className="mt-5 border-t border-line pt-5">
          <p className="text-[13px] font-medium text-ink-500">
            You are asking the authority to:
          </p>
          <p className="mt-1 text-[15px] leading-relaxed text-ink-700">
            {analysis.requested_action_or_information}
          </p>
        </div>
      </Card>

      {image_url && (
        <Card className="mt-6">
          <p className="text-[13px] font-medium text-ink-500 mb-2">Image Evidence</p>
          <img 
            src={image_url} 
            alt="Evidence" 
            className="w-full rounded-md object-cover border border-line" 
            style={{maxHeight: "300px"}} 
          />
          
          {vision_result && (
            <div className="mt-4 border-t border-line pt-4 flex flex-col gap-3">
              <div>
                <p className="text-[13px] font-medium text-ink-500">AI Severity Assessment</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone={vision_result.severity_score > 70 ? "negative" : "neutral"}>
                    Score: {vision_result.severity_score}/100
                  </Badge>
                </div>
                <p className="mt-2 text-[14px] text-ink-700">{vision_result.severity_reason}</p>
              </div>
              
              <div>
                <p className="text-[13px] font-medium text-ink-500">Visual Evidence Status</p>
                <div className="mt-1">
                  <Badge tone={vision_result.relevance === "relevant" ? "positive" : "neutral"}>
                    {vision_result.relevance.replace("_", " ")}
                  </Badge>
                </div>
                <p className="mt-1 text-[13px] text-ink-500">{vision_result.relevance_reason}</p>
              </div>
            </div>
          )}

          {location && location.latitude && (
             <div className="mt-4 border-t border-line pt-4">
                <p className="text-[13px] font-medium text-ink-500">Location</p>
                <p className="mt-1 text-[14px] text-ink-700">Lat: {Number(location.latitude).toFixed(5)}, Lng: {Number(location.longitude).toFixed(5)}</p>
             </div>
          )}
        </Card>
      )}

      {loading && (
        <div className="mt-6">
          <LoadingState message="Organizing the information..." />
        </div>
      )}

      {error && (
        <div className="mt-6">
          <ErrorState message={error} onRetry={handleContinue} onBack={() => navigate("/start")} />
        </div>
      )}

      {!loading && (
        <div className="mt-8 flex items-center justify-between">
          <Button variant="secondary" onClick={() => navigate("/start")}>
            Back
          </Button>
          <Button 
            onClick={handleContinue} 
            disabled={vision_result && vision_result.relevance === "irrelevant"}
            title={vision_result && vision_result.relevance === "irrelevant" ? "Please provide valid evidence of a civic issue" : ""}
          >
            Continue
          </Button>
        </div>
      )}
    </PageContainer>
  );
}
