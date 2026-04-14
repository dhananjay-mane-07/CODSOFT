import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "../App.css";

const BASE_URL = "https://codsoft-q1jf.onrender.com/api";

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [profileImage, setProfileImage] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch(`${BASE_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.profileImage) setProfileImage(data.profileImage);
        if (data.name) setUserName(data.name);
      })
      .catch(() => {});
  }, [token]);

  return (
    <nav className="navbar">
      <div className="logo">Job Portal</div>

      <div className="nav-links">
        <NavLink to="/" className={({ isActive }) => (isActive ? "active" : "")}>
          Home
        </NavLink>

        <NavLink to="/jobs" className={({ isActive }) => (isActive ? "active" : "")}>
          Jobs
        </NavLink>

        {token ? (
          <>
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
              Dashboard
            </NavLink>

            <NavLink to="/my-applications" className={({ isActive }) => (isActive ? "active" : "")}>
              My Applications
            </NavLink>

            {/* Profile avatar — replaces Logout button */}
            <NavLink
              to="/profile"
              title={userName || "My Profile"}
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 8px", borderRadius: "8px" }}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "2px solid #38bdf8",
                  background: "#1e3a5f",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontSize: "20px", lineHeight: 1 }}>👤</span>
                )}
              </div>
              {userName && (
                <span style={{ fontSize: "14px", fontWeight: "500", maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {userName.split(" ")[0]}
                </span>
              )}
            </NavLink>
          </>
        ) : (
          <NavLink to="/login" className={({ isActive }) => (isActive ? "active" : "")}>
            Login
          </NavLink>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
