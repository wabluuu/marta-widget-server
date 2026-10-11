// Minimal in-memory cache.
//
// Since MARTA's endpoint returns ALL stations in one payload,
// cache that one upstream response and let every request read
// from it, rather than re-fetching per station.

let cachedData = null;
let cachedAt = 0;

function get(ttlMs) {
  if (cachedData && Date.now() - cachedAt < ttlMs) {
    const date = new Date(Date.now());
    console.log(`[${date.toISOString()}] -> Cache hit`);
    return cachedData;
  }
  return null;
}

function set(data) {
  cachedData = data;
  cachedAt = Date.now();
}

export default { get, set };
