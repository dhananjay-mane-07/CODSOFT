import { NavLink, useNavigate } from "react-router-dom";
import "../App.css";

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="logo">Job Portal</div>

      <div className="nav-links">
        <NavLink to="/" className={({ isActive }) => isActive ? "active" : ""}>
          Home
        </NavLink>

        <NavLink to="/jobs" className={({ isActive }) => isActive ? "active" : ""}>
          Jobs
        </NavLink>

        {token ? (
          <>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? "active" : ""}>
              Dashboard
            </NavLink>

            <NavLink to="/my-applications" className={({ isActive }) => isActive ? "active" : ""}>
              My Applications
            </NavLink>

            <button className="logout-btn" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <NavLink to="/login" className={({ isActive }) => isActive ? "active" : ""}>
            Login
          </NavLink>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
