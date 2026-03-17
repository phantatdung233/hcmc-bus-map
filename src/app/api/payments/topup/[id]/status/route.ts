import { NextRequest, NextResponse } from "next/server";

import { getTopupOrderById } from "@/lib/mvp-store";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  const order = getTopupOrderById(params.id);

  if (!order) {
    return NextResponse.json({ message: "Khong tim thay order" }, { status: 404 });
  }

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    status: order.status,
    createdAt: order.createdAt,
  });
}
