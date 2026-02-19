import { useEffect, useState } from "react";
import { getMyApplications } from "../services/api";
import "../App.css";

export default function MyApplications() {
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const data = await getMyApplications();
      setApplications(Array.isArray(data) ? data : []);
    } catch {
      alert("Failed to load applications");
    }
  };

  return (
    <div className="dashboard-container">

      <div className="dashboard-card">
        <h2>My Applications</h2>

        {applications.length === 0 ? (
          <p className="center-msg">No applications yet</p>
        ) : (
          <div className="application-list">
            {applications.map((app) => (
              <div key={app._id} className="application-card">

                <div className="application-info">
                  <h3>{app.job?.title}</h3>
                  <p className="company">{app.job?.company}</p>
                  <p className="location">📍 {app.job?.location}</p>
                </div>

                <div className="application-actions">
                  <span className="status-badge">
                    {app.status || "Applied"}
                  </span>

                  {app.resumeUrl && (
                    <a
                      href={app.resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="secondary-btn"
                    >
                      View Resume
                    </a>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
