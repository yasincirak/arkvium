export type ItemRecord = {
  id: string;
  assetName: string;
  ownerName: string;
  phone: string;
  email: string;
  description: string;
  category: string;
  status: string;
  createdAt: string;
};

export type FinderMessage = {
  id: string;
  recordId: string;
  finderName: string;
  finderPhone: string;
  finderEmail?: string;
  location: string;
  message: string;
  createdAt: string;
};