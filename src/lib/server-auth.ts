import type { NextRequest } from "next/server";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export const getAuthenticatedUserId = (request: NextRequest): string | null => {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const parsed = verifySessionToken(token);
    if (parsed?.userId) {
      return parsed.userId;
    }
  }

  return null;
};
