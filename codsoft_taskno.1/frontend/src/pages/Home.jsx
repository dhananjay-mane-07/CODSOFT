import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getJobs, applyToJob } from "../services/api";
import "../App.css";

function Home() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const data = await getJobs();
        setJobs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.log(err.message);
      }
    };
    loadJobs();
  }, []);

  const handleApply = async (jobId) => {
    if (!token) {
      alert("Please login first");
      navigate("/login");
      return;
    }

    const resumeUrl = prompt("Enter Resume URL");
    if (!resumeUrl) return;

    try {
      await applyToJob(jobId, resumeUrl, token);
      alert("Applied successfully ✅");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      {/* HERO SECTION */}
      <section className="hero">
        <div className="hero-left">
          <h1>Find your Dream Job</h1>
          <p className="hero-desc">
            Discover opportunities from top companies. Apply fast and track your applications easily.
          </p>

          <button
            className="primary-btn"
            onClick={() => navigate("/login")}
          >
            Upload Resume
          </button>
        </div>

        <div className="hero-right">
          <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="job" />
        </div>
      </section>

      {/* SEARCH BOX */}
      <div className="search-box">
        <input placeholder="Search keyword" />
        <input placeholder="Location" />
        <input placeholder="Category" />
        <button onClick={() => navigate("/jobs")}>
          Find Job
        </button>
      </div>

      {/* JOB LIST SECTION */}
      <div className="container">
        <h2 className="page-title">Latest Job Openings</h2>

        <div className="job-list">
          {jobs.length === 0 ? (
            <p>No jobs available</p>
          ) : (
            jobs.map((job) => (
              <div className="job-card" key={job._id}>
                <div className="job-info">
                  <h3>{job.title}</h3>
                  <p>{job.company}</p>
                  <span>{job.location}</span>
                </div>

                <button
                  className="apply-btn"
                  onClick={() => handleApply(job._id)}
                >
                  Apply
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

export default Home;
