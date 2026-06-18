import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, XCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ImportProgressModalProps {
  status: {
    visible: boolean;
    current: number;
    total: number;
    failed: { filename: string, reason: string }[];
  } | null;
  onClose: () => void;
}

export function ImportProgressModal({ status, onClose }: ImportProgressModalProps) {
  if (!status) return null;

  const isComplete = status.current === status.total || status.total === 0;
  const progress = status.total === 0 ? 0 : Math.round((status.current / status.total) * 100);
  const hasErrors = status.failed.length > 0;

  return (
    <AnimatePresence>
      {status.visible && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 bg-ink/40 backdrop-blur-sm z-[200] ${isComplete ? 'cursor-pointer' : ''}`}
            onPointerDown={isComplete ? onClose : undefined}
          />
          <div 
            className={`fixed inset-0 z-[210] flex items-center justify-center p-4 ${isComplete ? 'cursor-pointer pointer-events-none' : 'pointer-events-none'}`}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2rem] shadow-xl overflow-hidden border border-border-medium flex flex-col max-h-[80vh] pointer-events-auto cursor-auto"
              onPointerDown={e => e.stopPropagation()}
            >
              <div className="p-6 md:p-8 flex flex-col items-center">
                <div className="mb-4">
                  {isComplete ? (
                    hasErrors ? (
                      <AlertTriangle className="w-12 h-12 text-orange-500" />
                    ) : (
                      <CheckCircle2 className="w-12 h-12 text-green-500" />
                    )
                  ) : (
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                  )}
                </div>
                
                <h3 className="font-serif text-xl text-ink mb-2">
                  {isComplete ? "导入完成 / Import Complete" : "正在导入 / Importing..."}
                </h3>
                
                <p className="text-sm text-ink-light opacity-80 mb-6 font-mono">
                  {status.current} / {status.total}
                </p>

                {!isComplete && (
                   <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden mb-4">
                     <div 
                       className="bg-ink h-full transition-all duration-300 ease-out" 
                       style={{ width: `${progress}%` }} 
                     />
                   </div>
                )}

                {hasErrors && (
                  <div className="w-full mt-4 flex flex-col gap-2 relative">
                    <p className="text-xs uppercase tracking-widest text-[#E63946] font-medium text-left px-2">
                      未导入文件 / Failed Items ({status.failed.length})
                    </p>
                    <div className="w-full bg-stone-50 rounded-2xl border border-border-medium p-3 max-h-[40vh] overflow-y-auto">
                      {status.failed.map((err, i) => (
                        <div key={i} className="flex flex-col mb-2 last:mb-0 pb-2 last:pb-0 border-b last:border-b-0 border-border-medium">
                          <span className="text-xs text-ink truncate..." title={err.filename}>{err.filename}</span>
                          <span className="text-[10px] text-[#E63946] mt-0.5">{err.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isComplete && (
                  <button 
                    onClick={onClose}
                    className="w-full mt-6 py-3 px-4 rounded-full bg-ink text-white hover:bg-ink-light transition-colors uppercase tracking-widest text-[11px] font-medium"
                  >
                    关闭 / Close
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
