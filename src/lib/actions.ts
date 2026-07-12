"use server";

import { randomUUID } from "crypto";
import nodemailer from "nodemailer";
import {
  saveRecord,
  saveFinderMessage,
  getRecordById,
} from "./store";
import type { ItemRecord, FinderMessage } from "./types";

type CreateRecordInput = {
  assetName: string;
  ownerName: string;
  phone: string;
  email: string;
  description: string;
  category: string;
  status: string;
};

type CreateFinderMessageInput = {
  recordId: string;
  finderName: string;
  finderPhone: string;
  finderEmail?: string;
  location: string;
  message: string;
};

export async function createRecord(
  data: CreateRecordInput
): Promise<ItemRecord> {
  const record: ItemRecord = {
    id: randomUUID(),
    ...data,
    createdAt: new Date().toISOString(),
  };

  saveRecord(record);

  return record;
}

export async function createFinderMessage(
  data: CreateFinderMessageInput
): Promise<FinderMessage> {
  const message: FinderMessage = {
    id: randomUUID(),
    ...data,
    createdAt: new Date().toISOString(),
  };

  saveFinderMessage(message);

  const record = getRecordById(data.recordId);

  if (record?.email) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `"ARKVIUM" <${process.env.GMAIL_USER}>`,
        to: record.email,
        subject: `ARKVIUM: ${record.assetName} için yeni bildirim`,
        text: `
Merhaba ${record.ownerName},

ARKVIUM sistemine kayıtlı "${record.assetName}" isimli eşyanız için yeni bir bulan kişi bildirimi aldınız.

Bulan kişinin adı: ${data.finderName}
Telefon: ${data.finderPhone}
E-posta: ${data.finderEmail || "Belirtilmedi"}
Konum: ${data.location || "Belirtilmedi"}
Mesaj: ${data.message || "Mesaj bırakılmadı"}

ARKVIUM
Dijital Sahiplik Platformu
        `.trim(),
      });
    } catch (error) {
      console.error("E-posta gönderilemedi:", error);
    }
  }

  return message;
}