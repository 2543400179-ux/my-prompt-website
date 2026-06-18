import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FolderInput, ChevronDown, Folder as FolderIcon } from 'lucide-react';
import { Category, FolderItem } from '../types';

interface MoveDropdownProps {
  currentCategory: Category;
  categories: Record<Category, string>;
  onMove: (targetCategory: Category) => void;
  folders: FolderItem[];
  currentFolderId: string | null;
  onMoveToFolder: (folderId: string | null) => void;
}

export function MoveDropdown({ currentCategory, categories, onMove, folders, currentFolderId, onMoveToFolder }: MoveDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyles, setDropdownStyles] = useState({ bottom: 0, left: 0 });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click was inside toggle button
      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
        return;
      }
      
      // Check if click was inside portal (since portal is mounted to body)
      const portalEl = document.getElementById('move-dropdown-portal');
      if (portalEl && portalEl.contains(event.target as Node)) {
        return;
      }
      
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    if (!isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setDropdownStyles({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left + rect.width / 2,
      });
    }
    setIsOpen(!isOpen);
  };

  const currentCategoryFolders = folders.filter(f => f.categoryId === currentCategory);

  const portalContent = isOpen ? (
    <div 
      id="move-dropdown-portal"
      className="fixed z-[100] mb-2 w-max min-w-[140px] bg-white border border-ink shadow-lg py-1 rounded-sm flex flex-col max-h-[60vh] overflow-y-auto"
      style={{
        bottom: `${dropdownStyles.bottom}px`,
        left: `${dropdownStyles.left}px`,
        transform: 'translateX(-50%)'
      }}
    >
      <div className="px-3 py-1.5 text-[9px] uppercase tracking-widest text-ink-lighter font-medium bg-stone-50">
        Move to Category
      </div>
      {(Object.keys(categories) as Category[]).map(key => {
        if (key === currentCategory) return null;
        return (
          <button
            key={key}
            onClick={() => {
              onMove(key);
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-[10px] md:text-[11px] uppercase tracking-widest transition-colors hover:bg-bg whitespace-nowrap"
          >
            {categories[key]}
          </button>
        );
      })}
      
      {currentCategoryFolders.length > 0 && (
         <>
          <div className="mx-2 my-1 border-t border-border-subtle" />
          <div className="px-3 py-1.5 text-[9px] uppercase tracking-widest text-ink-lighter font-medium bg-stone-50">
            Move to Folder
          </div>
          {currentFolderId !== null && (
            <button
              onClick={() => {
                onMoveToFolder(null);
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-[10px] md:text-[11px] uppercase tracking-widest transition-colors hover:bg-bg whitespace-nowrap opacity-70 italic"
            >
              Root (No Folder)
            </button>
          )}
          {currentCategoryFolders.map(folder => {
            if (folder.id === currentFolderId) return null;
            return (
              <button
                key={folder.id}
                onClick={() => {
                  onMoveToFolder(folder.id);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-[10px] md:text-[11px] tracking-widest transition-colors hover:bg-bg whitespace-nowrap flex items-center gap-2 font-medium"
              >
                <FolderIcon size={12} className="opacity-60" />
                {folder.name}
              </button>
            );
          })}
         </>
      )}
    </div>
  ) : null;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={toggleDropdown}
          className="px-2 md:px-4 py-1.5 bg-stone-100 hover:bg-stone-200 text-ink text-[11px] uppercase tracking-widest font-medium rounded-full transition-colors flex items-center gap-1 md:gap-2"
          title="Move to Category or Folder"
        >
          <FolderInput size={13} />
          <span className="hidden sm:inline">移动 / Move</span>
          <ChevronDown size={12} className={`opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {typeof document !== 'undefined' && createPortal(portalContent, document.body)}
    </>
  );
}
