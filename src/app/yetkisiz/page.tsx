import type { Metadata } from "next";
import Link from "next/link";
import SayfaUstBari from "@/components/SayfaUstBari";
import { GIZLI_SAYFA_ROBOTS } from "@/lib/seo";
import { getUserSession } from "@/lib/session";

/**
 * "Yetkiniz yok" ekranı.
 *
 * NEDEN /admin ALTINDA DEĞİL?
 * Next.js layout ile page'i PARALEL render eder. Yetkisiz kullanıcıya
 * layout'tan farklı bir JSX döndürmek, alt sayfanın render edilmesini
 * ENGELLEMEZ: sayfanın çıktısı RSC yüküne girer ve istemciye gider.
 * Ölçtüm — bu yolla stok tablosu ve ürün kodları yanıtta görünüyordu.
 *
 * `redirect()` ise render'ı tamamen iptal eder ve istemciye yalnızca
 * yönlendirme yanıtı gider. Bu yüzden yetkisiz kullanıcı /admin dışına,
 * bu bağımsız sayfaya gönderilir.
 */
export const metadata: Metadata = {
  title: "ARKVIUM | Yetkiniz yok",
  robots: GIZLI_SAYFA_ROBOTS,
};

export const dynamic = "force-dynamic";

export default async function YetkisizSayfasi() {
  const oturum = await getUserSession();

  return (
    <main className="pt-20 flex min-h-screen items-center justify-center bg-[#09090f] px-4 py-12 text-white">
      <SayfaUstBari ton="koyu" />

      <div className="w-full max-w-md rounded-2xl border border-amber-500/25 bg-amber-500/10 p-8 text-center">
        <h1 className="text-2xl font-bold">Yetkiniz yok</h1>

        <p className="mt-4 text-sm leading-relaxed text-white/70">
          Yönetim paneli yalnızca yönetici hesaplarına açık.
          {oturum && (
            <>
              {" "}
              <span className="font-medium text-white">{oturum.email}</span>{" "}
              hesabının yönetici yetkisi bulunmuyor.
            </>
          )}
        </p>

        <p className="mt-3 text-sm leading-relaxed text-white/50">
          Yanlış hesapla giriş yaptıysan çıkış yapıp yönetici hesabınla
          yeniden giriş yap.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/account"
            className="inline-flex min-h-[44px] items-center rounded-xl bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/20"
          >
            Hesabıma dön
          </Link>

          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center rounded-xl border border-white/10 px-5 py-3 font-semibold text-white/70 transition hover:bg-white/5"
          >
            Ana sayfa
          </Link>
        </div>
      </div>
    </main>
  );
}
