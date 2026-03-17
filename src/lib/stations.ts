import type { GroupedStation, StationRecord } from "@/types/bus";

const DEFAULT_COORDINATE_TOLERANCE = 0.00003;

const coordinateKey = (lat: number, lng: number, tolerance: number): string => {
  const latBucket = Math.round(lat / tolerance) * tolerance;
  const lngBucket = Math.round(lng / tolerance) * tolerance;

  return `${latBucket.toFixed(6)},${lngBucket.toFixed(6)}`;
};

export const groupStationsByLocation = (
  stations: StationRecord[],
  tolerance = DEFAULT_COORDINATE_TOLERANCE,
): GroupedStation[] => {
  const grouped = new Map<string, GroupedStation>();

  for (const station of stations) {
    const key = coordinateKey(station.Lat, station.Lng, tolerance);
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, {
        key,
        lat: station.Lat,
        lng: station.Lng,
        stationNames: [station.StationName],
        addresses: [station.Address],
        routeIds: [station.RouteId],
      });
      continue;
    }

    existing.lat = (existing.lat + station.Lat) / 2;
    existing.lng = (existing.lng + station.Lng) / 2;

    if (!existing.stationNames.includes(station.StationName)) {
      existing.stationNames.push(station.StationName);
    }

    if (!existing.addresses.includes(station.Address)) {
      existing.addresses.push(station.Address);
    }

    if (!existing.routeIds.includes(station.RouteId)) {
      existing.routeIds.push(station.RouteId);
    }
  }

  return Array.from(grouped.values()).sort((a, b) => a.stationNames[0].localeCompare(b.stationNames[0], "vi"));
};
