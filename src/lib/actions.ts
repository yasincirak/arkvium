"use server";

import { randomUUID } from "crypto";
import nodemailer from "nodemailer";
import { revalidatePath } from "next/cache";
import { getAdminSession, getUserSession } from "./session";
import {
  saveRecord,
  saveFinderMessage,
  getRecordById,
  updateRecord,
  updateFinderMessageStatus,
  updateFinderMessageDeliveryStatus,
  updateRecordStatus,
} from "./store";
import type {
  ItemRecord,
  ItemRecordStatus,
  FinderMessage,
  FinderMessageStatus,
} from "./types";

type CreateRecordInput = {
  assetName: string;
  ownerName: string;
  phone: string;
  email: string;
  description: string;
  category: string;
  status: ItemRecordStatus;
};

type UpdateRecordInput = {
  assetName: string;
  ownerName: string;
  phone: string;
  email: string;
  description: string;
  category: string;
};

type CreateFinderMessageInput = {
  recordId: string;
  finderName: string;
  finderPhone: string;
  finderEmail?: string;
  location: string;
  message: string;
};

/**
 * Server Action'lar sayfa korumasından bağımsız, herkese açık HTTP uçlarıdır.
 * Bu yüzden sahiplik ve yetki kontrolü sayfada değil, action'ın kendi içinde
 * yapılmak zorundadır.
 */
async function requireRecordAccess(recordId: string): Promise<void> {
  const adminSession = await getAdminSession();

  if (adminSession) {
    return;
  }

  const userSession = await getUserSession();

  if (!userSession) {
    throw new Error("Bu işlem için giriş yapmanız gerekiyor.");
  }

  const record = await getRecordById(recordId);

  if (!record || record.userId !== userSession.userId) {
    throw new Error("Bu kayıt üzerinde işlem yapma yetkiniz yok.");
  }
}

export async function createRecord(
  data: CreateRecordInput
): Promise<ItemRecord> {
  const adminSession = await getAdminSession();
  const userSession = await getUserSession();

  if (!adminSession && !userSession) {
    throw new Error("Kayıt oluşturmak için giriş yapmanız gerekiyor.");
  }

  const userId = userSession?.userId;

  const record: ItemRecord = {
    id: randomUUID(),
    ...data,
    createdAt: new Date().toISOString(),
    userId,
  };

  await saveRecord(record);

  revalidatePath("/account");
  revalidatePath("/admin");
  revalidatePath("/admin/records");

  return record;
}

export async function editRecord(
  recordId: string,
  data: UpdateRecordInput
): Promise<ItemRecord | null> {
  await requireRecordAccess(recordId);

  const updatedRecord = await updateRecord(recordId, data);

  revalidatePath("/admin");
  revalidatePath("/admin/records");
  revalidatePath(`/admin/records/${recordId}`);
  revalidatePath(`/item/${recordId}`);
  revalidatePath("/account");

  return updatedRecord;
}

export async function createFinderMessage(
  data: CreateFinderMessageInput
): Promise<FinderMessage> {
  const finderName = data.finderName.trim();
  const finderPhone = data.finderPhone.trim();
  const location = data.location.trim();
  const finderEmail = data.finderEmail?.trim();
  const messageText = data.message?.trim();

  if (!finderName || !finderPhone || !location) {
    throw new Error("Ad soyad, telefon ve konum zorunludur.");
  }

  const normalizedPhone = finderPhone.replace(/\D/g, "");

  if (normalizedPhone.length < 7) {
    throw new Error("Telefon numarası en az 7 rakam olmalıdır.");
  }

  if (finderEmail) {
    const hasAt = finderEmail.includes("@");
    const hasDot = finderEmail.includes(".");

    if (!hasAt || !hasDot) {
      throw new Error("Geçerli bir e-posta adresi giriniz.");
    }
  }

  const message: FinderMessage = {
    id: randomUUID(),
    ...data,
    finderName,
    finderPhone,
    finderEmail,
    location,
    message: messageText ?? "",
    status: "new",
    emailDeliveryStatus: "pending",
    createdAt: new Date().toISOString(),
  };

  await saveFinderMessage(message);
  revalidatePath("/admin/notifications");

  const record = await getRecordById(data.recordId);

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

      await updateFinderMessageDeliveryStatus(
        message.id,
        "sent",
        new Date().toISOString()
      );
    } catch (error) {
      console.error("E-posta gönderilemedi:", error);

      await updateFinderMessageDeliveryStatus(
        message.id,
        "failed"
      );
    }
  }

  return message;
}

export async function changeFinderMessageStatus(
  messageId: string,
  status: FinderMessageStatus
): Promise<FinderMessage | null> {
  const adminSession = await getAdminSession();

  if (!adminSession) {
    throw new Error("Bu işlem için yönetici girişi gerekiyor.");
  }

  const updatedMessage = await updateFinderMessageStatus(
    messageId,
    status
  );

  revalidatePath("/admin/notifications");
  revalidatePath("/admin");

  return updatedMessage;
}

export async function changeRecordStatus(
  recordId: string,
  status: ItemRecordStatus
): Promise<ItemRecord | null> {
  await requireRecordAccess(recordId);

  const updatedRecord = await updateRecordStatus(
    recordId,
    status
  );

  revalidatePath("/admin");
  revalidatePath("/admin/records");
  revalidatePath(`/admin/records/${recordId}`);
  revalidatePath(`/item/${recordId}`);
  revalidatePath("/account");

  return updatedRecord;
}