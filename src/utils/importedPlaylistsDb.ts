import type {
  ImportedPlaylistRecord,
  ImportedPlaylistSource,
  ImportedPlaylistSummary,
  VideoItem
} from '../types';

const DB_NAME = 'ytpl_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'imported_playlists';

let openDbPromise: Promise<IDBDatabase> | null = null;

type SaveImportedPlaylistArgs = {
  name: string;
  source: ImportedPlaylistSource;
  items: VideoItem[];
};

function supportsIndexedDb(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
  });
}

async function getDb(): Promise<IDBDatabase> {
  if (!supportsIndexedDb()) {
    throw new Error('IndexedDB is not available in this environment.');
  }

  if (!openDbPromise) {
    openDbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('importedAt', 'importedAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error || new Error('Could not open IndexedDB.'));
      };
    });
  }

  return openDbPromise;
}

function toSummary(record: ImportedPlaylistRecord): ImportedPlaylistSummary {
  return {
    id: record.id,
    name: record.name,
    source: record.source,
    importedAt: record.importedAt,
    itemCount: record.itemCount
  };
}

function createRecordId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export async function listImportedPlaylists(): Promise<ImportedPlaylistSummary[]> {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const all = await requestToPromise(store.getAll() as IDBRequest<ImportedPlaylistRecord[]>);

  return all.map(toSummary).sort((a, b) => Date.parse(b.importedAt) - Date.parse(a.importedAt));
}

export async function saveImportedPlaylist(
  args: SaveImportedPlaylistArgs
): Promise<ImportedPlaylistSummary> {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  const record: ImportedPlaylistRecord = {
    id: createRecordId(),
    name: args.name || 'Imported playlist',
    source: args.source,
    importedAt: new Date().toISOString(),
    itemCount: args.items.length,
    items: args.items
  };

  await requestToPromise(store.put(record));
  return toSummary(record);
}

export async function getImportedPlaylist(id: string): Promise<ImportedPlaylistRecord | null> {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const record = await requestToPromise(
    store.get(id) as IDBRequest<ImportedPlaylistRecord | undefined>
  );
  return record || null;
}

export async function deleteImportedPlaylist(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await requestToPromise(store.delete(id));
}

export async function renameImportedPlaylist(
  id: string,
  nextName: string
): Promise<ImportedPlaylistSummary> {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  const record = await requestToPromise(
    store.get(id) as IDBRequest<ImportedPlaylistRecord | undefined>
  );
  if (!record) {
    throw new Error('Saved playlist not found.');
  }

  const sanitizedName = nextName.trim();
  if (!sanitizedName) {
    throw new Error('Playlist name cannot be empty.');
  }

  record.name = sanitizedName;
  await requestToPromise(store.put(record));
  return toSummary(record);
}
