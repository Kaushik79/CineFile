
import { useState } from "react";
import axios from "axios";
import "./App.css";

import MovieDetails from "./MovieDetails";
import Login from "./Login";
import Register from "./Register";
import Activities from "./Activities";
import Navbar from "./Navbar";
import TVDetails from "./TVDetails";
import Analytics from "./Analytics";
import ReleaseCalendar from "./ReleaseCalendar";
import ChatAssistant from "./ChatAssistant";

import {
  BrowserRouter,
  Routes,
  Route,
  Link,
} from "react-router-dom";

function Home() {
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [mediaType, setMediaType] = useState("movie");

  function getSearchEndpoint(type) {
    return type === "movie"
      ? "/api/movies/search"
      : "/api/movies/tv/search";
  }

  async function searchMovies(event) {
    event.preventDefault();

    if (!query.trim()) {
      setError("Please enter a title to search.");
      setMovies([]);
      setPage(1);
      setTotalPages(1);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        getSearchEndpoint(mediaType),
        {
          params: {
            query: query.trim(),
            page: 1,
          },
        }
      );

      setMovies(response.data.data);
      setPage(response.data.page);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      setMovies([]);

      setError(
        error.response?.data?.message ||
          "Unable to load results. Please try again."
      );

      console.error(
        "Search request failed:",
        error.message
      );
    } finally {
      setLoading(false);
    }
  }

  async function changePage(nextPage) {
    if (
      loading ||
      nextPage < 1 ||
      nextPage > totalPages ||
      !query.trim()
    ) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        getSearchEndpoint(mediaType),
        {
          params: {
            query: query.trim(),
            page: nextPage,
          },
        }
      );

      setMovies(response.data.data);
      setPage(response.data.page);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to load this page."
      );

      console.error(
        "Pagination request failed:",
        error.message
      );
    } finally {
      setLoading(false);
    }
  }

  function changeMediaType(type) {
    if (type === mediaType) {
      return;
    }

    setMediaType(type);
    setMovies([]);
    setPage(1);
    setTotalPages(1);
    setError("");
  }

  return (
    <main className="app">
      <header className="header">
        <h1>CineFile</h1>
        <p>Your personal movie discovery space.</p>
      </header>

      <div className="media-switch">
        <button
          type="button"
          className={
            mediaType === "movie" ? "active" : ""
          }
          onClick={() => changeMediaType("movie")}
        >
          Movies
        </button>

        <button
          type="button"
          className={
            mediaType === "tv" ? "active" : ""
          }
          onClick={() => changeMediaType("tv")}
        >
          TV Shows
        </button>
      </div>

      <form
        className="search-form"
        onSubmit={searchMovies}
      >
        <input
          type="text"
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder={
            mediaType === "movie"
              ? "Search movies..."
              : "Search TV shows..."
          }
          aria-label={
            mediaType === "movie"
              ? "Movie title"
              : "TV show title"
          }
        />

        <button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {loading && <p>Loading results...</p>}

      {!loading &&
        movies.length === 0 &&
        !error && (
          <p className="empty">
            Search for a{" "}
            {mediaType === "movie"
              ? "movie"
              : "TV show"}{" "}
            to get started.
          </p>
        )}

      <section className="movie-grid">
        {movies.map((item) => {
          const title =
            mediaType === "movie"
              ? item.title
              : item.name;

          const releaseDate =
            mediaType === "movie"
              ? item.releaseDate
              : item.firstAirDate;

          const card = (
            <article className="movie-card">
              {item.posterUrl ? (
                <img
                  src={item.posterUrl}
                  alt={`${title} poster`}
                />
              ) : (
                <div className="poster-placeholder">
                  No poster available
                </div>
              )}

              <div className="movie-info">
                <h2>{title}</h2>

                <p>
                  {releaseDate
                    ? releaseDate.slice(0, 4)
                    : "Release date unknown"}
                </p>

                <p>
                  Rating:{" "}
                  {typeof item.rating === "number"
                    ? item.rating.toFixed(1)
                    : "Not available"}
                </p>
              </div>
            </article>
          );

          if (mediaType === "movie") {
            return (
              <Link
                to={`/movies/${item.id}`}
                key={`movie-${item.id}`}
                className="movie-link"
              >
                {card}
              </Link>
            );
          }

          return (
            <Link
              to={`/tv/${item.id}`}
              key={`tv-${item.id}`}
              className="movie-link"
            >
              {card}
            </Link>
          );
        })}
      </section>

      {movies.length > 0 && (
        <div className="pagination">
          <button
            type="button"
            onClick={() => changePage(page - 1)}
            disabled={loading || page <= 1}
          >
            Previous
          </button>

          <span>
            Page {page} of {totalPages}
          </span>

          <button
            type="button"
            onClick={() => changePage(page + 1)}
            disabled={
              loading || page >= totalPages
            }
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/register"
          element={<Register />}
        />
        <Route
          path="/activities"
          element={<Activities />}
        />
        <Route path="/" element={<Home />} />
        <Route
          path="/movies/:id"
          element={<MovieDetails />}
        />
        <Route path="/tv/:id" element={<TVDetails />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/calendar" element={<ReleaseCalendar />} />
        <Route path="/chat" element={<ChatAssistant />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
