
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "./api";
import "./ReleaseCalendar.css";

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function ReleaseCalendar() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState(() =>
    formatDate(new Date())
  );

  const [mediaFilter, setMediaFilter] = useState("all");
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const startDate = formatDate(new Date(year, month, 1));
  const endDate = formatDate(new Date(year, month + 1, 0));

  useEffect(() => {
    let cancelled = false;

    async function fetchReleases() {
      setLoading(true);
      setError("");

      try {
        const requests = [];

        if (mediaFilter !== "tv") {
          requests.push(
            api.get("/movies/calendar/movies", {
              params: { startDate, endDate },
            })
          );
        }

        if (mediaFilter !== "movie") {
          requests.push(
            api.get("/movies/calendar/tv", {
              params: { startDate, endDate },
            })
          );
        }

        const responses = await Promise.all(requests);
        const allReleases = responses.flatMap(
          (response) => response.data.data
        );

        if (!cancelled) {
          setReleases(
            allReleases.sort((a, b) =>
              (a.releaseDate || "").localeCompare(b.releaseDate || "")
            )
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to load releases. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchReleases();

    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, mediaFilter]);

  const calendarDays = useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return [
      ...Array(firstWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
  }, [year, month]);

  const releasesByDate = useMemo(() => {
    const grouped = {};

    for (const release of releases) {
      if (!release.releaseDate) continue;

      if (!grouped[release.releaseDate]) {
        grouped[release.releaseDate] = [];
      }

      grouped[release.releaseDate].push(release);
    }

    return grouped;
  }, [releases]);

  const selectedReleases = releasesByDate[selectedDate] || [];

  function changeMonth(offset) {
    const nextMonth = new Date(year, month + offset, 1);

    setCurrentMonth(nextMonth);
    setSelectedDate(formatDate(nextMonth));
  }

  return (
    <main className="release-calendar-page">
      <header className="calendar-header">
        <div>
          <h1>Release Calendar</h1>
          <p>Discover upcoming movies and TV premieres.</p>
        </div>

        <div className="calendar-filter">
          <label htmlFor="mediaFilter">Show</label>
          <select
            id="mediaFilter"
            value={mediaFilter}
            onChange={(event) => setMediaFilter(event.target.value)}
          >
            <option value="all">Movies & TV</option>
            <option value="movie">Movies only</option>
            <option value="tv">TV shows only</option>
          </select>
        </div>
      </header>

      <section className="calendar-panel">
        <div className="calendar-month-header">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
          >
            ←
          </button>

          <h2>
            {currentMonth.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h2>

          <button
            type="button"
            onClick={() => changeMonth(1)}
            aria-label="Next month"
          >
            →
          </button>
        </div>

        {loading && <p className="calendar-message">Loading releases...</p>}

        {error && <p className="calendar-error">{error}</p>}

        {!loading && !error && (
          <div className="calendar-grid">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
              (day) => (
                <div className="calendar-weekday" key={day}>
                  {day}
                </div>
              )
            )}

            {calendarDays.map((day, index) => {
              if (day === null) {
                return (
                  <div
                    className="calendar-day calendar-day-empty"
                    key={`empty-${index}`}
                  />
                );
              }

              const date = formatDate(new Date(year, month, day));
              const dayReleases = releasesByDate[date] || [];
              const isSelected = selectedDate === date;

              return (
                <button
                  type="button"
                  key={date}
                  className={`calendar-day ${
                    isSelected ? "calendar-day-selected" : ""
                  }`}
                  onClick={() => setSelectedDate(date)}
                  aria-pressed={isSelected}
                >
                  <span>{day}</span>

                  {dayReleases.length > 0 && (
                    <span className="calendar-day-count">
                      {dayReleases.length} release
                      {dayReleases.length === 1 ? "" : "s"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="selected-releases">
        <h2>
          Releases on{" "}
          {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(
            "en-US",
            { month: "long", day: "numeric", year: "numeric" }
          )}
        </h2>

        {!loading && !error && selectedReleases.length === 0 && (
          <p className="calendar-message">
            No releases found for this date. Select another date or month.
          </p>
        )}

        <div className="release-list">
          {selectedReleases.map((release) => (
            <article
              className="release-card"
              key={`${release.mediaType}-${release.id}`}
            >
              {release.posterUrl ? (
                <img src={release.posterUrl} alt={`${release.title} poster`} />
              ) : (
                <div className="release-poster-placeholder">
                  No poster
                </div>
              )}

              <div className="release-card-info">
                <span className="release-media-type">
                  {release.mediaType === "movie" ? "MOVIE" : "TV SHOW"}
                </span>

                <h3>{release.title}</h3>

                <p>
                  {release.releaseDate || "Date unavailable"}
                </p>

                <p>
                  Rating:{" "}
                  {typeof release.rating === "number"
                    ? release.rating.toFixed(1)
                    : "N/A"}
                </p>

                <Link
                  to={
                    release.mediaType === "movie"
                      ? `/movies/${release.id}`
                      : `/tv/${release.id}`
                  }
                >
                  View details →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default ReleaseCalendar;
