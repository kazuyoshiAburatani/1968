import type { Metadata } from "next";
import Link from "next/link";
import { PicksGrid } from "@/components/picks/picks-grid";

export const metadata: Metadata = {
  title: "みんなの推し",
  description:
    "1968 年生まれの方々が暮らしを楽しむための、運営おすすめの商品・サービス。旅行・介護・健康・ガジェット・終活まで、同年代向けに厳選。",
};

export default function PicksPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
      <header className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold flex items-center justify-center gap-2">
          <i className="ri-heart-3-fill text-rose-500" aria-hidden />
          みんなの推し
        </h1>
        <p className="mt-3 text-sm sm:text-base text-foreground/80 leading-7 max-w-2xl mx-auto">
          1968 年生まれの方々の暮らしに、ちょっとした喜びと安心をお届けする、運営おすすめの商品・サービスです。
        </p>
      </header>

      <div className="mt-10">
        <PicksGrid limit={null} showHeading={false} />
      </div>

      <p className="mt-12 text-center text-sm">
        <Link href="/">← トップへ戻る</Link>
      </p>
    </div>
  );
}
