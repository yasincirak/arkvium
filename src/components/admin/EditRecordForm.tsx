"use client";

import { useState } from "react";
import { editRecord } from "@/lib/actions";
import type { ItemRecord } from "@/lib/types";

type Props = {
  record: ItemRecord;
};

export default function EditRecordForm({ record }: Props) {
  const [assetName, setAssetName] = useState(record.assetName);
  const [ownerName, setOwnerName] = useState(record.ownerName);
  const [phone, setPhone] = useState(record.phone);
  const [email, setEmail] = useState(record.email);
  const [category, setCategory] = useState(record.category);
  const [description, setDescription] = useState(record.description);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);

    await editRecord(record.id, {
      assetName,
      ownerName,
      phone,
      email,
      category,
      description,
    });

    setSaving(false);
    setSaved(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6"
    >
      <div>
        <label className="mb-2 block text-sm text-white/60">Eşya Adı</label>
        <input
          value={assetName}
          onChange={(event) => setAssetName(event.target.value)}
          required
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/60">Sahip Adı</label>
        <input
          value={ownerName}
          onChange={(event) => setOwnerName(event.target.value)}
          required
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/60">Telefon</label>
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          required
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/60">E-posta</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/60">Kategori</label>
        <input
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/60">Açıklama</label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={5}
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-white px-5 py-3 font-semibold text-black disabled:opacity-50"
      >
        {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
      </button>

      {saved && (
        <p className="text-sm text-green-400">
          Değişiklikler başarıyla kaydedildi.
        </p>
      )}
    </form>
  );
}