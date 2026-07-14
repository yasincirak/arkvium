"use client";

import { useState } from "react";
import { createRecord } from "@/lib/actions";
import type { ItemRecord, ItemRecordStatus } from "@/lib/types";
import { QRCodeSVG } from "qrcode.react";

export default function NewRecordPage() {
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<ItemRecord | null>(null);

  const [form, setForm] = useState<{
    assetName: string;
    ownerName: string;
    phone: string;
    email: string;
    description: string;
    category: string;
    status: ItemRecordStatus;
  }>({
    assetName: "",
    ownerName: "",
    phone: "",
    email: "",
    description: "",
    category: "",
    status: "active",
  });

  const itemUrl =
    typeof window !== "undefined" && created
      ? `${window.location.origin}/item/${created.id}`
      : "";

  async function handleSave() {
    if (!form.assetName || !form.ownerName || !form.phone) {
      alert("Eşya adı, sahip adı ve telefon alanları zorunludur.");
      return;
    }

    setSaving(true);

    try {
      const record = await createRecord(form);
      setCreated(record);
    } catch (error) {
      console.error(error);
      alert("Kayıt oluşturulurken bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] p-6 text-white">
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-bold">Yeni Kayıt Oluştur</h1>
        <p className="mt-2 text-sm text-white/50">
          ARKVIUM dijital sahiplik kaydı oluştur.
        </p>

        <div className="mt-8 grid gap-4">
          <input
            className="rounded-lg border border-white/10 bg-black/30 p-3 outline-none"
            placeholder="Eşya adı"
            value={form.assetName}
            onChange={(e) => setForm({ ...form, assetName: e.target.value })}
          />

          <input
            className="rounded-lg border border-white/10 bg-black/30 p-3 outline-none"
            placeholder="Sahip adı"
            value={form.ownerName}
            onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
          />

          <input
            className="rounded-lg border border-white/10 bg-black/30 p-3 outline-none"
            placeholder="Telefon"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />

          <input
            className="rounded-lg border border-white/10 bg-black/30 p-3 outline-none"
            placeholder="E-posta"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <input
            className="rounded-lg border border-white/10 bg-black/30 p-3 outline-none"
            placeholder="Kategori"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />

          <textarea
            className="min-h-28 rounded-lg border border-white/10 bg-black/30 p-3 outline-none"
            placeholder="Açıklama"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />

          <select
            className="rounded-lg border border-white/10 bg-black/30 p-3 outline-none"
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as ItemRecordStatus })
            }
          >
            <option value="active">Aktif</option>
            <option value="lost">Kayıp</option>
            <option value="inactive">Pasif</option>
          </select>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>

        {created && (
          <div className="mt-8 rounded-xl border border-green-500/30 bg-green-500/10 p-5">
            <h2 className="text-lg font-semibold text-green-300">
              Kayıt oluşturuldu
            </h2>

            <p className="mt-2 text-sm text-white/60">
              Kayıt ID: {created.id}
            </p>

            <div className="mt-5 inline-block rounded-xl bg-white p-4">
              <QRCodeSVG value={itemUrl} size={180} />
            </div>

            <p className="mt-4 break-all text-sm text-white/60">{itemUrl}</p>
          </div>
        )}
      </div>
    </main>
  );
}