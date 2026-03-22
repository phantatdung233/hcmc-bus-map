"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Bus, ChevronDown, ChevronUp, Clock3, LocateFixed, Minus, Plus, Search, Star, Ticket, X, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, mvpRequest } from "@/lib/mvp-client";
import { Input } from "@/components/ui/input";
import routeInfoJson from "@/data/routeinfo.json";
import stationsJson from "@/data/stations.json";
import routesJson from "@/data/routes.json";
import { cn } from "@/lib/utils";
import { getCurrentSeconds, getNextDepartures, parseTimeTable } from "@/lib/time";
import type { RouteInfo, RouteSchedule, StationRecord } from "@/types/bus";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const stationMarkerIcon = L.divIcon({
  className: "bus-marker-icon",
  html: `
    <span class="bus-marker-pin" aria-hidden="true">
      <svg viewBox="0 0 24 24" class="bus-marker-glyph" role="img" aria-label="bus">
        <path d="M6 3h12a3 3 0 0 1 3 3v9a2 2 0 0 1-2 2h-1a2 2 0 1 1-4 0h-4a2 2 0 1 1-4 0H5a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3Zm0 2a1 1 0 0 0-1 1v6h14V6a1 1 0 0 0-1-1H6Zm1.5 10.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1Zm9 0a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1Z"/>
      </svg>
    </span>
  `,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  tooltipAnchor: [0, -14],
});

const userLocationIcon = L.divIcon({
  className: "user-location-icon",
  html: `
    <span aria-hidden="true" style="position:relative; display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px;">
      <span style="position:absolute; width:28px; height:28px; border-radius:9999px; background:rgba(37,99,235,0.2);"></span>
      <span style="position:absolute; width:14px; height:14px; border-radius:9999px; background:#2563eb; box-shadow:0 0 0 2px #ffffff;"></span>
      <svg viewBox="0 0 24 24" style="position:relative; width:12px; height:12px;" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="current location">
        <path d="M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7Z" />
        <path d="M12 2v3" />
        <path d="M12 19v3" />
        <path d="M2 12h3" />
        <path d="M19 12h3" />
      </svg>
    </span>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const HCMC_CENTER: [number, number] = [10.762622, 106.660172];
const DEFAULT_ZOOM = 17;
const MIN_MARKER_ZOOM = 16;
const FOCUS_ZOOM = 17;
const MAX_VISIBLE_MARKERS = 450;

type DirectionFilterValue = "all" | 0 | 1;
type RouteTypeFilterValue = "all" | number;

type StationRouteView = {
  routeId: number;
  routeNo: string;
  routeName: string;
  nextIn: string[];
  nextOut: string[];
  operationTime: string | undefined;
  normalTicket: string | undefined;
  headway: string | undefined;
  type: string | undefined;
  outBoundDescription: string | undefined;
  inBoundDescription: string | undefined;
  orgs: string | undefined;
  timeOfTrip: string | undefined;
  totalTrip: string | undefined;
};

type StationView = {
  key: string;
  stationId: number;
  stationCode: string;
  stationName: string;
  address: string;
  lat: number;
  lng: number;
  routeIds: number[];
  stationDirections: number[];
  stationTypes: Array<number | null>;
};

type SearchResultView = {
  type: "station" | "route";
  station?: StationView;
  route?: StationRouteView;
  label: string;
  subtitle: string;
};

type NearbyStationView = {
  station: StationView;
  distanceKm: number;
};

type RoutePathView = {
  direction: 0 | 1;
  points: [number, number][];
};

type RecentSearchItem = {
  key: string;
  type: "station" | "route";
  refId: number;
  label: string;
};

const stations = stationsJson as StationRecord[];
const routes = routesJson as RouteSchedule[];
const routeInfos = routeInfoJson as RouteInfo[];
const routeMap = new Map(routes.map((route) => [route.RouteId, route]));
const routeInfoMap = new Map(routeInfos.map((route) => [route.RouteId, route]));
const routeTypeMap = new Map(routes.map((route) => [route.RouteId, route.RouteType]));

const ROUTE_TYPE_LABELS: Record<number, string> = {
  1: "Bus thường",
  4: "Bus điện",
  101: "Bus nhanh",
};

const STORAGE_KEYS = {
  favoriteRouteIds: "busmap.favoriteRouteIds",
  favoriteStationIds: "busmap.favoriteStationIds",
  recentSearches: "busmap.recentSearches",
} as const;

const toRad = (value: number) => (value * Math.PI) / 180;

const getDistanceKm = (from: [number, number], to: [number, number]) => {
  const earthRadiusKm = 6371;
  const dLat = toRad(to[0] - from[0]);
  const dLon = toRad(to[1] - from[1]);
  const lat1 = toRad(from[0]);
  const lat2 = toRad(to[0]);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const formatDistance = (distanceKm: number) => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  return `${distanceKm.toFixed(1)} km`;
};

const parsePathPoints = (pathPoints: string): [number, number][] => {
  if (!pathPoints || !pathPoints.trim()) {
    return [];
  }

  const tokens = pathPoints.trim().split(/\s+/);
  const points: [number, number][] = [];

  for (const token of tokens) {
    const [lngStr, latStr] = token.split(",");

    if (!lngStr || !latStr) {
      continue;
    }

    const lng = Number(lngStr);
    const lat = Number(latStr);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }

    const previous = points[points.length - 1];

    if (!previous || previous[0] !== lat || previous[1] !== lng) {
      points.push([lat, lng]);
    }
  }

  return points;
};

const buildRouteView = (routeId: number): StationRouteView | null => {
  const route = routeMap.get(routeId);
  const routeInfo = routeInfoMap.get(routeId);

  if (!route && !routeInfo) {
    return null;
  }

  const nowSeconds = getCurrentSeconds();
  const nextIn = route ? getNextDepartures(parseTimeTable(route.TimeTableIn), nowSeconds, 3) : [];
  const nextOut = route ? getNextDepartures(parseTimeTable(route.TimeTableOut), nowSeconds, 3) : [];

  return {
    routeId,
    routeNo: route?.RouteNo ?? routeInfo?.RouteNo ?? String(routeId),
    routeName: route?.RouteName ?? routeInfo?.RouteName ?? "Đang cập nhật",
    nextIn,
    nextOut,
    operationTime: routeInfo?.OperationTime,
    normalTicket: routeInfo?.NormalTicket,
    headway: routeInfo?.Headway,
    type: routeInfo?.Type,
    outBoundDescription: routeInfo?.OutBoundDescription,
    inBoundDescription: routeInfo?.InBoundDescription,
    orgs: routeInfo?.Orgs,
    timeOfTrip: routeInfo?.TimeOfTrip,
    totalTrip: routeInfo?.TotalTrip,
  };
};

const getPrimaryLabel = (station: StationView): string => {
  return station.stationName || "Trạm xe buýt";
};

const getPrimaryAddress = (station: StationView): string => {
  return station.address || "Chưa có địa chỉ";
};

const getRouteStationsByDirection = (routeId: number, direction: 0 | 1): StationRecord[] => {
  return stations
    .filter((station) => station.RouteId === routeId && station.StationDirection === direction)
    .sort((a, b) => a.StationOrder - b.StationOrder);
};

function RouteItineraryDiagram({
  routeId,
  direction,
  title,
  color,
}: {
  routeId: number;
  direction: 0 | 1;
  title: string;
  color: "blue" | "amber";
}) {
  const stationList = getRouteStationsByDirection(routeId, direction);

  if (stationList.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-slate-50/30 p-4 text-center">
        <p className="text-sm text-slate-500">Đang cập nhật</p>
      </div>
    );
  }

  const isBlue = color === "blue";

  return (
    <div
      className={cn(
        "rounded-2xl border p-1 shadow-sm overflow-hidden flex flex-col",
        isBlue ? "border-blue-100/60 bg-blue-50/20" : "border-amber-100/60 bg-amber-50/20",
      )}
    >
      <div
        className={cn(
          "px-4 py-3 border-b flex items-center justify-between",
          isBlue ? "border-blue-100/50 bg-blue-50/50" : "border-amber-100/50 bg-amber-50/50",
        )}
      >
        <p className={cn("flex items-center gap-2 text-[14px] font-bold", isBlue ? "text-blue-900" : "text-amber-900")}>
          <span
            className={cn("rounded-md p-1.5", isBlue ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600")}
          >
            <Bus className="size-4" />
          </span>
          {title}
        </p>
        <span
          className={cn(
            "text-xs font-semibold px-2 py-1 rounded-full",
            isBlue ? "bg-blue-100/80 text-blue-700" : "bg-amber-100/80 text-amber-700",
          )}
        >
          {stationList.length} trạm
        </span>
      </div>

      <div className="max-h-[360px] overflow-y-auto px-2 py-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/50 overscroll-contain">
        <div className="relative">
          {/* Continuous vertical line */}
          <div
            className={cn(
              "absolute left-[15px] top-[24px] bottom-[24px] w-[2px] rounded-full",
              isBlue ? "bg-blue-200/80" : "bg-amber-200/80",
            )}
          />

          <div className="space-y-1">
            {stationList.map((station, index) => {
              const isFirst = index === 0;
              const isLast = index === stationList.length - 1;
              const isEndpoint = isFirst || isLast;

              return (
                <div key={`${station.StationId}-${index}`} className="flex gap-3 relative z-10 group items-start">
                  <div className="flex flex-col items-center justify-center w-8 shrink-0 pt-[14px]">
                    <div
                      className={cn(
                        "rounded-full z-10 shadow-sm transition-all duration-300 group-hover:scale-[1.3] ring-4 ring-transparent group-hover:ring-white",
                        isEndpoint
                          ? isBlue
                            ? "w-3.5 h-3.5 bg-blue-600 ring-[3px] ring-blue-100"
                            : "w-3.5 h-3.5 bg-amber-600 ring-[3px] ring-amber-100"
                          : isBlue
                            ? "w-2.5 h-2.5 bg-white border-[2.5px] border-blue-400"
                            : "w-2.5 h-2.5 bg-white border-[2.5px] border-amber-400",
                      )}
                    />
                  </div>

                  <div
                    className={cn(
                      "flex-1 min-w-0 rounded-xl px-3 py-2.5 border transition-all duration-200 cursor-pointer",
                      isEndpoint
                        ? isBlue
                          ? "bg-blue-50/50 border-blue-100 hover:bg-white hover:border-blue-200 hover:shadow-sm"
                          : "bg-amber-50/50 border-amber-100 hover:bg-white hover:border-amber-200 hover:shadow-sm"
                        : "bg-transparent border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm",
                    )}
                  >
                    <p
                      className={cn(
                        "text-[13px] font-semibold leading-snug transition-colors",
                        isEndpoint
                          ? isBlue
                            ? "text-blue-800"
                            : "text-amber-800"
                          : "text-slate-700 group-hover:text-blue-600",
                      )}
                    >
                      {station.StationName}
                    </p>
                    {station.Address && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 group-hover:line-clamp-none transition-all">
                        {station.Address}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MapEventsWatcher({
  onZoomChange,
  onBoundsChange,
}: {
  onZoomChange: (zoom: number) => void;
  onBoundsChange: (bounds: L.LatLngBounds) => void;
}) {
  const map = useMapEvents({
    zoomend: (event) => {
      onZoomChange(event.target.getZoom());
      onBoundsChange(event.target.getBounds());
    },
    moveend: (event) => {
      onBoundsChange(event.target.getBounds());
    },
  });

  useEffect(() => {
    onBoundsChange(map.getBounds());
  }, [map, onBoundsChange]);

  return null;
}

function MapViewportController({
  focusStation,
  onMapReady,
}: {
  focusStation: StationView | null;
  onMapReady: (map: L.Map) => void;
}) {
  const map = useMap();

  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);

  useEffect(() => {
    if (!focusStation) {
      return;
    }

    map.flyTo([focusStation.lat, focusStation.lng], Math.max(map.getZoom(), FOCUS_ZOOM), {
      duration: 0.5,
    });
  }, [focusStation, map]);

  return null;
}

export default function BusMap() {
  const [selectedStation, setSelectedStation] = useState<StationView | null>(null);
  const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM);
  const [focusStation, setFocusStation] = useState<StationView | null>(null);
  const [activeTab, setActiveTab] = useState<"nearby" | "favorite" | "recent">("nearby");

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchCollapsed, setIsSearchCollapsed] = useState(true);
  const [mapRef, setMapRef] = useState<L.Map | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<StationRouteView | null>(null);
  const [isRoutePanelCollapsed, setIsRoutePanelCollapsed] = useState(true);
  const [selectedDirection, setSelectedDirection] = useState<DirectionFilterValue>("all");
  const [selectedRouteType, setSelectedRouteType] = useState<RouteTypeFilterValue>("all");
  const [mapCenter, setMapCenter] = useState<[number, number]>(HCMC_CENTER);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "granted" | "denied" | "unsupported">("idle");
  const [favoriteRouteIds, setFavoriteRouteIds] = useState<number[]>([]);
  const [favoriteStationIds, setFavoriteStationIds] = useState<number[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);
  const hasRequestedLocation = useRef(false);

  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [walletUserEmail, setWalletUserEmail] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        setWalletUserEmail(user.email);
      })
      .catch(() => {
        setWalletUserEmail(null);
      });
  }, []);

  useEffect(() => {
    if (isWalletOpen) {
      getCurrentUser()
        .then((user) => {
          setWalletUserEmail(user.email);
          return mvpRequest<{ balance: number }>("/api/wallet/balance");
        })
        .then((res) => setWalletBalance(res.balance))
        .catch(() => {
          setWalletUserEmail(null);
          setWalletBalance(null);
        });
    }
  }, [isWalletOpen]);

  const getTicketPriceFromRoute = (normalTicket?: string | null): number => {
    const digits = (normalTicket ?? "").replace(/\D/g, "");
    const parsed = Number(digits);

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }

    return 7000;
  };

  const navigateToBuyTicket = (route: StationRouteView) => {
    const params = new URLSearchParams({
      routeId: String(route.routeId),
      price: String(getTicketPriceFromRoute(route.normalTicket)),
    });

    window.location.href = `/buy-ticket?${params.toString()}`;
  };

  const requestUserLocation = (shouldFly = false) => {
    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCenter: [number, number] = [position.coords.latitude, position.coords.longitude];
        setLocationStatus("granted");
        setUserLocation(nextCenter);
        setMapCenter(nextCenter);

        if (shouldFly && mapRef) {
          mapRef.flyTo(nextCenter, Math.max(mapRef.getZoom(), DEFAULT_ZOOM), { duration: 0.6 });
        }
      },
      () => {
        setLocationStatus("denied");
        setMapCenter(HCMC_CENTER);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  useEffect(() => {
    if (hasRequestedLocation.current) {
      return;
    }

    hasRequestedLocation.current = true;

    setTimeout(() => {
      requestUserLocation(false);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef || !userLocation) {
      return;
    }

    mapRef.flyTo(userLocation, Math.max(mapRef.getZoom(), DEFAULT_ZOOM), { duration: 0.6 });
  }, [mapRef, userLocation]);

  useEffect(() => {
    try {
      const savedFavoriteRouteIds = localStorage.getItem(STORAGE_KEYS.favoriteRouteIds);
      const savedFavoriteStationIds = localStorage.getItem(STORAGE_KEYS.favoriteStationIds);
      const savedRecentSearches = localStorage.getItem(STORAGE_KEYS.recentSearches);

      if (savedFavoriteRouteIds) {
        const parsed = JSON.parse(savedFavoriteRouteIds) as unknown;

        if (Array.isArray(parsed)) {
          setFavoriteRouteIds(parsed.filter((value): value is number => Number.isInteger(value)));
        }
      }

      if (savedFavoriteStationIds) {
        const parsed = JSON.parse(savedFavoriteStationIds) as unknown;

        if (Array.isArray(parsed)) {
          setFavoriteStationIds(parsed.filter((value): value is number => Number.isInteger(value)));
        }
      }

      if (savedRecentSearches) {
        const parsed = JSON.parse(savedRecentSearches) as unknown;

        if (Array.isArray(parsed)) {
          setRecentSearches(
            parsed
              .filter(
                (item): item is RecentSearchItem =>
                  typeof item === "object" &&
                  item !== null &&
                  (item as RecentSearchItem).type !== undefined &&
                  ((item as RecentSearchItem).type === "station" || (item as RecentSearchItem).type === "route") &&
                  Number.isInteger((item as RecentSearchItem).refId) &&
                  typeof (item as RecentSearchItem).label === "string" &&
                  typeof (item as RecentSearchItem).key === "string",
              )
              .slice(0, 5),
          );
        }
      }
    } catch {
      setFavoriteRouteIds([]);
      setFavoriteStationIds([]);
      setRecentSearches([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.favoriteRouteIds, JSON.stringify(favoriteRouteIds));
  }, [favoriteRouteIds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.favoriteStationIds, JSON.stringify(favoriteStationIds));
  }, [favoriteStationIds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.recentSearches, JSON.stringify(recentSearches));
  }, [recentSearches]);

  const stationViews = useMemo(() => {
    const byStationId = new Map<number, StationView>();

    for (const station of stations) {
      const existing = byStationId.get(station.StationId);

      if (!existing) {
        byStationId.set(station.StationId, {
          key: `${station.StationId}`,
          stationId: station.StationId,
          stationCode: station.StationCode,
          stationName: station.StationName,
          address: station.Address,
          lat: station.Lat,
          lng: station.Lng,
          routeIds: [station.RouteId],
          stationDirections: [station.StationDirection],
          stationTypes: [station.StationType],
        });
        continue;
      }

      existing.lat = (existing.lat + station.Lat) / 2;
      existing.lng = (existing.lng + station.Lng) / 2;

      if (!existing.routeIds.includes(station.RouteId)) {
        existing.routeIds.push(station.RouteId);
      }

      if (!existing.stationDirections.includes(station.StationDirection)) {
        existing.stationDirections.push(station.StationDirection);
      }

      if (!existing.stationTypes.includes(station.StationType)) {
        existing.stationTypes.push(station.StationType);
      }
    }

    return Array.from(byStationId.values()).sort((a, b) => a.stationName.localeCompare(b.stationName, "vi"));
  }, []);

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("vi");
  const canRenderMarkers = currentZoom >= MIN_MARKER_ZOOM;

  const availableRouteTypes = useMemo(() => {
    return Array.from(new Set(routes.map((route) => route.RouteType))).sort((a, b) => a - b);
  }, []);

  const routeSearchIndex = useMemo(() => {
    const routeIds = new Set<number>();

    for (const route of routes) {
      routeIds.add(route.RouteId);
    }

    for (const routeInfo of routeInfos) {
      routeIds.add(routeInfo.RouteId);
    }

    return Array.from(routeIds)
      .map((routeId) => buildRouteView(routeId))
      .filter((item): item is StationRouteView => item !== null)
      .sort((a, b) => a.routeNo.localeCompare(b.routeNo, "vi"));
  }, []);

  const stationViewMap = useMemo(() => {
    return new Map(stationViews.map((station) => [station.stationId, station]));
  }, [stationViews]);

  const searchableStations = useMemo(() => {
    if (!normalizedSearch) {
      return stationViews;
    }

    return stationViews.filter((station) => {
      const label = getPrimaryLabel(station).toLocaleLowerCase("vi");
      const address = getPrimaryAddress(station).toLocaleLowerCase("vi");

      if (label.includes(normalizedSearch) || address.includes(normalizedSearch)) {
        return true;
      }

      return station.routeIds.some((routeId) => {
        const route = routeMap.get(routeId);

        if (!route) {
          return false;
        }

        return (
          route.RouteNo.toLocaleLowerCase("vi").includes(normalizedSearch) ||
          route.RouteName.toLocaleLowerCase("vi").includes(normalizedSearch)
        );
      });
    });
  }, [stationViews, normalizedSearch]);

  const filteredStations = useMemo(() => {
    return searchableStations.filter((station) => {
      const directionPass = selectedDirection === "all" ? true : station.stationDirections.includes(selectedDirection);

      const typePass =
        selectedRouteType === "all"
          ? true
          : station.routeIds.some((routeId) => routeTypeMap.get(routeId) === selectedRouteType);

      return directionPass && typePass;
    });
  }, [searchableStations, selectedDirection, selectedRouteType]);

  const routeSearchResults = useMemo(() => {
    if (!normalizedSearch) {
      return [] as StationRouteView[];
    }

    return routeSearchIndex
      .filter((route) => {
        const routeNo = route.routeNo.toLocaleLowerCase("vi");
        const routeName = route.routeName.toLocaleLowerCase("vi");
        const routeType = routeTypeMap.get(route.routeId);
        const typePass = selectedRouteType === "all" ? true : routeType === selectedRouteType;

        return (routeNo.includes(normalizedSearch) || routeName.includes(normalizedSearch)) && typePass;
      })
      .slice(0, 6);
  }, [normalizedSearch, routeSearchIndex, selectedRouteType]);

  const searchResults = useMemo(() => {
    if (!normalizedSearch) {
      return [] as SearchResultView[];
    }

    const stationResults: SearchResultView[] = filteredStations.slice(0, 6).map((station) => ({
      type: "station",
      station,
      label: getPrimaryLabel(station),
      subtitle: `${station.routeIds.length} tuyến đi qua`,
    }));

    const routeResults: SearchResultView[] = routeSearchResults.map((route) => ({
      type: "route",
      route,
      label: `Tuyến ${route.routeNo}: ${route.routeName}`,
      subtitle: `${route.headway ? `${route.headway} phút/chuyến` : "Đang cập nhật tần suất"}`,
    }));

    return [...routeResults, ...stationResults].slice(0, 10);
  }, [filteredStations, normalizedSearch, routeSearchResults]);

  const nearbyStations = useMemo(() => {
    if (!userLocation) {
      return [] as NearbyStationView[];
    }

    return filteredStations
      .map((station) => ({
        station,
        distanceKm: getDistanceKm(userLocation, [station.lat, station.lng]),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5);
  }, [filteredStations, userLocation]);

  const visibleStations = useMemo(() => {
    if (!canRenderMarkers) {
      return [] as StationView[];
    }

    const stationsForMap = selectedRoute
      ? filteredStations.filter((station) => station.routeIds.includes(selectedRoute.routeId))
      : filteredStations;

    if (!mapBounds) {
      return stationsForMap.slice(0, MAX_VISIBLE_MARKERS);
    }

    const expandedBounds = mapBounds.pad(0.25);
    const inViewport = stationsForMap.filter((station) => expandedBounds.contains([station.lat, station.lng]));

    return inViewport.slice(0, MAX_VISIBLE_MARKERS);
  }, [canRenderMarkers, filteredStations, mapBounds, selectedRoute]);

  const selectedRoutePaths = useMemo(() => {
    if (!selectedRoute) {
      return [] as RoutePathView[];
    }

    const buckets = new Map<0 | 1, [number, number][]>();

    for (const station of stations) {
      if (station.RouteId !== selectedRoute.routeId) {
        continue;
      }

      if (selectedDirection !== "all" && station.StationDirection !== selectedDirection) {
        continue;
      }

      if (station.StationDirection !== 0 && station.StationDirection !== 1) {
        continue;
      }

      const parsedPoints = parsePathPoints(station.pathPoints);

      if (parsedPoints.length < 2) {
        continue;
      }

      const direction = station.StationDirection;
      const existing = buckets.get(direction) ?? [];

      for (const point of parsedPoints) {
        const previous = existing[existing.length - 1];

        if (!previous || previous[0] !== point[0] || previous[1] !== point[1]) {
          existing.push(point);
        }
      }

      buckets.set(direction, existing);
    }

    return Array.from(buckets.entries())
      .map(([direction, points]) => ({ direction, points }))
      .filter((item) => item.points.length >= 2);
  }, [selectedRoute, selectedDirection]);

  const routesAtStation = useMemo(() => {
    if (!selectedStation) {
      return [] as StationRouteView[];
    }

    return selectedStation.routeIds
      .map((routeId) => buildRouteView(routeId))
      .filter((item): item is StationRouteView => item !== null)
      .sort((a, b) => a.routeNo.localeCompare(b.routeNo, "vi"));
  }, [selectedStation]);

  const favoriteRoutes = useMemo(() => {
    return favoriteRouteIds
      .map((routeId) => buildRouteView(routeId))
      .filter((item): item is StationRouteView => item !== null)
      .sort((a, b) => a.routeNo.localeCompare(b.routeNo, "vi"));
  }, [favoriteRouteIds]);

  const favoriteStations = useMemo(() => {
    return favoriteStationIds
      .map((stationId) => stationViewMap.get(stationId))
      .filter((item): item is StationView => item !== undefined)
      .sort((a, b) => a.stationName.localeCompare(b.stationName, "vi"));
  }, [favoriteStationIds, stationViewMap]);

  const addRecentSearch = (item: Omit<RecentSearchItem, "key">) => {
    setRecentSearches((previous) => {
      const key = `${item.type}-${item.refId}`;
      const next = [{ ...item, key }, ...previous.filter((existing) => existing.key !== key)];
      return next.slice(0, 5);
    });
  };

  const toggleFavoriteRoute = (routeId: number) => {
    setFavoriteRouteIds((previous) =>
      previous.includes(routeId) ? previous.filter((id) => id !== routeId) : [...previous, routeId],
    );
  };

  const toggleFavoriteStation = (stationId: number) => {
    setFavoriteStationIds((previous) =>
      previous.includes(stationId) ? previous.filter((id) => id !== stationId) : [...previous, stationId],
    );
  };

  const onSelectStation = (station: StationView, trackRecent = false) => {
    setSelectedStation(station);
    setSelectedRoute(null);
    setIsSearchCollapsed(true);
    setFocusStation(station);

    if (trackRecent) {
      addRecentSearch({
        type: "station",
        refId: station.stationId,
        label: getPrimaryLabel(station),
      });
    }
  };

  const onSelectRoute = (route: StationRouteView, trackRecent = false) => {
    setSelectedStation(null);
    setSelectedRoute(route);
    // On mobile (md breakpoint is 768px), collapse by default. On desktop, expand.
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    setIsRoutePanelCollapsed(isMobile);
    setIsSearchCollapsed(true);

    if (trackRecent) {
      addRecentSearch({
        type: "route",
        refId: route.routeId,
        label: `Tuyến ${route.routeNo}: ${route.routeName}`,
      });
    }
  };

  const resetMapView = () => {
    if (!mapRef) {
      return;
    }

    mapRef.flyTo(HCMC_CENTER, DEFAULT_ZOOM, { duration: 0.6 });
    setSelectedStation(null);
    setSelectedRoute(null);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-50">
      <Button
        aria-label="Mở tìm kiếm"
        className={cn(
          "absolute left-4 top-4 h-12 w-12 rounded-full shadow-lg bg-white hover:bg-slate-50 text-slate-700 border-none transition-all duration-300",
          !isSearchCollapsed || selectedStation || selectedRoute
            ? "opacity-0 scale-75 pointer-events-none"
            : "opacity-100 scale-100",
        )}
        onClick={() => setIsSearchCollapsed(false)}
        size="icon"
        type="button"
        variant="outline"
        style={{ zIndex: 1300 }}
      >
        <Search className="size-5" />
      </Button>

      <div className="absolute right-4 top-4 z-[900] flex flex-col items-end">
        <Button
          aria-label="Tài khoản & Thanh toán"
          className={cn(
            "h-12 w-12 rounded-full shadow-lg bg-white hover:bg-slate-50 text-[#2f5a46] border-none transition-all duration-300",
            isWalletOpen ? "scale-105 shadow-md bg-slate-50" : "scale-100",
          )}
          onClick={() => setIsWalletOpen(!isWalletOpen)}
          size="icon"
          type="button"
          variant="outline"
        >
          <Wallet className="size-5" />
        </Button>

        <Card
          className={cn(
            "absolute top-[56px] right-0 w-72 rounded-2xl shadow-xl border-[#d6e4dc] bg-white overflow-hidden origin-top-right transition-all duration-300",
            isWalletOpen
              ? "opacity-100 scale-100 translate-y-0 visible"
              : "opacity-0 scale-95 -translate-y-2 invisible pointer-events-none",
          )}
        >
          {walletUserEmail ? (
            <>
              <CardHeader className="bg-[#2f5a46]/5 pb-3">
                <CardTitle className="text-sm font-semibold text-slate-800">Ví thanh toán</CardTitle>
                <CardDescription className="text-xs">Email: {walletUserEmail}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-3 flex flex-col gap-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Số dư khả dụng</p>
                  <p className="text-xl font-bold text-[#2f5a46]">
                    {walletBalance === null ? "..." : `${walletBalance.toLocaleString("vi-VN")} đ`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-[#2f5a46] hover:bg-[#1f4231] text-white rounded-xl"
                    onClick={() => (window.location.href = "/wallet")}
                  >
                    Đến ví
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-[#2f5a46] text-[#2f5a46] rounded-xl hover:bg-[#f7f5ef]"
                    onClick={() => (window.location.href = "/topup")}
                  >
                    Nạp tiền
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="p-4 flex flex-col items-center text-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                <Wallet className="size-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Bạn chưa đăng nhập</p>
                <p className="text-xs text-slate-500 mt-1">Đăng nhập để sử dụng tính năng nạp tiền và mua vé xe buýt</p>
              </div>
              <Button
                size="sm"
                className="w-full bg-[#2f5a46] hover:bg-[#1f4231] text-white rounded-xl mt-1"
                onClick={() => (window.location.href = "/account")}
              >
                Đăng nhập
              </Button>
            </CardContent>
          )}
        </Card>
      </div>

      <Card
        className={cn(
          "absolute left-3 right-3 top-3 flex flex-col max-h-[70vh] border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-xl md:left-5 md:right-auto md:w-104 md:top-5 md:max-h-[90vh] transition-all duration-300 rounded-3xl origin-top-left",
          isSearchCollapsed
            ? "opacity-0 scale-95 pointer-events-none -translate-x-2 -translate-y-4 invisible"
            : "opacity-100 scale-100 translate-x-0 translate-y-2 visible",
          (selectedStation || selectedRoute) && !isSearchCollapsed
            ? "invisible md:visible opacity-0 md:opacity-100 scale-95 md:scale-100 md:translate-y-0"
            : "",
        )}
        style={{ zIndex: 1000 }}
      >
        <CardHeader className="shrink-0 pb-3 pt-5 px-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl font-bold text-slate-800 tracking-tight">HCMC Bus Map</CardTitle>
              <CardDescription className="text-sm text-slate-500 mt-1">Tìm kiếm trạm và tuyến xe buýt</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Button
                aria-label="Thu gọn tìm kiếm"
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
                onClick={() => setIsSearchCollapsed(true)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ChevronUp className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto px-5 pb-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/50">
          <div className="relative space-y-3">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-slate-400" />
            <Input
              aria-label="Tìm trạm hoặc tuyến"
              className="h-12 pl-10 pr-10 text-[15px] bg-slate-100/50 border-slate-200 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 rounded-2xl transition-all"
              onChange={(event) => {
                const value = event.target.value;
                setSearchQuery(value);

                if (value.trim().length > 0) {
                  setIsSearchCollapsed(false);
                }
              }}
              placeholder="Tìm tên trạm, địa chỉ, số tuyến..."
              type="text"
              value={searchQuery}
            />

            {searchQuery ? (
              <Button
                aria-label="Xóa từ khóa"
                className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full text-slate-400 hover:text-slate-600"
                onClick={() => setSearchQuery("")}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">Chiều tuyến</span>
              <select
                className="h-10 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedDirection(value === "all" ? "all" : (Number(value) as 0 | 1));
                }}
                value={selectedDirection}
              >
                <option value="all">Tất cả chiều</option>
                <option value="0">Chiều đi</option>
                <option value="1">Chiều về</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-1">Loại tuyến</span>
              <select
                className="h-10 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedRouteType(value === "all" ? "all" : Number(value));
                }}
                value={selectedRouteType}
              >
                <option value="all">Tất cả loại</option>
                {availableRouteTypes.map((routeType) => (
                  <option key={`type-${routeType}`} value={routeType}>
                    {ROUTE_TYPE_LABELS[routeType] ?? `Loại ${routeType}`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {searchResults.length > 0 ? (
            <Card className="z-20 mt-4 max-h-[45vh] overflow-y-auto p-1.5 md:max-h-96 rounded-2xl border-slate-100 shadow-inner bg-white/60 backdrop-blur-md">
              {searchResults.map((result) => (
                <button
                  key={result.type === "station" ? `station-${result.station?.key}` : `route-${result.route?.routeId}`}
                  className="flex flex-col w-full rounded-xl px-3.5 py-2.5 text-left transition-colors hover:bg-blue-50 active:bg-blue-100 border border-transparent hover:border-blue-100/50 my-0.5"
                  onClick={() => {
                    if (result.type === "station" && result.station) {
                      onSelectStation(result.station, true);
                      return;
                    }

                    if (result.type === "route" && result.route) {
                      onSelectRoute(result.route, true);
                    }
                  }}
                  type="button"
                >
                  <span className="text-[15px] font-semibold text-slate-800 line-clamp-1">{result.label}</span>
                  <span className="text-xs text-slate-500 mt-0.5">{result.subtitle}</span>
                </button>
              ))}
            </Card>
          ) : null}

          {!searchQuery.trim() ? (
            <div className="mt-5 space-y-4">
              <div className="flex bg-slate-100/80 p-1 rounded-xl w-full gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("nearby")}
                  className={cn(
                    "flex-1 text-[13px] font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5",
                    activeTab === "nearby"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50",
                  )}
                >
                  <LocateFixed className="size-4" />
                  Gần bạn
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("favorite")}
                  className={cn(
                    "flex-1 text-[13px] font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5",
                    activeTab === "favorite"
                      ? "bg-white text-amber-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50",
                  )}
                >
                  <Star className={cn("size-4", activeTab === "favorite" ? "fill-amber-500 text-amber-500" : "")} />
                  Yêu thích
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("recent")}
                  className={cn(
                    "flex-1 text-[13px] font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5",
                    activeTab === "recent"
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50",
                  )}
                >
                  <Clock3 className="size-4" />
                  Gần đây
                </button>
              </div>

              <div className="max-h-[38vh] md:max-h-[42vh] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/50">
                {activeTab === "favorite" && (
                  <div className="rounded-2xl border border-amber-100 bg-linear-to-b from-amber-50/55 to-white p-3.5 shadow-sm">
                    {favoriteRoutes.length === 0 && favoriteStations.length === 0 ? (
                      <div className="py-8 text-center">
                        <Star className="size-8 mx-auto text-amber-200 mb-2" />
                        <p className="text-sm text-slate-500">Chưa có trạm, tuyến yêu thích</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {favoriteRoutes.map((route) => (
                          <button
                            key={`favorite-route-${route.routeId}`}
                            className="flex w-full items-center justify-between rounded-xl border border-transparent px-3 py-2.5 text-left transition hover:border-amber-200 hover:bg-white"
                            onClick={() => onSelectRoute(route, true)}
                            type="button"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="truncate text-sm font-semibold text-slate-800">Tuyến {route.routeNo}</p>
                              <p className="truncate text-xs text-slate-500">{route.routeName}</p>
                            </div>
                            <Star className="size-4 shrink-0 fill-amber-400 text-amber-500" />
                          </button>
                        ))}

                        {favoriteStations.map((station) => (
                          <button
                            key={`favorite-station-${station.stationId}`}
                            className="flex w-full items-center justify-between rounded-xl border border-transparent px-3 py-2.5 text-left transition hover:border-amber-200 hover:bg-white"
                            onClick={() => onSelectStation(station, true)}
                            type="button"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="truncate text-sm font-semibold text-slate-800">
                                {getPrimaryLabel(station)}
                              </p>
                              <p className="truncate text-xs text-slate-500">Trạm yêu thích</p>
                            </div>
                            <Star className="size-4 shrink-0 fill-amber-400 text-amber-500" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "recent" && (
                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-3.5 shadow-sm">
                    {recentSearches.length === 0 ? (
                      <div className="py-8 text-center">
                        <Clock3 className="size-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500">Chưa có tìm kiếm gần đây</p>
                      </div>
                    ) : (
                      <>
                        <div className="mb-2.5 flex items-center justify-end px-1">
                          <Button
                            className="h-6 px-2 text-xs"
                            onClick={() => setRecentSearches([])}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            Xóa lịch sử
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          {recentSearches.map((item) => (
                            <button
                              key={item.key}
                              className="w-full rounded-xl border border-transparent px-3 py-2 text-left transition hover:border-slate-200 hover:bg-white"
                              onClick={() => {
                                if (item.type === "route") {
                                  const route = buildRouteView(item.refId);

                                  if (route) {
                                    onSelectRoute(route, false);
                                  }

                                  return;
                                }

                                const station = stationViewMap.get(item.refId);

                                if (station) {
                                  onSelectStation(station, false);
                                }
                              }}
                              type="button"
                            >
                              <p className="text-sm font-medium text-slate-800">{item.label}</p>
                              <p className="text-xs text-slate-500">{item.type === "route" ? "Tuyến" : "Trạm"}</p>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {activeTab === "nearby" && (
                  <div className="rounded-2xl border border-blue-100 bg-linear-to-b from-blue-50/50 to-white p-3.5 shadow-sm">
                    <div className="mb-3 flex items-center justify-between px-1">
                      <p className="text-[13px] font-bold tracking-wide text-blue-900 flex items-center gap-1.5">
                        <LocateFixed className="size-4 text-blue-600" />
                        GẦN BẠN
                      </p>
                      <Button
                        className="h-8 rounded-full bg-white px-3 text-[13px] font-medium text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 shadow-sm"
                        onClick={() => requestUserLocation(true)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Cập nhật
                      </Button>
                    </div>

                    {nearbyStations.length > 0 ? (
                      <div className="space-y-1">
                        {nearbyStations.map((item) => (
                          <button
                            key={`nearby-${item.station.key}`}
                            className="flex items-center justify-between w-full rounded-xl border border-transparent px-3 py-2.5 text-left transition duration-200 hover:border-blue-100 hover:bg-white hover:shadow-xs active:scale-[0.98] group"
                            onClick={() => onSelectStation(item.station)}
                            type="button"
                          >
                            <div className="flex-1 min-w-0 pr-3">
                              <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700">
                                {getPrimaryLabel(item.station)}
                              </p>
                              <p className="text-[13px] text-slate-500 mt-0.5">{item.station.routeIds.length} tuyến</p>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="inline-flex h-6 items-center justify-center rounded-full bg-blue-100/50 px-2.5 text-[11px] font-semibold text-blue-700">
                                {formatDistance(item.distanceKm)}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-2 py-3 text-center">
                        <p className="text-sm text-slate-500">
                          {locationStatus === "denied"
                            ? "Chưa cấp quyền vị trí. Vui lòng cho phép truy cập vị trí."
                            : "Đang dò tìm vị trí..."}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div
        className={cn(
          "absolute right-3 bottom-5 flex flex-col gap-3 md:bottom-5 md:right-5 transition-all duration-300",
          selectedStation || (selectedRoute && !isRoutePanelCollapsed) ? "hidden md:flex" : "flex",
        )}
        style={{
          zIndex: 1300,
        }}
      >
        <div className="flex flex-col bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden">
          <Button
            aria-label="Phóng to bản đồ"
            onClick={() => mapRef?.zoomIn()}
            className="h-11 w-11 rounded-none border-b border-slate-100 bg-transparent hover:bg-slate-50 text-slate-700"
            size="icon"
            variant="ghost"
            type="button"
          >
            <Plus className="size-5" />
          </Button>
          <Button
            aria-label="Thu nhỏ bản đồ"
            onClick={() => mapRef?.zoomOut()}
            className="h-11 w-11 rounded-none bg-transparent hover:bg-slate-50 text-slate-700"
            size="icon"
            variant="ghost"
            type="button"
          >
            <Minus className="size-5" />
          </Button>
        </div>

        <Button
          aria-label="Về trung tâm thành phố"
          onClick={resetMapView}
          className="h-11 w-11 rounded-2xl bg-white/90 backdrop-blur-md shadow-lg border border-slate-200/50 hover:bg-slate-50 text-slate-700"
          size="icon"
          variant="ghost"
          type="button"
        >
          <LocateFixed className="size-5" />
        </Button>
        <Button
          aria-label="Đến vị trí hiện tại"
          onClick={() => requestUserLocation(true)}
          className="h-11 w-11 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30 border-none"
          size="icon"
          variant="default"
          type="button"
        >
          <LocateFixed className="size-5" />
        </Button>
      </div>

      <MapContainer center={mapCenter} zoom={DEFAULT_ZOOM} className="h-full w-full" zoomControl={false}>
        <MapEventsWatcher onBoundsChange={setMapBounds} onZoomChange={setCurrentZoom} />
        <MapViewportController focusStation={focusStation} onMapReady={setMapRef} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO'
          maxZoom={20}
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {selectedRoutePaths.map((path) => {
          const color = path.direction === 0 ? "#3b82f6" : "#f59e0b"; // Blue and Amber

          return (
            <Polyline
              key={`route-path-${selectedRoute?.routeId}-${path.direction}`}
              pathOptions={{ color, weight: 6, opacity: 0.8, lineCap: "round", lineJoin: "round" }}
              positions={path.points}
            />
          );
        })}

        {userLocation ? <Marker position={userLocation} icon={userLocationIcon} /> : null}

        {canRenderMarkers
          ? visibleStations.map((station) => (
              <Marker
                key={station.key}
                icon={stationMarkerIcon}
                position={[station.lat, station.lng]}
                eventHandlers={{
                  click: () => {
                    onSelectStation(station);
                  },
                }}
              >
                <Tooltip
                  className="station-tooltip bg-white/95 backdrop-blur border-slate-200 text-slate-800 shadow-xl rounded-xl px-3 py-2"
                  direction="top"
                  offset={[0, -12]}
                  opacity={1}
                >
                  <div className="max-w-60 text-sm">
                    <p className="font-bold text-slate-900">{getPrimaryLabel(station)}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{station.routeIds.length} tuyến đi qua</p>
                  </div>
                </Tooltip>
              </Marker>
            ))
          : null}
      </MapContainer>

      {canRenderMarkers && filteredStations.length === 0 ? (
        <div
          className="pointer-events-none absolute inset-x-4 bottom-5 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 shadow-xl backdrop-blur-xl transition-all"
          style={{ zIndex: 1000 }}
        >
          <p className="text-[15px] font-bold text-slate-800 text-center">Không tìm thấy kết quả</p>
          <p className="text-sm text-slate-500 text-center mt-1">Thử đổi từ khóa hoặc bộ lọc.</p>
        </div>
      ) : null}

      {selectedStation ? (
        <>
          <button
            aria-label="Đóng chi tiết trạm"
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedStation(null)}
            style={{ zIndex: 1050 }}
            type="button"
          />

          <Card
            className="absolute bottom-0 left-0 right-0 h-screen md:h-auto md:max-h-[calc(100vh-2.5rem)] overflow-y-auto rounded-t-3xl border-0 bg-white/95 shadow-2xl backdrop-blur-xl pb-[calc(env(safe-area-inset-bottom)+16px)] md:left-5 md:right-auto md:top-5 md:w-md md:rounded-3xl md:pb-0 overscroll-contain"
            style={{ zIndex: 1100 }}
          >
            <CardHeader className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur-xl px-6 py-5">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Badge
                    variant="default"
                    className="mb-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold border-none shadow-none"
                  >
                    Thông tin trạm
                  </Badge>
                  <CardTitle className="text-xl font-bold text-slate-900 leading-tight">
                    {getPrimaryLabel(selectedStation)}
                  </CardTitle>
                  <CardDescription className="mt-2 text-[15px] text-slate-500">
                    {getPrimaryAddress(selectedStation)}
                  </CardDescription>
                </div>
                <Button
                  aria-label={
                    favoriteStationIds.includes(selectedStation.stationId) ? "Bỏ yêu thích trạm" : "Yêu thích trạm"
                  }
                  className={cn(
                    "rounded-full h-10 w-10",
                    favoriteStationIds.includes(selectedStation.stationId)
                      ? "bg-amber-100 hover:bg-amber-200 text-amber-700"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600",
                  )}
                  onClick={() => toggleFavoriteStation(selectedStation.stationId)}
                  size="icon"
                  variant="ghost"
                  type="button"
                >
                  <Star
                    className={cn(
                      "size-5",
                      favoriteStationIds.includes(selectedStation.stationId) ? "fill-amber-400 text-amber-600" : "",
                    )}
                  />
                </Button>
                <Button
                  aria-label="Đóng"
                  className="rounded-full h-10 w-10 bg-slate-100 hover:bg-slate-200 text-slate-600 shrink-0"
                  onClick={() => setSelectedStation(null)}
                  size="icon"
                  variant="ghost"
                  type="button"
                >
                  <X className="size-5" />
                </Button>
              </div>
              <div className="pt-4 flex">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-[13px] font-semibold text-emerald-700">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  {selectedStation.routeIds.length} tuyến đang hoạt động
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 p-4 md:p-6 bg-slate-50/50">
              {walletUserEmail ? (
                <Card className="rounded-2xl border-[#d6e4dc] bg-[#2f5a46]/5 shadow-xs">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-[#2f5a46]">Mua vé nhanh tại trạm này</p>
                      <span className="text-xs font-medium text-slate-500">{routesAtStation.length} tuyến</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {routesAtStation.map((route) => (
                        <Button
                          key={`station-buy-${route.routeId}`}
                          size="sm"
                          className="rounded-xl bg-[#2f5a46] hover:bg-[#1f4231] text-white"
                          onClick={() => navigateToBuyTicket(route)}
                          type="button"
                        >
                          <Ticket className="mr-1.5 h-4 w-4" /> Tuyến {route.routeNo}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="rounded-2xl border-dashed border-slate-200 bg-white/70 shadow-xs">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Đăng nhập để mua vé nhanh</p>
                      <p className="text-xs text-slate-500 mt-1">Bạn có thể mua vé trực tiếp từ thông tin trạm.</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-[#2f5a46] text-[#2f5a46] hover:bg-[#f7f5ef]"
                      onClick={() => (window.location.href = "/account")}
                      type="button"
                    >
                      Đăng nhập
                    </Button>
                  </CardContent>
                </Card>
              )}

              {routesAtStation.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <p className="text-[15px] font-medium text-slate-500">Không có dữ liệu tuyến.</p>
                </div>
              ) : null}

              {routesAtStation.map((route) => (
                <Card
                  key={route.routeId}
                  className="group overflow-hidden rounded-2xl border-slate-200/60 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:border-blue-200"
                >
                  <button
                    onClick={() => onSelectRoute(route)}
                    type="button"
                    className="block w-full text-left focus:outline-none"
                  >
                    <div className="bg-slate-50/50 p-4 border-b border-slate-100 group-hover:bg-blue-50/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white shadow-inner font-bold">
                          {route.routeNo}
                        </div>
                        <p className="text-[15px] font-bold text-slate-800 line-clamp-2 leading-tight">
                          {route.routeName}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 space-y-3 bg-white">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 rounded text-blue-500 bg-blue-50 p-1">
                          <Bus className="size-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Chiều đi</p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {route.nextIn.length > 0 ? route.nextIn.join(" • ") : "Không có dữ liệu"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 rounded text-amber-500 bg-amber-50 p-1">
                          <Bus className="size-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Chiều về</p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {route.nextOut.length > 0 ? route.nextOut.join(" • ") : "Không có dữ liệu"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                </Card>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}

      {selectedRoute ? (
        <>
          {isRoutePanelCollapsed ? (
            <Card
              className="absolute bottom-4 left-4 max-w-[calc(100%-7.5rem)] rounded-2xl border-slate-200/60 bg-white/95 shadow-xl backdrop-blur-xl md:bottom-5 md:left-5 md:right-auto md:max-w-[24rem] md:w-[24rem] transition-all"
              style={{ zIndex: 1200 }}
            >
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <button
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  onClick={() => setIsRoutePanelCollapsed(false)}
                  type="button"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white font-bold shadow-md shadow-blue-500/20">
                    {selectedRoute.routeNo}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-0.5">Chi tiết tuyến</p>
                    <p className="truncate text-[15px] font-bold text-slate-800">{selectedRoute.routeName}</p>
                  </div>
                  <ChevronUp className="size-5 shrink-0 text-slate-400 ml-auto" />
                </button>
                <Button
                  aria-label="Đóng tuyến"
                  className="h-10 w-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 shrink-0 mr-1"
                  onClick={() => setSelectedRoute(null)}
                  size="icon"
                  variant="ghost"
                  type="button"
                >
                  <X className="size-4.5" />
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <button
                aria-label="Đóng chi tiết tuyến"
                className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity md:hidden"
                onClick={() => setSelectedRoute(null)}
                style={{ zIndex: 1150 }}
                type="button"
              />
              <Card
                className="absolute bottom-0 left-0 right-0 h-screen md:h-auto md:max-h-[calc(100vh-2.5rem)] overflow-y-auto rounded-t-3xl border-0 bg-white/95 shadow-2xl backdrop-blur-xl pb-[calc(env(safe-area-inset-bottom)+16px)] md:bottom-auto md:left-5 md:right-auto md:top-5 md:w-120 md:rounded-3xl md:pb-0 overscroll-contain"
                style={{ zIndex: 1200 }}
              >
                <CardHeader className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur-xl px-6 py-5">
                  <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500 text-white font-bold text-lg shadow-lg shadow-blue-500/30">
                          {selectedRoute.routeNo}
                        </div>
                        <div>
                          <Badge
                            variant="default"
                            className="bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold border-none mb-1 shadow-none"
                          >
                            Chi tiết tuyến
                          </Badge>
                          <CardTitle className="line-clamp-2 text-lg md:text-xl font-bold text-slate-900 leading-tight">
                            {selectedRoute.routeName}
                          </CardTitle>
                        </div>
                      </div>
                      <CardDescription className="text-sm font-medium text-slate-500">
                        Vận hành: <span className="text-slate-700">{selectedRoute.orgs ?? "Đang cập nhật"}</span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        aria-label={
                          favoriteRouteIds.includes(selectedRoute.routeId) ? "Bỏ yêu thích tuyến" : "Yêu thích tuyến"
                        }
                        className={cn(
                          "h-10 w-10 rounded-full",
                          favoriteRouteIds.includes(selectedRoute.routeId)
                            ? "bg-amber-100 hover:bg-amber-200 text-amber-700"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-600",
                        )}
                        onClick={() => toggleFavoriteRoute(selectedRoute.routeId)}
                        size="icon"
                        variant="ghost"
                        type="button"
                      >
                        <Star
                          className={cn(
                            "size-5",
                            favoriteRouteIds.includes(selectedRoute.routeId) ? "fill-amber-400 text-amber-600" : "",
                          )}
                        />
                      </Button>
                      <Button
                        aria-label="Thu gọn"
                        className="h-10 w-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
                        onClick={() => setIsRoutePanelCollapsed(true)}
                        size="icon"
                        variant="ghost"
                        type="button"
                      >
                        <ChevronDown className="size-5" />
                      </Button>
                      <Button
                        aria-label="Đóng"
                        className="h-10 w-10 rounded-full bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 transition-colors"
                        onClick={() => setSelectedRoute(null)}
                        size="icon"
                        variant="ghost"
                        type="button"
                      >
                        <X className="size-5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 p-4 md:p-6 bg-slate-50/50">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-2xl bg-white p-3.5 border border-slate-200/60 shadow-sm">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Giờ hoạt động
                      </p>
                      <p className="font-semibold text-slate-800">{selectedRoute.operationTime ?? "Đang cập nhật"}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3.5 border border-slate-200/60 shadow-sm">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Giá vé</p>
                      <p className="font-semibold text-emerald-600">{selectedRoute.normalTicket ?? "Đang cập nhật"}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3.5 border border-slate-200/60 shadow-sm">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tần suất</p>
                      <p className="font-semibold text-slate-800">
                        {selectedRoute.headway ? `${selectedRoute.headway} phút` : "Đang cập nhật"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-3.5 border border-slate-200/60 shadow-sm">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Loại hình</p>
                      <p className="font-semibold text-slate-800">{selectedRoute.type ?? "Đang cập nhật"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 rounded-2xl bg-white p-3.5 border border-slate-200/60 shadow-sm">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
                        <Clock3 className="size-5" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Thời gian chuyến
                        </p>
                        <p className="font-semibold text-slate-800 mt-0.5">
                          {selectedRoute.timeOfTrip ?? "Đang cập nhật"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-white p-3.5 border border-slate-200/60 shadow-sm">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-50 text-cyan-600">
                        <Bus className="size-5" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Tổng chuyến/ngày
                        </p>
                        <p className="font-semibold text-slate-800 mt-0.5">
                          {selectedRoute.totalTrip ?? "Đang cập nhật"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-[15px] font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">
                      Chuyến sắp tới
                    </p>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-blue-100 p-1.5 text-blue-600">
                          <Clock3 className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Chiều đi</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedRoute.nextIn.length > 0 ? (
                              selectedRoute.nextIn.map((time, idx) => (
                                <Badge
                                  key={`in-${idx}`}
                                  variant="default"
                                  className="bg-blue-50 text-blue-700 hover:bg-blue-100 py-1 px-2.5 font-semibold text-sm border-blue-200/50 shadow-none"
                                >
                                  {time}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm font-medium text-slate-500">Không có dữ liệu</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-amber-100 p-1.5 text-amber-600">
                          <Clock3 className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Chiều về</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedRoute.nextOut.length > 0 ? (
                              selectedRoute.nextOut.map((time, idx) => (
                                <Badge
                                  key={`out-${idx}`}
                                  variant="default"
                                  className="bg-amber-50 text-amber-700 hover:bg-amber-100 py-1 px-2.5 font-semibold text-sm border-amber-200/50 shadow-none"
                                >
                                  {time}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm font-medium text-slate-500">Không có dữ liệu</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <RouteItineraryDiagram
                      routeId={selectedRoute.routeId}
                      direction={0}
                      title="Lộ trình chiều đi"
                      color="blue"
                    />
                    <RouteItineraryDiagram
                      routeId={selectedRoute.routeId}
                      direction={1}
                      title="Lộ trình chiều về"
                      color="amber"
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
