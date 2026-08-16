import TagGenerator from "@/components/admin/TagGenerator";

// Etiket üretimi her istekte taze çalışmalıdır.
export const dynamic = "force-dynamic";

export default function AdminTagsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Etiket Üretimi</h1>

        <p className="mt-2 text-sm text-white/50">
          Baskıya gidecek yeni etiketleri burada üretirsin. Her etiketin
          üzerinde bir etiket kodu, kazınarak açılan bölümde ise gizli
          aktivasyon kodu bulunur.
        </p>
      </div>

      <TagGenerator />
    </div>
  );
}
