import React, { useState, useEffect } from 'react';
import { PromptItem } from '../types';
import { uploadBase64ToCloudinary } from '../lib/cloudinary';
import { savePrompts } from '../store/db';
import { Loader2, Cloud } from 'lucide-react';

export function MigrationBanner({ prompts, setPrompts }: { prompts: PromptItem[], setPrompts: any }) {
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const needsMigration = prompts.some(p => 
    (p.imageUrl && p.imageUrl.startsWith('data:image')) || 
    (p.imageUrls && p.imageUrls.some(u => u.startsWith('data:image')))
  );

  if (!needsMigration) return null;

  const startMigration = async () => {
    setMigrating(true);
    let migratedCount = 0;
    
    // We count how many prompts need migration
    const promptsToMigrate = prompts.filter(p => 
      (p.imageUrl && p.imageUrl.startsWith('data:image')) || 
      (p.imageUrls && p.imageUrls.some(u => u.startsWith('data:image')))
    );

    setProgress({ current: 0, total: promptsToMigrate.length });

    const newPrompts = [...prompts];

    for (let i = 0; i < promptsToMigrate.length; i++) {
      const p = promptsToMigrate[i];
      const index = newPrompts.findIndex(item => item.id === p.id);
      
      const newImageUrls = [];
      const currentList = p.imageUrls || (p.imageUrl ? [p.imageUrl] : []);
      
      for (const b64 of currentList) {
        try {
          const url = await uploadBase64ToCloudinary(b64);
          newImageUrls.push(url);
        } catch (err) {
          console.error("Migration failed for a base64 string", err);
          newImageUrls.push(b64); // keep it if fail
        }
      }
      
      if (newImageUrls.length > 0) {
        newPrompts[index] = {
          ...p,
          imageUrl: newImageUrls[0],
          imageUrls: newImageUrls,
          // Remove legacy property
          _imageFiles: undefined,
          _hasImages: undefined
        } as any;
      }
      
      migratedCount++;
      setProgress({ current: migratedCount, total: promptsToMigrate.length });
    }

    setPrompts(newPrompts);
    await savePrompts(newPrompts);
    setMigrating(false);
  };

  return (
    <div className="bg-amber-100 border-l-4 border-amber-500 p-4 m-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <Cloud className="text-amber-600" />
        <div>
          <h3 className="text-sm font-bold text-amber-900">数据迁移提醒 / Cloud Migration Required</h3>
          <p className="text-xs text-amber-800 mt-1">您有 {prompts.filter(p => (p.imageUrl && p.imageUrl.startsWith('data:image')) || (p.imageUrls && p.imageUrls.some(u => u.startsWith('data:image')))).length} 个本地图片需要上传至云端，以保证同步和导出正常工作。</p>
        </div>
      </div>
      <button 
        disabled={migrating}
        onClick={startMigration}
        className="bg-amber-600 text-white px-4 py-2 text-xs font-bold rounded shadow hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
      >
        {migrating ? <><Loader2 size={14} className="animate-spin" /> 上传中可以喝杯茶 ({progress.current}/{progress.total})</> : "开始一键上云"}
      </button>
    </div>
  );
}
