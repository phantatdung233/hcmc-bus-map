import { NextRequest, NextResponse } from "next/server";

import { getUserById } from "@/lib/mvp-store";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ message: "Thieu x-user-id" }, { status: 401 });
  }

  const user = getUserById(userId);

  if (!user) {
    return NextResponse.json({ message: "Khong tim thay user" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
  });
}
