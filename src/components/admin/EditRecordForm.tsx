"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { editRecord } from "@/lib/actions";
import type { ItemRecord } from "@/lib/types";

type Props = {
  record: ItemRecord;
};

export default function EditRecordForm({ record }: Props) {
  const router = useRouter();

  const [assetName, setAssetName] = useState(record.assetName);
  const [ownerName, setOwnerName] = useState(record.ownerName);
  const [phone, setPhone] = useState(record.phone);
  const [email, setEmail] = useState(record.email);
  const [category, setCategory] = useState(record.category);
  const [description, setDescription] = useState(record.description);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const updatedRecord = await editRecord(record.id, {
        assetName,
        ownerName,
        phone,
        email,
        category,
        description,
      });

      if (!updatedRecord) {
        setError(
          "Kayıt güncellenemedi. Lütfen bilgileri kontrol edip tekrar deneyin."
        );
        setSaving(false);
        return;
      }

      router.push(`/admin/records/${record.id}`);
      router.refresh();
    } catch {
      setError(
        "Kayıt güncellenirken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin."
      );
      setSaving(false);
    }
  }

  function handleCancel() {
    router.push(`/admin/records/${record.id}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6"
    >
      <div>
        <label className="mb-2 block text-sm text-white/60">
          Eşya Adı
        </label>

        <input
          value={assetName}
          onChange={(event) => setAssetName(event.target.value)}
          required
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/60">
          Sahip Adı
        </label>

        <input
          value={ownerName}
          onChange={(event) => setOwnerName(event.target.value)}
          required
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/60">
          Telefon
        </label>

        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          required
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/60">
          E-posta
        </label>

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/60">
          Kategori
        </label>

        <input
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/60">
          Açıklama
        </label>

        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={5}
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
        />
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-white px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
        </button>

        <button
          type="button"
          onClick={handleCancel}
          disabled={saving}
          className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          İptal
        </button>
      </div>
    </form>
  );
}