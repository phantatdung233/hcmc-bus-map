# BusMap Feature Roadmap (Data-Driven)

Date: 2026-03-16
Scope: recommendations based on existing datasets only:

- stations.json -> StationRecord
- routes.json -> RouteSchedule
- routeinfo.json -> RouteInfo

## 1. Data Inventory (What we already have)

### stations.json (StationRecord)

- StationId, StationCode, StationName
- Address
- Lat, Lng
- StationOrder, StationDirection, StationType
- RouteId (many-to-one per record)
- pathPoints (string; likely polyline or list of points)

### routes.json (RouteSchedule)

- RouteId, RouteNo, RouteName, RouteType
- TimeTableIn, TimeTableOut (string timetable)

### routeinfo.json (RouteInfo)

- RouteId, RouteNo, RouteName
- Orgs (operator)
- OutBoundDescription / InBoundDescription
- NormalTicket, Headway, OperationTime
- Type, TimeOfTrip, TotalTrip

## 2. Product Goals (short term)

- Help users find the nearest usable bus stop fast.
- Show route details and next departures clearly.
- Keep the UI lightweight (no backend required initially).

## 3. Recommended Features (based on current data)

### A. Core Experience (MVP)

1. Route Search by number/name
   - Source: routes.json + routeinfo.json
   - UX: search box should match RouteNo and RouteName
   - Output: list of routes with key info (Headway, OperationTime, NormalTicket)

2. Station Search by name/address
   - Source: stations.json
   - UX: fuzzy search + highlight matched text
   - Output: station card + routes passing through

3. Nearby Stations (if location allowed)
   - Source: stations.json
   - UX: button "Near me" -> list sorted by distance
   - Calculation: Haversine distance from user to Lat/Lng

4. Route Detail Panel
   - Source: routeinfo.json + routes.json
   - Show: operator, ticket, headway, operation time, trip time, total trips
   - Show next departures (already supported by TimeTableIn/Out)

5. Station Detail Panel
   - Source: stations.json
   - Show: station name, address, routes passing
   - Add next departures per route (reuse timetable data)

### B. Navigation & Map UX

6. Route Path Visualization
   - Source: StationRecord.pathPoints
   - Parse pathPoints -> polyline on map
   - Show inbound/outbound path separately if available

7. Direction Filter
   - Source: StationDirection
   - UX: toggle "Inbound / Outbound" to reduce clutter

8. Route Type Filter
   - Source: RouteType / Type
   - UX: filter for express/local/bus type

### C. Personalization (No backend needed)

9. Favorite Routes / Stations (localStorage)
   - Store: routeIds / stationIds
   - UX: star icon + quick access section

10. Recent Searches (localStorage)
    - UX: show last 5 searches for faster reuse

### D. Data Quality Helpers

11. Data Coverage Indicator
    - Count number of stations per route
    - Show when a route has missing info

12. Duplicate Station Merge
    - Group stations by StationId or proximity
    - Show a single marker with aggregated routes

## 4. Feature Prioritization

### Phase 1 (1-2 weeks)

- Route search + route detail panel
- Station search + station detail panel
- Nearby stations + user location recenter

### Phase 2 (2-4 weeks)

- Route path visualization
- Direction and type filters
- Favorites + recent searches

### Phase 3 (optional)

- Data coverage indicators
- Merge duplicates + advanced clustering

## 5. Data Processing Notes

### 5.1 Parse TimeTableIn/Out

- Format is likely text schedule. Use existing parseTimeTable.
- Add edge cases: midnight crossover, invalid entries

### 5.2 Parse pathPoints

- Inspect pathPoints format in stations.json (sample a record)
- If it is a polyline string -> decode to Lat/Lng
- If it is CSV list -> split and map to coords

### 5.3 Grouping stations

- If StationId repeats (already happens), group by StationId
- For near-duplicates, use distance threshold (e.g., 30-50m)

## 6. UX Specifications (suggested)

- Search results show route/stop count, distance if available
- Map markers:
  - station marker: current icon
  - user location: blue dot with ring (already)
  - selected route path: bold line + direction arrow
- Panels slide from bottom on mobile, right side on desktop

## 7. Success Metrics (offline)

- Median time to find a route < 10 seconds
- 90% of stations visible at zoom >= 17
- Search success rate (non-empty results) > 80%

## 8. Implementation Checklist

- [x] Build route search index from routes.json
- [x] Build station search index from stations.json
- [x] Add "near me" list with distance calculation
- [x] Add route detail panel with full metadata
- [x] Parse pathPoints and render polylines
- [x] Add filters (direction + type)
- [x] Add localStorage favorites + recent

## 9. Files to touch (planned)

- src/components/map/BusMap.tsx
- src/data/routes.json
- src/data/routeinfo.json
- src/data/stations.json
- src/types/bus.ts
- src/lib/time.ts (if timetable parsing needs upgrades)

---

If you want, I can refine this into a task-by-task implementation plan with estimated effort and UI wireframes.
