import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { PaperFile } from '@/types';

interface PaperDBSchema extends DBSchema {
  papers: {
    key: string;
    value: PaperFile;
    indexes: { 'by-timestamp': number };
  };
}

const DB_NAME = 'blockchain-survey-db';
const DB_VERSION = 1;
const MAX_FILES = 10;

let dbPromise: Promise<IDBPDatabase<PaperDBSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<PaperDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<PaperDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('papers', { keyPath: 'id' });
        store.createIndex('by-timestamp', 'timestamp');
      },
    });
  }
  return dbPromise;
}

export async function savePaperFile(name: string, data: ArrayBuffer): Promise<PaperFile> {
  const db = await getDB();
  const id = `${Date.now()}-${name}`;
  const paperFile: PaperFile = {
    id,
    name,
    data,
    timestamp: Date.now(),
  };

  await db.put('papers', paperFile);

  // Keep only the latest MAX_FILES
  const allFiles = await db.getAllFromIndex('papers', 'by-timestamp');
  if (allFiles.length > MAX_FILES) {
    const toDelete = allFiles.slice(0, allFiles.length - MAX_FILES);
    const tx = db.transaction('papers', 'readwrite');
    for (const file of toDelete) {
      await tx.store.delete(file.id);
    }
    await tx.done;
  }

  return paperFile;
}

export async function getPaperFiles(): Promise<PaperFile[]> {
  const db = await getDB();
  const files = await db.getAllFromIndex('papers', 'by-timestamp');
  return files.reverse(); // Most recent first
}

export async function getPaperFile(id: string): Promise<PaperFile | undefined> {
  const db = await getDB();
  return db.get('papers', id);
}

export async function getLatestPaperFile(): Promise<PaperFile | undefined> {
  const files = await getPaperFiles();
  return files[0];
}
