# API QA Report - 2026-03-22

## 1) Scope

Test full API flow as black-box tester for:

- Auth: register, login, me, logout
- Wallet: balance, transactions
- Topup: create, status, confirm, webhook
- Tickets: buy, my, my-tickets
- Security checks: auth bypass attempts

## 2) Test Environment

- Project: hcmc-bus-map
- Base URL: http://localhost:3000
- Runtime: Next.js production server already running on port 3000
- Test runner: scripts/qa-api-test.mjs
- Execution time: 2026-03-22T13:13:59.139Z

## 3) Overall Result

- Total cases: 26
- Passed: 21
- Failed: 5
- Coverage: main API flows + auth/security checks

## 4) Passed Coverage (High Level)

- Register validation works (missing fields, weak password, duplicate email)
- Login success/failure works
- Session cookie is set on login
- Auth me works with valid cookie and fails after logout
- Wallet balance endpoint works with session
- Ticket purchase rejects insufficient balance
- Topup creation validation works
- Topup create and status endpoints respond correctly (functional)
- Webhook success for existing order responds 200
- tickets/my and my-tickets currently return consistent data

## 5) Failed Cases and Findings

### [CRITICAL] F1 - Topup mark success is non-atomic and breaks wallet credit

- Failed checks:
  - Confirm topup redirects to error page instead of success
  - Wallet balance does not increase after topup
  - Buying ticket after topup still fails due to no balance
- Evidence from test:
  - Redirect location contained: status=error&message=Updating the path 'balance' would create a conflict at 'balance'
  - Wallet before=0, after=0
- Impact:
  - User may complete payment but wallet is not credited.
  - Order can become success while balance remains unchanged, causing data inconsistency.
- Root cause:
  - In markTopupSuccess, same field balance is updated by both $setOnInsert and $inc in one update document.
  - Relevant code:
    - src/lib/user-store.ts line 214
    - src/lib/user-store.ts line 215
    - src/lib/user-store.ts line 205
- Recommendation:
  - Remove balance from $setOnInsert, keep only $inc for balance.
  - Wrap topup order update + transaction update + wallet credit in a MongoDB transaction/session.
  - Return success only after full commit.

### [HIGH] F2 - Topup status endpoint exposes order data without authentication

- Failed check:
  - Topup status endpoint requires auth (security check)
- Evidence from test:
  - GET /api/payments/topup/{id}/status without cookie returned 200 and order data.
- Impact:
  - Anyone with orderId can enumerate payment status and amounts.
- Root cause:
  - Status route has no user authentication/authorization check.
  - Relevant code:
    - src/app/api/payments/topup/[id]/status/route.ts line 5
    - src/app/api/payments/topup/[id]/status/route.ts line 10
- Recommendation:
  - Require authenticated user.
  - Verify order.userId equals current session user before returning details.

### [HIGH] F3 - Legacy x-user-id header can bypass session auth

- Failed check:
  - Header-only x-user-id cannot bypass auth (security check)
- Evidence from test:
  - Request with no cookie but with x-user-id returned 200 on protected wallet API.
- Impact:
  - Account takeover risk by spoofing userId in request header.
- Root cause:
  - server-auth still accepts legacy x-user-id fallback.
  - Relevant code:
    - src/lib/server-auth.ts line 14
    - src/lib/server-auth.ts line 15
- Recommendation:
  - Remove legacy header fallback in production.
  - Accept only signed session cookie (or JWT) and enforce strict auth middleware.

### [MEDIUM] F4 - Confirm endpoint UX can report error while order already became success

- Failed signal:
  - Confirm redirect hit error page but order status became success afterward.
- Impact:
  - User-facing confusion and support burden.
  - Potential duplicate retry behavior.
- Root cause:
  - Multi-update logic is partially applied before exception propagates.
  - Confirm route catches error and redirects to error page regardless of partial DB success.
  - Relevant code:
    - src/app/api/payments/topup/confirm/route.ts line 30
    - src/app/api/payments/topup/confirm/route.ts line 35
- Recommendation:
  - Make markTopupSuccess transactional and idempotent.
  - Use explicit error codes and consistent final state before redirecting.

### [LOW] F5 - Duplicate ticket listing endpoints increase maintenance risk

- Observation:
  - /api/tickets/my and /api/my-tickets provide same behavior.
- Impact:
  - Duplicated route surface may drift over time.
- Relevant code:
  - src/app/api/tickets/my/route.ts
  - src/app/api/my-tickets/route.ts
- Recommendation:
  - Keep one canonical endpoint and deprecate the other with backward-compatible redirect/versioning.

## 6) Suggested Improvement Plan (Prioritized)

1. Fix wallet credit conflict in markTopupSuccess immediately (P0).
2. Implement MongoDB transaction for topup success flow (P0).
3. Remove x-user-id fallback and enforce cookie-only auth (P0).
4. Add auth + ownership check on topup status endpoint (P1).
5. Add regression tests for topup success and security checks in CI (P1).
6. Consolidate duplicate ticket endpoints (P2).

## 7) Reproduction Commands

- Run QA script:

```bash
node scripts/qa-api-test.mjs
```

## 8) Attachments

- Automated test script:
  - scripts/qa-api-test.mjs
