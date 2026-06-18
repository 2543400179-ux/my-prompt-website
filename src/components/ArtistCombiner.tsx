import React, { useState, useMemo } from 'react';
import { PromptItem } from '../types';
import { Copy, RefreshCw, Layers, Check, ChevronDown, ChevronUp, Pencil, Wand2 } from 'lucide-react';
import { cn, copyToClipboard } from '../lib/utils';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ArtistItemProps {
  key?: React.Key;
  item: PromptItem;
  onDoubleClick: (item: PromptItem) => void;
}

function SortableArtistItem({ item, onDoubleClick }: ArtistItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onDoubleClick={() => onDoubleClick(item)}
      className={cn(
        "inline-flex items-center cursor-grab active:cursor-grabbing px-3 py-1.5 rounded-lg border transition-all h-[34px]",
        isDragging ? "opacity-50 z-50 bg-white shadow-xl border-border-medium" : "bg-bg border-border-subtle hover:border-border-medium hover:bg-white"
      )}
    >
      <div className="text-xs font-mono text-ink-medium" title={item.prompts}>
        {item.prompts}
      </div>
    </div>
  );
}

interface ArtistCombinerProps {
  prompts: PromptItem[];
  onOpenDetail: (item: PromptItem) => void;
}

export function ArtistCombiner({ prompts, onOpenDetail }: ArtistCombinerProps) {
  const [count, setCount] = useState(() => {
    const saved = localStorage.getItem('nai-muse-random-count');
    return saved ? parseInt(saved, 10) : 3;
  });

  React.useEffect(() => {
    localStorage.setItem('nai-muse-random-count', count.toString());
  }, [count]);

  const [copied, setCopied] = useState(false);
  const [combination, setCombination] = useState<PromptItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [editedText, setEditedText] = useState('');
  const [isEditingText, setIsEditingText] = useState(false);

  // Filter artist cards
  const artistCards = useMemo(() => {
    return prompts.filter(p => p.prompts && p.prompts.toLowerCase().trim().startsWith('artist'));
  }, [prompts]);

  // Initial combination setup
  React.useEffect(() => {
    if (artistCards.length > 0 && combination.length === 0) {
      handleRandomize();
    }
  }, [artistCards]);

  React.useEffect(() => {
    setEditedText(combination.map(c => c.prompts).join(', '));
  }, [combination]);

  if (artistCards.length === 0) return null;

  const handleRandomize = () => {
    if (artistCards.length === 0) return;
    const shuffled = [...artistCards].sort(() => 0.5 - Math.random());
    setCombination(shuffled.slice(0, Math.min(count, shuffled.length)));
  };

  const handleCopy = () => {
    if (!editedText) return;
    copyToClipboard(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCleanWeights = () => {
    const cleaned = editedText.split(',').map(part => {
      let s = part.trim();
      // Remove NAI style weights prefix: 0.3:: artist:name ::
      s = s.replace(/^[-+]?[\d.]+::\s*(.*?)\s*(?:::)?$/, '$1');
      // Remove () and [] modifiers
      let prev;
      do {
        prev = s;
        s = s.replace(/^\((.*?)(?::[-+]?[\d.]+)?\)$/, '$1').trim();
        s = s.replace(/^\[(.*?)\]$/, '$1').trim();
      } while (s !== prev);
      // Remove trailing weights if formatted like tag:1.5
      const match = s.match(/(.+?):[-+]?[\d.]+$/);
      if (match) {
        s = match[1].trim();
      }
      return s;
    }).filter(Boolean).join(',\n');
    setEditedText(cleaned);
  };

  const handleToggleEdit = () => {
    if (isEditingText) {
      const parts = editedText.split(',').map(s => s.trim()).filter(Boolean);
      const newComb = parts.map(part => {
        let existing = combination.find(c => c.prompts.trim() === part);
        if (!existing) {
          existing = artistCards.find(c => c.prompts.trim() === part);
        }
        if (existing) return existing;
        return {
          id: `custom-${Date.now()}-${Math.random()}`,
          categoryId: 'main',
          title: part,
          prompts: part,
        } as PromptItem;
      });
      setCombination(newComb);
      setCount(Math.max(1, newComb.length));
    }
    setIsEditingText(!isEditingText);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = combination.findIndex(p => p.id === active.id);
      const newIndex = combination.findIndex(p => p.id === over.id);
      setCombination(arrayMove(combination, oldIndex, newIndex));
    }
  };

  return (
    <div className="w-full bg-white border border-border-subtle rounded-xl p-4 mb-4 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
            <Layers size={18} />
          </div>
          <div>
            <h4 className="text-sm font-medium text-ink">Random Artist Combiner</h4>
            <p className="text-xs text-ink-light">Double-click to view item. Drag to reorder.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-bg rounded p-1 border border-border-subtle">
            <button 
              className="w-6 h-6 flex items-center justify-center text-xs text-ink-medium hover:text-ink hover:bg-white rounded transition-colors"
              onClick={() => setCount(Math.max(1, count - 1))}
            >-</button>
            <span className="text-xs font-mono w-6 text-center tabular-nums">{count}</span>
            <button 
              className="w-6 h-6 flex items-center justify-center text-xs text-ink-medium hover:text-ink hover:bg-white rounded transition-colors"
              onClick={() => setCount(Math.min(artistCards.length, count + 1))}
            >+</button>
          </div>
          <button 
            onClick={handleRandomize}
            title="Randomize"
            className="p-2 bg-white border border-border-subtle hover:border-ink hover:bg-bg rounded-lg text-ink transition-all shadow-sm active:scale-95"
          >
            <RefreshCw size={14} />
          </button>
          
          <div className="flex items-center gap-1 bg-white border border-border-subtle rounded-lg shadow-sm">
            {isEditingText && (
              <button 
                onClick={handleCleanWeights}
                className="p-2 rounded-l-lg border-r border-border-subtle text-ink-medium hover:text-ink hover:bg-bg transition-all"
                title="Clean Weights"
              >
                <Wand2 size={14} />
              </button>
            )}
            <button 
              onClick={handleToggleEdit}
              className={cn(
                "p-2 transition-all",
                isEditingText 
                  ? "bg-ink border-ink text-white hover:bg-ink-dark hover:border-ink-dark rounded-r-lg" 
                  : "rounded-lg text-ink-medium hover:text-ink hover:bg-bg"
              )}
              title={isEditingText ? "Done Editing" : "Edit Text"}
            >
              {isEditingText ? <Check size={14} /> : <Pencil size={14} />}
            </button>
          </div>

          <button 
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all shadow-sm active:scale-95",
              copied 
                ? "bg-emerald-50 border-emerald-200 text-emerald-600" 
                : "bg-ink border-ink text-white hover:bg-ink-dark hover:border-ink-dark"
            )}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 bg-white border border-border-subtle hover:border-ink hover:bg-bg rounded-lg text-ink transition-all shadow-sm"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="w-full bg-bg/30 px-3 py-3 rounded-lg border border-border-subtle flex flex-col gap-3 min-h-[60px]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {isEditingText ? (
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="w-full p-3 text-xs font-mono bg-white border border-border-subtle rounded-lg resize-y focus:outline-none focus:border-ink transition-colors min-h-[80px] shadow-inner"
                  placeholder="Edit the combined tags here..."
                  autoFocus
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={combination.map(c => c.id)} strategy={rectSortingStrategy}>
                      {combination.map(item => (
                        <SortableArtistItem key={item.id} item={item} onDoubleClick={onOpenDetail} />
                      ))}
                    </SortableContext>
                  </DndContext>
                  {combination.length === 0 && <span className="text-xs text-ink-light italic p-2">No combination generated</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
