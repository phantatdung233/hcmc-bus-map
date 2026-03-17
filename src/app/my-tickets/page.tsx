"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Ticket, History, QrCode, Bus, Calendar, Clock, CreditCard } from "lucide-react";

import MvpNav from "@/components/mvp/MvpNav";
import { getStoredUserId, mvpRequest } from "@/lib/mvp-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TicketInfo = {
  id: string;
  routeId: number;
  ticketCode: string;
  price: number;
  status: "active" | "used" | "expired";
  createdAt: string;
};

export default function MyTicketsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [tickets, setTickets] = useState<TicketInfo[]>([]);
  const [message, setMessage] = useState("Đang tải danh sách vé...");

  useEffect(() => {
    const stored = getStoredUserId();
    if (!stored) {
      router.push("/account");
      return;
    }

    setUserId(stored);
  }, [router]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    mvpRequest<{ items: TicketInfo[] }>("/api/tickets/buy", undefined, userId)
      .then((res) => {
        setTickets(res.items);
        setMessage("");
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Không tải được dữ liệu");
      });
  }, [userId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main className="min-h-screen bg-linear-to-b from-[#f7f5ef] to-[#e8f2ee] p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <MvpNav title="Vé Điện Tử" />

        {message && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-600 shadow-sm text-center">
            {message}
          </div>
        )}

        <section className="flex flex-col">
          <Card className="rounded-3xl border-[#d6e4dc] bg-white/80 backdrop-blur-xl shadow-sm overflow-hidden flex flex-col min-h-[600px]">
            <CardHeader className="bg-[#2f5a46]/5 border-b border-[#d6e4dc]/50 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-xl font-bold text-[#2f5a46] flex items-center gap-2">
                    <Ticket className="h-6 w-6" /> Danh sách vé điện tử
                  </CardTitle>
                  <CardDescription className="text-slate-500 mt-1">
                    Hiển thị {tickets.length} vé của bạn
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Vé hợp lệ
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-slate-300"></span> Đã sử dụng/Hết hạn
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 overflow-y-auto override-scrollbar flex-1">
              <div className="grid gap-4 md:grid-cols-2">
                {tickets.length === 0 && !message ? (
                  <div className="col-span-full text-slate-500 text-center py-16 flex flex-col items-center">
                    <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <QrCode className="h-10 w-10 text-slate-400" />
                    </div>
                    <p className="text-lg font-medium text-slate-700">Bạn chưa có vé nào</p>
                    <p className="text-sm mt-1">Hãy mua vé để xem danh sách tại đây</p>
                  </div>
                ) : null}

                {tickets.map((item) => (
                  <div
                    key={item.id}
                    className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs group hover:border-[#2f5a46]/30 transition-colors hover:shadow-md"
                  >
                    <div
                      className={cn(
                        "absolute left-0 top-0 bottom-0 w-2",
                        item.status === "active" ? "bg-[#2f5a46]" : "bg-slate-300",
                      )}
                    ></div>

                    {/* Header vé */}
                    <div className="p-4 pl-6 border-b border-dashed border-slate-200 flex justify-between items-start bg-slate-50/50">
                      <div className="flex gap-3 items-center">
                        <div
                          className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs",
                            item.status === "active"
                              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200",
                          )}
                        >
                          <Bus className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                            Tuyến Xe
                          </p>
                          <p
                            className={cn(
                              "text-lg font-bold leading-none",
                              item.status === "active" ? "text-emerald-700" : "text-slate-600",
                            )}
                          >
                            Trạm số {item.routeId}
                          </p>
                        </div>
                      </div>

                      <span
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-xs",
                          item.status === "active"
                            ? "bg-emerald-500 text-white"
                            : item.status === "used"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {item.status === "active" ? "Hợp lệ" : item.status === "used" ? "Đã dùng" : "Hết hạn"}
                      </span>
                    </div>

                    {/* Body vé */}
                    <div className="p-4 pl-6 flex justify-between items-center bg-white relative">
                      {/* Vòng tròn cắt mép vé */}
                      <div className="absolute -top-3 -left-2 w-4 h-4 bg-slate-50/50 rounded-full border border-slate-200 border-t-0 border-l-0"></div>
                      <div className="absolute -top-3 -right-3 w-4 h-4 bg-slate-50/50 rounded-full border border-slate-200 border-t-0 border-r-0"></div>

                      <div className="space-y-4 w-full pr-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" /> Ngày mua
                            </p>
                            <p className="text-sm font-medium text-slate-800">{formatDate(item.createdAt)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" /> Giờ mua
                            </p>
                            <p className="text-sm font-medium text-slate-800">{formatTime(item.createdAt)}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                              <CreditCard className="w-3.5 h-3.5" /> Giá vé
                            </p>
                            <p className="text-sm font-bold text-slate-800">{item.price.toLocaleString("vi-VN")} đ</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                              <Ticket className="w-3.5 h-3.5" /> Mã số vé
                            </p>
                            <p className="text-sm font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700 tracking-wider inline-block">
                              {item.ticketCode}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Mã QR giả bên phải */}
                      <div className="shrink-0 flex flex-col items-center justify-center p-2 border border-slate-200 rounded-xl bg-white shadow-xs">
                        <QrCode
                          className={cn(
                            "w-[72px] h-[72px]",
                            item.status === "active" ? "text-slate-800" : "text-slate-300",
                          )}
                        />
                        <p className="text-[10px] mt-1 text-slate-400 font-medium">QUÉT ĐỂ LÊN XE</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
