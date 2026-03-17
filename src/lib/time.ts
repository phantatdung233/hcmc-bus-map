const SECONDS_IN_DAY = 24 * 60 * 60;

export const toClockTime = (secondsFromMidnight: number): string => {
  const normalized = ((Math.floor(secondsFromMidnight) % SECONDS_IN_DAY) + SECONDS_IN_DAY) % SECONDS_IN_DAY;
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

export const parseTimeTable = (raw: string): number[] => {
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((token) => Number.parseInt(token.trim(), 10))
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b);
};

export const getCurrentSeconds = (date = new Date()): number => {
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
};

export const getNextDepartures = (timeTable: number[], nowSeconds: number, count = 3): string[] => {
  if (timeTable.length === 0) {
    return [];
  }

  const sameDay = timeTable.filter((value) => value >= nowSeconds).slice(0, count);

  // Only return departures for today, no next day departures
  return sameDay.map((value) => toClockTime(value));
};
