import { useEffect, useState } from "react";
import { getJobs, applyToJob } from "../services/api";
import "../App.css";

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data = await getJobs();
        setJobs(Array.isArray(data) ? data : []);
      } catch (err) {
        alert("Failed to load jobs");
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const handleApply = async (jobId) => {
    if (!token) {
      alert("Please login first");
      return;
    }

    const resumeUrl = prompt("Paste your resume URL");
    if (!resumeUrl) return;

    try {
      await applyToJob(jobId, resumeUrl, token);
      alert("Application submitted!");
    } catch (err) {
      alert(err.message || "Application failed");
    }
  };

  if (loading) return <p className="center-msg">Loading jobs...</p>;

  return (
    <div className="container">
      <h2 className="page-title">Available Jobs</h2>

      {jobs.length === 0 ? (
        <p className="center-msg">No jobs available</p>
      ) : (
        <div className="job-list">
          {jobs.map((job) => (
            <div key={job._id} className="job-card">
              <div className="job-info">
                <h3>{job.title}</h3>
                <p className="company">{job.company}</p>
                <p className="location">📍 {job.location}</p>
                <span className="posted-by">
                  Posted by: {job.createdBy?.email || "Employer"}
                </span>
              </div>

              <div className="job-actions">
                <button
                  className="apply-btn"
                  onClick={() => handleApply(job._id)}
                >
                  Apply Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
