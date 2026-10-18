
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "./api";

function TVDetails() {
  const { id } = useParams();

  const [show, setShow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    async function fetchShow() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/movies/tv/${id}`);
        setShow(response.data.data);
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Unable to load TV show details."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchShow();
  }, [id]);

  async function addToWatchlist() {
    if (!show || adding) return;

    try {
      setAdding(true);
      setMessage("");
      setActionError("");

      await api.post("/activities", {
        mediaId: show.id,
        mediaType: "tv",
        title: show.name,
        status: "plan_to_watch",
      });

      setMessage(`${show.name} added to your watchlist!`);
    } catch (error) {
      setActionError(
        error.response?.data?.message ||
          "Unable to add this show to your watchlist."
      );
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return <main className="app">Loading TV show...</main>;
  }

  if (error) {
    return (
      <main className="app">
        <p className="error">{error}</p>
        <Link to="/">Back to discovery</Link>
      </main>
    );
  }

  if (!show) {
    return <main className="app">TV show not found.</main>;
  }

  return (
    <main className="app">
      <Link to="/">← Back to discovery</Link>

      <section className="details">
        {show.posterUrl && (
          <img
            className="details-poster"
            src={show.posterUrl}
            alt={`${show.name} poster`}
          />
        )}

        <div>
          <h1>{show.name}</h1>

          {show.tagline && <p>{show.tagline}</p>}

          <p>
            <strong>First aired:</strong>{" "}
            {show.firstAirDate || "Unknown"}
          </p>

          <p>
            <strong>Last aired:</strong>{" "}
            {show.lastAirDate || "Unknown"}
          </p>

          <p>
            <strong>Seasons:</strong>{" "}
            {show.numberOfSeasons ?? "Unknown"}
          </p>

          <p>
            <strong>Episodes:</strong>{" "}
            {show.numberOfEpisodes ?? "Unknown"}
          </p>

          <p>
            <strong>Rating:</strong>{" "}
            {typeof show.rating === "number"
              ? show.rating.toFixed(1)
              : "Not available"}
          </p>

          <p>
            <strong>Genres:</strong>{" "}
            {show.genres?.length
              ? show.genres.map((genre) => genre.name).join(", ")
              : "Not available"}
          </p>

          <h2>Overview</h2>
          <p>{show.overview || "No overview available."}</p>

          <button
            type="button"
            onClick={addToWatchlist}
            disabled={adding}
          >
            {adding ? "Adding..." : "+ Add to Watchlist"}
          </button>

          {message && <p role="status">{message}</p>}
          {actionError && (
            <p className="error" role="alert">{actionError}</p>
          )}
        </div>
      </section>
    </main>
  );
}

export default TVDetails;
