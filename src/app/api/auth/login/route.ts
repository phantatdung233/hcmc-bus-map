import { NextRequest, NextResponse } from "next/server";

import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { loginUser } from "@/lib/user-store";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ message: "email va password la bat buoc" }, { status: 400 });
  }

  try {
    const user = await loginUser(email, password);
    const token = createSessionToken(user.id);

    const response = NextResponse.json({
      userId: user.id,
      email: user.email,
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json({ message: "Sai thong tin dang nhap" }, { status: 401 });
  }
}
