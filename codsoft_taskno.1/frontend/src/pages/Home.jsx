import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getJobs, applyToJob } from "../services/api";
import "../App.css";

const BASE_URL = "https://codsoft-q1jf.onrender.com/api";

function Home() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");

  // Resume / AI state
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [appliedIds, setAppliedIds] = useState([]);
  const [showResumePanel, setShowResumePanel] = useState(false);
  const fileRef = useRef();

  const token = localStorage.getItem("token");

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const data = await getJobs();
        const arr = Array.isArray(data) ? data : [];
        setAllJobs(arr);
        setJobs(arr);
      } catch (err) {
        console.log(err.message);
      }
    };
    loadJobs();
  }, []);

  // ── Search ──────────────────────────────────────────────────────────────
  const handleSearch = (e) => {
    e.preventDefault();
    const kw = keyword.trim().toLowerCase();
    const loc = location.trim().toLowerCase();
    const filtered = allJobs.filter((job) => {
      const matchKw = !kw || job.title?.toLowerCase().includes(kw) ||
        job.company?.toLowerCase().includes(kw);
      const matchLoc = !loc || job.location?.toLowerCase().includes(loc);
      return matchKw && matchLoc;
    });
    setJobs(filtered);
  };

  const handleClearSearch = () => {
    setKeyword("");
    setLocation("");
    setJobs(allJobs);
  };

  // ── Resume Upload ────────────────────────────────────────────────────────
  const handleUploadClick = () => {
    if (!token) {
      navigate("/login");
      return;
    }
    setShowResumePanel(true);
    setTimeout(() => {
      document.getElementById("resume-panel")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleFile = (f) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(f.type)) {
      alert("Only PDF or Word (.doc/.docx) files are accepted.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      alert("File must be under 5MB.");
      return;
    }
    setFile(f);
    setAnalysis(null);
  };

  const readFileAsBase64 = (f) =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result.split(",")[1]);
      reader.onerror = () => rej(new Error("Read failed"));
      reader.readAsDataURL(f);
    });

  const analyzeResume = async () => {
    if (!file) { alert("Please upload your resume first."); return; }

    setAnalyzing(true);
    setAnalysis(null);

    try {
      const base64Data = await readFileAsBase64(file);
      const mediaType = file.type;

      // Call your backend endpoint instead of Anthropic API
      const response = await fetch("https://codsoft-q1jf.onrender.com/api/analyze-resume", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          base64: base64Data,
          mimeType: mediaType,
          jobs: allJobs
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Backend error:", data);
        throw new Error(data.message || data.error || "Analysis failed");
      }

      console.log("Analysis result:", data);

      if (data.error) {
        setAnalysis({ error: data.error });
      } else {
        setAnalysis(data);
      }
    } catch (err) {
      alert("Analysis failed: " + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyFromAnalysis = async (jobId) => {
    if (!file) { alert("Resume file needed to apply."); return; }
    setApplyingJobId(jobId);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      await applyToJob(jobId, formData);
      setAppliedIds((prev) => [...prev, jobId]);
      alert("Applied successfully! ✅");
    } catch (err) {
      alert(err.message || "Application failed");
    } finally {
      setApplyingJobId(null);
    }
  };

  const atsColor = (score) => {
    if (score >= 75) return "#22c55e";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-left">
          <h1>Find your Dream Job</h1>
          <p className="hero-desc">
            Discover opportunities from top companies. Apply fast and track your
            applications easily.
          </p>
          <button className="primary-btn" onClick={handleUploadClick}>
            📤 Upload Resume
          </button>
        </div>
        <div className="hero-right">
          <img
            src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
            alt="job"
          />
        </div>
      </section>

      {/* ── SEARCH BOX ───────────────────────────────────────────────────── */}
      <form className="search-box" onSubmit={handleSearch}>
        <input
          placeholder="🔍 Search by job title or company"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <input
          placeholder="📍 Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <button type="submit">Find Job</button>
        {(keyword || location) && (
          <button
            type="button"
            onClick={handleClearSearch}
            style={{ background: "#64748b" }}
          >
            Clear
          </button>
        )}
      </form>

      {/* ── JOB LIST ─────────────────────────────────────────────────────── */}
      <div className="container">
        <h2 className="page-title">
          Latest Job Openings
          {(keyword || location) && (
            <span style={{ fontSize: "15px", color: "#64748b", marginLeft: "10px" }}>
              — {jobs.length} result{jobs.length !== 1 ? "s" : ""}
            </span>
          )}
        </h2>

        <div className="job-list">
          {jobs.length === 0 ? (
            <p style={{ textAlign: "center", color: "#64748b" }}>
              No jobs found{keyword || location ? " for your search" : ""}.
            </p>
          ) : (
            jobs.map((job) => (
              <div className="job-card" key={job._id}>
                <div className="job-info">
                  <h3>{job.title}</h3>
                  <p className="company">🏢 {job.company}</p>
                  <p className="location">📍 {job.location}</p>
                  {job.jobType && (
                    <span className="job-type-badge">{job.jobType}</span>
                  )}
                </div>
                <button
                  className="apply-btn"
                  onClick={() => {
                    if (!token) { navigate("/login"); return; }
                    navigate("/jobs");
                  }}
                >
                  View & Apply
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── RESUME UPLOAD + AI ANALYSIS PANEL ────────────────────────────── */}
      {showResumePanel && (
        <div id="resume-panel" className="container" style={{ marginTop: "40px" }}>
          <div className="dashboard-card">
            <h2>📤 Upload Resume for AI Analysis</h2>
            <p style={{ color: "#555", marginBottom: "20px" }}>
              Get an instant ATS score, skill analysis, and personalised job
              recommendations.
            </p>

            {/* Drop Zone */}
            <div
              className={`drop-zone ${dragOver ? "drag-active" : ""} ${file ? "has-file" : ""}`}
              onClick={() => fileRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
              }}
            >
              <input
                type="file"
                ref={fileRef}
                style={{ display: "none" }}
                accept=".pdf,.doc,.docx"
                onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
              />
              {file ? (
                <div>
                  <div style={{ fontSize: "48px", marginBottom: "10px" }}>
                    {file.type === "application/pdf" ? "📕" : "📘"}
                  </div>
                  <p style={{ fontWeight: "600", color: "#0f172a" }}>{file.name}</p>
                  <p style={{ color: "#888", fontSize: "14px" }}>
                    {(file.size / 1024).toFixed(1)} KB — Click to change
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: "48px", marginBottom: "10px" }}>📎</div>
                  <p style={{ fontWeight: "600", color: "#0f172a" }}>
                    Drop your resume here
                  </p>
                  <p style={{ color: "#888", fontSize: "14px" }}>
                    or click to browse — PDF, DOC, DOCX up to 5MB
                  </p>
                </div>
              )}
            </div>

            <button
              className="primary-btn"
              style={{ marginTop: "20px", width: "100%", fontSize: "16px", padding: "14px" }}
              onClick={analyzeResume}
              disabled={analyzing || !file}
            >
              {analyzing ? "🔍 Analyzing Resume..." : "✨ Analyze with AI"}
            </button>
          </div>

          {/* Analysis Results */}
          {analysis && !analysis.error && (
            <>
              <div className="dashboard-card" style={{ marginTop: "24px" }}>
                <h2>📊 Resume Analysis</h2>
                <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div style={{ textAlign: "center", minWidth: "120px" }}>
                    <svg width="120" height="120" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                      <circle
                        cx="60" cy="60" r="50" fill="none"
                        stroke={atsColor(analysis.atsScore)}
                        strokeWidth="12"
                        strokeDasharray={`${(analysis.atsScore / 100) * 314} 314`}
                        strokeLinecap="round"
                        transform="rotate(-90 60 60)"
                      />
                      <text x="60" y="65" textAnchor="middle" fontSize="22" fontWeight="bold" fill={atsColor(analysis.atsScore)}>
                        {analysis.atsScore}
                      </text>
                    </svg>
                    <p style={{ fontWeight: "600", marginTop: "4px" }}>ATS Score</p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ marginBottom: "6px" }}>{analysis.name}</h3>
                    <span className="job-type-badge" style={{ marginBottom: "10px", display: "inline-block" }}>
                      {analysis.experienceLevel}
                    </span>
                    <p style={{ color: "#555", lineHeight: "1.6" }}>{analysis.summary}</p>
                  </div>
                </div>

                {analysis.skills?.length > 0 && (
                  <div style={{ marginTop: "20px" }}>
                    <h4 style={{ marginBottom: "10px" }}>🛠 Detected Skills</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {analysis.skills.map((s, i) => (
                        <span key={i} className="skill-tag">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "20px" }}>
                  <div>
                    <h4 style={{ marginBottom: "8px", color: "#16a34a" }}>✅ Strengths</h4>
                    <ul style={{ paddingLeft: "18px", color: "#555", lineHeight: "1.8" }}>
                      {(analysis.strengths || []).map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h4 style={{ marginBottom: "8px", color: "#dc2626" }}>⚡ Improvements</h4>
                    <ul style={{ paddingLeft: "18px", color: "#555", lineHeight: "1.8" }}>
                      {(analysis.improvements || []).map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                </div>
              </div>

              {analysis.recommendedJobs?.length > 0 && (
                <div className="dashboard-card" style={{ marginTop: "24px" }}>
                  <h2>🎯 Recommended Jobs For You</h2>
                  <p style={{ color: "#555", marginBottom: "20px" }}>
                    Based on your skills and experience:
                  </p>
                  <div className="job-list">
                    {analysis.recommendedJobs.map((rec) => {
                      const applied = appliedIds.includes(rec.jobId);
                      return (
                        <div key={rec.jobId} className="job-card" style={{ flexDirection: "column", alignItems: "flex-start", gap: "12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "flex-start" }}>
                            <div className="job-info">
                              <h3>{rec.title}</h3>
                              <p className="company">{rec.company}</p>
                            </div>
                            <div style={{
                              background: rec.matchScore >= 75 ? "#dcfce7" : rec.matchScore >= 50 ? "#fef9c3" : "#fee2e2",
                              color: rec.matchScore >= 75 ? "#166534" : rec.matchScore >= 50 ? "#854d0e" : "#991b1b",
                              padding: "6px 14px", borderRadius: "20px", fontWeight: "700", fontSize: "14px",
                              whiteSpace: "nowrap"
                            }}>
                              {rec.matchScore}% Match
                            </div>
                          </div>
                          <p style={{ color: "#555", fontSize: "14px" }}>💡 {rec.reason}</p>
                          <button
                            className={applied ? "posted-badge" : "apply-btn"}
                            onClick={() => !applied && handleApplyFromAnalysis(rec.jobId)}
                            disabled={applyingJobId === rec.jobId || applied}
                            style={{ alignSelf: "flex-end" }}
                          >
                            {applied ? "✅ Applied" : applyingJobId === rec.jobId ? "Applying..." : "Apply Now"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {analysis?.error && (
            <div className="dashboard-card" style={{ marginTop: "24px" }}>
              <p style={{ color: "#dc2626" }}>❌ {analysis.error}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default Home;
