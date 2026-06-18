import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { FolderItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { generateId } from '../lib/utils';
import { Category } from '../types';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (folder: FolderItem) => void;
  category: Category;
  initialData?: FolderItem | null;
}

export function FolderModal({ isOpen, onClose, onSave, category, initialData }: FolderModalProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (initialData && isOpen) {
      setName(initialData.name);
    } else if (isOpen) {
      setName('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) return alert("请输入大类/文件夹名称 / Enter folder name");
    
    if (initialData) {
      onSave({ ...initialData, name: name.trim() });
    } else {
      onSave({
        id: generateId(),
        categoryId: category,
        name: name.trim(),
        createdAt: Date.now()
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white shadow-2xl z-[70] flex flex-col max-h-[90vh] rounded-sm border border-border-subtle"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg/50 shrink-0">
              <h2 className="font-serif text-lg text-ink">
                {initialData ? 'RENAME FOLDER' : 'NEW FOLDER'}
              </h2>
              <button onClick={onClose} className="p-1 hover:bg-stone-200 rounded-full transition-colors opacity-60 hover:opacity-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-[11px] uppercase tracking-widest text-ink-light mb-2 font-medium">Folder Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-50 border border-border-medium focus:border-ink focus:outline-none transition-colors text-ink text-sm rounded-sm"
                  placeholder="e.g. Reference, Wips, 2024..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={onClose}
                  className="px-6 py-2.5 text-[11px] uppercase tracking-widest font-medium text-ink hover:bg-stone-100 transition-colors rounded-sm"
                >
                  取消 / Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="px-6 py-2.5 bg-ink text-white text-[11px] uppercase tracking-widest font-medium hover:bg-ink-light transition-colors rounded-sm"
                >
                  保存 / Save
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
