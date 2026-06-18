import { X, Copy, Edit, Trash2, Check } from 'lucide-react';
import { PromptItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { copyToClipboard } from '../lib/utils';

interface PromptDetailModalProps {
  item: PromptItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (item: PromptItem) => void;
  onDelete: (id: string) => void;
}

export function PromptDetailModal({ item, isOpen, onClose, onEdit, onDelete }: PromptDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Reset active image when item changes
  useEffect(() => {
    setActiveImageIndex(0);
  }, [item?.id]);

  if (!isOpen || !item) return null;

  const handleCopy = async () => {
    const success = await copyToClipboard(item.prompts);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const images = item.imageUrls || (item.imageUrl ? [item.imageUrl] : []);

  const handleDelete = () => {
    if (window.confirm("确定要删除此记录吗？ / Are you sure you want to delete this entry?")) {
      onDelete(item.id);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          className="absolute inset-0 bg-ink-lightest backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-bg w-[95vw] md:w-full max-w-5xl border border-border-subtle shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
        >
          <div className="flex justify-between items-center p-5 md:p-6 border-b border-border-subtle bg-white">
            <h2 className="font-serif text-lg md:text-xl text-ink">
              详细信息 <span className="text-xs md:text-sm opacity-40 italic ml-2 uppercase tracking-widest hidden sm:inline">Detail View</span>
            </h2>
            <div className="flex items-center gap-3 md:gap-4">
              <button onClick={() => { onEdit(item); onClose(); }} className="text-ink hover:text-ink transition-colors flex items-center gap-2 text-sm bg-bg border border-border-medium px-3 md:px-4 py-1 sm:py-1.5 hover:bg-white hover:border-ink">
                <Edit size={14} /> <span className="text-[10px] md:text-xs uppercase tracking-widest">编辑 <span className="hidden sm:inline">/ Edit</span></span>
              </button>
              <button onClick={onClose} className="text-ink-lighter hover:text-ink transition-colors pl-3 md:pl-4 border-l border-border-subtle">
                <X size={20} className="stroke-[1.5]" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto p-5 md:p-8 flex-1 scroll-mask flex flex-col md:flex-row items-start gap-6 md:gap-8 min-h-0">
            {images.length > 0 ? (
              <div className="w-full md:w-auto md:max-w-[60%] shrink-0 flex flex-col gap-3 items-start">
                <img draggable={false} 
                  src={images[activeImageIndex]} 
                  alt={item.title} 
                  className="block w-auto h-auto max-w-full max-h-[60vh] md:max-h-[75vh] rounded shadow-sm border border-border-subtle" 
                />
                {images.length > 1 && (
                  <div className="flex flex-wrap gap-2 w-0 min-w-full">
                    {images.map((imgUrl, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => setActiveImageIndex(idx)}
                        className={`w-14 sm:w-16 aspect-square relative border shrink-0 ${activeImageIndex === idx ? 'border-ink shadow-sm' : 'border-border-subtle opacity-60 hover:opacity-100'} transition-all bg-stone-100 hover:border-ink cursor-pointer overflow-hidden rounded-sm`}
                      >
                        <img draggable={false} src={imgUrl} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
            
            <div className="flex-1 space-y-5 md:space-y-6 w-full min-w-0">
              <div>
                <h3 className="font-serif text-2xl md:text-3xl mb-2 md:mb-3 text-ink leading-tight">{item.title}</h3>
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 md:mt-4">
                    {item.tags.map((tag, idx) => (
                      <span key={`${tag}-${idx}`} className="text-[10px] uppercase tracking-wider border border-ink text-ink px-[10px] py-[3px] rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-end mb-3">
                  <label className="block text-xs text-ink">提示词正文 <span className="uppercase tracking-widest opacity-60 ml-2 text-[10px]">Prompts</span></label>
                  <button 
                    onClick={handleCopy}
                    className="flex items-center justify-center text-ink bg-white border border-border-medium p-2 cursor-pointer hover:border-ink hover:bg-ink hover:text-white transition-all shadow-sm"
                    title="复制 Copy"
                  >
                    {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                </div>
                <div className="bg-white border border-border-subtle p-5 text-[14px] leading-relaxed text-ink font-sans whitespace-pre-wrap shadow-inner min-h-[160px]">
                  {item.prompts}
                </div>
              </div>

            </div>
          </div>

          <div className="p-5 md:p-6 border-t border-border-subtle bg-white flex justify-between items-center">
            <button 
              onClick={handleDelete}
              className="text-xs text-red-500/80 hover:text-red-500 transition-colors flex items-center gap-1.5 py-1"
            >
              <Trash2 size={14} /> 删除 <span className="hidden sm:inline">/ Delete</span>
            </button>
            <span className="text-[10px] uppercase tracking-widest text-ink-lighter max-w-[120px] truncate">ID: {item.id.split('-')[0]}</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
