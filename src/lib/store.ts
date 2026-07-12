import fs from "fs";
import path from "path";
import type { ItemRecord, FinderMessage } from "./types";

const dataDir = path.join(process.cwd(), "data");
const recordsFile = path.join(dataDir, "records.json");
const finderMessagesFile = path.join(dataDir, "finder-messages.json");

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  if (!fs.existsSync(recordsFile)) {
    fs.writeFileSync(recordsFile, "[]", "utf-8");
  }

  if (!fs.existsSync(finderMessagesFile)) {
    fs.writeFileSync(finderMessagesFile, "[]", "utf-8");
  }
}

export function getRecords(): ItemRecord[] {
  ensureDataFile();

  const fileContent = fs.readFileSync(recordsFile, "utf-8");
  return JSON.parse(fileContent) as ItemRecord[];
}

export function getRecordById(id: string): ItemRecord | null {
  const records = getRecords();
  return records.find((record) => record.id === id) ?? null;
}

export function saveRecord(record: ItemRecord) {
  const records = getRecords();
  records.push(record);

  fs.writeFileSync(recordsFile, JSON.stringify(records, null, 2), "utf-8");

  return record;
}

export function getFinderMessages(): FinderMessage[] {
  ensureDataFile();

  const fileContent = fs.readFileSync(finderMessagesFile, "utf-8");
  return JSON.parse(fileContent) as FinderMessage[];
}

export function getFinderMessagesByRecordId(recordId: string): FinderMessage[] {
  const messages = getFinderMessages();
  return messages.filter((message) => message.recordId === recordId);
}

export function saveFinderMessage(message: FinderMessage) {
  const messages = getFinderMessages();
  messages.push(message);

  fs.writeFileSync(
    finderMessagesFile,
    JSON.stringify(messages, null, 2),
    "utf-8"
  );

  return message;
}