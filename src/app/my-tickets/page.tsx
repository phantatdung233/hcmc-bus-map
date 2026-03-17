"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Ticket, History, QrCode, ArrowDownLeft, ArrowUpRight, Bus } from "lucide-react";

import MvpNav from "@/components/mvp/MvpNav";
import { getStoredUserId, mvpRequest } from "@/lib/mvp-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TicketInfo = {
  id: string;
  routeId: number;
  ticketCode: string;
  price: number;
  status: "active" | "used" | "expired";
  createdAt: string;
};

type Transaction = {
  id: string;
  type: "topup" | "buy_ticket";
  amount: number;
  status: "pending" | "success" | "failed";
  note?: string;
  createdAt: string;
};

export default function MyTicketsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [tickets, setTickets] = useState<TicketInfo[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [message, setMessage] = useState("Đang tải danh sách vé và lịch sử...");

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

    Promise.all([
      mvpRequest<{ items: TicketInfo[] }>("/api/tickets/buy", undefined, userId),
      mvpRequest<{ items: Transaction[] }>("/api/wallet/transactions", undefined, userId),
    ])
      .then(([ticketRes, txRes]) => {
        setTickets(ticketRes.items);
        setTransactions(txRes.items);
        setMessage("");
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Không tải được dữ liệu");
      });
  }, [userId]);

  return (
    <main className="min-h-screen bg-linear-to-b from-[#f7f5ef] to-[#e8f2ee] p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <MvpNav title="Lịch sử & Vé của tôi" />

        {message && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-600 shadow-sm text-center">
            {message}
          </div>
        )}

        <section className="grid gap-6 md:grid-cols-2">
          {/* Cột danh sách vé */}
          <Card className="rounded-3xl border-[#d6e4dc] bg-white/80 backdrop-blur-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
            <CardHeader className="bg-[#2f5a46]/5 border-b border-[#d6e4dc]/50 pb-4">
              <CardTitle className="text-lg font-bold text-[#2f5a46] flex items-center gap-2">
                <Ticket className="h-5 w-5" /> Danh sách vé điện tử
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 overflow-y-auto override-scrollbar flex-1">
              <ul className="space-y-4">
                {tickets.length === 0 && !message ? (
                  <li className="text-slate-500 text-center py-12 flex flex-col items-center">
                    <QrCode className="h-10 w-10 mb-3 text-slate-300" />
                    Bạn chưa mua vé nào
                  </li>
                ) : null}

                {tickets.map((item) => (
                  <li
                    key={item.id}
                    className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs group"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#2f5a46]"></div>
                    <div className="p-4 pl-6 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                      <div className="flex gap-4 items-center">
                        <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                          <Bus className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 tracking-wide">{item.ticketCode}</p>
                          <p className="text-sm font-medium text-emerald-700">Tuyến số {item.routeId}</p>
                        </div>
                      </div>

                      <div className="flex flex-row sm:flex-col items-center justify-between sm:items-end gap-1 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                            item.status === "active"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {item.status}
                        </span>
                        <p className="font-semibold text-slate-700">{item.price.toLocaleString("vi-VN")} đ</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Cột lịch sử giao dịch */}
          <Card className="rounded-3xl border-[#d6e4dc] bg-white/80 backdrop-blur-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
            <CardHeader className="bg-[#2f5a46]/5 border-b border-[#d6e4dc]/50 pb-4">
              <CardTitle className="text-lg font-bold text-[#2f5a46] flex items-center gap-2">
                <History className="h-5 w-5" /> Lịch sử giao dịch
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 overflow-y-auto override-scrollbar flex-1">
              <ul className="space-y-3">
                {transactions.length === 0 && !message ? (
                  <li className="text-slate-500 text-center py-12 flex flex-col items-center">
                    <History className="h-10 w-10 mb-3 text-slate-300" />
                    Chưa có giao dịch
                  </li>
                ) : null}

                {transactions.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${item.type === "topup" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}
                      >
                        {item.type === "topup" ? (
                          <ArrowDownLeft className="h-5 w-5" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">
                          {item.type === "topup" ? "Nạp tiền vào ví" : "Mua vé xe buýt"}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${item.status === "success" ? "bg-emerald-500" : item.status === "pending" ? "bg-amber-500" : "bg-red-500"}`}
                          ></span>
                          {new Date(item.createdAt).toLocaleString("vi-VN")}
                        </p>
                      </div>
                    </div>
                    <div className={`font-bold ${item.type === "topup" ? "text-emerald-600" : "text-slate-800"}`}>
                      {item.type === "topup" ? "+" : "-"}
                      {item.amount.toLocaleString("vi-VN")} đ
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
