import React from 'react';
import { FolderItem } from '../types';
import { Folder, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface FolderCardProps {
  key?: string | number;
  folder: FolderItem;
  itemCount: number;
  coverImage?: string;
  displayMode?: 'large' | 'compact';
  onClick: (id: string) => void;
  onEdit: (folder: FolderItem) => void;
  onDelete: (id: string, name: string) => void;
}

export function FolderCard({ folder, onClick, onEdit, onDelete, itemCount, coverImage, displayMode = 'large' }: FolderCardProps) {
  const [showMenu, setShowMenu] = React.useState(false);

  return (
    <div 
      className="group relative bg-white border border-border-medium hover:border-ink transition-all duration-300 cursor-pointer flex flex-col h-full hover:shadow-lg"
      onClick={() => onClick(folder.id)}
    >
      <div className={cn("w-full bg-stone-100 flex items-center justify-center text-ink-lightest relative overflow-hidden", displayMode === 'compact' ? 'aspect-[4/3] sm:aspect-square mb-2' : 'aspect-[4/3] sm:aspect-[3/4] mb-3 sm:mb-4')}>
        {coverImage ? (
          <>
            <img draggable={false} src={coverImage} alt={folder.name} loading="lazy" className="w-full h-full object-cover grayscale-[20%] opacity-80 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-stone-50 border-b border-border-medium group-hover:bg-stone-100 transition-colors">
            <Folder size={32} className="opacity-20 translate-y-2 group-hover:translate-y-0 opacity-40 transition-all duration-500" />
          </div>
        )}
        
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-white/90 backdrop-blur-md text-ink px-2 py-1 flex items-center gap-1.5 shadow-sm">
          <Folder size={11} strokeWidth={2.5} />
          <span className="text-[9px] uppercase tracking-widest font-medium">Folder</span>
        </div>
      </div>

      <div className={cn("flex flex-col flex-1", displayMode === 'compact' ? "px-2 pb-3" : "px-3 sm:px-4 pb-4 sm:pb-5")}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className={cn("font-serif text-ink tracking-tight overflow-hidden text-ellipsis whitespace-nowrap", displayMode === 'compact' ? "text-xs font-medium" : "text-sm sm:text-base font-medium")}>
            {folder.name}
          </h3>
        </div>
        
        <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-ink-light opacity-70">
          {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
        </p>
      </div>

      <div className="absolute top-2 right-2">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-ink shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-300"
        >
          <MoreVertical size={14} />
        </button>

        {showMenu && (
          <>
            <div 
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
              }}
            />
            <div className="absolute top-full right-0 mt-1 min-w-[120px] bg-white border border-border-medium shadow-lg z-50 py-1 origin-top-right animate-in fade-in zoom-in-95 duration-200">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onEdit(folder);
                }}
                className="w-full text-left px-3 py-2 text-[10px] sm:text-[11px] uppercase tracking-widest text-ink hover:bg-stone-50 transition-colors flex items-center gap-2"
              >
                <Edit2 size={12} />
                重命名
              </button>
              <div className="mx-2 my-1 border-t border-border-medium opacity-50" />
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onDelete(folder.id, folder.name);
                }}
                className="w-full text-left px-3 py-2 text-[10px] sm:text-[11px] uppercase tracking-widest text-[#E63946] hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <Trash2 size={12} />
                删除
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
