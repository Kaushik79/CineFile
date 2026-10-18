
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

import api from "./api";
import "./Analytics.css";

function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await api.get("/activities/analytics");
        setAnalytics(response.data.data);

        const monthlyResponse = await api.get("/activities/analytics/monthly");
        setMonthlyData(monthlyResponse.data.data);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load analytics. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return <div className="analytics-message">Loading your insights...</div>;
  }

  if (error) {
    return <div className="analytics-error">{error}</div>;
  }

  const statusData = [
    { name: "Watched", count: analytics.watched },
    { name: "Watching", count: analytics.watching },
    { name: "Plan to Watch", count: analytics.planToWatch },
  ];

  const mediaData = [
    { name: "Movies", count: analytics.movies },
    { name: "TV Shows", count: analytics.tvShows },
  ];

  const mediaColors = ["#8b5cf6", "#06b6d4"];

  const summaryCards = [
    {
      label: "Total Activities",
      value: analytics.totalActivities,
    },
    {
      label: "Movies",
      value: analytics.movies,
    },
    {
      label: "TV Shows",
      value: analytics.tvShows,
    },
    {
      label: "Average Rating",
      value: `${analytics.averageRating}/10`,
    },
  ];

  return (
    <main className="analytics-page">
      <header className="analytics-header">
        <div>
          <h1>CineFile Insights</h1>
          <p>Your personal movie and TV tracking statistics.</p>
        </div>
      </header>

      <section className="analytics-summary">
        {summaryCards.map((card) => (
          <article className="analytics-card" key={card.label}>
            <p>{card.label}</p>
            <h2>{card.value}</h2>
          </article>
        ))}
      </section>

      {analytics.totalActivities === 0 ? (
        <section className="analytics-empty">
          <h2>Your story starts here 🎬</h2>
          <p>
            Add movies or TV shows to your activity log to see your insights.
          </p>
        </section>
      ) : (
        <section className="analytics-charts">
          <article className="analytics-chart-card">
            <h2>Activity Status</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Activities" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </article>

          <article className="analytics-chart-card">
            <h2>Movies vs TV Shows</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={mediaData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  label
                >
                  {mediaData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={mediaColors[index]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </article>

          
<article className="analytics-chart-card">
  <h2>Monthly Activity Trends</h2>

  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={monthlyData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="month" />
      <YAxis allowDecimals={false} />
      <Tooltip />
      <Legend />

      <Line
        type="monotone"
        dataKey="movies"
        name="Movies"
        stroke="#8b5cf6"
        strokeWidth={2}
      />

      <Line
        type="monotone"
        dataKey="tvShows"
        name="TV Shows"
        stroke="#06b6d4"
        strokeWidth={2}
      />
    </LineChart>
  </ResponsiveContainer>
</article>

        </section>
      )}
    </main>
  );
}

export default Analytics;
