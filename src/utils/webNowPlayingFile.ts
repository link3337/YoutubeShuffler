const DB_NAME = 'ytpl-now-playing';
const STORE_NAME = 'settings';
const FILE_HANDLE_KEY = 'web_now_playing_file_handle';

const openDb = async (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'));
    });
};

const withStore = async <T>(
    mode: IDBTransactionMode,
    work: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
    const db = await openDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const req = work(store);

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB operation failed.'));

        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
        tx.onabort = () => db.close();
    });
};

export const canUseWebNowPlayingFileOutput = (): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }

    const pickerWindow = window as Window & {
        showSaveFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle>;
    };

    return typeof pickerWindow.showSaveFilePicker === 'function';
};

export const pickWebNowPlayingFile = async (): Promise<FileSystemFileHandle> => {
    const pickerWindow = window as Window & {
        showSaveFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle>;
    };

    const picker = pickerWindow.showSaveFilePicker;
    if (!picker) {
        throw new Error('Local file output is not supported in this browser. Use Chrome or Edge over HTTPS.');
    }

    return picker({
        suggestedName: 'current_song.txt',
        types: [
            {
                description: 'Text files',
                accept: { 'text/plain': ['.txt'] }
            }
        ]
    });
};

export const saveWebNowPlayingFileHandle = async (
    handle: FileSystemFileHandle
): Promise<void> => {
    await withStore('readwrite', (store) => store.put(handle, FILE_HANDLE_KEY));
};

export const loadWebNowPlayingFileHandle = async (): Promise<FileSystemFileHandle | null> => {
    const handle = await withStore<FileSystemFileHandle | undefined>('readonly', (store) =>
        store.get(FILE_HANDLE_KEY)
    );
    return handle ?? null;
};

export const clearWebNowPlayingFileHandle = async (): Promise<void> => {
    await withStore('readwrite', (store) => store.delete(FILE_HANDLE_KEY));
};

export const writeToWebNowPlayingFile = async (
    handle: any,
    text: string
): Promise<void> => {
    const opts: any = { mode: 'readwrite' };
    const permission = await handle.queryPermission(opts);

    if (permission !== 'granted') {
        const requested = await handle.requestPermission(opts);
        if (requested !== 'granted') {
            throw new Error('Write permission was denied for the selected output file.');
        }
    }

    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
};
