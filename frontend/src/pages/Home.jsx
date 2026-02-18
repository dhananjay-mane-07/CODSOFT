import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div>
      <h1>Job Board</h1>
      <Link to="/jobs">View Jobs</Link>
      <br />
      <Link to="/login">Login</Link>
    </div>
  );
}
