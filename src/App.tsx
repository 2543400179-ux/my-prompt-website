import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { PromptCard } from './components/PromptCard';
import { PromptFormModal } from './components/PromptFormModal';
import { PromptDetailModal } from './components/PromptDetailModal';
import { ConfirmModal } from './components/ConfirmModal';
import { SortDropdown, SortMode } from './components/SortDropdown';
import { MoveDropdown } from './components/MoveDropdown';
import { FolderCard } from './components/FolderCard';
import { FolderModal } from './components/FolderModal';
import { ImportProgressModal } from './components/ImportProgressModal';
import { ArtistCombiner } from './components/ArtistCombiner';
import { fetchPrompts, savePrompts, fetchFolders, saveFolders, deletePromptFromDB, deleteFolderFromDB } from './store/db';
import { Category, PromptItem, FolderItem } from './types';
import { compressImage, generateId, cn } from './lib/utils';
import { MigrationBanner } from './components/MigrationBanner';
import { AnimatePresence, motion } from 'motion/react';
import { LayoutGrid, LayoutList, Eye, EyeOff, ChevronUp, ChevronDown, Share2, Download, X, FolderPlus, ArrowLeft, Plus, Trash2, Search } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';

const CATEGORY_NAMES: Record<Category, string> = {
  main: '画风',
  clothing: '服装',
  characters: '角色库',
  composition: '构图',
  actions: '动作',
  negative: '负面',
  others: '特定'
};

const CATEGORY_SUBS: Record<Category, string> = {
  main: 'Style',
  clothing: 'Clothing',
  characters: 'Characters',
  composition: 'Composition',
  actions: 'Action',
  negative: 'Negative',
  others: 'Others'
};

declare global {
  interface Window {
    addOrUpdateCard: (artistName: string, base64Image: string) => void;
  }
}

export default function App() {
  const [currentCategory, setCurrentCategory] = useState<Category>('main');
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  useEffect(() => {
    window.addOrUpdateCard = async (artistName: string, base64Image: string) => {
      if (!artistName || !base64Image) return;

      try {
        const { uploadBase64ToCloudinary } = await import('./lib/cloudinary');
        const secureUrl = await uploadBase64ToCloudinary(base64Image);

        setPrompts(prev => {
          const targetFolderId = currentFolderId || undefined;
          // Search inside the current folder (or root if currentFolderId is null)
          const existingCardIndex = prev.findIndex(p => 
            p.title === artistName && p.folderId === targetFolderId && p.categoryId === currentCategory
          );

          let newPrompts = [...prev];

          if (existingCardIndex >= 0) {
            // Update existing card by pushing the secureUrl
            const existing = newPrompts[existingCardIndex];
            const newImages = existing.imageUrls ? [...existing.imageUrls] : (existing.imageUrl ? [existing.imageUrl] : []);
            newImages.push(secureUrl);

            newPrompts[existingCardIndex] = {
              ...existing,
              imageUrls: newImages,
              imageUrl: newImages[0]
            };
          } else {
            // Create new card
            const newPrompt: PromptItem = {
              id: generateId(),
              categoryId: currentCategory,
              folderId: targetFolderId,
              title: artistName,
              prompts: artistName,
              tags: [],
              imageUrls: [secureUrl],
              imageUrl: secureUrl,
              createdAt: Date.now()
            };
            newPrompts = [newPrompt, ...newPrompts];
          }

          savePrompts(newPrompts).catch(console.error);
          return newPrompts;
        });
      } catch (err) {
        console.error("External addOrUpdateCard failed to upload image:", err);
      }
    };
  }, [currentFolderId, currentCategory]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editFolderData, setEditFolderData] = useState<FolderItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    visible: boolean;
    current: number;
    total: number;
    failed: { filename: string, reason: string }[];
  } | null>(null);

  
  const handleGlobalDragOver = (e: React.DragEvent) => {
    if (isModalOpen || isDetailOpen || isFolderModalOpen) return;
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingGlobal(true);
    }
  };

  const handleGlobalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingGlobal(false);
  };

  const handleGlobalDrop = async (e: React.DragEvent) => {
    if (isModalOpen || isDetailOpen || isFolderModalOpen) return;
    e.preventDefault();
    setIsDraggingGlobal(false);
    
    const allFiles = Array.from(e.dataTransfer.files) as File[];
    const files = allFiles.filter(file => file.type.startsWith('image/'));
    const nonImageFiles = allFiles.filter(file => !file.type.startsWith('image/'));
    
    const failedList: { filename: string, reason: string }[] = nonImageFiles.map(f => ({
      filename: f.name,
      reason: '格式不支持 / Not an image format'
    }));

    if (files.length === 0) {
      if (failedList.length > 0) {
        setImportStatus({
           visible: true,
           current: allFiles.length,
           total: allFiles.length,
           failed: failedList
        });
      }
      return;
    }
    
    setImportStatus({
      visible: true,
      current: 0,
      total: allFiles.length,
      failed: failedList
    });
    
    setLoading(true);
    
    const newItemsByArtist: Record<string, { title: string, prompt: string, files: File[] }> = {};

    for (const file of files) {
      const filename = file.name;
      let artistStr = "";

      const isValidName = /^artist_[^,]+,\s*s-\d+/i.test(filename);

      if (isValidName) {
          const parts = filename.split(/artist_/i);
          if (parts.length > 1) {
              // 1. 根据描述，只捕获逗号前的内容
              let extracted = parts[1].split(',')[0];
              // 2. 去掉可能遗留的扩展名（当没有逗号时），只去掉常见的图片扩展名，不要误伤名字里的点
              extracted = extracted.replace(/\.(png|jpe?g|webp|avif|gif)$/i, '');
              artistStr = extracted.trim();
          }
      }

      if (artistStr) {
          if (!newItemsByArtist[artistStr]) {
             newItemsByArtist[artistStr] = {
                 title: artistStr,
                 prompt: `artist:${artistStr}`,
                 files: []
             };
          }
          newItemsByArtist[artistStr].files.push(file);
      } else {
          failedList.push({ filename: file.name, reason: '文件名不匹配规则(需为 artist_xx, s-yy格式，中间不能有逗号) / Filename does not match rule' });
      }
    }

    let finalPrompts = [...prompts];
    let focusPromptId: string | null = null;
    let focusFolderId: string | null = null;
    let processedImages = failedList.length;

    for (const key in newItemsByArtist) {
       const group = newItemsByArtist[key];
       const base64Images: string[] = [];
       for (const f of group.files) {
           if (f.size > 5 * 1024 * 1024) {
             failedList.push({ filename: f.name, reason: '图片超过5MB / Image exceeds 5MB' });
             processedImages++;
             setImportStatus(prev => prev ? { ...prev, current: processedImages, failed: failedList } : null);
             continue;
           }

           try {
               const b64 = await compressImage(f);
               base64Images.push(b64);
           } catch (err) {
               console.error("Image processing failed", err);
               failedList.push({ filename: f.name, reason: '图片处理失败 / Processing failed' });
           }
           processedImages++;
           setImportStatus(prev => prev ? { ...prev, current: processedImages, failed: failedList } : null);
       }

       if (base64Images.length === 0) continue;

       const existingIdx = finalPrompts.findIndex(p => 
         p.title === group.title && 
         p.categoryId === currentCategory && 
         (p.folderId || null) === currentFolderId
       );

       if (existingIdx !== -1) {
           const existing = finalPrompts[existingIdx];
           let updatedImages: string[] = [];
           if (existing.imageUrls && Array.isArray(existing.imageUrls)) {
               updatedImages = [...existing.imageUrls, ...base64Images];
           } else if (existing.imageUrl) {
               updatedImages = [existing.imageUrl, ...base64Images];
           } else {
               updatedImages = [...base64Images];
           }
           finalPrompts[existingIdx] = { ...existing, imageUrls: updatedImages, imageUrl: updatedImages[0] };
           focusPromptId = existing.id;
           focusFolderId = existing.folderId || null;
       } else {
           const newPrompt: PromptItem = {
               id: generateId(),
               categoryId: currentCategory, 
               folderId: currentFolderId || undefined,
               title: group.title,
               prompts: group.prompt,
               imageUrl: base64Images[0],
               imageUrls: base64Images,
               createdAt: Date.now()
           };
           finalPrompts = [newPrompt, ...finalPrompts];
           focusPromptId = newPrompt.id;
           focusFolderId = currentFolderId; // DO NOT change focus folder to null if it's placed in the current folder. Wait, currentFolderId could be what it's added to. So we should NOT jump out of the current folder context if it's placed here.
       }
    }

    setPrompts(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      
      // Preserve items that might have been added concurrently, 
      // and remove items that might have been deleted concurrently
      const mergedPrompts = finalPrompts.filter(p => existingIds.has(p.id) || !prompts.some(oldP => oldP.id === p.id));
      
      const newItemsFromPrev = prev.filter(p => !finalPrompts.some(fp => fp.id === p.id));
      
      const combined = [...newItemsFromPrev, ...mergedPrompts].sort((a, b) => b.createdAt - a.createdAt);
      
      savePrompts(combined);
      return combined;
    });
    setLoading(false);
    setImportStatus(prev => prev ? { ...prev, current: allFiles.length, failed: failedList } : null);

    // 跳转定位逻辑 (jump logic)
    // Avoid switching folders unless it actually merged into a folder different from current.
    if (focusPromptId) {
        if (focusFolderId !== null && focusFolderId !== currentFolderId) {
            setCurrentFolderId(focusFolderId);
        } else if (focusFolderId === null && currentFolderId !== null) {
            // It merged into root, so show root. But if it was just created, focusFolderId is currentFolderId, so it won't hit here.
            setCurrentFolderId(null);
        }
        
        setTimeout(() => {
            const el = document.getElementById(`prompt-card-${focusPromptId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                el.style.transition = 'box-shadow 0.3s';
                el.style.boxShadow = '0 0 0 2px #000';
                setTimeout(() => {
                    el.style.boxShadow = '';
                }, 2000);
            }
        }, 300);
    }
  };
  
  const [categorySortModes, setCategorySortModes] = useState<Record<Category, SortMode>>(() => {
    const saved = localStorage.getItem('nai-muse-sort-modes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      characters: 'manual',
      main: 'manual',
      clothing: 'manual',
      composition: 'manual',
      actions: 'manual',
      negative: 'manual',
    };
  });
  
  let sortMode = categorySortModes[currentCategory] || 'manual';
  if (sortMode === 'timeDesc' || sortMode === 'timeAsc') {
    sortMode = 'manual';
  }
  const setSortMode = (mode: SortMode) => {
    const newModes = { ...categorySortModes, [currentCategory]: mode };
    setCategorySortModes(newModes);
    localStorage.setItem('nai-muse-sort-modes', JSON.stringify(newModes));
  };
  
  const [detailItem, setDetailItem] = useState<PromptItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editItemData, setEditItemData] = useState<PromptItem | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const listContainerRef = React.useRef<HTMLDivElement>(null);

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const term = searchQuery.trim();
      
      const matches = prompts.filter(p => 
        p.title && p.title.includes(term)
      );
      
      if (matches.length > 0) {
        const currentIdx = matches.findIndex(m => m.id === highlightId);
        const nextMatch = matches[(currentIdx + 1) % matches.length];
        
        if (nextMatch.categoryId !== currentCategory) {
          setCurrentCategory(nextMatch.categoryId);
        }
        if (nextMatch.folderId !== currentFolderId) {
          setCurrentFolderId(nextMatch.folderId || null);
        }
        
        setHighlightId(nextMatch.id);
        setIsDetailOpen(false);
      } else {
        setHighlightId(null);
        alert('未找到相关记录 / No records found');
      }
    }
  };
  
  const [displayMode, setDisplayMode] = useState<'large' | 'compact'>('large');
  const [privacyMode, setPrivacyMode] = useState(false);
  const [isFooterExpanded, setIsFooterExpanded] = useState(true);

  // New multi-select & share states
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>([]);
  
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: (() => void) | null;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: null
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    Promise.all([fetchPrompts(), fetchFolders()]).then(([pData, fData]) => {
      setPrompts(pData);
      setFolders(fData);
      setLoading(false);
    });
    if (window.innerWidth < 768) {
      setIsFooterExpanded(false);
    }
  }, []);

  const handleSelectCategory = (cat: Category) => {
    setCurrentCategory(cat);
    setCurrentFolderId(null);
    setSelectionMode(false);
    setSelectedPromptIds([]);
  };

  const handleAddOrEditFolder = async (folder: FolderItem) => {
    let newFolders;
    if (editFolderData) {
      newFolders = folders.map(f => f.id === folder.id ? folder : f);
    } else {
      newFolders = [folder, ...folders];
    }
    setFolders(newFolders);
    await saveFolders(newFolders);
    setIsFolderModalOpen(false);
    setEditFolderData(null);
  };

  const handleDeleteFolder = (id: string, name: string) => {
    setConfirmState({
      isOpen: true,
      title: "删除文件夹 / Delete Folder",
      message: `确定要删除 "${name}" 吗？\n文件夹内的记录会被移至根目录。`,
      action: async () => {
        setFolders(prev => {
          const newFolders = prev.filter(f => f.id !== id);
          saveFolders(newFolders);
          deleteFolderFromDB(id);
          return newFolders;
        });
        
        // Move items in this folder to root of the category
        setPrompts(prev => {
          const newPrompts = prev.map(p => p.folderId === id ? { ...p, folderId: undefined } : p);
          savePrompts(newPrompts);
          return newPrompts;
        });

        if (currentFolderId === id) {
          setCurrentFolderId(null);
        }
      }
    });
  };

  const openFolderEditModal = (folder?: FolderItem) => {
    if (folder) setEditFolderData(folder);
    else setEditFolderData(null);
    setIsFolderModalOpen(true);
  };

  const handleAddOrEditPrompt = async (item: PromptItem) => {
    const targetFolderId = editItemData ? item.folderId : (currentFolderId || undefined);
    const itemWithFolder = { ...item, folderId: targetFolderId };

    setPrompts(prev => {
      let newPrompts;
      if (editItemData) {
        // Edit mode
        newPrompts = prev.map(p => p.id === item.id ? itemWithFolder : p);
      } else {
        // Add mode
        newPrompts = [itemWithFolder, ...prev];
      }
      savePrompts(newPrompts);
      return newPrompts;
    });

    setIsModalOpen(false);
    setEditItemData(null);
    setIsDetailOpen(false);
  };

  const handleToggleFavorite = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPrompts(prev => {
      const newPrompts = prev.map(p => 
        p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
      );
      savePrompts(newPrompts);
      return newPrompts;
    });
  };

  const handleDeletePrompt = async (id: string) => {
    setPrompts(prev => {
      const newPrompts = prev.filter(p => p.id !== id);
      savePrompts(newPrompts);
      deletePromptFromDB(id);
      return newPrompts;
    });
  };

  const openEditModal = (item?: PromptItem) => {
    if (item) {
      setEditItemData(item);
    } else {
      setEditItemData(null);
    }
    setIsModalOpen(true);
  };

  const openDetailModal = (item: PromptItem) => {
    setDetailItem(item);
    setIsDetailOpen(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const activeId = active.id as string;
      const overId = over.id as string;

      setPrompts(prev => {
        const activeItem = prev.find(p => p.id === activeId);
        const overItem = prev.find(p => p.id === overId);
        
        // Disable crossing the favorite boundary
        if (activeItem && overItem && activeItem.isFavorite !== overItem.isFavorite) {
          return prev;
        }

        const oldIndex = prev.findIndex(p => p.id === activeId);
        const newIndex = prev.findIndex(p => p.id === overId);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newPrompts = arrayMove(prev, oldIndex, newIndex) as PromptItem[];
          savePrompts(newPrompts); // save asynchronously
          return newPrompts;
        }
        return prev;
      });
    }
  };

  const currentPrompts = React.useMemo(() => prompts.filter(p => {
    if (p.categoryId !== currentCategory) return false;
    if (currentFolderId === null) return !p.folderId;
    return p.folderId === currentFolderId;
  }), [prompts, currentCategory, currentFolderId]);

  const currentCategoryFolders = React.useMemo(() => folders.filter(f => f.categoryId === currentCategory), [folders, currentCategory]);

  const handleExportData = async () => {
    try {
      setLoading(true);
      const dataToExport = selectionMode && selectedPromptIds.length > 0 
        ? prompts.filter(p => selectedPromptIds.includes(p.id)) 
        : prompts;

      const folderIdsToExport = new Set(dataToExport.map(p => p.folderId).filter(Boolean));
      const foldersToExport = selectionMode && selectedPromptIds.length > 0
        ? folders.filter(f => folderIdsToExport.has(f.id))
        : folders;

      const zip = new JSZip();

      const exportPrompts = dataToExport.map(p => {
         const newP: any = { ...p };
         newP.imageUrls = undefined;
         newP.imageUrl = undefined;
         
         const artist = p.title || 'Unknown';
         const safeArtistDir = `${p.id}_${artist}`.replace(/[\/\?<>\\:\*\|":]/g, '_');
         
         const base64List = p.imageUrls || (p.imageUrl ? [p.imageUrl] : []);
         newP._imageFiles = [];
         
         if (base64List.length > 0) {
           newP._hasImages = true;
         }

         base64List.forEach((b64, idx) => {
            const mimeMatch = b64.match(/^data:([^;]+);base64,/);
            const ext = mimeMatch && mimeMatch[1].startsWith('image/') ? mimeMatch[1].split('/')[1] : 'jpg';
            const cleanBase64 = b64.includes(',') ? b64.split(',')[1] : b64;
            
            const fileName = `${safeArtistDir}_${idx + 1}.${ext}`;
            const filePath = `images/${safeArtistDir}/${fileName}`;
            
            newP._imageFiles.push(filePath);
            
            zip.file(filePath, cleanBase64, { base64: true });
         });
         
         return newP;
      });

      const exportData = {
        prompts: exportPrompts,
        folders: foldersToExport
      };

      zip.file('data.json', JSON.stringify(exportData, null, 2));

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'nai-muse-backup.zip');
    } catch (err) {
      console.error(err);
      alert("导出失败 / Export failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    try {
      if (file.name.endsWith('.zip')) {
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(file, { decodeFileName: (bytes: any) => {
           return new TextDecoder("utf-8").decode(bytes);
        }});

        const dataFile = loadedZip.file('data.json');
        if (!dataFile) throw new Error("ZIP 文件中找不到 data.json / data.json not found in ZIP");

        const dataStr = await dataFile.async('text');
        const imported = JSON.parse(dataStr);

        let promptsToImport: any[] = [];
        let foldersToImport: FolderItem[] = [];

        if (Array.isArray(imported)) {
          promptsToImport = imported;
        } else {
          promptsToImport = imported.prompts || [];
          foldersToImport = imported.folders || [];
        }

        const folderIdMap = new Map<string, string>();
        const updatedFolders: FolderItem[] = [];
        foldersToImport.forEach(f => {
           const newId = generateId();
           folderIdMap.set(f.id, newId);
           updatedFolders.push({
             ...f,
             id: newId
           });
        });

        const resolvedPrompts = await Promise.all(promptsToImport.map(async (p: any) => {
          const newPrompt = {
             ...p,
             id: generateId(),
             folderId: p.folderId ? folderIdMap.get(p.folderId) : undefined
          };

          if (p._imageFiles && Array.isArray(p._imageFiles)) {
             const base64Images: string[] = [];
             for (const imgPath of p._imageFiles) {
                const imgFile = loadedZip.file(imgPath);
                if (imgFile) {
                   const base64 = await imgFile.async('base64');
                   const ext = imgPath.split('.').pop()?.toLowerCase() || 'jpg';
                   const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
                   base64Images.push(`data:${mime};base64,${base64}`);
                }
             }
             newPrompt.imageUrls = base64Images.length ? base64Images : undefined;
             newPrompt.imageUrl = base64Images.length ? base64Images[0] : undefined;
          }

          delete newPrompt._imageFiles;
          delete newPrompt._hasImages;

          return newPrompt;
        }));

        setFolders(updatedFolders);
        await saveFolders(updatedFolders);

        setPrompts(resolvedPrompts);
        await savePrompts(resolvedPrompts);
        
        alert('配置和图片导入成功！/ Import successful!');

      } else if (file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const importedData = JSON.parse(event.target?.result as string);
            let importedPrompts = [];
            let importedFolders: any[] = [];
            
            if (Array.isArray(importedData)) {
              importedPrompts = importedData;
            } else if (importedData.prompts || importedData.folders) {
              importedPrompts = importedData.prompts || [];
              importedFolders = importedData.folders || [];
            } else {
              throw new Error("Invalid format");
            }
            
            const folderIdMap = new Map<string, string>();
            const newFolders = importedFolders.map((f: any) => {
               const newId = generateId();
               folderIdMap.set(f.id, newId);
               return { ...f, id: newId };
            });

            const newPrompts = importedPrompts.map((p: any) => ({
              ...p,
              id: generateId(),
              folderId: p.folderId ? folderIdMap.get(p.folderId) : undefined
            })) as PromptItem[];
            
            setFolders(newFolders);
            saveFolders(newFolders);

            setPrompts(newPrompts);
            savePrompts(newPrompts);
            
            alert('JSON 数据导入成功！/ JSON Import successful!');
          } catch (err) {
            alert('JSON 解析失败 / JSON parsing failed.');
          } finally {
            setLoading(false);
          }
        };
        reader.readAsText(file);
        e.target.value = '';
        return; 
      } else {
        alert('请选择 .zip 或 .json 文件 / Please select .zip or .json file');
      }
    } catch (err) {
      console.error(err);
      alert('导入失败 / Import failed.');
    } finally {
      if (file && !file.name.endsWith('.json')) {
        setLoading(false);
      }
    }
    
    e.target.value = '';
  };

  const sortedPrompts = React.useMemo(() => {
    return [...currentPrompts].sort((a, b) => {
      // Manual mode relies on array order, but favors isFavorite
      if (sortMode === 'manual') {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return 0;
      }
      if (sortMode === 'imgCountDesc') {
        const countA = (a.imageUrls?.length || (a.imageUrl ? 1 : 0));
        const countB = (b.imageUrls?.length || (b.imageUrl ? 1 : 0));
        return countB - countA;
      }
      if (sortMode === 'tags') {
        const tagA = (a.tags && a.tags.length > 0) ? a.tags[0].toLowerCase() : 'zzz';
        const tagB = (b.tags && b.tags.length > 0) ? b.tags[0].toLowerCase() : 'zzz';
        return tagA.localeCompare(tagB);
      }
      return 0;
    });
  }, [currentPrompts, sortMode]);

  const computeItemContent = (index: number, item: any, context: any) => {
    if (item.type === 'folder') {
      return (
        <FolderCard 
          folder={item.data} 
          itemCount={item.itemCount || 0}
          coverImage={item.coverImage}
          displayMode={context.displayMode}
          onClick={(id) => setCurrentFolderId(id)}
          onEdit={(f) => openFolderEditModal(f)}
          onDelete={handleDeleteFolder}
        />
      );
    } else {
      return (
        <PromptCard 
          item={item.data} 
          onDelete={handleDeletePrompt} 
          isManualSort={context.sortMode === 'manual'}
          onClickDetail={openDetailModal}
          displayMode={context.displayMode}
          privacyMode={context.privacyMode}
          selectionMode={context.selectionMode}
          isSelected={context.selectedPromptIds.includes(item.data.id)}
          isHighlighted={context.highlightId === item.data.id}
          onToggleSelect={(id) => {
            setSelectedPromptIds(prev => 
              prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
            );
          }}
          onToggleFavorite={handleToggleFavorite}
        />
      );
    }
  };

  const foldersAndPrompts = React.useMemo(() => {
    const list: Array<{ type: 'folder' | 'prompt', data: any, coverImage?: string, itemCount?: number }> = [];
    if (currentFolderId === null) {
      currentCategoryFolders.forEach(f => {
        const folderPrompts = prompts.filter(p => p.folderId === f.id);
        const folderPromptsWithImage = folderPrompts.filter(p => p.imageUrls?.[0] || p.imageUrl);
        folderPromptsWithImage.sort((a, b) => b.createdAt - a.createdAt);
        const coverImage = folderPromptsWithImage[0]?.imageUrls?.[0] || folderPromptsWithImage[0]?.imageUrl;
        list.push({ type: 'folder', data: f, coverImage, itemCount: folderPrompts.length });
      });
    }
    sortedPrompts.forEach(p => list.push({ type: 'prompt', data: p }));
    return list;
  }, [currentFolderId, currentCategoryFolders, sortedPrompts, prompts]);

  React.useEffect(() => {
    if (highlightId && listContainerRef.current) {
      setTimeout(() => {
        const index = foldersAndPrompts.findIndex(item => item.type === 'prompt' && item.data.id === highlightId);
        if (index !== -1 && listContainerRef.current) {
          const itemEl = listContainerRef.current.children[0]?.children[index] as HTMLElement;
          if (itemEl) {
             itemEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 100);
    }
  }, [highlightId, foldersAndPrompts]);

  return (
    <div 
      className="flex flex-col h-[100dvh] w-full font-sans bg-bg text-ink overflow-hidden"
      onDragOver={handleGlobalDragOver}
      onDragLeave={handleGlobalDragLeave}
      onDrop={handleGlobalDrop}
    >
      {/* Global Drag Overlay */}
      <AnimatePresence>
        {isDraggingGlobal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-white/80 backdrop-blur-sm border-4 border-dashed border-ink flex items-center justify-center pointer-events-none"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center text-ink shadow-lg">
                <FolderPlus size={40} strokeWidth={1} />
              </div>
              <h2 className="font-serif text-3xl text-ink">Drop images to add</h2>
              <p className="text-sm text-ink-light tracking-widest uppercase">Auto-detected artist images will merge</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <Sidebar currentCategory={currentCategory} onSelect={handleSelectCategory} />
        
        <main className="flex-1 flex flex-col h-full bg-white relative overflow-hidden w-full">
          <MigrationBanner prompts={prompts} setPrompts={setPrompts} />
          <header className="h-auto py-3 lg:py-0 lg:h-16 border-b border-border-subtle flex flex-col md:flex-row px-4 sm:px-6 md:px-8 shrink-0 bg-bg/50 backdrop-blur-sm z-30 gap-3 md:gap-4 md:items-center w-full">
            <div className="flex items-center justify-between w-full md:w-auto shrink-0 gap-3 md:gap-4">
              <h2 className="font-serif text-lg md:text-xl flex items-center md:items-baseline whitespace-nowrap gap-2 md:gap-3 overflow-hidden">
                {currentFolderId ? (
                   <div className="flex items-center gap-1 md:gap-2">
                     <button
                       onClick={() => setCurrentFolderId(null)}
                       className="p-1 hover:bg-stone-200 rounded-full transition-colors shrink-0 outline-none -ml-1 md:ml-0"
                       title="Back to root"
                     >
                       <ArrowLeft className="w-4 h-4 md:w-[18px] md:h-[18px] opacity-80" />
                     </button>
                     <span className="hidden md:inline opacity-50 cursor-pointer hover:opacity-100 transition-opacity" onClick={() => setCurrentFolderId(null)}>
                       {CATEGORY_NAMES[currentCategory]}
                     </span>
                     <span className="hidden md:inline opacity-50 shrink-0 mx-1">/</span>
                     <span className="truncate max-w-[140px] sm:max-w-[200px] text-base md:text-xl font-medium md:font-normal" title={folders.find(f => f.id === currentFolderId)?.name}>
                       {folders.find(f => f.id === currentFolderId)?.name}
                     </span>
                     
                     <span className="inline-flex md:hidden items-center text-[10px] font-sans font-medium tracking-wider shrink-0 bg-stone-100 px-2 py-[2px] rounded-full border border-border-subtle opacity-80 ml-1">
                        {currentPrompts.length}
                     </span>
                   </div>
                ) : (
                   <span className="text-[17px] md:text-xl font-medium md:font-normal">{CATEGORY_NAMES[currentCategory]}</span> 
                )}
                
                <span className={`text-[10px] md:text-xs opacity-50 font-serif italic uppercase tracking-wider shrink-0 ${currentFolderId ? "hidden md:inline" : "inline"}`}>
                  Archive / {currentPrompts.length.toString().padStart(3, '0')} Items
                </span>
              </h2>

              <div className="relative group/search flex md:hidden items-center w-[130px] sm:w-[150px] shrink-0 ml-auto">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-light group-focus-within:text-ink pointer-events-none" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                  placeholder="搜索标题"  
                  className="w-full h-[34px] pl-9 pr-6 text-xs bg-border-subtle/30 border border-transparent focus:bg-white focus:border-border-medium rounded outline-none transition-all placeholder:opacity-60"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setHighlightId(null); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-ink-lighter hover:text-ink">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-3 shrink-0 md:ml-auto w-full md:w-auto justify-between md:justify-end mt-2 md:mt-0 overflow-visible z-20">
              <div className="hidden md:flex relative group/search items-center w-[180px] shrink-0">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-light group-focus-within:text-ink pointer-events-none" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                  placeholder="搜索标题"  
                  className="w-full h-[34px] pl-9 pr-6 text-xs bg-border-subtle/30 border border-transparent focus:bg-white focus:border-border-medium rounded outline-none transition-all placeholder:opacity-60"
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setHighlightId(null); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-ink-lighter hover:text-ink">
                    <X size={14} />
                  </button>
                )}
              </div>
              
                <div className="flex items-center gap-1 bg-border-subtle/30 rounded p-1 shrink-0 h-[34px]">
                  <button
                    onClick={() => {
                      setSelectionMode(!selectionMode);
                      setSelectedPromptIds([]);
                    }}
                    title="Select Multiple"
                    className={`h-full px-2 rounded transition-colors flex items-center justify-center ${selectionMode ? 'bg-white shadow text-ink' : 'text-ink-light hover:text-ink'}`}
                  >
                    <Share2 size={14} />
                  </button>
                  <div className="w-px h-4 bg-border-medium/30 mx-0.5"></div>
                  <button
                    onClick={() => setPrivacyMode(!privacyMode)}
                    title="Toggle Privacy"
                    className={`h-full px-2 rounded transition-colors flex items-center justify-center ${privacyMode ? 'bg-white shadow text-ink' : 'text-ink-light hover:text-ink'}`}
                  >
                    {privacyMode ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <div className="w-px h-4 bg-border-medium/30 mx-0.5"></div>
                  <button
                    onClick={() => setDisplayMode(mode => mode === 'large' ? 'compact' : 'large')}
                    title="Toggle Layout"
                    className="h-full px-2 rounded transition-colors text-ink bg-white shadow cursor-pointer flex items-center justify-center"
                  >
                    {displayMode === 'large' ? <LayoutList size={14} /> : <LayoutGrid size={14} />}
                  </button>
                </div>
                
                <div className="shrink-0 h-[34px]">
                  <SortDropdown value={sortMode} onChange={setSortMode} />
                </div>
                
                <div className="hidden sm:block w-px h-[34px] bg-border-medium shrink-0 ml-1 mr-1"></div>
                
                <div className="flex gap-2 shrink-0 h-[34px]">
                  {currentFolderId === null && (
                    <button 
                      onClick={() => openFolderEditModal()}
                      className="h-full w-[34px] flex justify-center border border-ink bg-white hover:bg-stone-50 transition-all items-center"
                      title="新建文件夹"
                    >
                      <FolderPlus size={14} />
                    </button>
                  )}
                  <button 
                    onClick={() => openEditModal()}
                    className="h-full w-[34px] flex justify-center border border-ink bg-ink text-white hover:bg-ink-light transition-all items-center"
                    title="新增记录"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
          </header>

            <section className="flex-1 p-4 md:p-10 overflow-hidden relative bg-stone-50">
            {loading ? (
              <div className="h-full flex items-center justify-center font-serif text-ink-lighter tracking-widest italic opacity-50">
                正在同步数据库 / Synchronizing...
              </div>
            ) : currentPrompts.length === 0 && (currentFolderId !== null || currentCategoryFolders.length === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40 mt-[-5%]">
                 <p className="font-serif text-2xl mb-2">暂无数据记录</p>
                 <p className="text-[11px] tracking-widest uppercase">No Entries Found. Click '新增记录' to add.</p>
              </div>
            ) : (
              <div className="flex flex-col h-full w-full">
                {currentCategory === 'main' && currentFolderId !== null && (
                  <ArtistCombiner prompts={currentPrompts} onOpenDetail={openDetailModal} />
                )}
                <div className="flex-1 min-h-0 scroll-mask pr-2" style={{ marginRight: '-8px' }}>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={sortedPrompts.map(p => p.id)} strategy={rectSortingStrategy}>
                    <div className="h-full overflow-y-auto w-full pr-1 overflow-x-hidden" ref={listContainerRef}>
                      <div className={
                        displayMode === 'large' 
                          ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6 pb-24 px-1 w-full"
                          : "grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8 gap-3 md:gap-4 pb-24 px-1 w-full"
                      }>
                        {foldersAndPrompts.map((item, index) => (
                          <div key={item.type + '-' + item.data.id} className="w-full h-full flex flex-col">
                            {computeItemContent(index, item, { selectedPromptIds, selectionMode, privacyMode, displayMode, sortMode, highlightId })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </SortableContext>
                </DndContext>
                </div>
              </div>
            )}
          </section>

          {selectionMode && (
            <div className="fixed bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 bg-white pl-3 md:pl-4 pr-1 md:pr-2 py-1.5 md:py-2 rounded-[2rem] flex items-center justify-center gap-2 md:gap-4 shadow-xl border border-border-medium z-50 animate-in slide-in-from-bottom-5 whitespace-nowrap max-w-max w-[calc(100vw-2rem)] sm:w-auto">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-6 h-6 rounded-full bg-ink text-white flex items-center justify-center text-xs font-serif shrink-0">
                  {selectedPromptIds.length}
                </div>
                <span className="text-[10px] md:text-[11px] uppercase tracking-widest font-medium opacity-60 hidden sm:inline">Selected</span>
              </div>

              <div className="w-px h-5 bg-border-medium"></div>

              <div className="flex items-center gap-1 md:gap-2">
                {/* Move Action */}
                {selectedPromptIds.length > 0 && (
                  <MoveDropdown 
                    currentCategory={currentCategory}
                    categories={CATEGORY_NAMES}
                    folders={folders}
                    currentFolderId={currentFolderId}
                    onMove={async (targetCategory) => {
                      if (!targetCategory || targetCategory === currentCategory) return;
                      setPrompts(prev => {
                        const newPrompts = prev.map(p => {
                          if (selectedPromptIds.includes(p.id)) {
                            return { ...p, categoryId: targetCategory, folderId: undefined };
                          }
                          return p;
                        });
                        savePrompts(newPrompts);
                        return newPrompts;
                      });
                      setSelectedPromptIds([]);
                      setSelectionMode(false);
                    }}
                    onMoveToFolder={async (targetFolderId) => {
                      setPrompts(prev => {
                        const newPrompts = prev.map(p => {
                          if (selectedPromptIds.includes(p.id)) {
                            return { ...p, folderId: targetFolderId || undefined };
                          }
                          return p;
                        });
                        savePrompts(newPrompts);
                        return newPrompts;
                      });
                      setSelectedPromptIds([]);
                      setSelectionMode(false);
                    }}
                  />
                )}

                {/* Delete Action */}
                <button 
                  onClick={() => {
                    if (selectedPromptIds.length === 0) return;
                    setConfirmState({
                      isOpen: true,
                      title: "批量删除 / Bulk Delete",
                      message: `确定要删除选中的 ${selectedPromptIds.length} 个记录吗？`,
                      action: async () => {
                        setPrompts(prev => {
                          const newPrompts = prev.filter(p => !selectedPromptIds.includes(p.id));
                          savePrompts(newPrompts);
                          selectedPromptIds.forEach(id => deletePromptFromDB(id));
                          return newPrompts;
                        });
                        setSelectedPromptIds([]);
                        setSelectionMode(false);
                      }
                    });
                  }}
                  disabled={selectedPromptIds.length === 0}
                  className="px-3 md:px-4 py-1.5 border hover:bg-[#E63946] border-[#E63946] text-[#E63946] hover:text-white text-[11px] uppercase tracking-widest font-medium rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 md:gap-2"
                >
                  <Trash2 size={13} />
                  <span className="hidden sm:inline">删除 / Delete</span>
                  <span className="sm:hidden">删除</span>
                </button>

                {/* Export Action */}
                <button 
                  onClick={handleExportData}
                  disabled={selectedPromptIds.length === 0}
                  className="px-3 md:px-4 py-1.5 bg-ink text-white text-[11px] uppercase tracking-widest font-medium rounded-full hover:bg-ink-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 md:gap-2"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">导出 / Export</span>
                  <span className="sm:hidden">导出</span>
                </button>

                {/* Cancel/Close */}
                <button 
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedPromptIds([]);
                  }}
                  className="p-1 md:p-1.5 text-ink-lighter hover:text-ink hover:bg-stone-100 rounded-full transition-colors ml-0 md:ml-1"
                  title="Cancel"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          )}

          <footer className="bg-ink text-bg shrink-0 relative z-10 transition-all" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div 
               className="flex items-center justify-between px-5 py-2 border-b border-white/10 md:hidden cursor-pointer bg-ink-light"
               onClick={() => setIsFooterExpanded(!isFooterExpanded)}
            >
               <span className="text-[10px] uppercase tracking-widest text-[#F5F2ED]/60 font-medium">System Module / Footer</span>
               <button className="text-[#F5F2ED]/60 hover:text-white p-1">
                 {isFooterExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
               </button>
            </div>

            {isFooterExpanded && (
              <div className="p-5 md:p-4 md:px-8 flex flex-col md:flex-row justify-between gap-6 md:gap-8 transition-all">
                 <div className="flex-1 max-w-4xl flex flex-col justify-center">
                    <p className="text-[10px] uppercase tracking-widest text-[#F5F2ED]/40 mb-1.5">Universal Negative Prompts</p>
                    <p className="font-serif text-xs italic leading-relaxed text-[#F5F2ED]/80 line-clamp-2 md:line-clamp-none">
                      lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name.
                    </p>
                 </div>
                 <div className="w-full md:w-auto border-t md:border-t-0 md:border-l border-[#F5F2ED]/20 pt-4 md:pt-0 md:pl-8 flex flex-col justify-center shrink-0">
                    <div className="flex justify-end md:justify-end items-center gap-2 h-full">
                      <div className="flex gap-2">
                        <button onClick={handleExportData} className="text-[10px] border border-[#F5F2ED]/40 text-[#F5F2ED]/80 hover:bg-[#F5F2ED] hover:text-ink hover:border-white px-3 py-1.5 transition-all cursor-pointer">
                          导出 / Export
                        </button>
                        <label className="text-[10px] border border-[#F5F2ED]/40 text-[#F5F2ED]/80 hover:bg-[#F5F2ED] hover:text-ink hover:border-white px-3 py-1.5 transition-all cursor-pointer">
                          导入 / Import
                          <input type="file" accept=".json,.zip" className="hidden" onChange={handleImportData} />
                        </label>
                      </div>
                    </div>
                 </div>
              </div>
            )}
          </footer>
        </main>
      </div>

      <PromptFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddOrEditPrompt}
        category={currentCategory}
        initialData={editItemData}
      />
      
      <PromptDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        item={detailItem}
        onEdit={(item) => openEditModal(item)}
        onDelete={handleDeletePrompt}
      />
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSave={handleAddOrEditFolder}
        category={currentCategory}
        initialData={editFolderData}
      />
      
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={() => {
          if (confirmState.action) {
            confirmState.action();
          }
        }}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />

      <ImportProgressModal
        status={importStatus}
        onClose={() => setImportStatus(null)}
      />
    </div>
  );
}
