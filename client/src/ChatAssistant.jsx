
import { useState } from "react";
import { Link } from "react-router-dom";
import api from "./api";
import "./ChatAssistant.css";

function ChatAssistant() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hey! I'm CineFile AI 🎬 Tell me your mood or favorite genre, and I'll help you discover something to watch.",
    },
  ]);

  const [input, setInput] = useState("");
  const [mediaType, setMediaType] = useState("movie");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(event) {
    event.preventDefault();

    const message = input.trim();

    if (!message || loading) return;

    setInput("");
    setError("");
    setMessages((previous) => [
      ...previous,
      { role: "user", content: message },
    ]);
    setLoading(true);

    try {
      const response = await api.post("/chat/recommendations", {
        message,
        mediaType,
      });

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: response.data.reply,
          recommendations: response.data.recommendations || [],
        },
      ]);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to get recommendations. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="chat-page">
      <section className="chat-container">
        <header className="chat-header">
          <div className="chat-avatar">✦</div>
          <div>
            <h1>CineFile AI</h1>
            <p>Your personal movie and TV assistant</p>
          </div>
        </header>

        <div className="chat-preferences">
          <label htmlFor="chat-media-type">Recommend:</label>
          <select
            id="chat-media-type"
            value={mediaType}
            onChange={(event) => setMediaType(event.target.value)}
            disabled={loading}
          >
            <option value="movie">Movies</option>
            <option value="tv">TV Shows</option>
          </select>
        </div>

        <div className="chat-messages" aria-live="polite">
          {messages.map((message, index) => (
            <div
              key={`${index}-${message.role}`}
              className={`chat-message ${message.role}`}
            >
              <span className="chat-role">
                {message.role === "user" ? "You" : "CineFile AI"}
              </span>

              <p>{message.content}</p>

              {message.recommendations?.length > 0 && (
                <div className="chat-recommendations">
                  {message.recommendations.map((item) => (
                    <article
                      className="chat-recommendation-card"
                      key={`${item.mediaType}-${item.id}`}
                    >
                      {item.posterUrl ? (
                        <img
                          src={item.posterUrl}
                          alt={`${item.title} poster`}
                        />
                      ) : (
                        <div className="chat-poster-placeholder">
                          No poster
                        </div>
                      )}

                      <div className="chat-recommendation-info">
                        <h3>{item.title}</h3>

                        <p>
                          {item.releaseDate || "Release date unavailable"}
                        </p>

                        <p>
                          Rating:{" "}
                          {typeof item.rating === "number"
                            ? item.rating.toFixed(1)
                            : "N/A"}
                        </p>

                        <Link
                          to={
                            item.mediaType === "tv"
                              ? `/tv/${item.id}`
                              : `/movies/${item.id}`
                          }
                        >
                          View details →
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="chat-message assistant">
              <span className="chat-role">CineFile AI</span>
              <p>Finding titles for you...</p>
            </div>
          )}
        </div>

        {error && (
          <p className="chat-error" role="alert">
            {error}
          </p>
        )}

        <form className="chat-form" onSubmit={sendMessage}>
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Describe what you want to watch..."
            maxLength={2000}
            aria-label="Your message"
            disabled={loading}
          />

          <button type="submit" disabled={loading || !input.trim()}>
            {loading ? "Searching..." : "Send"}
          </button>
        </form>

        <p className="chat-disclaimer">
          Recommendations use TMDB title records. Ratings and release dates
          may change as source data is updated.
        </p>
      </section>
    </main>
  );
}

export default ChatAssistant;
