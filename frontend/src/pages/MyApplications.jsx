import { useEffect, useState } from "react";
import { getMyApplications } from "../services/api";

function MyApplications() {
  const [applications, setApplications] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchApplications = async () => {
      const data = await getMyApplications(token);
      setApplications(data);
    };
    fetchApplications();
  }, []);

  return (
    <div className="container">
      <h2>My Applications</h2>

      {applications.map((app) => (
        <div key={app._id} className="job-card">
          <h3>{app.job.title}</h3>
          <p>{app.job.company}</p>
          <p>Resume: {app.resumeUrl}</p>
        </div>
      ))}
    </div>
  );
}

export default MyApplications;
