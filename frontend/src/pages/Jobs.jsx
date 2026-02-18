import { useEffect, useState } from "react";
import API from "../services/api";

export default function Jobs() {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    const fetchJobs = async () => {
      const res = await API.get("/jobs");
      setJobs(res.data);
    };
    fetchJobs();
  }, []);

  const applyToJob = async (jobId) => {
    try {
      await API.post(`/applications/${jobId}`, {
        resumeUrl: "https://myresume.com"
      });
      alert("Applied successfully");
    } catch {
      alert("Application failed");
    }
  };

  return (
    <div>
      <h2>Job Listings</h2>

      {jobs.map(job => (
        <div key={job._id}>
          <h3>{job.title}</h3>
          <p>{job.company}</p>
          <p>{job.location}</p>
          <button onClick={() => applyToJob(job._id)}>
            Apply
          </button>
        </div>
      ))}
    </div>
  );
}
