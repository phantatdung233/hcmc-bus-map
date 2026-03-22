import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUserId } from "@/lib/server-auth";
import { getTopupOrderById } from "@/lib/user-store";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ message: "Chua dang nhap" }, { status: 401 });
  }

  const params = await context.params;
  const order = await getTopupOrderById(params.id);

  if (!order) {
    return NextResponse.json({ message: "Khong tim thay order" }, { status: 404 });
  }

  if (order.userId !== userId) {
    return NextResponse.json({ message: "Khong co quyen truy cap order nay" }, { status: 403 });
  }

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    status: order.status,
    createdAt: order.createdAt,
  });
}
