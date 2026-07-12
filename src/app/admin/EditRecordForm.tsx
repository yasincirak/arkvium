import { editRecord } from "@/lib/actions";
import type { ItemRecord } from "@/lib/types";

type EditRecordFormProps = {
  record: ItemRecord;
};

export default function EditRecordForm({
  record,
}: EditRecordFormProps) {
  return (
    <form
      action={async (formData) => {
        "use server";

        await editRecord(record.id, {
          assetName: String(formData.get("assetName") || "").trim(),
          ownerName: String(formData.get("ownerName") || "").trim(),
          phone: String(formData.get("phone") || "").trim(),
          email: String(formData.get("email") || "").trim(),
          category: String(formData.get("category") || "").trim(),
          description: String(formData.get("description") || "").trim(),
        });
      }}
      className="space-y-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="assetName"
            className="mb-2 block text-sm text-white/50"
          >
            Eşya adı
          </label>

          <input
            id="assetName"
            name="assetName"
            type="text"
            defaultValue={record.assetName}
            required
            className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-white/30"
          />
        </div>

        <div>
          <label
            htmlFor="ownerName"
            className="mb-2 block text-sm text-white/50"
          >
            Eşya sahibi
          </label>

          <input
            id="ownerName"
            name="ownerName"
            type="text"
            defaultValue={record.ownerName}
            required
            className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-white/30"
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="mb-2 block text-sm text-white/50"
          >
            Telefon
          </label>

          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={record.phone}
            required
            className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-white/30"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm text-white/50"
          >
            E-posta
          </label>

          <input
            id="email"
            name="email"
            type="email"
            defaultValue={record.email}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-white/30"
          />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="category"
            className="mb-2 block text-sm text-white/50"
          >
            Kategori
          </label>

          <input
            id="category"
            name="category"
            type="text"
            defaultValue={record.category}
            className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-white/30"
          />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="description"
            className="mb-2 block text-sm text-white/50"
          >
            Açıklama
          </label>

          <textarea
            id="description"
            name="description"
            defaultValue={record.description}
            rows={4}
            className="w-full resize-y rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-white/30"
          />
        </div>
      </div>

      <button
        type="submit"
        className="rounded-lg bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90"
      >
        Değişiklikleri Kaydet
      </button>
    </form>
  );
}