const BASE_URL = "https://codsoft-q1jf.onrender.com/api";

const getToken = () => localStorage.getItem("token");

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`
});

const jsonHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`
});

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const loginUser = async (email, password) => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Login failed");
  return data;
};

export const registerUser = async (form) => {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Registration failed");
  return data;
};

// ─── JOBS ────────────────────────────────────────────────────────────────────

export const getJobs = async (keyword = "", location = "") => {
  const params = new URLSearchParams();
  if (keyword) params.append("keyword", keyword);
  if (location) params.append("location", location);
  const res = await fetch(`${BASE_URL}/jobs?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch jobs");
  return data;
};

export const getJobById = async (id) => {
  const res = await fetch(`${BASE_URL}/jobs/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Job not found");
  return data;
};

export const createJob = async (jobData) => {
  const res = await fetch(`${BASE_URL}/jobs`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(jobData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create job");
  return data;
};

export const getMyJobs = async () => {
  const res = await fetch(`${BASE_URL}/jobs/my`, {
    headers: authHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch your jobs");
  return data;
};

export const getApplicantsByJob = async (jobId) => {
  const res = await fetch(`${BASE_URL}/jobs/${jobId}/applicants`, {
    headers: authHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch applicants");
  return data;
};

// ─── APPLICATIONS ─────────────────────────────────────────────────────────────

export const applyToJob = async (jobId, formData) => {
  const res = await fetch(`${BASE_URL}/applications/${jobId}`, {
    method: "POST",
    headers: authHeaders(), // Do NOT set Content-Type — browser sets multipart boundary
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Application failed");
  return data;
};

export const getMyApplications = async () => {
  const res = await fetch(`${BASE_URL}/applications/my`, {
    headers: authHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch applications");
  return data;
};

// ─── PROFILE ─────────────────────────────────────────────────────────────────

export const getMyProfile = async () => {
  const res = await fetch(`${BASE_URL}/profile`, {
    headers: authHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch profile");
  return data;
};

export const updateMyProfile = async (profileData) => {
  const res = await fetch(`${BASE_URL}/profile`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify(profileData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to update profile");
  return data;
};

export const getUserProfile = async (userId) => {
  const res = await fetch(`${BASE_URL}/profile/${userId}`, {
    headers: authHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch user profile");
  return data;
};
