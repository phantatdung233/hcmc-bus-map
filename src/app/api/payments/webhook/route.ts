import { NextRequest, NextResponse } from "next/server";

import { markTopupSuccess } from "@/lib/user-store";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const status = typeof body?.status === "string" ? body.status : "";

  if (!orderId || !status) {
    return NextResponse.json({ message: "orderId va status la bat buoc" }, { status: 400 });
  }

  if (status !== "success") {
    return NextResponse.json({ message: "Chi xu ly status success" }, { status: 200 });
  }

  try {
    const order = await markTopupSuccess(orderId);

    return NextResponse.json({
      orderId: order.id,
      status: order.status,
    });
  } catch {
    return NextResponse.json({ message: "Khong tim thay order" }, { status: 404 });
  }
}
