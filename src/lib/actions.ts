"use server";

import { addRecord, getAllRecords } from "./store";
import { ItemRecord } from "./types";

function generateId(): string {
  const year = new Date().getFullYear();
  const count = getAllRecords().length + 1;
  const padded = String(count).padStart(6, "0");
  return `AV-ITEM-${year}-${padded}`;
}

export async function createRecord(formData: {
  name: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  description: string;
  category: string;
  status: string;
}): Promise<ItemRecord> {
  const record: ItemRecord = {
    id: generateId(),
    name: formData.name,
    ownerName: formData.ownerName,
    ownerPhone: formData.ownerPhone,
    ownerEmail: formData.ownerEmail,
    description: formData.description,
    category: formData.category,
    status: formData.status,
    createdAt: new Date().toISOString(),
  };

  addRecord(record);
  return record;
}