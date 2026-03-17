"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, PlusCircle, Ticket, History, ArrowDownLeft, ArrowUpRight, ClockAlert } from "lucide-react";

import MvpNav from "@/components/mvp/MvpNav";
import { getStoredUserId, mvpRequest } from "@/lib/mvp-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Transaction = {
  id: string;
  type: "topup" | "buy_ticket";
  amount: number;
  status: "pending" | "success" | "failed";
  note?: string;
  createdAt: string;
};

export default function WalletPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [message, setMessage] = useState("Đang tải dữ liệu ví...");

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
      mvpRequest<{ balance: number }>("/api/wallet/balance", undefined, userId),
      mvpRequest<{ items: Transaction[] }>("/api/wallet/transactions", undefined, userId),
    ])
      .then(([walletRes, txRes]) => {
        setBalance(walletRes.balance);
        setTransactions(txRes.items);
        setMessage("");
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Không tải được dữ liệu vi");
      });
  }, [userId]);

  return (
    <main className="min-h-screen bg-linear-to-b from-[#f7f5ef] to-[#e8f2ee] p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <MvpNav title="Ví của tôi" />

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="rounded-3xl border-[#d6e4dc] bg-[#2f5a46] text-white shadow-lg overflow-hidden relative md:col-span-1">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-100 flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Số dư khả dụng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-6 tracking-tight">
                {balance === null ? "..." : `${balance.toLocaleString("vi-VN")} đ`}
              </div>

              <div className="flex flex-col gap-3">
                <Link href="/topup" className="w-full">
                  <Button className="w-full rounded-xl bg-white text-[#2f5a46] hover:bg-emerald-50 h-11 font-semibold border-none">
                    <PlusCircle className="mr-2 h-5 w-5" /> Nạp tiền vào ví
                  </Button>
                </Link>
                <Link href="/buy-ticket" className="w-full">
                  <Button
                    variant="outline"
                    className="w-full rounded-xl bg-[#2f5a46] hover:bg-[#1f4231] hover:text-white text-emerald-50 border-emerald-400 h-11 font-medium"
                  >
                    <Ticket className="mr-2 h-5 w-5" /> Mua vé xe buýt
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-[#d6e4dc] bg-white/80 backdrop-blur-xl shadow-sm md:col-span-2 flex flex-col max-h-[500px]">
            <CardHeader className="bg-[#2f5a46]/5 border-b border-[#d6e4dc]/50 pb-4">
              <CardTitle className="text-lg font-bold text-[#2f5a46] flex items-center gap-2">
                <History className="h-5 w-5" /> Lịch sử giao dịch gần đây
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 overflow-y-auto override-scrollbar flex-1">
              {message && (
                <div className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-xl mb-4">{message}</div>
              )}

              <ul className="space-y-3">
                {transactions.length === 0 && !message ? (
                  <li className="text-slate-500 text-center py-8 bg-slate-50 rounded-2xl flex flex-col items-center">
                    <ClockAlert className="h-8 w-8 mb-2 text-slate-300" />
                    Chưa có giao dịch nào
                  </li>
                ) : null}

                {transactions.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 hover:border-[#d6e4dc] transition-colors shadow-xs"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${item.type === "topup" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}
                      >
                        {item.type === "topup" ? (
                          <ArrowDownLeft className="h-5 w-5" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">
                          {item.type === "topup" ? "Nạp tiền vào ví" : "Mua vé xe buýt"}
                        </p>
                        <p className="text-sm text-slate-500 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.status === "success" ? "bg-emerald-50 text-emerald-700" : item.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}
                          >
                            {item.status === "success"
                              ? "Thành công"
                              : item.status === "pending"
                                ? "Đang xử lý"
                                : "Thất bại"}
                          </span>
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
        </div>
      </div>
    </main>
  );
}
