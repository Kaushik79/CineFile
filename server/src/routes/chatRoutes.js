
const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const router = express.Router();

const MODEL_NAME = "gemini-3.1-flash-lite";

const SYSTEM_INSTRUCTION = `
You are CineFile AI, a friendly movie and TV recommendation assistant.
Your name is CLIFF.

Help users discover films and television shows, discuss genres,
explain movie themes, and suggest what to watch.

Be concise, conversational, and helpful.
If you are unsure about a release date or factual detail, say so.
Do not claim that a title is available on a particular streaming
platform unless that information has been verified.
`;


async function searchTMDB(query, mediaType, token) {
  const endpoint =
    mediaType === "tv" ? "search/tv" : "search/movie";

  const url = new URL(
    `https://api.themoviedb.org/3/${endpoint}`
  );

  url.searchParams.set("query", query);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("language", "en-US");
  url.searchParams.set("page", "1");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error("TMDB search failed.");
  }

  const data = await response.json();

  return (data.results || []).slice(0, 3).map((item) => ({
    id: item.id,
    mediaType,
    title: mediaType === "tv" ? item.name : item.title,
    releaseDate:
      mediaType === "tv" ? item.first_air_date : item.release_date,
    posterUrl: item.poster_path
      ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
      : null,
    rating: item.vote_average,
    overview: item.overview,
  }));
}



router.post("/recommendations", async (req, res) => {
  try {
    const { message, mediaType = "movie" } = req.body;

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 2000
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a message of at most 2000 characters.",
      });
    }

    if (!["movie", "tv"].includes(mediaType)) {
      return res.status(400).json({
        success: false,
        message: "mediaType must be movie or tv.",
      });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const tmdbToken = process.env.TMDB_BEARER_TOKEN;

    if (!geminiKey || !tmdbToken) {
      return res.status(500).json({
        success: false,
        message: "Recommendation service is not configured.",
      });
    }

    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `
The user wants ${mediaType === "tv" ? "TV shows" : "movies"}.

User request: ${message.trim()}

Suggest 3 specific, existing titles that fit the request.
Return only a JSON array of title strings, for example:
["Interstellar", "Arrival", "Inception"]

Do not include markdown or explanations.
`,
      config: {
        maxOutputTokens: 200,
      },
    });

    const rawText = response.text?.trim() || "";
    const jsonText = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

    let titles;

    try {
      titles = JSON.parse(jsonText);
    } catch {
      return res.status(502).json({
        success: false,
        message: "Unable to interpret AI recommendations. Try again.",
      });
    }

    if (
      !Array.isArray(titles) ||
      !titles.every(
        (title) => typeof title === "string" && title.trim()
      )
    ) {
      return res.status(502).json({
        success: false,
        message: "The AI returned invalid recommendations.",
      });
    }

    const uniqueTitles = [...new Set(
      titles.map((title) => title.trim())
    )].slice(0, 3);

    const searchResults = await Promise.all(
      uniqueTitles.map((title) =>
        searchTMDB(title, mediaType, tmdbToken)
      )
    );

    const recommendations = [];
    const seenIds = new Set();

    for (const results of searchResults) {
      const match = results[0];

      if (match && !seenIds.has(match.id)) {
        seenIds.add(match.id);
        recommendations.push(match);
      }
    }

    return res.status(200).json({
      success: true,
      reply: "Here are some titles that match your request.",
      recommendations,
    });
  } catch (error) {
    console.error("Recommendation request failed.");

    return res.status(502).json({
      success: false,
      message: "Unable to generate recommendations right now.",
    });
  }
});


router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "A non-empty message is required.",
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Message must be 2000 characters or fewer.",
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "AI assistant is not configured.",
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: message.trim(),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        maxOutputTokens: 500,
      },
    });

    const reply = response.text;

    if (!reply || !reply.trim()) {
      return res.status(502).json({
        success: false,
        message: "The AI assistant returned an empty response.",
      });
    }

    return res.status(200).json({
      success: true,
      reply: reply.trim(),
    });
//   } catch (error) {
//     // Log only a generic message; never log API keys or request headers.
//     console.error("CineFile AI request failed.");

//     return res.status(502).json({
//       success: false,
//       message: "The AI assistant is temporarily unavailable.",
//     });
//   }


} catch (error) {
  console.error("CineFile AI diagnostic:", {
    name: error.name,
    status: error.status,
    message: String(error.message || "Unknown error")
      .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[REDACTED]")
      .slice(0, 500),
  });

  return res.status(502).json({
    success: false,
    message: "The AI assistant is temporarily unavailable.",
  });
}

});

module.exports = router;
