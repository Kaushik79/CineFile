
const express = require("express");

const router = express.Router();

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL =
  "https://image.tmdb.org/t/p/w500";

const TMDB_BACKDROP_BASE_URL =
  "https://image.tmdb.org/t/p/w1280";

// Validate pagination input.
function getPage(req, res) {
  const page = Number(req.query.page ?? 1);

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 500
  ) {
    res.status(400).json({
      success: false,
      message:
        "Page must be an integer between 1 and 500.",
    });

    return null;
  }

  return page;
}

// Build an absolute image URL or return null.
function getImageUrl(path, baseUrl) {
  return path ? `${baseUrl}${path}` : null;
}

// Send a request to TMDB without exposing the token.
async function fetchTMDB(url, token) {
  return fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(10000),
  });
}

// Handle unexpected errors consistently.
function handleTMDBError(res, error, label) {
  console.error(`${label}:`, error.message);

  if (error.cause) {
    console.error("Underlying cause:", {
      code: error.cause.code,
      message: error.cause.message,
    });
  }

  if (
    error.name === "TimeoutError" ||
    error.name === "AbortError"
  ) {
    return res.status(504).json({
      success: false,
      message: "Movie service timed out. Try again.",
    });
  }

  return res.status(502).json({
    success: false,
    message: "Unable to contact the movie service.",
  });
}

// GET /api/movies/search?query=Interstellar&page=1
router.get("/search", async (req, res) => {
  try {
    const query = req.query.query;

    if (
      typeof query !== "string" ||
      !query.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "A movie search query is required.",
      });
    }

    if (query.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message:
          "Search query must be 100 characters or fewer.",
      });
    }

    const token = process.env.TMDB_BEARER_TOKEN;

    if (!token) {
      return res.status(500).json({
        success: false,
        message: "Movie search is not configured.",
      });
    }

    const page = getPage(req, res);

    if (page === null) {
      return;
    }

    const url = new URL(
      `${TMDB_BASE_URL}/search/movie`
    );

    url.searchParams.set("query", query.trim());
    url.searchParams.set("include_adult", "false");
    url.searchParams.set("language", "en-US");
    url.searchParams.set("page", String(page));

    const tmdbResponse = await fetchTMDB(url, token);

    if (!tmdbResponse.ok) {
      console.error(
        "TMDB movie search status:",
        tmdbResponse.status
      );

      return res.status(
        tmdbResponse.status === 429 ? 503 : 502
      ).json({
        success: false,
        message:
          tmdbResponse.status === 429
            ? "Movie service is temporarily busy."
            : "Unable to retrieve movies from TMDB.",
      });
    }

    const data = await tmdbResponse.json();

    const movies = data.results.map((movie) => ({
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      releaseDate: movie.release_date,
      posterUrl: getImageUrl(
        movie.poster_path,
        TMDB_IMAGE_BASE_URL
      ),
      backdropUrl: getImageUrl(
        movie.backdrop_path,
        TMDB_BACKDROP_BASE_URL
      ),
      rating: movie.vote_average,
    }));

    return res.status(200).json({
      success: true,
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
      data: movies,
    });
  } catch (error) {
    return handleTMDBError(
      res,
      error,
      "Movie search error"
    );
  }
});

// GET /api/movies/tv/search?query=Wednesday&page=1
// Keep this specific route before /:id.
router.get("/tv/search", async (req, res) => {
  try {
    const query = req.query.query;

    if (
      typeof query !== "string" ||
      !query.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "A TV show search query is required.",
      });
    }

    if (query.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message:
          "Search query must be 100 characters or fewer.",
      });
    }

    const token = process.env.TMDB_BEARER_TOKEN;

    if (!token) {
      return res.status(500).json({
        success: false,
        message: "TV search is not configured.",
      });
    }

    const page = getPage(req, res);

    if (page === null) {
      return;
    }

    // IMPORTANT: TV search must use /search/tv.
    const url = new URL(
      `${TMDB_BASE_URL}/search/tv`
    );

    url.searchParams.set("query", query.trim());
    url.searchParams.set("language", "en-US");
    url.searchParams.set("page", String(page));

    const tmdbResponse = await fetchTMDB(url, token);

    if (!tmdbResponse.ok) {
      console.error(
        "TMDB TV search status:",
        tmdbResponse.status
      );

      return res.status(
        tmdbResponse.status === 429 ? 503 : 502
      ).json({
        success: false,
        message:
          tmdbResponse.status === 429
            ? "TV service is temporarily busy."
            : "Unable to retrieve TV shows from TMDB.",
      });
    }

    const data = await tmdbResponse.json();

    const shows = data.results.map((show) => ({
      id: show.id,
      name: show.name,
      overview: show.overview,
      firstAirDate: show.first_air_date,
      posterUrl: getImageUrl(
        show.poster_path,
        TMDB_IMAGE_BASE_URL
      ),
      backdropUrl: getImageUrl(
        show.backdrop_path,
        TMDB_BACKDROP_BASE_URL
      ),
      rating: show.vote_average,
    }));

    return res.status(200).json({
      success: true,
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
      data: shows,
    });
  } catch (error) {
    return handleTMDBError(
      res,
      error,
      "TV search error"
    );
  }
});


 // GET /api/movies/tv/:id
router.get("/tv/:id", async (req, res) => {
  try {
    const tvId = req.params.id;

    if (!/^[1-9]\d*$/.test(tvId)) {
      return res.status(400).json({
        success: false,
        message: "A valid TV show ID is required.",
      });
    }

    const token = process.env.TMDB_BEARER_TOKEN;

    if (!token) {
      return res.status(500).json({
        success: false,
        message: "TV service is not configured.",
      });
    }

    const url = new URL(`${TMDB_BASE_URL}/tv/${tvId}`);
    url.searchParams.set("language", "en-US");

    const tmdbResponse = await fetchTMDB(url, token);

    if (tmdbResponse.status === 404) {
      return res.status(404).json({
        success: false,
        message: "TV show not found.",
      });
    }

    if (!tmdbResponse.ok) {
      return res.status(502).json({
        success: false,
        message: "Unable to retrieve TV show details.",
      });
    }

    const show = await tmdbResponse.json();

    return res.status(200).json({
      success: true,
      data: {
        id: show.id,
        name: show.name,
        overview: show.overview,
        firstAirDate: show.first_air_date,
        lastAirDate: show.last_air_date,
        numberOfSeasons: show.number_of_seasons,
        numberOfEpisodes: show.number_of_episodes,
        genres: show.genres.map((genre) => ({
          id: genre.id,
          name: genre.name,
        })),
        posterUrl: getImageUrl(
          show.poster_path,
          TMDB_IMAGE_BASE_URL
        ),
        backdropUrl: getImageUrl(
          show.backdrop_path,
          TMDB_BACKDROP_BASE_URL
        ),
        rating: show.vote_average,
        status: show.status,
        tagline: show.tagline,
        originalLanguage: show.original_language,
      },
    });
  } catch (error) {
    return handleTMDBError(
      res,
      error,
      "TV details error"
    );
  }
});


// GET /api/movies/:id
router.get("/:id", async (req, res) => {
  try {
    const movieId = req.params.id;

    if (!/^[1-9]\d*$/.test(movieId)) {
      return res.status(400).json({
        success: false,
        message: "A valid movie ID is required.",
      });
    }

    const token = process.env.TMDB_BEARER_TOKEN;

    if (!token) {
      return res.status(500).json({
        success: false,
        message:
          "Movie service is not configured.",
      });
    }

    const url = new URL(
      `${TMDB_BASE_URL}/movie/${movieId}`
    );

    url.searchParams.set("language", "en-US");

    const tmdbResponse = await fetchTMDB(url, token);

    if (tmdbResponse.status === 404) {
      return res.status(404).json({
        success: false,
        message: "Movie not found.",
      });
    }

    if (!tmdbResponse.ok) {
      console.error(
        "TMDB movie details status:",
        tmdbResponse.status
      );

      return res.status(502).json({
        success: false,
        message:
          "Unable to retrieve movie details.",
      });
    }

    const movie = await tmdbResponse.json();

    return res.status(200).json({
      success: true,
      data: {
        id: movie.id,
        title: movie.title,
        overview: movie.overview,
        releaseDate: movie.release_date,
        runtime: movie.runtime,
        genres: movie.genres.map(
          (genre) => ({
            id: genre.id,
            name: genre.name,
          })
        ),
        posterUrl: getImageUrl(
          movie.poster_path,
          TMDB_IMAGE_BASE_URL
        ),
        backdropUrl: getImageUrl(
          movie.backdrop_path,
          TMDB_BACKDROP_BASE_URL
        ),
        rating: movie.vote_average,
        voteCount: movie.vote_count,
        status: movie.status,
        tagline: movie.tagline,
        originalLanguage: movie.original_language,
      },
    });
  } catch (error) {
    return handleTMDBError(
      res,
      error,
      "Movie details error"
    );
  }
});

module.exports = router;
