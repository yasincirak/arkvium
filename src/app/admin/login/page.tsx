import { redirect } from "next/navigation";
import { getUserSession } from "@/lib/session";
import { girisAdresi } from "@/lib/guvenli-yonlendirme";

/**
 * ESKİ YÖNETİCİ GİRİŞİ KALDIRILDI.
 *
 * Ayrı yönetici şifresi ve ayrı yönetici çerezi artık yok; yetkilendirmenin
 * tek kaynağı kullanıcı hesabı ve `User.role`. Bu adres yalnızca eski
 * yer imlerini ve bağlantıları kırmamak için duruyor:
 *
 *   - oturum yoksa  -> /login?next=/admin
 *   - oturum varsa  -> /admin  (rol denetimi orada yapılır)
 *
 * Burada hiçbir form, şifre alanı veya kimlik doğrulama yoktur.
 */
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const oturum = await getUserSession();

  if (!oturum) {
    redirect(girisAdresi("/admin"));
  }

  redirect("/admin");
}
