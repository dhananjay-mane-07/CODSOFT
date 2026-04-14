import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { createJob, getMyJobs, getApplicantsByJob } from "../services/api";
import "../App.css";

export default function Dashboard() {
  const [form, setForm] = useState({
    title: "", company: "", location: "",
    description: "", eligibility: "", skills: "", jobType: "Full-time", salary: ""
  });
  const [jobs, setJobs] = useState([]);
  const [selectedApplicants, setSelectedApplicants] = useState([]);
  const [showApplicants, setShowApplicants] = useState(false);
  const [selectedJobTitle, setSelectedJobTitle] = useState("");
  const [role, setRole] = useState("");
  const [userName, setUserName] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setRole(decoded.role || "");
        setUserName(decoded.name || decoded.email || "");
      } catch (err) {
        console.error("Failed to decode token:", err);
      }
    }
  }, []);

  const loadJobs = async () => {
    if (role !== "employer") return;
    try {
      const data = await getMyJobs();
      setJobs(Array.isArray(data) ? data : []);
    } catch {
      alert("Failed to load jobs");
    }
  };

  useEffect(() => { loadJobs(); }, [role]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.company || !form.location) {
      alert("Title, company and location are required");
      return;
    }
    setPosting(true);
    try {
      await createJob({
        ...form,
        skills: form.skills.split(",").map(s => s.trim()).filter(Boolean)
      });
      alert("Job posted successfully!");
      setForm({ title: "", company: "", location: "", description: "", eligibility: "", skills: "", jobType: "Full-time", salary: "" });
      loadJobs();
    } catch (err) {
      alert(err.message || "Failed to post job");
    } finally {
      setPosting(false);
    }
  };

  const handleViewApplicants = async (jobId, jobTitle) => {
    try {
      const data = await getApplicantsByJob(jobId);
      setSelectedApplicants(Array.isArray(data) ? data : []);
      setSelectedJobTitle(jobTitle);
      setShowApplicants(true);
    } catch {
      alert("Failed to load applicants");
    }
  };

  return (
    <div className="dashboard-container">

      {/* ── EMPLOYER VIEW ── */}
      {role === "employer" && (
        <>
          <div className="dashboard-card">
            <h2>📋 Post New Job</h2>
            <form onSubmit={handleSubmit} className="post-job-form">
              <div className="form-row">
                <input name="title" placeholder="Job Title *" value={form.title} onChange={handleChange} />
                <input name="company" placeholder="Company Name *" value={form.company} onChange={handleChange} />
              </div>
              <div className="form-row">
                <input name="location" placeholder="Location *" value={form.location} onChange={handleChange} />
                <select name="jobType" value={form.jobType} onChange={handleChange}>
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Internship</option>
                  <option>Remote</option>
                  <option>Contract</option>
                </select>
              </div>
              <input name="salary" placeholder="Salary Range (e.g. ₹4–6 LPA)" value={form.salary} onChange={handleChange} />
              <textarea
                name="description"
                placeholder="Job Description"
                rows={3}
                value={form.description}
                onChange={handleChange}
                style={{ padding: "12px", borderRadius: "6px", border: "1px solid #ddd", resize: "vertical" }}
              />
              <textarea
                name="eligibility"
                placeholder="Eligibility Criteria (e.g. B.Tech CS, 3+ years exp)"
                rows={2}
                value={form.eligibility}
                onChange={handleChange}
                style={{ padding: "12px", borderRadius: "6px", border: "1px solid #ddd", resize: "vertical" }}
              />
              <input
                name="skills"
                placeholder="Required Skills (comma separated: React, Node.js, MongoDB)"
                value={form.skills}
                onChange={handleChange}
              />
              <button className="primary-btn" disabled={posting}>
                {posting ? "Posting..." : "Post Job"}
              </button>
            </form>
          </div>

          <div className="dashboard-card">
            <h2>💼 My Posted Jobs</h2>
            {jobs.length === 0 ? (
              <p className="center-msg">No jobs posted yet</p>
            ) : (
              jobs.map((job) => (
                <div key={job._id} className="job-card" style={{ marginBottom: "12px" }}>
                  <div className="job-info">
                    <h3>{job.title}</h3>
                    <p className="company">{job.company}</p>
                    <p className="location">📍 {job.location}</p>
                    {job.jobType && <span className="job-type-badge">{job.jobType}</span>}
                  </div>
                  <div className="job-actions">
                    <button className="secondary-btn" onClick={() => handleViewApplicants(job._id, job.title)}>
                      View Applicants
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {showApplicants && (
            <div className="dashboard-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2>👥 Applicants — {selectedJobTitle}</h2>
                <button className="secondary-btn" onClick={() => setShowApplicants(false)}>✕ Close</button>
              </div>
              {selectedApplicants.length === 0 ? (
                <p className="center-msg">No applications yet for this job</p>
              ) : (
                <div className="applicant-list">
                  {selectedApplicants.map((app) => (
                    <div key={app._id} className="applicant-card">
                      <div>
                        <h4>{app.applicant?.name || "Applicant"}</h4>
                        <p style={{ color: "#555", fontSize: "14px" }}>{app.applicant?.email}</p>
                        <span className="status-badge" style={{ marginTop: "6px", display: "inline-block" }}>
                          {app.status || "Applied"}
                        </span>
                      </div>
                      <a href={app.resumeUrl} target="_blank" rel="noreferrer" className="primary-btn">
                        📄 View Resume
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── CANDIDATE VIEW ── */}
      {role === "candidate" && (
        <div className="dashboard-card">
          <h2>👋 Welcome{userName ? `, ${userName}` : ""}!</h2>
          <p style={{ color: "#555", marginBottom: "20px" }}>
            Use the tools below to supercharge your job search.
          </p>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <a href="/resume-upload" className="primary-btn" style={{ textDecoration: "none", textAlign: "center" }}>
              📤 Upload Resume & Get AI Analysis
            </a>
            <a href="/jobs" className="secondary-btn" style={{ textDecoration: "none", textAlign: "center" }}>
              🔍 Browse Jobs
            </a>
            <a href="/my-applications" className="secondary-btn" style={{ textDecoration: "none", textAlign: "center" }}>
              📋 My Applications
            </a>
          </div>
        </div>
      )}

      {role === "" && (
        <div className="dashboard-card">
          <p className="center-msg">Loading dashboard...</p>
        </div>
      )}
    </div>
  );
}
