export const MARTA_LINES = ["Gold", "Red", "Blue", "Green"];

export const MARTA_DESTINATIONS = [
  "North Springs",
  "Airport",
  "Doraville",
  // MARTA uses period in the name for destination but not station
  "Hamilton E. Holmes",
  "Indian Creek",
  "Bankhead",
  "Edgewood-Candler Park",
];

export const MARTA_STATIONS = [
  "North Springs",
  "Sandy Springs",
  "Dunwoody",
  "Medical Center",
  "Buckhead",
  "Doraville",
  "Chamblee",
  "Brookhaven",
  "Lenox",
  "Lindbergh Center",
  "Arts Center",
  "Midtown",
  "North Ave",
  "Civic Center",
  "Peachtree Center",
  "Five Points",
  "Garnett",
  "West End",
  "Oakland City",
  "Lakewood",
  "East Point",
  "College Park",
  "Airport",
  "Bankhead",
  "Hamilton E Holmes",
  "West Lake",
  "Ashby",
  "Vine City",
  "SEC District",
  "Georgia State",
  "King Memorial",
  "Inman Park",
  "Edgewood Candler Park",
  "East Lake",
  "Decatur",
  "Avondale",
  "Kensington",
  "Indian Creek",
];

// Normalize names to just characters
export const normalize = (str) => {
  return str
    .toUpperCase()
    .replace(/\bSTATION\b/g, "")
    .replace(/[^A-Z]/g, "")
    .trim();
};

const isSupportedLine = (userLine) => {
  return MARTA_LINES.some((line) => normalize(line) === normalize(userLine));
};

export const isValidLine = (userLine) =>
  userLine && typeof userLine === "string" && isSupportedLine(userLine);

const isSupportedStation = (userStation) => {
  return MARTA_STATIONS.some((st) => normalize(st) === normalize(userStation));
};

export const isValidStation = (userStation) =>
  userStation &&
  typeof userStation === "string" &&
  isSupportedStation(userStation);

const isSupportedDestination = (userDest) => {
  return MARTA_STATIONS.some((dest) => normalize(dest) === normalize(userDest));
};

export const isValidDestination = (userDest) =>
  userDest && typeof userDest === "string" && isSupportedDestination(userDest);
