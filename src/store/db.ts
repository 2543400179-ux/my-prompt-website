import { get, set } from 'idb-keyval';
import { PromptItem, FolderItem } from '../types';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';

const STORE_KEY = 'nai_prompts_data';
const FOLDER_STORE_KEY = 'nai_folders_data';

export async function fetchPrompts(): Promise<PromptItem[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "prompts"));
    const prompts: PromptItem[] = [];
    querySnapshot.forEach((doc) => {
      prompts.push(doc.data() as PromptItem);
    });
    
    // Sort by createdAt descending
    prompts.sort((a, b) => b.createdAt - a.createdAt);

    if (prompts.length === 0) {
      // Migrate from local IndexedDB if Firebase is empty
      const localData = await get<PromptItem[]>(STORE_KEY);
      if (localData && localData.length > 0) {
        // DO NOT save to Firebase here, because images might be base64.
        // App.tsx will handle the migration.
        return localData;
      }
    }
    
    // Cache locally
    await set(STORE_KEY, prompts);
    return prompts;
  } catch (error) {
    console.error("Failed to fetch from Firebase, falling back to local DB:", error);
    const data = await get<PromptItem[]>(STORE_KEY);
    return data || [];
  }
}

export async function savePrompts(prompts: PromptItem[]): Promise<void> {
  // Save locally first for instant feel
  await set(STORE_KEY, prompts);
  
  // Write everything to Firestore using a batch to avoid huge writes
  // In a real app we'd do individual updates, but for this scale batching is fine
  try {
    const batch = writeBatch(db);
    
    // To prevent deleting data we just sync up. We should technically diff or delete missing.
    // For simplicity, we just completely write all current items. 
    prompts.forEach(p => {
      const ref = doc(db, "prompts", p.id);
      batch.set(ref, p);
    });
    
    await batch.commit();
  } catch (err) {
    console.error("Failed to sync prompts to Firebase", err);
  }
}

export async function fetchFolders(): Promise<FolderItem[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "folders"));
    const folders: FolderItem[] = [];
    querySnapshot.forEach((doc) => {
      folders.push(doc.data() as FolderItem);
    });

    if (folders.length === 0) {
      // Migrate from IndexedDB
      const localData = await get<FolderItem[]>(FOLDER_STORE_KEY);
      if (localData && localData.length > 0) {
        await saveFolders(localData);
        return localData;
      }
    }

    folders.sort((a, b) => b.createdAt - a.createdAt);
    await set(FOLDER_STORE_KEY, folders);
    return folders;
  } catch (error) {
    console.error("Failed to fetch folders from Firebase, falling back to local DB:", error);
    const data = await get<FolderItem[]>(FOLDER_STORE_KEY);
    return data || [];
  }
}

export async function saveFolders(folders: FolderItem[]): Promise<void> {
  await set(FOLDER_STORE_KEY, folders);
  try {
    const batch = writeBatch(db);
    folders.forEach(f => {
      const ref = doc(db, "folders", f.id);
      batch.set(ref, f);
    });
    await batch.commit();
  } catch (err) {
    console.error("Failed to sync folders to Firebase", err);
  }
}

// Added individual deletion since savePrompts strictly adds/updates via setDoc
export async function deletePromptFromDB(id: string) {
  try {
    await deleteDoc(doc(db, "prompts", id));
  } catch (e) { console.error("Firebase err", e); }
}

export async function deleteFolderFromDB(id: string) {
  try {
    await deleteDoc(doc(db, "folders", id));
  } catch (e) { console.error("Firebase err", e); }
}
