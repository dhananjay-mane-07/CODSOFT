import { useEffect, useState } from "react";
import jwtDecode from "jwt-decode";
import { createJob, getMyJobs, getApplicantsByJob } from "../services/api";
import "../App.css";

const BASE_URL = "https://codsoft-q1jf.onrender.com/api";

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

  // Applicant profile modal
  const [viewingProfile, setViewingProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

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

  const handleViewApplicantProfile = async (applicantId) => {
    setProfileLoading(true);
    setViewingProfile(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/profile/${applicantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setViewingProfile(data);
    } catch (err) {
      alert("Could not load profile: " + err.message);
    } finally {
      setProfileLoading(false);
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
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        {/* Profile avatar */}
                        <div
                          style={{
                            width: "48px", height: "48px", borderRadius: "50%",
                            overflow: "hidden", border: "2px solid #e2e8f0",
                            background: "#f1f5f9", display: "flex",
                            alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {app.applicant?.profileImage ? (
                            <img src={app.applicant.profileImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span style={{ fontSize: "24px" }}>👤</span>
                          )}
                        </div>
                        <div>
                          <h4 style={{ marginBottom: "2px" }}>{app.applicant?.name || "Applicant"}</h4>
                          <p style={{ color: "#555", fontSize: "14px" }}>{app.applicant?.email}</p>
                          <span className="status-badge" style={{ marginTop: "4px", display: "inline-block" }}>
                            {app.status || "Applied"}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                        {/* View Profile button */}
                        <button
                          className="secondary-btn"
                          onClick={() => handleViewApplicantProfile(app.applicant?._id)}
                          disabled={!app.applicant?._id}
                        >
                          👤 View Profile
                        </button>
                        {/* View Resume */}
                        <a href={app.resumeUrl} target="_blank" rel="noreferrer" className="primary-btn"
                          style={{ textDecoration: "none", display: "inline-block" }}>
                          📄 Resume
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Applicant Profile Modal */}
          {(profileLoading || viewingProfile) && (
            <div className="modal-overlay" onClick={() => setViewingProfile(null)}>
              <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
                <button className="modal-close" onClick={() => setViewingProfile(null)}>✕</button>

                {profileLoading ? (
                  <p className="center-msg" style={{ padding: "40px 0" }}>Loading profile...</p>
                ) : viewingProfile && (
                  <>
                    {/* Avatar + name */}
                    <div style={{ textAlign: "center", marginBottom: "24px" }}>
                      <div style={{
                        width: "80px", height: "80px", borderRadius: "50%", overflow: "hidden",
                        border: "3px solid #2563eb", margin: "0 auto 12px", background: "#e2e8f0",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}>
                        {viewingProfile.profileImage
                          ? <img src={viewingProfile.profileImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span style={{ fontSize: "36px" }}>👤</span>
                        }
                      </div>
                      <h2 style={{ marginBottom: "4px" }}>{viewingProfile.name}</h2>
                      <p style={{ color: "#2563eb" }}>{viewingProfile.email}</p>
                    </div>

                    {viewingProfile.mobile && (
                      <div className="modal-section">
                        <h4>📱 Mobile</h4>
                        <p>{viewingProfile.mobile}</p>
                      </div>
                    )}

                    {viewingProfile.education && (
                      <div className="modal-section">
                        <h4>🎓 Education</h4>
                        <p>{viewingProfile.education}</p>
                      </div>
                    )}

                    {viewingProfile.skills?.length > 0 && (
                      <div className="modal-section">
                        <h4>🛠 Skills</h4>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                          {viewingProfile.skills.map((s, i) => (
                            <span key={i} className="skill-tag">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
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
            <a href="/profile" className="secondary-btn" style={{ textDecoration: "none", textAlign: "center" }}>
              👤 My Profile
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
