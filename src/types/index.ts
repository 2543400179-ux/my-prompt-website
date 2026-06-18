export type Category = 
  | 'characters' 
  | 'main' 
  | 'clothing'
  | 'negative' 
  | 'composition' 
  | 'actions' 
  | 'others';

export interface PromptItem {
  id: string;
  categoryId: Category;
  folderId?: string; // Optional folder ID
  title: string;
  prompts: string; // The actual prompt string (comma separated)
  imageUrl?: string; // Optional image URL or base64 data for character/main
  imageUrls?: string[]; // Multiple images array
  tags?: string[];
  isFavorite?: boolean;
  createdAt: number;
}

export interface FolderItem {
  id: string;
  categoryId: Category;
  name: string;
  createdAt: number;
}
