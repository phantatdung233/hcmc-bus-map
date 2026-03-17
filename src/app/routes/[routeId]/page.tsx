import Link from "next/link";
import { notFound } from "next/navigation";

import routeInfoJson from "@/data/routeinfo.json";
import routesJson from "@/data/routes.json";
import { getCurrentSeconds, getNextDepartures, parseTimeTable } from "@/lib/time";
import type { RouteInfo, RouteSchedule } from "@/types/bus";

type RouteDetailProps = {
  params: Promise<{ routeId: string }>;
};

const routeInfos = routeInfoJson as RouteInfo[];
const routeSchedules = routesJson as RouteSchedule[];

export default async function RouteDetailPage({ params }: RouteDetailProps) {
  const { routeId } = await params;
  const routeIdNumber = Number.parseInt(routeId, 10);

  if (!Number.isFinite(routeIdNumber)) {
    notFound();
  }

  const info = routeInfos.find((item) => item.RouteId === routeIdNumber);
  const schedule = routeSchedules.find((item) => item.RouteId === routeIdNumber);

  if (!info || !schedule) {
    notFound();
  }

  const nowSeconds = getCurrentSeconds();
  const nextIn = getNextDepartures(parseTimeTable(schedule.TimeTableIn), nowSeconds, 3);
  const nextOut = getNextDepartures(parseTimeTable(schedule.TimeTableOut), nowSeconds, 3);

  return (
    <main className="min-h-screen bg-linear-to-b from-[#f6f8f3] via-[#f2f7f2] to-[#e8f1ea] px-4 py-5 text-[#122118]">
      <div className="mx-auto max-w-3xl">
        <div className="sticky top-4 z-20 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#d5e2da] bg-white/90 p-3 shadow-sm backdrop-blur">
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-[#c2d0c8] bg-white px-3 py-1.5 text-sm font-medium text-[#1f3a2c]"
          >
            Quay lại bản đồ
          </Link>
          <p className="rounded-full bg-[#eef5f1] px-3 py-1 text-xs font-medium text-[#395948]">Tuyến {info.RouteNo}</p>
        </div>

        <section className="mt-4 rounded-3xl border border-[#d5dfd8] bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.14em] text-[#5d7065]">Chi tiết tuyến xe buýt</p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight text-[#102117]">{info.RouteName}</h1>
          <p className="mt-2 text-sm text-[#4f6157]">Đơn vị vận hành: {info.Orgs}</p>

          <div className="mt-5 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-[#f2f7f4] p-3">
              <p className="text-xs text-[#5f6f67]">Giờ hoạt động</p>
              <p className="mt-1 font-medium text-[#1d3328]">{info.OperationTime}</p>
            </div>
            <div className="rounded-xl bg-[#f2f7f4] p-3">
              <p className="text-xs text-[#5f6f67]">Giá vé</p>
              <p className="mt-1 font-medium text-[#1d3328]">{info.NormalTicket}</p>
            </div>
            <div className="rounded-xl bg-[#f2f7f4] p-3">
              <p className="text-xs text-[#5f6f67]">Tần suất</p>
              <p className="mt-1 font-medium text-[#1d3328]">{info.Headway} phút</p>
            </div>
            <div className="rounded-xl bg-[#f2f7f4] p-3">
              <p className="text-xs text-[#5f6f67]">Loại hình</p>
              <p className="mt-1 font-medium text-[#1d3328]">{info.Type}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[#d9e8df] bg-[#f4faf6] p-4 text-sm">
            <p className="font-semibold text-[#1c372b]">3 chuyến sắp tới</p>
            <p className="mt-2 rounded-lg bg-white/80 px-2 py-1 text-[#435b4f]">
              Chiều đi: {nextIn.length > 0 ? nextIn.join(" • ") : "Không có dữ liệu"}
            </p>
            <p className="mt-1 rounded-lg bg-white/80 px-2 py-1 text-[#435b4f]">
              Chiều về: {nextOut.length > 0 ? nextOut.join(" • ") : "Không có dữ liệu"}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 text-sm leading-6 text-[#21332a] lg:grid-cols-2">
            <div className="rounded-2xl border border-[#e0e9e3] bg-[#fcfefc] p-4">
              <h2 className="font-semibold text-[#153026]">Lộ trình chiều đi</h2>
              <p className="mt-1 text-[#43594e]">{info.OutBoundDescription}</p>
            </div>
            <div className="rounded-2xl border border-[#e0e9e3] bg-[#fcfefc] p-4">
              <h2 className="font-semibold text-[#153026]">Lộ trình chiều về</h2>
              <p className="mt-1 text-[#43594e]">{info.InBoundDescription}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
