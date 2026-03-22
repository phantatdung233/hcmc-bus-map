import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, ReceiptText, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const formatVnd = (value: number) => `${value.toLocaleString("vi-VN")} d`;

type ResultConfig = {
  title: string;
  description: string;
  badge: string;
  badgeClassName: string;
  icon: "success" | "info" | "error";
};

const RESULT_MAP: Record<string, ResultConfig> = {
  success: {
    title: "Thanh toan thanh cong",
    description: "He thong da ghi nhan giao dich va cap nhat so du vi.",
    badge: "Success",
    badgeClassName: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    icon: "success",
  },
  already_paid: {
    title: "Don hang da duoc thanh toan",
    description: "Ban da quet thanh toan truoc do. Khong co giao dich nao bi tru trung.",
    badge: "Already Paid",
    badgeClassName: "bg-sky-100 text-sky-700 border border-sky-200",
    icon: "info",
  },
  error: {
    title: "Thanh toan that bai",
    description: "Khong the xu ly giao dich luc nay. Vui long thu lai sau.",
    badge: "Failed",
    badgeClassName: "bg-rose-100 text-rose-700 border border-rose-200",
    icon: "error",
  },
};

const StatusIcon = ({ icon }: { icon: ResultConfig["icon"] }) => {
  if (icon === "success") {
    return <CheckCircle2 className="h-14 w-14 text-emerald-600" />;
  }

  if (icon === "info") {
    return <Clock3 className="h-14 w-14 text-sky-600" />;
  }

  return <AlertTriangle className="h-14 w-14 text-rose-600" />;
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const readValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
};

export default async function PaymentScanResultPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const status = readValue(params.status) || "error";
  const orderId = readValue(params.orderId) || "N/A";
  const amountRaw = Number(readValue(params.amount) || 0);
  const messageRaw = readValue(params.message);

  const config = RESULT_MAP[status] || RESULT_MAP.error;
  const amountLabel = amountRaw > 0 ? formatVnd(amountRaw) : "Khong co";

  const message = messageRaw.trim() ? messageRaw : config.description;

  return (
    <main className="min-h-screen bg-linear-to-br from-[#f7f5ef] via-[#e9f3ef] to-[#dbece7] p-4 md:p-8">
      <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
        <Card className="w-full rounded-3xl border-[#d6e4dc] bg-white/90 shadow-xl backdrop-blur">
          <CardHeader className="border-b border-[#d6e4dc]/60 pb-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-slate-100 p-3">
                  <StatusIcon icon={config.icon} />
                </div>
                <div>
                  <CardTitle className="text-2xl text-slate-800">{config.title}</CardTitle>
                  <CardDescription className="mt-1 text-slate-600">Ket qua sau khi quet QR thanh toan</CardDescription>
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${config.badgeClassName}`}>
                {config.badge}
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
              {message}
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ma don hang</p>
                <p className="mt-1 font-mono text-sm text-slate-800">{orderId}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">So tien</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{amountLabel}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Button asChild className="h-11 rounded-xl bg-[#2f5a46] hover:bg-[#1f4231]">
                <Link href="/wallet">
                  <Wallet className="mr-2 h-4 w-4" /> Ve vi
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="h-11 rounded-xl border-[#d6e4dc] text-[#2f5a46] hover:bg-[#f0f7f4]"
              >
                <Link href="/topup">
                  <ReceiptText className="mr-2 h-4 w-4" /> Tao lenh moi
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-11 rounded-xl border-slate-200">
                <Link href="/">Ve ban do</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
