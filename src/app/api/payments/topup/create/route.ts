import { NextRequest, NextResponse } from "next/server";

import { createTopupOrder } from "@/lib/mvp-store";

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ message: "Thieu x-user-id" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const amount = Number(body?.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ message: "amount khong hop le" }, { status: 400 });
  }

  const order = createTopupOrder(userId, Math.round(amount));

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    status: order.status,
    paymentUrl: order.paymentUrl,
  });
}
