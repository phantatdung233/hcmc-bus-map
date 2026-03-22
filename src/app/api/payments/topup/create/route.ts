import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserId } from "@/lib/server-auth";
import { createTopupOrder } from "@/lib/user-store";

export async function POST(request: NextRequest) {
  const userId = getAuthenticatedUserId(request);

  if (!userId) {
    return NextResponse.json({ message: "Chua dang nhap" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const amount = Number(body?.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ message: "amount khong hop le" }, { status: 400 });
  }

  const order = await createTopupOrder(userId, Math.round(amount));

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    status: order.status,
    paymentUrl: order.paymentUrl,
  });
}
