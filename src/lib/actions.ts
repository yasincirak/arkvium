"use server";

import { randomUUID } from "crypto";
import nodemailer from "nodemailer";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { verifyUserSessionToken } from "./auth";
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

export async function createRecord(
  data: CreateRecordInput
): Promise<ItemRecord> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("arkvium_user_session")?.value;

  let userId: string | undefined;

  if (sessionToken) {
    const session = await verifyUserSessionToken(sessionToken);

    if (session) {
      userId = session.userId;
    }
  }

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