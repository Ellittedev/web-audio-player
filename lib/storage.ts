const DB_NAME = 'AudioPlayerDB';
const DB_VERSION = 4; // Incremented to add blob storage support
const STORE_NAME = 'audios';

export interface StoredAudio {
  id: string;
  name: string;
  dataUrl?: string; // Legacy support - will be phased out
  blob?: Blob; // New: Store blob directly for large files
  size: number;
  type: string;
  configurationId: string; // Added to separate configurations
  usesBlob: boolean; // Flag to indicate if using blob storage
}

let db: IDBDatabase | null = null;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        // Add index on configurationId for efficient querying
        store.createIndex('byConfigurationId', 'configurationId', { unique: false });
      }
    };
  });
}

export async function storeAudio(audio: StoredAudio): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(audio);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAudio(id: string, configurationId: string): Promise<StoredAudio | null> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('byConfigurationId');
    const request = index.get([configurationId, id]); // Using compound key [configurationId, id]

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// Keep the old function for backward compatibility during migration
export async function getAudioLegacy(id: string): Promise<StoredAudio | null> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllAudios(configurationId: string): Promise<StoredAudio[]> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('byConfigurationId');
    
    // Use getAll with the index to efficiently retrieve all audios for this configuration
    const request = index.getAll(configurationId);

    request.onsuccess = () => {
      resolve(request.result || []);
    };
    request.onerror = () => reject(request.error);
  });
}

// Keep the old function for backward compatibility during migration
export async function getAllAudiosLegacy(): Promise<StoredAudio[]> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteAudio(id: string, configurationId: string): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('byConfigurationId');
    // We need to get the key to delete. Since we have an index on configurationId, we can open a cursor.
    // Alternatively, we can use get([configurationId, id]) to get the record and then delete by id.
    // But note: the object store's key is just 'id', so we must delete by the id (the primary key).
    // However, we want to ensure we only delete if the configurationId matches.
    // So we first get the record by the index (which gives us the record with the given configurationId and id)
    // and then delete by its id (the primary key).
    const getRequest = index.get([configurationId, id]);

    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (record) {
        const deleteRequest = store.delete(record.id);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      } else {
        // No record found with that configurationId and id
        resolve();
      }
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Legacy version for backward compatibility
export async function deleteAudioLegacy(id: string): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteAllAudios(configurationId: string): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('byConfigurationId');

    // Open a cursor to iterate through all records with this configurationId
    const request = index.openCursor(IDBKeyRange.only(configurationId));

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        // Delete the current record
        cursor.delete();
        // Continue to the next record
        cursor.continue();
      } else {
        // No more records
        resolve();
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function deleteAllAudiosAllConfigurations(): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Clear all records
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update the name of an audio track
 */
export async function updateAudioName(id: string, newName: string, configurationId: string): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('byConfigurationId');

    // Get all audios for this configuration and find the matching one
    const getAllRequest = index.getAll(configurationId);

    getAllRequest.onsuccess = () => {
      const audios = getAllRequest.result || [];
      const record = audios.find(a => a.id === id);
      
      if (record) {
        // Update the name
        record.name = newName;
        const updateRequest = store.put(record);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        reject(new Error('Audio not found'));
      }
    };

    getAllRequest.onerror = () => reject(getAllRequest.error);
  });
}

// Legacy version for backward compatibility
export async function deleteAllAudiosLegacy(): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
