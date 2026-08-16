export type ItemRecordStatus =
  | "active"
  | "lost"
  | "found"
  | "inactive";

/** Ürün durumunun kullanıcıya gösterilen karşılığı. */
export const ITEM_DURUM_ETIKETLERI: Record<string, string> = {
  active: "Aktif",
  lost: "Kayıp",
  found: "Bulundu",
  inactive: "Pasif",
};

export type ItemRecord = {
  id: string;
  assetName: string;
  ownerName: string;
  phone: string;
  email: string;
  description: string;
  category: string;
  status: ItemRecordStatus;
  createdAt: string;
  userId?: string;
};

export type FinderMessageStatus =
  | "new"
  | "read"
  | "completed";

export type EmailDeliveryStatus =
  | "pending"
  | "sent"
  | "failed";

export type FinderMessage = {
  id: string;
  recordId: string;
  finderName: string;
  finderPhone: string;
  finderEmail?: string;
  location: string;
  message: string;
  status: FinderMessageStatus;
  emailDeliveryStatus?: EmailDeliveryStatus;
  emailDeliveredAt?: string;
  createdAt: string;
};