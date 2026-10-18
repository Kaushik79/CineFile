
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import api from "./api";

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

function MovieDetails() {
  const { id } = useParams();

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    async function fetchMovie() {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(`/api/movies/${id}`);
        setMovie(response.data.data);
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Unable to load movie details."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchMovie();
  }, [id]);

  async function addToWatchlist() {
    try {
      setSaving(true);
      setSaveMessage("");
      setSaveError("");

      await api.post("/activities", {
        mediaId: movie.id,
        mediaType: "movie",
        title: movie.title,
        status: "plan_to_watch",
      });

      setSaveMessage("Added to your watchlist!");
    } catch (error) {
      setSaveError(
        error.response?.data?.message ||
          "Unable to add this movie."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="app">Loading movie details...</main>;
  }

  if (error) {
    return (
      <main className="app">
        <p className="error">{error}</p>
        <Link to="/">Back to search</Link>
      </main>
    );
  }

  if (!movie) {
    return <main className="app">Movie not found.</main>;
  }

  const posterPath = movie.posterPath || null;
  const posterUrl = posterPath
    ? posterPath.startsWith("http")
      ? posterPath
      : `${IMAGE_BASE_URL}${posterPath}`
    : null;

  return (
    <main className="app">
      <Link to="/">← Back to search</Link>

      <section className="details">
        {posterUrl && (
          <img
            className="details-poster"
            src={posterUrl}
            alt={`${movie.title} poster`}
          />
        )}

        <div>
          <h1>{movie.title}</h1>

          {movie.tagline && <p>{movie.tagline}</p>}

          <p>
            <strong>Release date:</strong>{" "}
            {movie.releaseDate || "Unknown"}
          </p>

          <p>
            <strong>Runtime:</strong>{" "}
            {movie.runtime ? `${movie.runtime} minutes` : "Unknown"}
          </p>

          <p>
            <strong>Rating:</strong>{" "}
            {typeof movie.rating === "number"
              ? movie.rating.toFixed(1)
              : "Not available"}
          </p>

          <p>
            <strong>Genres:</strong>{" "}
            {movie.genres?.length
                ? movie.genres
                    .map((genre) => genre.name)
                    .join(", ")
                : "Not available"}
          </p>

          <h2>Overview</h2>
          <p>{movie.overview || "No overview available."}</p>
          
          <button onClick={addToWatchlist} disabled={saving}>
            {saving ? "Adding..." : "＋ Add to Watchlist"}
          </button>

          {saveMessage && <p>{saveMessage}</p>}
          {saveError && <p className="error">{saveError}</p>}
        </div>
      </section>
    </main>
  );
}

export default MovieDetails;
