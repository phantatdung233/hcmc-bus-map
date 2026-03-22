import { NextRequest, NextResponse } from "next/server";

import { createUser } from "@/lib/user-store";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ message: "email va password la bat buoc" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ message: "Mat khau toi thieu 8 ky tu" }, { status: 400 });
  }

  try {
    const user = await createUser(email, password);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_EXISTS") {
      return NextResponse.json({ message: "Email da ton tai" }, { status: 409 });
    }

    return NextResponse.json({ message: "Khong the tao tai khoan" }, { status: 500 });
  }
}
