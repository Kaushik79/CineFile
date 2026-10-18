
import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();

  const token = sessionStorage.getItem("token");

  let user = null;

  try {
    const storedUser = sessionStorage.getItem("user");

    if (storedUser && storedUser !== "undefined") {
      user = JSON.parse(storedUser);
    }
  } catch (error) {
    console.error("Unable to read saved user:", error);
  }

  function handleLogout() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        CineFile
      </Link>

      <div className="nav-links">
        <Link to="/">Discover</Link>

        {token ? (
          <>
            <Link to="/activities">My Watchlist</Link>
            <span className="nav-user">
              {user?.name || "User"}
            </span>
            <button onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
