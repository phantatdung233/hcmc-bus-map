import { NextRequest, NextResponse } from "next/server";

import { creditTopupDirect, markTopupSuccess } from "@/lib/mvp-store";

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const body = await request.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const status = typeof body?.status === "string" ? body.status : "";
  const amount = Number(body?.amount);

  if (!orderId || !status) {
    return NextResponse.json({ message: "orderId va status la bat buoc" }, { status: 400 });
  }

  if (status !== "success") {
    return NextResponse.json({ message: "MVP chi xu ly status success" }, { status: 200 });
  }

  try {
    const order = markTopupSuccess(orderId);

    return NextResponse.json({
      orderId: order.id,
      status: order.status,
    });
  } catch {
    if (userId && Number.isFinite(amount) && amount > 0) {
      const tx = creditTopupDirect(userId, Math.round(amount));
      return NextResponse.json({
        orderId,
        status: "success",
        fallback: true,
        transactionId: tx.id,
      });
    }

    return NextResponse.json({ message: "Khong tim thay order" }, { status: 404 });
  }
}
