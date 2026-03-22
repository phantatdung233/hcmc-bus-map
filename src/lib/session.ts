import crypto from "node:crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.MONGODB_URI || "local-dev-secret";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const toBase64Url = (value: string) => Buffer.from(value, "utf8").toString("base64url");
const fromBase64Url = (value: string) => Buffer.from(value, "base64url").toString("utf8");

const sign = (payloadB64: string) => crypto.createHmac("sha256", SESSION_SECRET).update(payloadB64).digest("base64url");

export const createSessionToken = (userId: string): string => {
  const payload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };

  const payloadB64 = toBase64Url(JSON.stringify(payload));
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
};

export const verifySessionToken = (token: string): { userId: string } | null => {
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) {
    return null;
  }

  const expected = sign(payloadB64);
  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);

  if (signatureBuf.length !== expectedBuf.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(signatureBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(payloadB64)) as { userId?: string; exp?: number };
    if (!payload.userId || !payload.exp) {
      return null;
    }

    if (Math.floor(Date.now() / 1000) > payload.exp) {
      return null;
    }

    return { userId: payload.userId };
  } catch {
    return null;
  }
};

export const SESSION_COOKIE_NAME = "busmap_session";
