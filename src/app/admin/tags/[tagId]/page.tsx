import Link from "next/link";
import { notFound } from "next/navigation";
import EtiketIslemleri from "@/components/admin/EtiketIslemleri";
import { etiketYazdirmaVarMi } from "@/lib/baski-yapilandirmasi";
import {
  islemUygunlugu,
  rezervasyonGecerliMi,
} from "@/lib/etiket-yonetim-kurallari";
import { prisma } from "@/lib/prisma";
import { SIPARIS_URUNLERI } from "@/lib/siparis";
import {
  etiketKoduBicimle,
  TAG_DURUM_ETIKETLERI,
  type TagDurumu,
} from "@/lib/tags";

/**
 * Tekil etiket detayı (yalnızca yönetici).
 *
 * ─────────────────────────────────────────────────────────────
 * NE GÖSTERİLİR, NE GÖSTERİLMEZ
 *
 * Gösterilir : etiket kodu, ürün türü, durum, üretim tarihi, rezervasyon
 *              ve aktivasyon durumu, bağlı sipariş, bağlı kayıt adı,
 *              iptal/yenileme geçmişinin güvenli özeti.
 *
 * GÖSTERİLMEZ: `activationCodeHash`, aktivasyon kodunun düz metni (zaten
 *              veritabanında yoktur), `publicToken` ve acil durum profili
 *              gibi kişisel/sağlık verileri. Bu alanlar `select` listesine
 *              HİÇ ALINMAZ; sayfaya ulaşamazlar.
 *
 * YETKİ
 * `src/app/admin/layout.tsx` içindeki ADMIN kapısı bu sayfayı da korur;
 * yetkisiz kullanıcı için `children` hiç render edilmez. Bulunamayan
 * etiket `notFound()` ile 404 döner.
 * ─────────────────────────────────────────────────────────────
 */

export const dynamic = "force-dynamic";

const DURUM_RENGI: Record<string, string> = {
  unused: "bg-white/10 text-white/70",
  active: "bg-emerald-500/15 text-emerald-300",
  inactive: "bg-amber-500/15 text-amber-200",
  revoked: "bg-red-500/15 text-red-300",
};

/** Geçmişte gösterilecek olay türlerinin okunabilir karşılıkları. */
const OLAY_ADLARI: Record<string, string> = {
  activated: "Etkinleştirildi",
  moved: "Başka ürüne taşındı",
  deactivated: "Pasife alındı",
  reactivated: "Yeniden etkinleştirildi",
  revoked: "İptal edildi",
  transferred: "Sahiplik devredildi",
  classified: "Ürün türü atandı",
  renewed: "Yenileme ile üretildi",
};

function tarihSaat(deger: Date | null): string {
  if (!deger) {
    return "—";
  }

  return deger.toLocaleString("tr-TR");
}

function Satir({ baslik, deger }: { baslik: string; deger: string }) {
  return (
    <div className="border-b border-white/5 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm text-white/40">{baslik}</dt>
      <dd className="mt-1 break-words text-sm text-white sm:col-span-2 sm:mt-0">
        {deger}
      </dd>
    </div>
  );
}

export default async function EtiketDetaySayfasi({
  params,
}: {
  params: { tagId: string };
}) {
  const etiket = await prisma.tag.findUnique({
    where: { id: params.tagId },
    select: {
      id: true,
      code: true,
      status: true,
      productKod: true,
      createdAt: true,
      activatedAt: true,
      revokedAt: true,
      itemRecord: { select: { assetName: true } },
      orderTag: {
        select: {
          reservedAt: true,
          reservationExpiresAt: true,
          order: { select: { orderNumber: true } },
        },
      },
      events: {
        where: { type: { in: ["revoked", "renewed", "classified"] } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, type: true, createdAt: true },
      },
    },
  });

  if (!etiket) {
    notFound();
  }

  const urun = etiket.productKod
    ? SIPARIS_URUNLERI.find((u) => u.kod === etiket.productKod) ?? null
    : null;

  const rezerveMi = rezervasyonGecerliMi(
    etiket.orderTag?.reservationExpiresAt ?? null
  );

  const uygunluk = islemUygunlugu({
    durum: etiket.status,
    rezerveMi,
    productKod: etiket.productKod,
  });

  const kod = etiketKoduBicimle(etiket.code);

  // 30×30 mm QR dosyası yalnızca o baskı akışı tanımlı üründe sunulur.
  const qrIndirilebilir =
    etiketYazdirmaVarMi(etiket.productKod) && etiket.status !== "revoked";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/tags"
          className="text-sm font-medium text-indigo-400 transition hover:text-indigo-300"
        >
          ← Etiketler
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-3xl font-bold text-white">{kod}</h1>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              DURUM_RENGI[etiket.status] ?? "bg-white/10 text-white/70"
            }`}
          >
            {TAG_DURUM_ETIKETLERI[etiket.status as TagDurumu] ?? etiket.status}
          </span>

          {rezerveMi && (
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200">
              Siparişe rezerve
            </span>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <dl>
          <Satir baslik="Etiket kodu" deger={kod} />
          <Satir baslik="Ürün türü" deger={urun?.ad ?? "Tür atanmamış"} />
          <Satir
            baslik="Durum"
            deger={
              TAG_DURUM_ETIKETLERI[etiket.status as TagDurumu] ?? etiket.status
            }
          />
          <Satir baslik="Üretim tarihi" deger={tarihSaat(etiket.createdAt)} />
          <Satir
            baslik="Aktivasyon"
            deger={
              etiket.activatedAt
                ? tarihSaat(etiket.activatedAt)
                : "Henüz aktive edilmedi"
            }
          />
          <Satir
            baslik="Rezervasyon"
            deger={
              etiket.orderTag
                ? rezerveMi
                  ? `Rezerve — ${tarihSaat(
                      etiket.orderTag.reservationExpiresAt
                    )} tarihine kadar`
                  : "Rezervasyon süresi dolmuş"
                : "Rezerve değil"
            }
          />
          <Satir
            baslik="Bağlı sipariş"
            deger={etiket.orderTag?.order.orderNumber ?? "—"}
          />
          <Satir
            baslik="Bağlı kayıt"
            deger={etiket.itemRecord?.assetName ?? "—"}
          />
          <Satir
            baslik="İptal tarihi"
            deger={etiket.revokedAt ? tarihSaat(etiket.revokedAt) : "—"}
          />
        </dl>

        <p className="mt-4 text-xs leading-5 text-white/40">
          Aktivasyon kodu bu ekranda gösterilmez. Kod veritabanında düz metin
          olarak saklanmaz; yalnızca SHA-256 özeti tutulur ve geri
          getirilemez.
        </p>
      </div>

      {qrIndirilebilir && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white">QR dosyası</h2>

          <p className="mt-1 text-sm text-white/50">
            30×30 mm baskı standardına uygun SVG. Dosya yalnızca etiketin
            herkese açık QR hedefini içerir; aktivasyon kodu veya kişisel
            veri taşımaz.
          </p>

          <a
            href={`/api/admin/tags/${etiket.id}/qr`}
            className="mt-4 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            QR&apos;ı yeniden indir
          </a>
        </div>
      )}

      <EtiketIslemleri
        tagId={etiket.id}
        kod={kod}
        iptalEdilebilir={uygunluk.iptalEdilebilir}
        yenilenebilir={uygunluk.yenilenebilir}
        sebep={uygunluk.sebep}
      />

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">Geçmiş</h2>

        {etiket.events.length === 0 ? (
          <p className="mt-2 text-sm text-white/40">
            Bu etiket için kayıtlı iptal, yenileme veya sınıflandırma olayı
            yok.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {etiket.events.map((olay) => (
              <li
                key={olay.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
              >
                <span className="font-medium text-white">
                  {OLAY_ADLARI[olay.type] ?? olay.type}
                </span>
                <span className="text-white/50">
                  {tarihSaat(olay.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
