"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Map, ArrowLeft, Ticket, Wallet, PlusCircle, UserCircle, History } from "lucide-react";

import { clearStoredUserId, getStoredUserId } from "@/lib/mvp-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MvpNavProps = {
  title: string;
};

export default function MvpNav({ title }: MvpNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    setUserId(getStoredUserId());
  }, [pathname]);

  const navLinks = [
    { href: "/account", label: "Tài khoản", icon: UserCircle },
    { href: "/wallet", label: "Ví của tôi", icon: Wallet },
    { href: "/topup", label: "Nạp tiền", icon: PlusCircle },
    { href: "/buy-ticket", label: "Mua vé", icon: Ticket },
    { href: "/my-tickets", label: "Vé của tôi", icon: History },
  ];

  return (
    <header className="rounded-3xl border border-[#d6e4dc] bg-white/80 p-5 shadow-sm backdrop-blur-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/"
              className="text-xs flex items-center gap-1 font-semibold uppercase tracking-wider text-[#2f5a46] hover:text-[#1a382b] transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Quay về Bus Map
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h1>
          {userId !== null && (
            <p className="text-sm text-slate-500 mt-1">
              ID Người dùng: <span className="font-medium text-slate-700">{userId || "(Chưa đăng nhập)"}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {navLinks.map((link) => {
            if (!userId && link.href !== "/account") return null;
            if (userId && link.href === "/account") return null;

            const isActive = pathname === link.href;
            const Icon = link.icon;

            return (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={isActive ? "default" : "outline"}
                  className={cn(
                    "rounded-xl gap-2",
                    isActive
                      ? "bg-[#2f5a46] hover:bg-[#1f4231] text-white"
                      : "text-slate-600 border-slate-200 hover:bg-[#f7f5ef] hover:text-[#2f5a46]",
                  )}
                  size="sm"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline-block">{link.label}</span>
                </Button>
              </Link>
            );
          })}

          {userId && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:text-red-700 hover:border-red-300"
              onClick={() => {
                clearStoredUserId();
                router.push("/account");
                router.refresh();
              }}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline-block">Đăng xuất</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
