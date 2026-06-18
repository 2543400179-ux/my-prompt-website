import { get, set } from 'idb-keyval';
import { PromptItem, FolderItem } from '../types';

const STORE_KEY = 'nai_prompts_data';
const FOLDER_STORE_KEY = 'nai_folders_data';

// Some initial mock data
const INITIAL_DATA: PromptItem[] = [];
const INITIAL_FOLDER_DATA: FolderItem[] = [];

export async function fetchPrompts(): Promise<PromptItem[]> {
  try {
    const data = await get<PromptItem[]>(STORE_KEY);
    if (!data) {
      await set(STORE_KEY, INITIAL_DATA);
      return INITIAL_DATA;
    }
    return data;
  } catch (error) {
    console.error("Failed to fetch from DB:", error);
    return INITIAL_DATA;
  }
}

export async function savePrompts(prompts: PromptItem[]): Promise<void> {
  await set(STORE_KEY, prompts);
}

export async function fetchFolders(): Promise<FolderItem[]> {
  try {
    const data = await get<FolderItem[]>(FOLDER_STORE_KEY);
    if (!data) {
      await set(FOLDER_STORE_KEY, INITIAL_FOLDER_DATA);
      return INITIAL_FOLDER_DATA;
    }
    return data;
  } catch (error) {
    console.error("Failed to fetch folders from DB:", error);
    return INITIAL_FOLDER_DATA;
  }
}

export async function saveFolders(folders: FolderItem[]): Promise<void> {
  await set(FOLDER_STORE_KEY, folders);
}
