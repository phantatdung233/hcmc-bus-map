"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Ticket, Bus, QrCode, Wallet } from "lucide-react";

import MvpNav from "@/components/mvp/MvpNav";
import { getCurrentUser, mvpRequest } from "@/lib/mvp-client";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type TicketInfo = {
  id: string;
  routeId: number;
  ticketCode: string;
  price: number;
  status: string;
  createdAt: string;
};

export default function BuyTicketPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [routeId, setRouteId] = useState(1);
  const [price, setPrice] = useState(7000);
  const { balance, refetch: refetchBalance } = useWalletBalance(Boolean(userId), userId || "anonymous");
  const [message, setMessage] = useState("Chọn tuyến và thanh toán vé bằng số dư ví.");
  const [lastTicket, setLastTicket] = useState<TicketInfo | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        setUserId(user.id);
      })
      .catch(() => {
        router.push("/account");
      });
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const routeIdParam = Number(params.get("routeId") ?? "");
    const priceParam = Number(params.get("price") ?? "");

    if (Number.isFinite(routeIdParam) && routeIdParam > 0) {
      setRouteId(Math.round(routeIdParam));
    }

    if (Number.isFinite(priceParam) && priceParam > 0) {
      setPrice(Math.round(priceParam));
    }
  }, []);

  const onBuy = async () => {
    if (!userId) {
      return;
    }

    setMessage("Đang xử lý giao dịch mùa vé...");

    try {
      const result = await mvpRequest<{ ticket: TicketInfo }>("/api/tickets/buy", {
        method: "POST",
        body: JSON.stringify({ routeId, price }),
      });

      setLastTicket(result.ticket);
      await refetchBalance();
      setMessage("Mua vé thành công!");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Mua vé thất bại");
    }
  };

  return (
    <main className="min-h-screen bg-linear-to-b from-[#f7f5ef] to-[#e8f2ee] p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <MvpNav title="Mua vé xe buýt" />

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-3xl border-[#d6e4dc] bg-white/80 backdrop-blur-xl shadow-sm overflow-hidden">
            <CardHeader className="bg-[#2f5a46]/5 border-b border-[#d6e4dc]/50 pb-4">
              <CardTitle className="text-lg font-bold text-[#2f5a46] flex items-center gap-2">
                <Ticket className="h-5 w-5" /> Mua vé mới
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-3">
                  <Wallet className="h-6 w-6 text-emerald-600" />
                  <div>
                    <p className="text-xs text-emerald-700 font-medium uppercase tracking-wide">Số dư khả dụng</p>
                    <p className="text-lg font-bold text-emerald-700">
                      {balance === null ? "..." : `${balance.toLocaleString("vi-VN")} đ`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                  onClick={() => router.push("/topup")}
                >
                  Nạp thêm
                </Button>
              </div>

              <div
                className={cn(
                  "rounded-2xl border p-4 text-sm font-medium shadow-sm",
                  lastTicket
                    ? "border-emerald-200/60 bg-emerald-50/50 text-emerald-800"
                    : "border-slate-200/60 bg-slate-50 text-slate-700",
                )}
              >
                {message}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Tuyến xe</label>
                    <div className="relative">
                      <Input
                        className="rounded-xl border-slate-300 pl-10 focus-visible:ring-[#2f5a46]"
                        type="number"
                        value={routeId}
                        onChange={(event) => setRouteId(Number(event.target.value) || 0)}
                      />
                      <Bus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Giá vé (VNĐ)</label>
                    <Input
                      className="rounded-xl border-slate-300 focus-visible:ring-[#2f5a46]"
                      type="number"
                      value={price}
                      onChange={(event) => setPrice(Number(event.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pb-2">
                  {[3000, 7000, 10000].map((val) => (
                    <Button
                      key={val}
                      variant="outline"
                      className="rounded-lg border-slate-200 text-slate-600 hover:border-[#2f5a46] hover:text-[#2f5a46]"
                      onClick={() => setPrice(val)}
                      type="button"
                    >
                      {val / 1000}k
                    </Button>
                  ))}
                </div>

                <Button
                  className="rounded-xl bg-[#2f5a46] hover:bg-[#1f4231] font-semibold h-12 w-full"
                  onClick={onBuy}
                  type="button"
                >
                  <Ticket className="mr-2 h-5 w-5" /> Thanh toán {price.toLocaleString("vi-VN")} đ
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "rounded-3xl shadow-sm border overflow-hidden transition-all duration-300 flex flex-col justify-center",
              lastTicket
                ? "border-emerald-200 bg-emerald-600 text-white shadow-emerald-500/20 shadow-xl"
                : "border-slate-200 border-dashed bg-white/40",
            )}
          >
            <CardContent className="p-8">
              {lastTicket ? (
                <div className="flex flex-col items-center text-center">
                  <div className="bg-white p-4 rounded-2xl mb-6 shadow-sm">
                    <QrCode className="h-40 w-40 text-slate-900" />
                  </div>

                  <h3 className="text-2xl font-bold mb-1">Vé điện tử</h3>
                  <p className="text-emerald-100 font-medium mb-6 backdrop-blur-sm bg-black/10 px-4 py-1 rounded-full text-sm">
                    Tuyến số {lastTicket.routeId}
                  </p>

                  <div className="w-full bg-white/10 rounded-2xl p-4 text-left border border-white/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-emerald-100 text-sm">Mã vé:</span>
                      <span className="font-mono font-bold tracking-wider">{lastTicket.ticketCode}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-emerald-100 text-sm">Giá vé:</span>
                      <span className="font-bold">{lastTicket.price.toLocaleString("vi-VN")} đ</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-100 text-sm">Trạng thái:</span>
                      <span className="bg-white text-emerald-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                        {lastTicket.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-emerald-200 mt-6 mt-auto">HSD: Trong ngày • Đưa mã QR cho nhân viên</p>
                </div>
              ) : (
                <div className="text-center text-slate-400 flex flex-col items-center justify-center min-h-[300px]">
                  <QrCode className="h-16 w-16 mb-4 opacity-30" />
                  <p className="font-medium">Vé điện tử của bạn</p>
                  <p className="text-sm mt-1">sẽ hiển thị ở đây sau khi mua</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
