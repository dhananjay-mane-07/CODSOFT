import { useState, useRef } from "react";
import { applyToJob, getJobs } from "../services/api";
import "../App.css";

const BASE_URL = "https://codsoft-q1jf.onrender.com/api";

const response = await fetch(`${BASE_URL}/analyze-resume`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    base64: base64Data,
    mimeType: file.type,
    jobs: availableJobs
  })
});

console.log("Response status:", response.status);
const data = await response.json();
console.log("Response data:", data);  // Add this
if (!response.ok) throw new Error(data.message || "Analysis failed");

export default function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [appliedIds, setAppliedIds] = useState([]);
  const fileRef = useRef();

  const handleFile = (f) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    if (!allowed.includes(f.type)) {
      alert("Only PDF or Word (.doc/.docx) files are accepted.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      alert("File must be under 5MB.");
      return;
    }
    if (f.type !== "application/pdf") {
      alert("Note: AI analysis works best with PDF files. Please convert to PDF for best results.");
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
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file for AI analysis.");
      return;
    }

    setAnalyzing(true);
    setAnalysis(null);

    try {
      const availableJobs = await getJobs();
      setJobs(availableJobs);

      const base64Data = await readFileAsBase64(file);
      const token = localStorage.getItem("token");

      // Call OUR backend proxy — not Anthropic directly
      const response = await fetch(`${BASE_URL}/analyze-resume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          base64: base64Data,
          mimeType: file.type,
          jobs: availableJobs
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Analysis failed");
      setAnalysis(data);

    } catch (err) {
      alert("Analysis failed: " + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApply = async (jobId) => {
    setApplyingJobId(jobId);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      await applyToJob(jobId, formData);
      setAppliedIds(prev => [...prev, jobId]);
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
    <div className="dashboard-container">
      <div className="dashboard-card">
        <h2>📤 Upload Resume for AI Analysis</h2>
        <p style={{ color: "#555", marginBottom: "20px" }}>
          Upload your resume as a <strong>PDF</strong> to get an AI-powered ATS score, skill analysis,
          and personalised job recommendations.
        </p>

        <div
          className={`drop-zone ${dragOver ? "drag-active" : ""} ${file ? "has-file" : ""}`}
          onClick={() => fileRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragOver(false);
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
              <p style={{ fontWeight: "600", color: "#0f172a" }}>Drop your resume here</p>
              <p style={{ color: "#888", fontSize: "14px" }}>or click to browse — PDF recommended (max 5MB)</p>
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

      {analysis && !analysis.error && (
        <>
          <div className="dashboard-card">
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
                  <text x="60" y="65" textAnchor="middle" fontSize="22" fontWeight="bold"
                    fill={atsColor(analysis.atsScore)}>
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
                  {analysis.skills.map((s, i) => <span key={i} className="skill-tag">{s}</span>)}
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
                <h4 style={{ marginBottom: "8px", color: "#dc2626" }}>⚡ Areas to Improve</h4>
                <ul style={{ paddingLeft: "18px", color: "#555", lineHeight: "1.8" }}>
                  {(analysis.improvements || []).map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>
          </div>

          {analysis.recommendedJobs?.length > 0 && (
            <div className="dashboard-card">
              <h2>🎯 Recommended Jobs For You</h2>
              <p style={{ color: "#555", marginBottom: "20px" }}>
                Based on your skills and experience — apply directly with the uploaded resume:
              </p>
              <div className="job-list">
                {analysis.recommendedJobs.map((rec) => {
                  const applied = appliedIds.includes(rec.jobId);
                  return (
                    <div key={rec.jobId} className="job-card"
                      style={{ flexDirection: "column", alignItems: "flex-start", gap: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "flex-start" }}>
                        <div className="job-info">
                          <h3>{rec.title}</h3>
                          <p className="company">{rec.company}</p>
                        </div>
                        <div style={{
                          background: rec.matchScore >= 75 ? "#dcfce7" : rec.matchScore >= 50 ? "#fef9c3" : "#fee2e2",
                          color: rec.matchScore >= 75 ? "#166534" : rec.matchScore >= 50 ? "#854d0e" : "#991b1b",
                          padding: "6px 14px", borderRadius: "20px", fontWeight: "700", fontSize: "14px"
                        }}>
                          {rec.matchScore}% Match
                        </div>
                      </div>
                      <p style={{ color: "#555", fontSize: "14px" }}>💡 {rec.reason}</p>
                      <button
                        className={applied ? "posted-badge" : "apply-btn"}
                        onClick={() => !applied && handleApply(rec.jobId)}
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
        <div className="dashboard-card">
          <p style={{ color: "#dc2626" }}>❌ {analysis.error}</p>
          {analysis.raw && (
            <pre style={{ fontSize: "12px", color: "#888", whiteSpace: "pre-wrap", marginTop: "10px" }}>
              {analysis.raw}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
