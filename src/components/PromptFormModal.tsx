import React, { useState, useRef, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import { Category, PromptItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { generateId, compressImage } from '../lib/utils';

interface PromptFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: PromptItem) => void;
  category: Category;
  initialData?: PromptItem | null;
}

export function PromptFormModal({ isOpen, onClose, onSave, category, initialData }: PromptFormModalProps) {
  const [title, setTitle] = useState('');
  const [prompts, setPrompts] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData && isOpen) {
      setTitle(initialData.title);
      setPrompts(initialData.prompts);
      setTagsInput(initialData.tags ? initialData.tags.join(', ') : '');
      const validImages = initialData.imageUrls ? [...initialData.imageUrls] : (initialData.imageUrl ? [initialData.imageUrl] : []);
      setImagePreviews(validImages);
    } else if (isOpen && !initialData) {
      setTitle('');
      setPrompts('');
      setTagsInput('');
      setImagePreviews([]);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    const newPreviews = [...imagePreviews];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (file.size > 5 * 1024 * 1024) {
          alert(`图片 ${file.name} 超过5MB / Image exceeds 5MB`);
          continue;
        }
        try {
          const compressedBase64 = await compressImage(file);
          newPreviews.push(compressedBase64);
        } catch (err) {
          console.error("图片处理失败 / Failed to process image", err);
        }
    }
    
    setImagePreviews(newPreviews);
    setIsUploading(false);
    
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    
    const files = (Array.from(e.dataTransfer.files) as File[]).filter(file => file.type.startsWith('image/'));
    if (files.length === 0) return;
    
    setIsUploading(true);
    const newPreviews = [...imagePreviews];
    
    for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          alert(`图片 ${file.name} 超过5MB / Image exceeds 5MB`);
          continue;
        }
        try {
          const compressedBase64 = await compressImage(file);
          newPreviews.push(compressedBase64);
        } catch (err) {
          console.error("图片处理失败 / Failed to process image", err);
        }
    }
    
    setImagePreviews(newPreviews);
    setIsUploading(false);
  };

  const handleImageDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', idx.toString()); // Firefox requires some data
  };

  const handleImageDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleImageDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    const newPreviews = [...imagePreviews];
    const item = newPreviews.splice(draggedIdx, 1)[0];
    newPreviews.splice(idx, 0, item);
    setImagePreviews(newPreviews);
    setDraggedIdx(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !prompts.trim()) return;

    const newPrompt: PromptItem = {
      id: initialData ? initialData.id : generateId(),
      categoryId: initialData ? initialData.categoryId : category,
      folderId: initialData?.folderId,
      title: title.trim(),
      prompts: prompts.trim(),
      tags: tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0),
      imageUrls: imagePreviews.length > 0 ? imagePreviews : undefined,
      createdAt: initialData ? initialData.createdAt : Date.now()
    };

    onSave(newPrompt);
    // State is reset by the useEffect when modal opens again, but we can reset here too just in case
    setTitle('');
    setPrompts('');
    setTagsInput('');
    setImagePreviews([]);
    onClose();
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); }}
      >
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
          className="bg-bg w-full max-w-2xl border border-border-subtle shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
        >
          <div className="flex justify-between items-center p-5 md:p-6 border-b border-border-subtle">
            <h2 className="font-serif text-lg md:text-xl text-ink">
              {initialData ? '编辑记录' : '新增记录'} <span className="text-xs md:text-sm opacity-40 italic ml-2">{initialData ? 'Edit Entry' : 'Add Entry'}</span>
            </h2>
            <button onClick={onClose} className="text-ink-lighter hover:text-ink transition-colors">
              <X size={20} className="stroke-[1.5]" />
            </button>
          </div>

          <div className="overflow-y-auto p-5 md:p-8 flex-1 scroll-mask">
            <form id="prompt-form" onSubmit={handleSubmit} className="space-y-6">
              
              <div>
                <label className="block text-xs text-ink-light mb-2 flex justify-between items-end">
                  <span>参考图像 <span className="uppercase tracking-widest opacity-60 ml-2 text-[10px]">Image Reference (Optional)</span></span>
                  <span className="text-[10px] opacity-50">{imagePreviews.length} images</span>
                </label>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {imagePreviews.map((preview, idx) => (
                    <div 
                      key={idx} 
                      draggable
                      onDragStart={(e) => handleImageDragStart(e, idx)}
                      onDragOver={(e) => handleImageDragOver(e, idx)}
                      onDrop={(e) => handleImageDrop(e, idx)}
                      onDragEnd={() => setDraggedIdx(null)}
                      className={`aspect-square border border-border-medium relative group overflow-hidden bg-stone-100 cursor-move ${draggedIdx === idx ? 'opacity-40 border-ink' : 'opacity-100'}`}
                    >
                      <img src={preview} alt={`Preview ${idx}`} className="w-full h-full object-cover pointer-events-none" />
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                        className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  
                  <div 
                    className={`aspect-square border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors relative overflow-hidden ${isDraggingFile ? 'border-ink bg-stone-100 text-ink' : 'border-border-medium bg-white text-ink-lighter hover:border-ink hover:text-ink'}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleFileDragOver}
                    onDragLeave={handleFileDragLeave}
                    onDrop={handleFileDrop}
                  >
                    <Upload size={20} strokeWidth={1.5} />
                    <span className="text-[10px] uppercase tracking-widest mt-2 text-center px-2">
                       {isDraggingFile ? "Drop here!" : (imagePreviews.length > 0 ? "Add More" : "Upload")}
                    </span>
                  </div>
                  
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-ink-light mb-2">标题 <span className="uppercase tracking-widest opacity-60 ml-2 text-[10px]">Title</span></label>
                <input 
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="例如：赛博朋克城市 / Elysia"
                  className="w-full bg-white border border-border-subtle px-4 py-3 text-ink focus:outline-none focus:border-ink transition-colors font-serif"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-ink-light mb-2">提示词内容 <span className="uppercase tracking-widest opacity-60 ml-2 text-[10px]">Prompts</span></label>
                <textarea 
                  value={prompts}
                  onChange={e => setPrompts(e.target.value)}
                  placeholder="在此输入需要保存的提示词段落..."
                  className="w-full bg-white border border-border-subtle px-4 py-3 text-ink focus:outline-none focus:border-ink transition-colors h-32 resize-none text-[13px] leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-ink-light mb-2">标签分类 <span className="uppercase tracking-widest opacity-60 ml-2 text-[10px]">Tags</span></label>
                <input 
                  type="text" 
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  placeholder="多个标签请用逗号分隔，例如：场景, 夜晚, 赛博朋克"
                  className="w-full bg-white border border-border-subtle px-4 py-3 text-ink focus:outline-none focus:border-ink transition-colors text-sm"
                />
              </div>
            </form>
          </div>

          <div className="p-5 md:p-6 border-t border-border-subtle bg-white flex justify-end gap-3 md:gap-4">
            <button 
              type="button" 
              onClick={onClose}
              className="text-xs text-ink-light hover:text-ink px-3 md:px-4 py-2 transition-colors flex items-center gap-2"
            >
              取消 <span className="uppercase tracking-widest opacity-40 text-[10px] hidden sm:inline">Cancel</span>
            </button>
            <button 
              type="submit" 
              form="prompt-form"
              disabled={isUploading}
              className="text-xs border border-ink bg-ink text-white hover:bg-transparent hover:text-ink px-4 md:px-6 py-2 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {initialData ? '保存修改' : '保存记录'} <span className="uppercase tracking-widest opacity-60 text-[10px] hidden sm:inline">{initialData ? 'Update' : 'Save'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
