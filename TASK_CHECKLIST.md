# BusMap Sprint Checklist

Date: 2026-03-16
Based on: FEATURES_ROADMAP.md

## Phase 1 - Core Logic + UI/UX (Completed)

- [x] P1-01 Build route search index from routes.json + routeinfo.json
  - Result: merged route index by RouteId with normalized route detail model.
- [x] P1-02 Support mixed search results (route + station)
  - Result: one search input returns both stations and routes; route item opens route detail directly.
- [x] P1-03 Improve station search UX
  - Result: station results keep existing behavior and fly to selected station.
- [x] P1-04 Add nearby stations module
  - Result: "Gần bạn" list sorted by distance (Haversine), top 5 nearest stops.
- [x] P1-05 Add manual location action for mobile permission flow
  - Result: "Vị trí của tôi" button in search panel and map controls to trigger geolocation prompt on user interaction.
- [x] P1-06 Route detail panel can open independently
  - Result: route detail modal no longer depends on selected station.
- [x] P1-07 Extend route detail metadata
  - Result: includes TimeOfTrip and TotalTrip from routeinfo.json.

## Phase 2 - Visual Route + Filters (Next)

- [x] P2-01 Parse pathPoints format in stations.json and document parser assumptions
  - Result: parser uses token format `lng,lat` separated by whitespace; invalid tokens are skipped; duplicate adjacent points are removed.
- [x] P2-02 Render route polyline for selected route
  - Result: polyline auto-draws when route detail opens and auto-fit bounds to route path.
- [x] P2-03 Add direction filter (StationDirection)
  - Result: filter supports `Tất cả`, `Chiều đi (0)`, `Chiều về (1)` and applies to markers + route path.
- [x] P2-04 Add route type filter (RouteType/Type)
  - Result: filter supports available route types from dataset and applies to search + markers.
- [x] P2-05 Keep map markers + route line style consistent across desktop/mobile
  - Result: shared style tokens/colors are used in a single render path for all breakpoints.

## Phase 3 - Personalization (Next)

- [x] P3-01 Favorite routes (localStorage)
  - Result: added star toggle for route detail; favorite routes are persisted and shown in quick access.
- [x] P3-02 Favorite stations (localStorage)
  - Result: added star toggle for station detail; favorite stations are persisted and shown in quick access.
- [x] P3-03 Recent searches (localStorage, max 5)
  - Result: selecting search results now stores up to 5 recent entries with one-tap reopen.

## Phase 4 - Data Quality (Optional)

- [ ] P4-01 Coverage indicators by route
- [ ] P4-02 Near-duplicate station merge strategy

## Acceptance Criteria for Completed Phase 1

- Search by route number/name opens route detail even without selecting a station first.
- Search by station still centers map and opens station panel.
- If geolocation is granted, nearby stops appear and can be tapped to open station details.
- If geolocation is denied, UX shows clear retry guidance.
- Mobile users can trigger geolocation via explicit button tap.

## Phase 5 - Account + Topup + Buy Ticket MVP (In Progress)

- [x] P5-01 Define MVP plan scope
  - Result: simplified plan created in ACCOUNT_PAYMENT_PLAN.md focusing only on topup and buy ticket.
- [x] P5-02 Create in-memory domain models for payment MVP
  - Result: added `src/types/payment.ts` and `src/lib/mvp-store.ts` with users, wallets, transactions, topup orders, tickets.
- [x] P5-03 Implement auth MVP APIs
  - Result: added register/login/me endpoints under `src/app/api/auth/**`.
- [x] P5-04 Implement wallet MVP APIs
  - Result: added balance and transaction endpoints under `src/app/api/wallet/**`.
- [x] P5-05 Implement topup MVP APIs
  - Result: added create topup, webhook confirm, and topup status endpoints under `src/app/api/payments/**`.
- [x] P5-06 Implement buy ticket MVP APIs
  - Result: added buy ticket and my tickets endpoints under `src/app/api/tickets/**`.
- [x] P5-07 Build minimal UI for wallet/topup/ticket purchase
  - Result: added `/wallet` page with login, topup action, buy ticket action, transactions list, tickets list.
- [x] P5-08 Connect UI to MVP APIs and test full flow
  - Result: `/wallet` calls auth, wallet, topup, webhook, and ticket APIs; project build succeeds with new routes.
- [x] P5-09 Add minimal validation and error states in UI
  - Result: UI now handles auth-required checks and API error messages for topup/buy ticket flow.
- [ ] P5-10 Add manual test script and acceptance checklist
