import { useEffect, useState } from "react";
import { createJob, getMyJobs, getApplicantsByJob } from "../services/api";
import "../App.css";

export default function Dashboard() {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [jobs, setJobs] = useState([]);

  const [selectedApplicants, setSelectedApplicants] = useState([]);
  const [showApplicants, setShowApplicants] = useState(false);

  const loadJobs = async () => {
    try {
      const data = await getMyJobs();
      setJobs(Array.isArray(data) ? data : []);
    } catch {
      alert("Failed to load jobs");
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  // POST JOB
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !company || !location) {
      alert("All fields required");
      return;
    }

    try {
      await createJob({ title, company, location });
      alert("Job posted successfully!");

      setTitle("");
      setCompany("");
      setLocation("");

      loadJobs();
    } catch (err) {
      alert(err.message || "Failed to post job");
    }
  };

  // VIEW APPLICANTS
  const handleViewApplicants = async (jobId) => {
    try {
      const data = await getApplicantsByJob(jobId);
      setSelectedApplicants(Array.isArray(data) ? data : []);
      setShowApplicants(true);
    } catch {
      alert("Failed to load applicants");
    }
  };

  return (
    <div className="dashboard-container">

      {/* ===== POST JOB ===== */}
      <div className="dashboard-card">
        <h2>Post New Job</h2>

        <form onSubmit={handleSubmit} className="post-job-form">
          <input
            placeholder="Job Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <input
            placeholder="Company Name"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />

          <input
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <button className="primary-btn">Post Job</button>
        </form>
      </div>

      {/* ===== MY POSTED JOBS ===== */}
      <div className="dashboard-card">
        <h2>My Posted Jobs</h2>

        {jobs.length === 0 ? (
          <p className="center-msg">No jobs posted yet</p>
        ) : (
          jobs.map((job) => (
            <div key={job._id} className="job-card">
              <div className="job-info">
                <h3>{job.title}</h3>
                <p className="company">{job.company}</p>
                <p className="location">📍 {job.location}</p>
              </div>

              <div className="job-actions">
                <button
                  className="secondary-btn"
                  onClick={() => handleViewApplicants(job._id)}
                >
                  View Applicants
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ===== APPLICANTS ===== */}
      {showApplicants && (
        <div className="dashboard-card">
          <h2>Applicants</h2>

          {selectedApplicants.length === 0 ? (
            <p className="center-msg">No applications yet</p>
          ) : (
            <div className="applicant-list">
              {selectedApplicants.map((app) => (
                <div key={app._id} className="applicant-card">
                  <div>
                    <h4>{app.applicant?.name}</h4>
                    <p>{app.applicant?.email}</p>
                  </div>

                  <a
                    href={app.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="primary-btn"
                  >
                    View Resume
                  </a>
                </div>
              ))}
            </div>
          )}

          <button
            className="secondary-btn"
            onClick={() => setShowApplicants(false)}
          >
            Close
          </button>
        </div>
      )}

    </div>
  );
}
