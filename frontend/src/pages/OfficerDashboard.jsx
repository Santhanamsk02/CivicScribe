import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, ShieldAlert, FolderOpen, RefreshCw, ArrowRight, Map, List } from "lucide-react";
import PageContainer from "../components/PageContainer.jsx";
import Card from "../components/Card.jsx";
import Badge from "../components/Badge.jsx";
import Button from "../components/Button.jsx";
import LoadingState from "../components/LoadingState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { getAllCases, ApiError } from "../api/client.js";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet's default icon path issues with Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function getStatusBadgeTone(status) {
  switch (status?.toUpperCase()) {
    case "RESOLVED":
      return "success";
    case "UNDER_REVIEW":
    case "ACTION_IN_PROGRESS":
      return "accent";
    case "SUBMITTED":
      return "default";
    case "APPROVED":
      return "accent";
    case "DRAFT":
    default:
      return "default";
  }
}

export default function OfficerDashboard() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // View mode
  const [viewMode, setViewMode] = useState("map"); // "map" or "list"

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const fetchCases = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllCases();
      setCases(data.cases || []);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? "Unable to load cases."
          : "Unable to load cases."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  // Compute metric cards from actual backend data
  const metrics = useMemo(() => {
    const total = cases.length;
    const draft = cases.filter((c) => (c.status || "").toUpperCase() === "DRAFT").length;
    const submitted = cases.filter((c) => (c.status || "").toUpperCase() === "SUBMITTED").length;
    const underReview = cases.filter((c) => (c.status || "").toUpperCase() === "UNDER_REVIEW").length;
    const resolved = cases.filter((c) => (c.status || "").toUpperCase() === "RESOLVED").length;

    return { total, draft, submitted, underReview, resolved };
  }, [cases]);

  // Apply filters
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      // Search by case number
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const numMatch = (c.case_number || "").toLowerCase().includes(query);
        const catMatch = (c.category || "").toLowerCase().includes(query);
        if (!numMatch && !catMatch) return false;
      }

      // Status filter
      if (statusFilter !== "ALL") {
        if ((c.status || "").toUpperCase() !== statusFilter) return false;
      }

      // Type filter
      if (typeFilter !== "ALL") {
        if ((c.request_type || "").toUpperCase() !== typeFilter) return false;
      }

      return true;
    });
  }, [cases, searchQuery, statusFilter, typeFilter]);

  return (
    <PageContainer>
      {/* Header & Demo Workspace Notice */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[24px] font-semibold text-ink-900">Officer Dashboard</h1>
            <span className="rounded-full border border-line bg-white px-2.5 py-0.5 text-[11px] font-medium text-ink-500">
              Demo officer workspace
            </span>
          </div>
          <p className="mt-1 text-[14px] text-ink-500">
            Review and manage grievance and RTI cases across citizen applications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-paper border border-line rounded-md p-1">
            <button 
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-[13px] font-medium transition ${viewMode === "map" ? "bg-white shadow-sm text-ink-900" : "text-ink-500 hover:text-ink-700"}`}
            >
              <Map size={14} /> Map
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-[13px] font-medium transition ${viewMode === "list" ? "bg-white shadow-sm text-ink-900" : "text-ink-500 hover:text-ink-700"}`}
            >
              <List size={14} /> List
            </button>
          </div>
          
          <Button
            variant="secondary"
            className="text-[13px]"
            onClick={fetchCases}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="mt-8">
          <LoadingState message="Loading cases..." />
        </div>
      ) : error ? (
        <div className="mt-8">
          <ErrorState message={error} onRetry={fetchCases} />
        </div>
      ) : cases.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={FolderOpen}
            title="No cases have been created yet."
            description="Cases created by citizens will appear here."
          />
        </div>
      ) : (
        <>
          {/* Top Summary Metrics Cards (Computed from actual data) */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Card className="p-4">
              <p className="text-[12px] font-medium uppercase tracking-wider text-ink-500">
                Total Cases
              </p>
              <p className="mt-1 text-[24px] font-bold text-ink-900">{metrics.total}</p>
            </Card>

            <Card className="p-4">
              <p className="text-[12px] font-medium uppercase tracking-wider text-ink-500">
                Draft
              </p>
              <p className="mt-1 text-[24px] font-bold text-ink-900">{metrics.draft}</p>
            </Card>

            <Card className="p-4">
              <p className="text-[12px] font-medium uppercase tracking-wider text-ink-500">
                Submitted
              </p>
              <p className="mt-1 text-[24px] font-bold text-ink-900">{metrics.submitted}</p>
            </Card>

            <Card className="p-4">
              <p className="text-[12px] font-medium uppercase tracking-wider text-ink-500">
                Under Review
              </p>
              <p className="mt-1 text-[24px] font-bold text-ink-900">{metrics.underReview}</p>
            </Card>

            <Card className="p-4 col-span-2 sm:col-span-1">
              <p className="text-[12px] font-medium uppercase tracking-wider text-ink-500">
                Resolved
              </p>
              <p className="mt-1 text-[24px] font-bold text-success">{metrics.resolved}</p>
            </Card>
          </div>

          {/* Filters Bar */}
          <div className="mt-6 flex flex-col gap-3 rounded-lg border border-line bg-white p-4 shadow-xs sm:flex-row sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by case number..."
                className="w-full rounded-md border border-line bg-paper py-2 pl-9 pr-3 text-[14px] text-ink-900 outline-none transition focus:border-accent focus:bg-white"
              />
            </div>

            {/* Status Dropdown */}
            <div className="flex items-center gap-2 sm:w-auto">
              <label htmlFor="filter-status" className="text-[13px] font-medium text-ink-500 whitespace-nowrap">
                Status:
              </label>
              <select
                id="filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-line bg-paper px-3 py-2 text-[13px] font-medium text-ink-900 outline-none transition focus:border-accent focus:bg-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">DRAFT</option>
                <option value="APPROVED">APPROVED</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                <option value="ACTION_IN_PROGRESS">ACTION_IN_PROGRESS</option>
                <option value="RESOLVED">RESOLVED</option>
              </select>
            </div>

            {/* Type Dropdown */}
            <div className="flex items-center gap-2 sm:w-auto">
              <label htmlFor="filter-type" className="text-[13px] font-medium text-ink-500 whitespace-nowrap">
                Type:
              </label>
              <select
                id="filter-type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-md border border-line bg-paper px-3 py-2 text-[13px] font-medium text-ink-900 outline-none transition focus:border-accent focus:bg-white"
              >
                <option value="ALL">All Types</option>
                <option value="GRIEVANCE">GRIEVANCE</option>
                <option value="RTI">RTI</option>
              </select>
            </div>
          </div>

          {/* Map View */}
          {viewMode === "map" && (
            <div className="mt-6 rounded-lg border border-line bg-white shadow-xs overflow-hidden" style={{ height: "400px", position: "relative" }}>
              {typeof window !== "undefined" && (() => {
                let mapCenter = [13.0827, 80.2707];
                for (const c of filteredCases) {
                  const lat = c.extracted_facts?.gps_location?.latitude || c.extracted_facts?.location?.latitude;
                  const lng = c.extracted_facts?.gps_location?.longitude || c.extracted_facts?.location?.longitude;
                  if (lat && lng) {
                    mapCenter = [Number(lat), Number(lng)];
                    break;
                  }
                }
                return (
                  <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%", zIndex: 10 }}>
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                  {filteredCases.map((c) => {
                    const lat = c.extracted_facts?.gps_location?.latitude || c.extracted_facts?.location?.latitude; // fallback
                    const lng = c.extracted_facts?.gps_location?.longitude || c.extracted_facts?.location?.longitude;
                    if (lat && lng) {
                      return (
                        <Marker key={c.case_number} position={[Number(lat), Number(lng)]}>
                          <Popup>
                            <div className="text-[13px]">
                              <strong className="block text-ink-900">{c.case_number}</strong>
                              <span className="block text-ink-600 mt-1">{c.category || "General Issue"}</span>
                              <Link to={`/officer/cases/${c.case_number}`} className="mt-2 inline-block font-medium text-accent hover:underline">
                                View Case Details &rarr;
                              </Link>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    }
                    return null;
                  })}
                </MapContainer>
                );
              })()}
            </div>
          )}

          {/* List View */}
          {viewMode === "list" && (
            <>
              {filteredCases.length === 0 ? (
            <div className="mt-6 rounded-lg border border-line bg-white p-8 text-center">
              <p className="text-[15px] font-medium text-ink-900">No matching cases found.</p>
              <p className="mt-1 text-[13px] text-ink-500">
                Try clearing your search query or adjusting the filters above.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setTypeFilter("ALL");
                }}
                className="mt-3 text-[13px] font-medium text-accent hover:underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="mt-6 hidden overflow-x-auto rounded-lg border border-line bg-white shadow-xs md:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-line bg-paper/60 text-[12px] uppercase tracking-wider text-ink-500">
                      <th className="px-4 py-3 font-semibold">Case Number</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Created</th>
                      <th className="px-4 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.map((row) => (
                      <tr
                        key={row.case_number}
                        className="border-b border-line text-[14px] transition hover:bg-paper/40 last:border-0"
                      >
                        <td className="px-4 py-3.5 font-semibold text-ink-900">
                          {row.case_number}
                        </td>
                        <td className="px-4 py-3.5 text-ink-700">
                          <Badge tone="default">{row.request_type || "—"}</Badge>
                        </td>
                        <td className="px-4 py-3.5 text-ink-700">
                          {row.category || "General"}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge tone={getStatusBadgeTone(row.status)}>
                            {row.status || "DRAFT"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-ink-500">
                          {formatDate(row.created_at)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            to={`/officer/cases/${row.case_number}`}
                            className="inline-flex items-center gap-1 font-semibold text-accent hover:text-accent-dark transition"
                          >
                            <span>View</span>
                            <ArrowRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="mt-6 flex flex-col gap-3 md:hidden">
                {filteredCases.map((row) => (
                  <Card key={row.case_number} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[15px] font-semibold text-ink-900">
                          {row.case_number}
                        </p>
                        <p className="mt-0.5 text-[13px] text-ink-500">
                          {row.category || "General"}
                        </p>
                      </div>
                      <Badge tone={getStatusBadgeTone(row.status)}>
                        {row.status || "DRAFT"}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-3 text-[12px] text-ink-500">
                      <div>
                        <span className="font-medium text-ink-700">{row.request_type}</span>
                        <span className="mx-1.5">&middot;</span>
                        <span>{formatDate(row.created_at)}</span>
                      </div>

                      <Link
                        to={`/officer/cases/${row.case_number}`}
                        className="inline-flex items-center gap-1 font-semibold text-accent"
                      >
                        <span>View Case</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
            </>
          )}
        </>
      )}
    </PageContainer>
  );
}
