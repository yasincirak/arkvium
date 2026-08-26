"use client";

import { useState } from "react";
import { useSozluk } from "@/lib/i18n/istemci";
import { useRouter } from "next/navigation";
import { editRecord } from "@/lib/actions";

type Props = {
  record: {
    id: string;
    assetName: string;
    ownerName: string;
    phone: string | null;
    email: string | null;
    category: string | null;
    description: string | null;
  };
};

export default function EditRecordForm({ record }: Props) {
  const ceviri = useSozluk();

  const router = useRouter();

  const [assetName, setAssetName] = useState(record.assetName);
  const [ownerName, setOwnerName] = useState(record.ownerName);
  const [phone, setPhone] = useState(record.phone ?? "");
  const [email, setEmail] = useState(record.email ?? "");
  const [category, setCategory] = useState(record.category ?? "");
  const [description, setDescription] = useState(record.description ?? "");
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
        setError(ceviri.hesap.kayitDuzenle.hata);
        setSaving(false);
        return;
      }

      router.push(`/account/records/${record.id}`);
      router.refresh();
    } catch {
      setError(ceviri.hesap.kayitDuzenle.genelHata);
      setSaving(false);
    }
  }

  function handleCancel() {
    router.push(`/account/records/${record.id}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6"
    >
      <div>
        <label className="mb-2 block text-sm text-white/60">{ceviri.kalanlar.esyaAdi}</label>

        <input
          value={assetName}
          onChange={(event) => setAssetName(event.target.value)}
          required
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/60">{ceviri.kalanlar.sahipAdi}</label>

        <input
          value={ownerName}
          onChange={(event) => setOwnerName(event.target.value)}
          required
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/60">{ceviri.kalanlar.telefon}</label>

        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          required
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/60">{ceviri.kalanlar.eposta}</label>

        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/60">{ceviri.kalanlar.kategori}</label>

        <input
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/60">{ceviri.kalanlar.aciklama}</label>

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
          className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Kaydediliyor..." : ceviri.hesap.kayitDuzenle.kaydet}
        </button>

        <button
          type="button"
          onClick={handleCancel}
          disabled={saving}
          className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >{ceviri.ortak.iptal}</button>
      </div>
    </form>
  );
}