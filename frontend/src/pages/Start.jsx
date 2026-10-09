import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Mic, MapPin } from "lucide-react";
import Webcam from "react-webcam";
import PageContainer from "../components/PageContainer.jsx";
import StepIndicator from "../components/StepIndicator.jsx";
import Textarea from "../components/Textarea.jsx";
import Button from "../components/Button.jsx";
import ErrorState from "../components/ErrorState.jsx";
import LoadingState from "../components/LoadingState.jsx";
import { useRequest } from "../context/RequestContext.jsx";
import { analyzeRequest, analyzeRequestWithImage, ApiError } from "../api/client.js";

const MAX_LENGTH = 2000;

export default function Start() {
  const { originalText, update, analysis } = useRequest();
  const [text, setText] = useState(originalText || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const navigate = useNavigate();
  const webcamRef = useRef(null);

  const processAndUpload = async (imageSrc, latitude, longitude) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        if (latitude && longitude) {
          ctx.font = "24px Arial";
          ctx.fillStyle = "white";
          ctx.shadowColor = "black";
          ctx.shadowBlur = 4;
          ctx.fillText(`Location: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, 20, img.height - 30);
        }
        canvas.toBlob((blob) => {
          resolve(blob);
        }, "image/jpeg", 0.9);
      };
      img.onerror = reject;
      img.src = imageSrc;
    });
  };

  const handleCaptureAndContinue = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) throw new Error("Could not capture image.");

      // Get location
      let lat = null, lng = null;
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (err) {
        console.warn("Location access denied or failed.");
      }

      const imageBlob = await processAndUpload(imageSrc, lat, lng);
      const result = await analyzeRequestWithImage(trimmed, imageBlob, lat, lng);
      
      update({
        originalText: trimmed,
        analysis: result.analysis,
        image_url: result.image_url,
        vision_result: result.vision_result,
        location: result.location,
        facts: null,
        missingInfo: null,
        draft: null,
      });
      navigate("/analyze");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err.message || "Failed to process the request.");
    } finally {
      setLoading(false);
      setShowCamera(false);
    }
  };

  const handleContinueWithoutImage = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (originalText === trimmed && analysis) {
      navigate("/analyze");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeRequest(trimmed);
      update({
        originalText: trimmed,
        analysis: result,
        facts: null,
        missingInfo: null,
        draft: null,
      });
      navigate("/analyze");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to connect to the drafting service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer narrow>
      <div className="mb-8">
        <StepIndicator current="describe" />
      </div>

      <h1 className="text-[26px] font-semibold text-ink-900">
        What would you like to report or ask?
      </h1>
      <p className="mt-2 text-[15px] text-ink-500">
        Describe the issue in your own words. You do not need to know the formal
        terminology.
      </p>

      <div className="mt-6">
        <Textarea
          label="Describe your issue"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
          placeholder="Example: There are large potholes on the road near my area. They have been there for three months and I want the road repaired."
          rows={5}
          maxLength={MAX_LENGTH}
          showCount
        />
      </div>

      {showCamera ? (
        <div className="mt-6 rounded-lg overflow-hidden border border-line bg-ink-100 flex flex-col items-center p-4">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="w-full max-w-md rounded-md"
            videoConstraints={{ facingMode: "environment" }}
          />
          <div className="mt-4 flex gap-4">
            <Button variant="secondary" onClick={() => setShowCamera(false)}>
              Cancel Camera
            </Button>
            <Button onClick={handleCaptureAndContinue}>
              Capture & Continue
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowCamera(true)}
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-[14px] text-ink-700 hover:bg-slate-50 cursor-pointer"
          >
            <Camera size={14} />
            Open Camera
          </button>
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-[14px] text-ink-300"
            title="Coming soon"
          >
            <Mic size={14} />
            Voice input
            <span className="text-[11px] text-ink-300">Coming soon</span>
          </button>
        </div>
      )}

      {error && (
        <div className="mt-6">
          <ErrorState message={error} onRetry={showCamera ? handleCaptureAndContinue : handleContinueWithoutImage} />
        </div>
      )}

      {loading && (
        <div className="mt-6">
          <LoadingState message="Understanding your request..." />
        </div>
      )}

      {!loading && !showCamera && (
        <div className="mt-8 flex items-center justify-between">
          <p className="max-w-[320px] text-[13px] text-ink-500">
            Next, we will capture a photo of the issue for severity assessment before proceeding.
          </p>
          <Button onClick={() => setShowCamera(true)} disabled={!text.trim()}>
            Continue
          </Button>
        </div>
      )}
    </PageContainer>
  );
}

