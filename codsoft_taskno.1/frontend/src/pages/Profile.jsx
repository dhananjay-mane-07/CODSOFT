import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

const BASE_URL = "https://codsoft-q1jf.onrender.com/api";

export default function Profile() {
  const navigate = useNavigate();
  const fileRef = useRef();

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    mobile: "",
    role: "",
    education: "",
    skills: "",
    profileImage: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewImg, setPreviewImg] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${BASE_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setProfile({
        name: data.name || "",
        email: data.email || "",
        mobile: data.mobile || "",
        role: data.role || "",
        education: data.education || "",
        skills: Array.isArray(data.skills) ? data.skills.join(", ") : (data.skills || ""),
        profileImage: data.profileImage || "",
      });
      setPreviewImg(data.profileImage || "");
    } catch (err) {
      alert("Failed to load profile: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { alert("Image must be under 2MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImg(reader.result);
      setProfile((prev) => ({ ...prev, profileImage: reader.result }));
    };
    reader.readAsDataURL(f);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profile.name,
          mobile: profile.mobile,
          education: profile.education,
          skills: profile.skills.split(",").map((s) => s.trim()).filter(Boolean),
          profileImage: profile.profileImage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert("Profile updated successfully!");
      setEditMode(false);
    } catch (err) {
      alert("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  if (loading) return <p className="center-msg" style={{ marginTop: "80px" }}>Loading profile...</p>;

  return (
    <div className="dashboard-container">
      {/* ── PROFILE HEADER CARD ── */}
      <div className="dashboard-card" style={{ textAlign: "center", position: "relative" }}>
        <div style={{ position: "relative", display: "inline-block", marginBottom: "16px" }}>
          <div
            style={{
              width: "110px",
              height: "110px",
              borderRadius: "50%",
              overflow: "hidden",
              border: "4px solid #2563eb",
              margin: "0 auto",
              cursor: editMode ? "pointer" : "default",
              background: "#e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => editMode && fileRef.current.click()}
          >
            {previewImg ? (
              <img src={previewImg} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: "48px" }}>👤</span>
            )}
          </div>
          {editMode && (
            <button
              onClick={() => fileRef.current.click()}
              style={{
                position: "absolute", bottom: 0, right: 0,
                background: "#2563eb", border: "none", borderRadius: "50%",
                width: "30px", height: "30px", cursor: "pointer",
                color: "white", fontSize: "14px", display: "flex",
                alignItems: "center", justifyContent: "center"
              }}
            >
              ✏️
            </button>
          )}
          <input type="file" ref={fileRef} style={{ display: "none" }} accept="image/*" onChange={handleImageChange} />
        </div>

        <h2 style={{ marginBottom: "4px" }}>{profile.name || "Your Name"}</h2>
        <p style={{ color: "#2563eb", fontWeight: "600", marginBottom: "4px" }}>{profile.email}</p>
        <span className="job-type-badge" style={{ textTransform: "capitalize" }}>{profile.role || "User"}</span>

        <div style={{ marginTop: "16px" }}>
          {!editMode ? (
            <button className="secondary-btn" onClick={() => setEditMode(true)}>✏️ Edit Profile</button>
          ) : (
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button className="primary-btn" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "💾 Save Changes"}
              </button>
              <button className="secondary-btn" onClick={() => { setEditMode(false); fetchProfile(); }}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── PERSONAL DETAILS ── */}
      <div className="dashboard-card">
        <h2>👤 Personal Details</h2>
        <div style={{ display: "grid", gap: "16px" }}>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              {editMode
                ? <input name="name" value={profile.name} onChange={handleChange} style={inputStyle} placeholder="Your full name" />
                : <p style={valueStyle}>{profile.name || <em style={{ color: "#aaa" }}>Not set</em>}</p>
              }
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <p style={{ ...valueStyle, color: "#64748b" }}>{profile.email}</p>
              {editMode && <small style={{ color: "#94a3b8" }}>Email cannot be changed</small>}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Mobile Number</label>
              {editMode
                ? <input name="mobile" value={profile.mobile} onChange={handleChange} style={inputStyle} placeholder="+91 98765 43210" />
                : <p style={valueStyle}>{profile.mobile || <em style={{ color: "#aaa" }}>Not set</em>}</p>
              }
            </div>
            <div>
              <label style={labelStyle}>Role</label>
              <p style={{ ...valueStyle, textTransform: "capitalize" }}>{profile.role || "—"}</p>
            </div>
          </div>

        </div>
      </div>

      {/* ── EDUCATION ── */}
      <div className="dashboard-card">
        <h2>🎓 Education</h2>
        {editMode ? (
          <textarea
            name="education"
            value={profile.education}
            onChange={handleChange}
            rows={3}
            style={{ ...inputStyle, resize: "vertical", width: "100%" }}
            placeholder="e.g. B.Tech Computer Science, XYZ University, 2020–2024"
          />
        ) : (
          <p style={valueStyle}>
            {profile.education || <em style={{ color: "#aaa" }}>No education details added yet.</em>}
          </p>
        )}
      </div>

      {/* ── SKILLS ── */}
      <div className="dashboard-card">
        <h2>🛠 Skills</h2>
        {editMode ? (
          <>
            <input
              name="skills"
              value={profile.skills}
              onChange={handleChange}
              style={inputStyle}
              placeholder="React, Node.js, MongoDB, Python (comma separated)"
            />
            <small style={{ color: "#94a3b8", marginTop: "6px", display: "block" }}>
              Separate skills with commas
            </small>
          </>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {profile.skills
              ? profile.skills.split(",").map((s, i) => s.trim() && (
                  <span key={i} className="skill-tag">{s.trim()}</span>
                ))
              : <em style={{ color: "#aaa" }}>No skills added yet.</em>
            }
          </div>
        )}
      </div>

      {/* ── LOGOUT SECTION ── */}
      <div className="dashboard-card" style={{ textAlign: "center", borderTop: "2px solid #fee2e2" }}>
        {!showLogoutConfirm ? (
          <button
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              background: "#ef4444", color: "white", border: "none",
              padding: "12px 32px", borderRadius: "8px", cursor: "pointer",
              fontSize: "15px", fontWeight: "600"
            }}
          >
            🚪 Logout
          </button>
        ) : (
          <div>
            <p style={{ color: "#0f172a", fontWeight: "600", marginBottom: "16px", fontSize: "16px" }}>
              Are you sure you want to logout?
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={handleLogout}
                style={{
                  background: "#ef4444", color: "white", border: "none",
                  padding: "10px 28px", borderRadius: "8px", cursor: "pointer",
                  fontSize: "15px", fontWeight: "600"
                }}
              >
                Yes, Logout
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="secondary-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "600",
  color: "#64748b",
  marginBottom: "6px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const inputStyle = {
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  fontSize: "14px",
  width: "100%",
  outline: "none",
  background: "#f8fafc",
};

const valueStyle = {
  fontSize: "15px",
  color: "#0f172a",
  padding: "8px 0",
  borderBottom: "1px solid #f1f5f9",
};
