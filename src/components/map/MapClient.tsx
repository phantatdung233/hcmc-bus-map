"use client";

import dynamic from "next/dynamic";

const BusMap = dynamic(() => import("@/components/map/BusMap"), {
  ssr: false,
  loading: () => (
    <main className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-linear-to-b from-[#f7f5ef] to-[#e8f2ee]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d6e4dc] border-t-[#2f5a46]" />
       <p className="anim-fade-up text-sm font-medium text-[#2f5a46]">Đang tải bản đồ...</p>
    </main>
  ),
});

export default function MapClient() {
  return <BusMap />;
}
