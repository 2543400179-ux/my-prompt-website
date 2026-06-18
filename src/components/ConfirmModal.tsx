import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Delete / 确认", 
  cancelText = "Cancel / 取消" 
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[200]"
            onClick={onCancel}
          />
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[2rem] shadow-xl overflow-hidden pointer-events-auto border border-border-medium"
            >
              <div className="p-6 md:p-8 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-red-50 text-[#E63946] flex items-center justify-center mb-4">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="font-serif text-xl text-ink mb-2">{title}</h3>
                <div className="text-sm text-ink-light opacity-80 mb-8">{message}</div>
                
                <div className="flex w-full gap-3">
                  <button 
                    onClick={onCancel}
                    className="flex-1 py-3 px-4 rounded-full border border-border-medium text-ink hover:bg-stone-50 transition-colors uppercase tracking-widest text-[11px] font-medium"
                  >
                    {cancelText}
                  </button>
                  <button 
                    onClick={() => {
                      onConfirm();
                      onCancel();
                    }}
                    className="flex-1 py-3 px-4 rounded-full bg-[#E63946] text-white hover:bg-red-600 transition-colors uppercase tracking-widest text-[11px] font-medium"
                  >
                    {confirmText}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
