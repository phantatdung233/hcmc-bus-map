"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, LogIn, ArrowRight } from "lucide-react";

import MvpNav from "@/components/mvp/MvpNav";
import { getCurrentUser, mvpRequest } from "@/lib/mvp-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Đăng nhập hoặc tạo tài khoản để sử dụng ví thanh toán.");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then(() => {
        setIsAuthenticated(true);
        router.push("/wallet");
      })
      .catch(() => {
        setIsAuthenticated(false);
      });
  }, [router]);

  const onLogin = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("Đang xử lý đăng nhập...");

    try {
      const result = await mvpRequest<{ userId: string; email: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setIsAuthenticated(true);
      setMessage(`Đăng nhập thành công: ${result.email}`);
      router.push("/wallet");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Đăng nhập thất bại");
    }
  };

  const onRegister = async () => {
    setMessage("Đang tạo tài khoản...");

    try {
      const result = await mvpRequest<{ id: string; email: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setMessage(`Tạo tài khoản thành công: ${result.email}. Bạn có thể đăng nhập ngay.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tạo tài khoản thất bại");
    }
  };

  return (
    <main className="min-h-screen bg-linear-to-b from-[#f7f5ef] to-[#e8f2ee] p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <MvpNav title="Tài khoản" />

        <Card className="rounded-3xl border-[#d6e4dc] bg-white/80 backdrop-blur-xl shadow-sm overflow-hidden">
          <CardHeader className="bg-[#2f5a46]/5 border-b border-[#d6e4dc]/50 pb-6">
            <CardTitle className="text-xl font-bold text-[#2f5a46]">Quản lý thẻ & Tài khoản</CardTitle>
            <CardDescription className="text-slate-600">
              Đăng nhập để xem số dư, mua vé và theo dõi lịch sử chuyến đi
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-6 rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4 text-sm text-amber-900 shadow-sm">
              {message}
            </div>

            <form className="grid gap-4 md:grid-cols-3 items-end" onSubmit={onLogin}>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Email</label>
                <Input
                  className="rounded-xl border-slate-300 focus-visible:ring-[#2f5a46]"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Mật khẩu</label>
                <Input
                  className="rounded-xl border-slate-300 focus-visible:ring-[#2f5a46]"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="******"
                />
              </div>
              <Button className="rounded-xl bg-[#2f5a46] hover:bg-[#1f4231] font-semibold h-10 w-full" type="submit">
                <LogIn className="mr-2 h-4 w-4" /> Đăng nhập
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap gap-3 items-center justify-between">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  onClick={onRegister}
                  type="button"
                >
                  <UserPlus className="mr-2 h-4 w-4" /> Tạo tài khoản mới
                </Button>
              </div>

              {isAuthenticated && (
                <Button
                  variant="ghost"
                  className="rounded-xl text-[#2f5a46] hover:bg-[#2f5a46]/10"
                  onClick={() => router.push("/wallet")}
                  type="button"
                >
                  Đi đến Ví <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
