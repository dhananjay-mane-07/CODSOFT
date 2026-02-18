import { useEffect, useState } from "react";
import { getJobs, applyToJob } from "../services/api";


function Jobs() {
  const [jobs, setJobs] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchJobs = async () => {
      const data = await getJobs();
      setJobs(data);
    };
    fetchJobs();
  }, []);

  const handleApply = async (jobId) => {
    if (!token) {
      alert("Please login first");
      return;
    }

    const resumeUrl = prompt("Enter resume URL");
    await applyToJob(jobId, resumeUrl, token);
    alert("Applied successfully!");
  };

  return (
    <div className="container">
      <h2>Available Jobs</h2>

      {jobs.map((job) => (
        <div key={job._id} className="job-card">
          <h3>{job.title}</h3>
          <p>{job.company}</p>
          <button onClick={() => handleApply(job._id)}>
            Apply
          </button>
        </div>
      ))}
    </div>
  );
}

export default Jobs;
