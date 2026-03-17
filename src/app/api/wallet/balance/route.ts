import { NextRequest, NextResponse } from "next/server";

import { getWalletByUser } from "@/lib/mvp-store";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ message: "Thieu x-user-id" }, { status: 401 });
  }

  const wallet = getWalletByUser(userId);

  return NextResponse.json({
    userId: wallet.userId,
    balance: wallet.balance,
    updatedAt: wallet.updatedAt,
  });
}
