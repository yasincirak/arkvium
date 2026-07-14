import { prisma } from "./prisma";
import type {
  ItemRecord,
  ItemRecordStatus,
  FinderMessage,
  FinderMessageStatus,
  EmailDeliveryStatus,
} from "./types";

type UpdateRecordData = {
  assetName: string;
  ownerName: string;
  phone: string;
  email: string;
  description: string;
  category: string;
};

function mapItemRecord(record: {
  id: string;
  assetName: string;
  ownerName: string;
  phone: string;
  email: string;
  description: string;
  category: string;
  status: string;
  createdAt: Date;
}): ItemRecord {
  return {
    ...record,
    status: record.status as ItemRecordStatus,
    createdAt: record.createdAt.toISOString(),
  };
}

function mapFinderMessage(message: {
  id: string;
  recordId: string;
  finderName: string;
  finderPhone: string;
  finderEmail: string | null;
  location: string;
  message: string;
  status: string;
  emailDeliveryStatus: string | null;
  emailDeliveredAt: Date | null;
  createdAt: Date;
}): FinderMessage {
  return {
    id: message.id,
    recordId: message.recordId,
    finderName: message.finderName,
    finderPhone: message.finderPhone,
    finderEmail: message.finderEmail ?? undefined,
    location: message.location,
    message: message.message,
    status: message.status as FinderMessageStatus,
    emailDeliveryStatus:
      (message.emailDeliveryStatus as EmailDeliveryStatus | null) ?? undefined,
    emailDeliveredAt: message.emailDeliveredAt?.toISOString(),
    createdAt: message.createdAt.toISOString(),
  };
}

export async function getRecords(): Promise<ItemRecord[]> {
  const records = await prisma.itemRecord.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return records.map(mapItemRecord);
}

export async function getRecordById(
  id: string
): Promise<ItemRecord | null> {
  const record = await prisma.itemRecord.findUnique({
    where: { id },
  });

  return record ? mapItemRecord(record) : null;
}

export async function saveRecord(
  record: ItemRecord
): Promise<ItemRecord> {
  const savedRecord = await prisma.itemRecord.create({
    data: {
      id: record.id,
      assetName: record.assetName,
      ownerName: record.ownerName,
      phone: record.phone,
      email: record.email,
      description: record.description,
      category: record.category,
      status: record.status,
      createdAt: new Date(record.createdAt),
    },
  });

  return mapItemRecord(savedRecord);
}

export async function updateRecord(
  recordId: string,
  data: UpdateRecordData
): Promise<ItemRecord | null> {
  const existingRecord = await prisma.itemRecord.findUnique({
    where: { id: recordId },
  });

  if (!existingRecord) {
    return null;
  }

  const updatedRecord = await prisma.itemRecord.update({
    where: { id: recordId },
    data,
  });

  return mapItemRecord(updatedRecord);
}

export async function updateRecordStatus(
  recordId: string,
  status: ItemRecordStatus
): Promise<ItemRecord | null> {
  const existingRecord = await prisma.itemRecord.findUnique({
    where: { id: recordId },
  });

  if (!existingRecord) {
    return null;
  }

  const updatedRecord = await prisma.itemRecord.update({
    where: { id: recordId },
    data: { status },
  });

  return mapItemRecord(updatedRecord);
}

export async function getFinderMessages(): Promise<FinderMessage[]> {
  const messages = await prisma.finderMessage.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return messages.map(mapFinderMessage);
}

export async function getFinderMessagesByRecordId(
  recordId: string
): Promise<FinderMessage[]> {
  const messages = await prisma.finderMessage.findMany({
    where: { recordId },
    orderBy: {
      createdAt: "desc",
    },
  });

  return messages.map(mapFinderMessage);
}

export async function saveFinderMessage(
  message: FinderMessage
): Promise<FinderMessage> {
  const savedMessage = await prisma.finderMessage.create({
    data: {
      id: message.id,
      recordId: message.recordId,
      finderName: message.finderName,
      finderPhone: message.finderPhone,
      finderEmail: message.finderEmail,
      location: message.location,
      message: message.message,
      status: message.status,
      emailDeliveryStatus: message.emailDeliveryStatus,
      emailDeliveredAt: message.emailDeliveredAt
        ? new Date(message.emailDeliveredAt)
        : null,
      createdAt: new Date(message.createdAt),
    },
  });

  return mapFinderMessage(savedMessage);
}

export async function updateFinderMessageStatus(
  messageId: string,
  status: FinderMessageStatus
): Promise<FinderMessage | null> {
  const existingMessage = await prisma.finderMessage.findUnique({
    where: { id: messageId },
  });

  if (!existingMessage) {
    return null;
  }

  const updatedMessage = await prisma.finderMessage.update({
    where: { id: messageId },
    data: { status },
  });

  return mapFinderMessage(updatedMessage);
}

export async function updateFinderMessageDeliveryStatus(
  messageId: string,
  emailDeliveryStatus: EmailDeliveryStatus,
  emailDeliveredAt?: string
): Promise<FinderMessage | null> {
  const existingMessage = await prisma.finderMessage.findUnique({
    where: { id: messageId },
  });

  if (!existingMessage) {
    return null;
  }

  const updatedMessage = await prisma.finderMessage.update({
    where: { id: messageId },
    data: {
      emailDeliveryStatus,
      ...(emailDeliveredAt
        ? { emailDeliveredAt: new Date(emailDeliveredAt) }
        : {}),
    },
  });

  return mapFinderMessage(updatedMessage);
}