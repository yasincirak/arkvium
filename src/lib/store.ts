import fs from "fs";
import path from "path";
import type { ItemRecord } from "./types";

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "records.json");

function ensureFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, "[]", "utf-8");
  }
}

export function getAllRecords(): ItemRecord[] {
  ensureFile();
  const raw = fs.readFileSync(dataFile, "utf-8");
  try {
    return JSON.parse(raw) as ItemRecord[];
  } catch {
    return [];
  }
}

export function getRecordById(id: string): ItemRecord | undefined {
  const records = getAllRecords();
  return records.find((r) => r.id === id);
}

export function addRecord(record: ItemRecord): void {
  ensureFile();
  const records = getAllRecords();
  records.push(record);
  fs.writeFileSync(dataFile, JSON.stringify(records, null, 2), "utf-8");
}   