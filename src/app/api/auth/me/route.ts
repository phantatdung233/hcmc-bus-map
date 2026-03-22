import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserId } from "@/lib/server-auth";
import { getUserById } from "@/lib/user-store";

export async function GET(request: NextRequest) {
  const userId = getAuthenticatedUserId(request);

  if (!userId) {
    return NextResponse.json({ message: "Chua dang nhap" }, { status: 401 });
  }

  const user = await getUserById(userId);

  if (!user) {
    return NextResponse.json({ message: "Khong tim thay user" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
  });
}
