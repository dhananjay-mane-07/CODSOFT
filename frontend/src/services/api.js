const API_BASE = "http://localhost:5000/api";

// helper to get token from localStorage
const getToken = () => localStorage.getItem("token");

// reusable request function
const request = async (url, options = {}) => {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
};





// ================= AUTH =================

// login user
export const loginUser = (email, password) =>
  request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

// register user
export const registerUser = (name, email, password) =>
  request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });





// ================= JOBS =================

// get all jobs
export const getJobs = () => request("/jobs");

// create job (optional if recruiter role exists)
export const createJob = (jobData) =>
  request("/jobs", {
    method: "POST",
    body: JSON.stringify(jobData),
  });





// ================= APPLICATIONS =================

// apply to a job
export const applyToJob = (jobId, resumeUrl) =>
  request(`/applications/${jobId}`, {
    method: "POST",
    body: JSON.stringify({ resumeUrl }),
  });

// get my applications
export const getMyApplications = () =>
  request("/applications/my");
