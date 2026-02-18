import { Link, useNavigate } from "react-router-dom";
import "../App.css";

function Home() {
  const navigate = useNavigate();

  return (
    <>
      <nav className="navbar">
        <h2 className="logo">Job Board</h2>
        <div>
          <Link to="/">Home</Link>
          <Link to="/jobs">Browse Jobs</Link>
          <Link to="/login">Login</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-left">
          <p className="small-text">500+ Jobs Listed</p>
          <h1>Find your Dream Job</h1>
          <p className="hero-desc">
            Discover opportunities from top companies. Apply fast and track your applications easily.
          </p>

          <button
            className="primary-btn"
            onClick={() => navigate("/login")}
          >
            Upload Resume
          </button>
        </div>

        <div className="hero-right">
          <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" />
        </div>
      </section>

      <div className="search-box">
        <input placeholder="Search keyword" />
        <input placeholder="Location" />
        <input placeholder="Category" />
        <button onClick={() => navigate("/jobs")}>
          Find Job
        </button>
      </div>
    </>
  );
}

export default Home;
