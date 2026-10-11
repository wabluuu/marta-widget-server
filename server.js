import express from "express";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import cors from "cors";
import helmet from "helmet";
import "dotenv/config";

import cache from "./cache.js";
import {
  MARTA_LINES,
  MARTA_STATIONS,
  MARTA_DESTINATIONS,
  isValidLine,
  isValidStation,
  isValidDestination,
  normalize,
} from "./consts.js";

const app = express();
const port = process.env.PORT || 8000;

const CACHE_TTL_MS = 20 * 1000; // 20 seconds

const MARTA_API_KEY = process.env.MARTA_API_KEY;
const MARTA_URL =
  "https://developerservices.itsmarta.com:18096/itsmarta/railrealtimearrivals/developerservices/traindata";

if (!MARTA_API_KEY) {
  console.error(
    "Missing MARTA_API_KEY in environment. Set it in .env before starting.",
  );
  process.exit(1);
}

// =======================================
// Middleware
// =======================================

const corsOptions = {
  origin: ["https://wabluuu.github.io", "http://localhost:3000"],
  optionsSuccessStatus: 200,
};

// Maximum of 10 reuests per IP address within a 1 minute window
const rateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 10,
  handler: (req, res, _next, options) => {
    errorWithTime(
      `Rate limit exceeded ip=${req.ip} path=${req.path} client=${req.get("x-client-id") ?? "unknown"}`,
    );
    res.status(options.statusCode).json({
      error: "Too many requests. Please slow down and try again shortly.",
    });
  },
});

// Delay requests for 2 seconds after first request
const speedLimiter = slowDown({
  windowMs: 1 * 60 * 1000,
  delayAfter: 1,
  delayMs: () => 2 * 1000,
});

app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors(corsOptions));
app.use(rateLimiter);
app.use(speedLimiter);

// =======================================

const logWithTime = (message) => {
  if (typeof message !== "string") return;
  const date = new Date(Date.now());
  console.log(`[${date.toISOString()}] ${message}`);
};

const errorWithTime = (message) => {
  if (typeof message !== "string") return;
  const date = new Date(Date.now());
  console.error(`[${date.toISOString()}] ${message}`);
};

let inFlight = null;
const fetchMartaData = async () => {
  const cached = cache.get(CACHE_TTL_MS);
  if (cached) return { data: cached, cacheHit: true };

  if (!inFlight) {
    logWithTime("-> Cache miss");
    inFlight = (async () => {
      const response = await fetch(`${MARTA_URL}?apiKey=${MARTA_API_KEY}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        throw new Error(`MARTA API responded with ${response.status}`);
      }
      const data = await response.json();
      cache.set(data);
      return data;
    })().finally(() => {
      inFlight = null;
    });
  }

  const data = await inFlight;
  return { data, cacheHit: false };
};

app.get("/next-train", async (req, res) => {
  const start = Date.now();
  const clientId = req.get("x-client-id") ?? "unknown";
  let cacheHit = null;

  res.on("finish", () => {
    console.log(
      JSON.stringify({
        t: new Date().toISOString(),
        evt: "next_train",
        client: clientId,
        station: req.query.station,
        line: req.query.line,
        dest: req.query.destination,
        status: res.statusCode,
        cacheHit,
        ms: Date.now() - start,
      }),
    );
  });

  const { station, line, destination } = req.query;
  const userStation = normalize(station);
  const userLine = normalize(line);
  const userDest = normalize(destination);

  if (!isValidLine(userLine)) {
    return res.status(400).json({
      error: 'Missing/invalid "line" query parameter.',
      supportedLines: MARTA_LINES,
    });
  }

  if (!isValidStation(userStation)) {
    return res.status(400).json({
      error: 'Missing/invalid "station" query parameter.',
      supportedStations: MARTA_STATIONS,
    });
  }

  if (!isValidDestination(userDest)) {
    return res.status(400).json({
      error: 'Missing/invalid "destination" query parameter.',
      supportedDestinations: MARTA_DESTINATIONS,
    });
  }

  try {
    const { data: allTrainData, cacheHit: hit } = await fetchMartaData();
    cacheHit = hit;
    const requestedData = allTrainData.filter(
      (data) =>
        normalize(data["DESTINATION"]) === userDest &&
        normalize(data["LINE"]) === userLine &&
        normalize(data["STATION"]) === userStation,
    );

    const arrivals = requestedData
      .map((data) => ({
        destination: data.DESTINATION,
        line: data.LINE,
        station: data.STATION,
        arrival: data.NEXT_ARR,
        waitingTime: data.WAITING_TIME,
        asOf: data.EVENT_TIME,
      }))
      .sort((a, b) => new Date(a.arrival) - new Date(b.arrival));
    const nextArrivals = arrivals.slice(0, 3);

    if (nextArrivals.length === 0) {
      return res.status(200).json({ arrivals: [] });
    }

    return res.status(200).json({ arrivals: nextArrivals });
  } catch (err) {
    errorWithTime(`Error fetching MARTA data: ${err.message}`);
    res.status(502).json({
      error: "Unable to fetch live train data right now. Try again shortly.",
    });
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, _req, res, _next) => {
  errorWithTime(`Unhandled error: ${err.message}`);
  res.status(500).json({ error: "Something went wrong." });
});

app.listen(port, () =>
  logWithTime(`Marta widget backend listening on port ${port}`),
);
