import { Copy, Trash2, Image as ImageIcon, GripHorizontal, Check, Heart } from 'lucide-react';
import { PromptItem } from '../types';
import { motion } from 'motion/react';
import React, { useState } from 'react';
import { cn, copyToClipboard } from '../lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PromptCardProps {
  item: PromptItem;
  onDelete: (id: string, e?: React.MouseEvent) => void;
  isManualSort?: boolean;
  onClickDetail: (item: PromptItem) => void;
  displayMode: 'large' | 'compact';
  privacyMode: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onToggleSelect?: (id: string) => void;
  onToggleFavorite?: (id: string, e?: React.MouseEvent) => void;
  readOnly?: boolean;
}

export const PromptCard: React.FC<PromptCardProps> = ({ item, onDelete, isManualSort, onClickDetail, displayMode, privacyMode, selectionMode, isSelected, isHighlighted, onToggleSelect, onToggleFavorite, readOnly }) => {
  const [copied, setCopied] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyToClipboard(item.prompts);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(item.id);
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      onClick={() => {
        if (selectionMode && onToggleSelect) {
          onToggleSelect(item.id);
        } else {
          onClickDetail(item);
        }
      }}
      className={cn(
        "bg-white border h-full flex flex-col group transition-all duration-300 cursor-pointer relative",
        displayMode === 'large' ? "p-4" : "p-2 sm:p-2.5",
        isDragging && "shadow-2xl border-ink z-50 ring-2 ring-ink ring-opacity-20",
        selectionMode && isSelected ? "border-ink ring-1 ring-ink shadow-sm" : 
        isHighlighted ? "border-ink ring-[3px] ring-inset ring-ink shadow-2xl z-40" : "border-border-subtle hover:border-ink"
      )}
    >
      {selectionMode && (
        <div className={cn("absolute top-2 left-2 p-1 border z-30 transition-all shadow-sm", isSelected ? "bg-ink border-ink text-white" : "bg-white/90 backdrop-blur-sm border-border-medium text-transparent")}>
          <Check size={14} strokeWidth={3} />
        </div>
      )}

      {isManualSort && !selectionMode && (
        <div 
          {...attributes} 
          {...listeners} 
          className="absolute top-2 left-10 p-1.5 bg-white/90 backdrop-blur-sm border border-border-subtle rounded text-ink-lightest hover:text-ink hover:border-ink cursor-grab active:cursor-grabbing z-20 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
          title="Drag to reorder"
        >
          <GripHorizontal size={14} />
        </div>
      )}

      {!readOnly && onToggleFavorite && !selectionMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(item.id, e);
          }}
          className={cn(
            "absolute top-2 left-2 p-1.5 backdrop-blur-sm border rounded z-20 transition-all shadow-sm",
            item.isFavorite 
              ? "bg-rose-50 border-rose-200 text-rose-500 opacity-100" 
              : "bg-white/90 border-border-subtle text-ink-lightest opacity-0 group-hover:opacity-100 hover:text-rose-500 hover:border-rose-300"
          )}
          title={item.isFavorite ? "Unfavorite" : "Favorite"}
        >
          <Heart size={14} className={cn(item.isFavorite && "fill-current")} />
        </button>
      )}

      {(()=>{
        if (!(item.imageUrls?.length || item.imageUrl)) return null;
        const imgCount = (item.imageUrls?.length || (item.imageUrl ? 1 : 0));
        return (
          <div className={cn("w-full bg-[#EAE5DF] flex items-center justify-center text-[10px] tracking-widest text-ink-lightest font-serif relative overflow-hidden", displayMode === 'compact' ? 'aspect-[4/3] sm:aspect-square mb-2' : 'aspect-[4/3] sm:aspect-[3/4] mb-3 sm:mb-4')}>
            <img draggable={false} src={item.imageUrls?.[0] || item.imageUrl} alt={item.title} loading="lazy" className={cn("w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-500")} />
            {imgCount > 1 && (
              <div className={cn("absolute bottom-2 right-2 bg-ink/70 backdrop-blur-md text-[9px] px-1.5 py-0.5 rounded-sm flex items-center gap-1 z-10 font-sans tracking-wide", imgCount > 4 ? "text-orange-400 font-bold" : "text-white")}>
                <ImageIcon size={10} /> {imgCount}
              </div>
            )}
          </div>
        );
      })()}

      {!readOnly && (
        <button 
          title="Delete"
          onClick={handleDelete}
          className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm border border-border-subtle text-ink opacity-0 group-hover:opacity-100 hover:bg-black hover:text-white transition-all z-20"
        >
          <Trash2 size={12} strokeWidth={1.5} />
        </button>
      )}

      <div className="flex-1 flex flex-col justify-between">
        <div>
           <div className="flex justify-between items-start gap-1">
             <h3 className={cn("font-serif leading-tight text-ink group-hover:text-amber-700 transition-colors line-clamp-2", displayMode === 'large' ? "text-lg mb-2" : "text-[13px] sm:text-sm leading-tight")}>{item.title}</h3>
           </div>
          
          {displayMode === 'large' && (
            <>
              <div className="relative group/prompt mt-1 sm:mt-2 bg-bg/30 p-2 border border-border-subtle/50 transition-colors hover:border-border-subtle">
                <p 
                  className={cn("text-ink-light leading-relaxed text-[11px] line-clamp-4", privacyMode && "blur-sm select-none opacity-50")} 
                  title={item.prompts}
                >
                  {item.prompts}
                </p>
                <button
                   onClick={handleCopy}
                   className="absolute top-1 right-1 p-1 bg-white border border-border-subtle opacity-0 group-hover/prompt:opacity-100 hover:text-ink hover:border-ink transition-all shadow-sm z-10"
                   title="复制 Copy"
                >
                   {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                </button>
              </div>
            </>
          )}
        </div>
        
        {item.tags && item.tags.length > 0 && displayMode === 'large' && (
          <div className="flex flex-wrap gap-1 mt-3">
            {item.tags.map((tag, idx) => (
              <span key={`${tag}-${idx}`} className="text-[9px] uppercase tracking-wider border border-ink text-ink px-[5px] py-[1px] rounded-full truncate max-w-full">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
