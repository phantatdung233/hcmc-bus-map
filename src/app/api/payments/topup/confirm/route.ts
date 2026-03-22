import { NextRequest, NextResponse } from "next/server";
import { getTopupOrderById, markTopupSuccess } from "@/lib/user-store";

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json({ message: "orderId la bat buoc" }, { status: 400 });
  }

  try {
    const order = await getTopupOrderById(orderId);

    if (!order) {
      return NextResponse.json({ message: "Không tìm thấy đơn hàng" }, { status: 404 });
    }

    if (order.status === "success") {
      return NextResponse.redirect(
        new URL(`/payment/scan-result?status=already_paid&orderId=${orderId}&amount=${order.amount}`, request.url),
      );
    }

    await markTopupSuccess(orderId);

    return NextResponse.redirect(
      new URL(`/payment/scan-result?status=success&orderId=${orderId}&amount=${order.amount}`, request.url),
    );
  } catch (error) {
    return NextResponse.redirect(
      new URL(
        `/payment/scan-result?status=error&orderId=${orderId}&message=${encodeURIComponent(error instanceof Error ? error.message : "Loi xu ly thanh toan")}`,
        request.url,
      ),
    );
  }
}
