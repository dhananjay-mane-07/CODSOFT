import { useState } from "react";
import { getMyApplications } from "../services/api";
import { getJobs } from "../services/api";


export default function Dashboard() {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");

  const createJob = async (e) => {
    e.preventDefault();
    try {
      await API.post("/jobs", { title, company, location });
      alert("Job posted successfully");
    } catch {
      alert("Failed to post job");
    }
  };

  return (
    <form onSubmit={createJob}>
      <h2>Post Job</h2>
      <input placeholder="Job Title" onChange={e => setTitle(e.target.value)} />
      <input placeholder="Company" onChange={e => setCompany(e.target.value)} />
      <input placeholder="Location" onChange={e => setLocation(e.target.value)} />
      <button type="submit">Post Job</button>
    </form>
  );
}
