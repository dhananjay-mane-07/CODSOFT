import { useEffect, useState } from "react";
import { getMyApplications } from "../services/api";

function MyApplications() {
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    getMyApplications().then(res => setApplications(res.data));
  }, []);

  return (
    <div>
      <h2>My Applications</h2>
      {applications.map(app => (
        <div key={app._id}>
          <h3>{app.job.title}</h3>
          <p>Status: {app.status}</p>
        </div>
      ))}
    </div>
  );
}

export default MyApplications;
