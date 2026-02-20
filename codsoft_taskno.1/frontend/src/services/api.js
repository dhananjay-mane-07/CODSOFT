const API_BASE = "https://codsoft-q1jf.onrender.com/api";

// get token from localStorage
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

// login user
export const loginUser = (email, password) =>
  request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

// register user
export const registerUser = (name, email, password, role = "student") =>
  request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, role }),
  });

// get all jobs
export const getJobs = () => request("/jobs");

// create job (employer)
export const createJob = (jobData) =>
  request("/jobs", {
    method: "POST",
    body: JSON.stringify(jobData),
  });

// get jobs posted by logged-in user
export const getMyJobs = () => request("/jobs/my");

// apply to job
export const applyToJob = (jobId, resumeUrl) =>
  request(`/applications/${jobId}`, {
    method: "POST",
    body: JSON.stringify({ resumeUrl }),
  });

// get my applications
export const getMyApplications = () =>
  request("/applications/my");

export const getApplicantsByJob = async (jobId) => {
  return request(`/applications/job/${jobId}`);
};

