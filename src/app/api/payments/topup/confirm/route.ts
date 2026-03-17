import { NextRequest, NextResponse } from "next/server";
import { creditTopupDirect, markTopupSuccess, getTopupOrderById } from "@/lib/mvp-store";

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("orderId");
  const userId = request.nextUrl.searchParams.get("userId");

  if (!orderId || !userId) {
    return NextResponse.json(
      { message: "orderId và userId là bắt buộc" },
      { status: 400 }
    );
  }

  try {
    const order = getTopupOrderById(orderId);

    if (!order) {
      return NextResponse.json(
        { message: "Không tìm thấy đơn hàng" },
        { status: 404 }
      );
    }

    if (order.status === "success") {
      return NextResponse.redirect(
        new URL(`/topup?status=already_paid&orderId=${orderId}`, request.url)
      );
    }

    // Mark the order as success and credit the user
    markTopupSuccess(orderId);
    creditTopupDirect(userId, Math.round(order.amount));

    return NextResponse.redirect(
      new URL(`/topup?status=success&orderId=${orderId}&amount=${order.amount}`, request.url)
    );
  } catch (error) {
    return NextResponse.redirect(
      new URL(
        `/topup?status=error&orderId=${orderId}&message=${encodeURIComponent(error instanceof Error ? error.message : "Lỗi xử lý thanh toán")}`,
        request.url
      )
    );
  }
}
