"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { QrCode, CheckCircle2, ArrowRight, Wallet, Download } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

import MvpNav from "@/components/mvp/MvpNav";
import { getCurrentUser, mvpRequest } from "@/lib/mvp-client";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type TopupOrder = {
  orderId: string;
  amount: number;
  status: "pending" | "success" | "failed";
  paymentUrl: string;
};

export default function TopupPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState(50000);
  const { balance, refetch: refetchBalance } = useWalletBalance(Boolean(userId), userId || "anonymous");
  const [order, setOrder] = useState<TopupOrder | null>(null);
  const [message, setMessage] = useState("Tạo lệnh nạp tiền để hiển thị QR thanh toán.");
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        setUserId(user.id);

        if (typeof window !== "undefined") {
          const savedOrder = localStorage.getItem(`topup_order_${user.id}`);
          if (savedOrder) {
            try {
              const parsedOrder = JSON.parse(savedOrder);
              setOrder(parsedOrder);
            } catch {
              // Ignore parse error
            }
          }
        }
      })
      .catch(() => {
        router.push("/account");
      });
  }, [router]);

  // Persist order to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined" && userId && order) {
      localStorage.setItem(`topup_order_${userId}`, JSON.stringify(order));
    }
  }, [order, userId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const status = params.get("status");
      const orderId = params.get("orderId");
      const amount = params.get("amount");

      if (status === "success" && orderId && amount) {
        const amountValue = parseInt(amount, 10);

        queueMicrotask(() => {
          setMessage(`✓ Nạp tiền thành công! Đã cộng ${amountValue.toLocaleString("vi-VN")} đ vào tài khoản.`);
          setOrder({
            orderId,
            amount: amountValue,
            status: "success",
            paymentUrl: "",
          });
        });

        if (userId) {
          refetchBalance();
          localStorage.removeItem(`topup_order_${userId}`);
        }

        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [userId, refetchBalance]);

  const createOrder = async () => {
    if (!userId) {
      return;
    }

    setMessage("Đang tạo lệnh nạp tiền...");

    try {
      const result = await mvpRequest<TopupOrder>("/api/payments/topup/create", {
        method: "POST",
        body: JSON.stringify({ amount }),
      });

      const confirmUrl = `${window.location.origin}/api/payments/topup/confirm?orderId=${result.orderId}`;

      setOrder({
        ...result,
        paymentUrl: confirmUrl,
      });
      setMessage("Mã QR đã được tạo. Quét mã để xác nhận thanh toán.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không tạo được lệnh nạp tiền");
    }
  };

  const downloadQR = () => {
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `topup-${order?.orderId || "qr"}.png`;
    link.click();
  };

  return (
    <main className="min-h-screen bg-linear-to-b from-[#f7f5ef] to-[#e8f2ee] p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <MvpNav title="Nạp tiền vào ví" />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          <Card className="rounded-3xl border-[#d6e4dc] bg-white/80 backdrop-blur-xl shadow-sm overflow-hidden lg:col-span-2">
            <CardHeader className="bg-[#2f5a46]/5 border-b border-[#d6e4dc]/50 pb-4">
              <CardTitle className="text-lg font-bold text-[#2f5a46] flex items-center gap-2">
                <Wallet className="h-5 w-5" /> Thông tin nạp tiền
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="mb-6">
                <p className="text-sm text-slate-500 font-medium tracking-wide uppercase mb-1">Số dư hiện tại</p>
                <p className="text-3xl font-bold text-[#2f5a46]">
                  {balance === null ? "..." : `${balance.toLocaleString("vi-VN")} đ`}
                </p>
              </div>

              <div
                className={cn(
                  "mb-6 rounded-2xl border p-4 text-sm font-medium shadow-sm",
                  order?.status === "success"
                    ? "border-emerald-200/60 bg-emerald-50/50 text-emerald-800"
                    : "border-amber-200/60 bg-amber-50/50 text-amber-800",
                )}
              >
                {message}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Số tiền cần nạp (VNĐ)</label>
                  <div className="relative">
                    <Input
                      className="rounded-xl border-slate-300 pl-4 pr-12 h-12 text-lg font-semibold focus-visible:ring-[#2f5a46]"
                      type="number"
                      value={amount}
                      onChange={(event) => setAmount(Number(event.target.value) || 0)}
                      disabled={!!order && order.status === "pending"}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">đ</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[20000, 50000, 100000].map((val) => (
                    <Button
                      key={val}
                      variant="outline"
                      className="rounded-lg border-slate-200 text-slate-600 hover:border-[#2f5a46] hover:text-[#2f5a46]"
                      onClick={() => setAmount(val)}
                      disabled={!!order && order.status === "pending"}
                      type="button"
                    >
                      {val / 1000}k
                    </Button>
                  ))}
                </div>

                <Button
                  className="rounded-xl bg-[#2f5a46] hover:bg-[#1f4231] font-semibold h-12 w-full mt-4"
                  onClick={createOrder}
                  disabled={amount <= 0 || (!!order && order.status === "pending")}
                  type="button"
                >
                  <QrCode className="mr-2 h-5 w-5" /> Tạo mã QR nạp tiền
                </Button>

                {order && order.status === "success" && (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl border-[#d6e4dc] text-[#2f5a46] hover:bg-[#f7f5ef]"
                    onClick={() => router.push("/wallet")}
                    type="button"
                  >
                    Quay về ví <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {order ? (
            <Card className="rounded-3xl border-[#d6e4dc] bg-white text-center shadow-lg lg:col-span-3 overflow-hidden flex flex-col justify-center relative">
              {order.status === "success" ? (
                <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center z-0">
                  <div className="w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl absolute"></div>
                </div>
              ) : null}

              <CardContent className="pt-8 pb-8 relative z-10 flex flex-col items-center">
                <div className="mb-6 flex flex-col items-center">
                  <p className="text-slate-500 font-medium uppercase tracking-wider text-sm mb-2">
                    Mã đơn hàng: {order.orderId}
                  </p>
                  <h3 className="text-3xl font-bold text-slate-800 mb-1">{order.amount.toLocaleString("vi-VN")} đ</h3>
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 mb-6">
                    {order.status === "pending"
                      ? "Chờ thanh toán"
                      : order.status === "success"
                        ? "Thành công"
                        : "Thất bại"}
                  </div>
                </div>

                <div className="mb-8 relative">
                  {order.status === "success" ? (
                    <div className="h-40 w-40 rounded-3xl bg-emerald-100 border-4 border-emerald-500 flex items-center justify-center shadow-inner">
                      <CheckCircle2 className="h-20 w-20 text-emerald-600" />
                    </div>
                  ) : (
                    <div
                      ref={qrRef}
                      className="inline-block p-4 bg-white rounded-2xl border-4 border-[#2f5a46] shadow-lg"
                    >
                      <QRCodeCanvas value={order.paymentUrl} size={256} level="H" includeMargin={true} />
                    </div>
                  )}
                </div>

                {order.status === "pending" ? (
                  <div className="flex flex-col gap-3 w-full max-w-xs">
                    <div className="text-sm text-slate-600 bg-blue-50 border border-blue-200 rounded-xl p-3">
                      Quét mã QR để thanh toán
                    </div>
                    <Button
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md h-12"
                      onClick={downloadQR}
                      type="button"
                    >
                      <Download className="mr-2 h-5 w-5" /> Tải mã QR
                    </Button>
                  </div>
                ) : (
                  <p className="text-emerald-700 font-medium text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" /> Giao dịch hoàn tất
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-3xl border-slate-200 border-dashed bg-slate-50/50 flex items-center justify-center p-8 lg:col-span-3 min-h-[400px]">
              <div className="text-center text-slate-400 flex flex-col items-center">
                <QrCode className="h-16 w-16 mb-4 opacity-50" />
                <p>
                  Nhập số tiền và tạo mã QR
                  <br />
                  để tiếp tục nạp tiền
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
