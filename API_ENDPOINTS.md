# API Endpoints

## Ticket APIs

### Canonical endpoint

- GET /api/tickets/my
- Purpose: Return current authenticated user's ticket list.

### Purchase endpoint

- POST /api/tickets/buy
- Purpose: Buy a bus ticket.

### Backward compatibility alias

- GET /api/my-tickets
- Behavior: Redirects (307) to /api/tickets/my.
- Note: Deprecated. New integrations should use /api/tickets/my directly.
