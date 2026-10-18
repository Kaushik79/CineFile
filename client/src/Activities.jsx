
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "./api";

function Activities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchActivities() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/activities");
        setActivities(response.data.data);
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Unable to load your activities."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchActivities();
  }, []);

  
    async function updateActivity(id, changes) {
        try {
            setError("");

            const response = await api.patch(
            `/activities/${id}`,
            changes
            );

            setActivities((currentActivities) =>
            currentActivities.map((activity) =>
                activity._id === id
                ? response.data.data
                : activity
            )
            );
        } catch (error) {
            setError(
            error.response?.data?.message ||
                "Unable to update activity."
            );
        }
    }

    async function deleteActivity(id) {
        try {
            setError("");

            await api.delete(`/activities/${id}`);

            setActivities((currentActivities) =>
            currentActivities.filter(
                (activity) => activity._id !== id
            )
            );
        } catch (error) {
            setError(
            error.response?.data?.message ||
                "Unable to delete activity."
            );
        }
    }


  if (loading) {
    return <main className="app">Loading your activities...</main>;
  }

  if (error) {
    return (
      <main className="app">
        <p className="error">{error}</p>
        <Link to="/">Back to movie search</Link>
      </main>
    );
  }

  return (
    <main className="app">
      <Link to="/">← Back to search</Link>

      <h1>My CineFile</h1>
      <p>Your personal movie and TV activity.</p>

      {activities.length === 0 ? (
        <p>
          Your list is empty. Search for a movie and add your first title!
        </p>
      ) : (
        <section className="activity-list">
          {activities.map((activity) => (
            <article className="activity-card" key={activity._id}>
              <h2>{activity.title}</h2>

              <p>
                Type: {activity.mediaType === "tv" ? "TV" : "Movie"}
              </p>

              <p>Status: {activity.status.replaceAll("_", " ")}</p>

              <p>
                Rating:{" "}
                {activity.rating ?? "Not rated"}
              </p>

              {activity.review && <p>{activity.review}</p>}

              
            <label>
                Status
                <select
                    value={activity.status}
                    onChange={(event) =>
                    updateActivity(activity._id, {
                        status: event.target.value,
                    })
                    }>
                    <option value="plan_to_watch">Plan to Watch</option>
                    <option value="watching">Watching</option>
                    <option value="watched">Watched</option>
                </select>
            </label>

            <label>
                Your rating (0–10)
                <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={activity.rating ?? ""}
                    onChange={(event) => {
                    const value = event.target.value;

                    if (value === "") {
                        updateActivity(activity._id, { rating: null });
                    } else if (
                        Number(value) >= 0 &&
                        Number(value) <= 10
                    ) {
                        updateActivity(activity._id, {
                        rating: Number(value),
                        });
                    }
                    }}
                />
            </label>

            <button
                type="button"
                onClick={() => deleteActivity(activity._id)}>
                Remove
            </button>

            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default Activities;
