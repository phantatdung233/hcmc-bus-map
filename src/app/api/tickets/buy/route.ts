import { NextRequest, NextResponse } from "next/server";

import { buyBusTicket, getTicketsByUser } from "@/lib/mvp-store";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ message: "Thieu x-user-id" }, { status: 401 });
  }

  return NextResponse.json({
    items: getTicketsByUser(userId),
  });
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json({ message: "Thieu x-user-id" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const routeId = Number(body?.routeId);
  const price = Number(body?.price);

  if (!Number.isFinite(routeId) || routeId <= 0) {
    return NextResponse.json({ message: "routeId khong hop le" }, { status: 400 });
  }

  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ message: "price khong hop le" }, { status: 400 });
  }

  try {
    const ticket = buyBusTicket(userId, Math.round(routeId), Math.round(price));

    return NextResponse.json({
      ticket,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json({ message: "So du khong du" }, { status: 400 });
    }

    return NextResponse.json({ message: "Khong the mua ve" }, { status: 500 });
  }
}
