import { useEffect, useState } from "react";
import { getJobs, applyToJob } from "../services/api";
import "../App.css";

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [applyFile, setApplyFile] = useState(null);
  const [applying, setApplying] = useState(false);
  const [appliedIds, setAppliedIds] = useState([]);

  const token = localStorage.getItem("token");

  const fetchJobs = async (kw = keyword, loc = location) => {
    setLoading(true);
    try {
      const data = await getJobs(kw, loc);
      setJobs(Array.isArray(data) ? data : []);
    } catch {
      alert("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs("", ""); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchJobs(keyword, location);
  };

  const handleApply = async () => {
    if (!token) { alert("Please login first"); return; }
    if (!applyFile) { alert("Please upload your resume"); return; }

    setApplying(true);
    try {
      const formData = new FormData();
      formData.append("resume", applyFile);
      await applyToJob(selectedJob._id, formData);
      setAppliedIds(prev => [...prev, selectedJob._id]);
      alert("Application submitted! ✅");
      setSelectedJob(null);
      setApplyFile(null);
    } catch (err) {
      alert(err.message || "Application failed");
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <p className="center-msg" style={{ marginTop: "80px" }}>Loading jobs...</p>;

  return (
    <div className="container">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="search-box" style={{ margin: "30px auto" }}>
        <input
          placeholder="🔍 Search by keyword"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <input
          placeholder="📍 Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      <h2 className="page-title">Available Jobs ({jobs.length})</h2>

      {jobs.length === 0 ? (
        <p className="center-msg">No jobs found</p>
      ) : (
        <div className="job-list">
          {jobs.map((job) => (
            <div
              key={job._id}
              className="job-card"
              style={{ cursor: "pointer" }}
              onClick={() => setSelectedJob(job)}
            >
              <div className="job-info">
                <h3>{job.title}</h3>
                <p className="company">🏢 {job.company}</p>
                <p className="location">📍 {job.location}</p>
                {job.jobType && <span className="job-type-badge">{job.jobType}</span>}
                {job.salary && <p style={{ fontSize: "14px", color: "#16a34a", fontWeight: "600", marginTop: "4px" }}>💰 {job.salary}</p>}
                <span className="posted-by">Posted by: {job.createdBy?.email || "Employer"}</span>
              </div>
              <div className="job-actions" style={{ flexDirection: "column", gap: "8px" }}>
                {job.skills?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxWidth: "200px" }}>
                    {job.skills.slice(0, 3).map((s, i) => (
                      <span key={i} className="skill-tag">{s}</span>
                    ))}
                    {job.skills.length > 3 && <span className="skill-tag">+{job.skills.length - 3}</span>}
                  </div>
                )}
                <button
                  className={appliedIds.includes(job._id) ? "posted-badge" : "apply-btn"}
                  onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }}
                  disabled={appliedIds.includes(job._id)}
                >
                  {appliedIds.includes(job._id) ? "✅ Applied" : "View & Apply"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="modal-overlay" onClick={() => setSelectedJob(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedJob(null)}>✕</button>

            <div className="modal-header">
              <h2>{selectedJob.title}</h2>
              <p className="company" style={{ fontSize: "18px" }}>🏢 {selectedJob.company}</p>
            </div>

            <div className="modal-meta">
              <span>📍 {selectedJob.location}</span>
              {selectedJob.jobType && <span className="job-type-badge">{selectedJob.jobType}</span>}
              {selectedJob.salary && <span style={{ color: "#16a34a", fontWeight: "600" }}>💰 {selectedJob.salary}</span>}
            </div>

            {selectedJob.description && (
              <div className="modal-section">
                <h4>📝 Job Description</h4>
                <p>{selectedJob.description}</p>
              </div>
            )}

            {selectedJob.eligibility && (
              <div className="modal-section">
                <h4>🎓 Eligibility</h4>
                <p>{selectedJob.eligibility}</p>
              </div>
            )}

            {selectedJob.skills?.length > 0 && (
              <div className="modal-section">
                <h4>🛠 Required Skills</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {selectedJob.skills.map((s, i) => (
                    <span key={i} className="skill-tag">{s}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-section">
              <h4>📄 Upload Resume to Apply</h4>
              {appliedIds.includes(selectedJob._id) ? (
                <p style={{ color: "#16a34a", fontWeight: "600" }}>✅ You have already applied to this job.</p>
              ) : (
                <>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setApplyFile(e.target.files[0] || null)}
                    style={{ marginBottom: "12px", width: "100%" }}
                  />
                  {applyFile && <p style={{ fontSize: "13px", color: "#555", marginBottom: "12px" }}>📎 {applyFile.name}</p>}
                  <button
                    className="apply-btn"
                    style={{ width: "100%", padding: "14px", fontSize: "16px" }}
                    onClick={handleApply}
                    disabled={applying || !token}
                  >
                    {!token ? "Login to Apply" : applying ? "Submitting..." : "Submit Application"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
