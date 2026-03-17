import { NextRequest, NextResponse } from "next/server";

import { loginUser } from "@/lib/mvp-store";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ message: "email va password la bat buoc" }, { status: 400 });
  }

  try {
    const user = loginUser(email, password);

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      note: "MVP: Gui userId qua header x-user-id cho cac API can dang nhap",
    });
  } catch {
    return NextResponse.json({ message: "Sai thong tin dang nhap" }, { status: 401 });
  }
}
