import React, { useState, useEffect } from 'react';
import { PromptItem } from '../types';
import { uploadBase64ToCloudinary } from '../lib/cloudinary';
import { savePrompts } from '../store/db';
import { Loader2, Cloud } from 'lucide-react';

export function MigrationBanner({ prompts, setPrompts }: { prompts: PromptItem[], setPrompts: any }) {
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState("");

  const needsMigration = prompts.some(p => 
    (p.imageUrl && p.imageUrl.startsWith('data:image')) || 
    (p.imageUrls && p.imageUrls.some(u => u.startsWith('data:image')))
  );

  if (!needsMigration) return null;

  const startMigration = async () => {
    setMigrating(true);
    setErrorMsg("");
    let migratedCount = 0;
    
    // We count how many prompts need migration
    const promptsToMigrate = prompts.filter(p => 
      (p.imageUrl && p.imageUrl.startsWith('data:image')) || 
      (p.imageUrls && p.imageUrls.some(u => u.startsWith('data:image')))
    );

    setProgress({ current: 0, total: promptsToMigrate.length });

    const newPrompts = [...prompts];
    let hasError = false;

    for (let i = 0; i < promptsToMigrate.length; i++) {
      const p = promptsToMigrate[i];
      const index = newPrompts.findIndex(item => item.id === p.id);
      
      const newImageUrls = [];
      const currentList = p.imageUrls || (p.imageUrl ? [p.imageUrl] : []);
      
      let lastErrorMessage = "";

      for (const b64 of currentList) {
        if (!b64.startsWith('data:image')) {
          newImageUrls.push(b64);
          continue;
        }
        try {
          const url = await uploadBase64ToCloudinary(b64);
          newImageUrls.push(url);
          // Sleep for 300ms to avoid hitting API rate limits instantly
          await new Promise(r => setTimeout(r, 300));
        } catch (err: any) {
          console.error("Migration failed for a base64 string", err);
          newImageUrls.push(b64); // keep it if fail
          hasError = true;
          lastErrorMessage = err.message || err.toString();
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

      // Incremental save every 20 items so we don't lose progress if it crashes
      if (migratedCount % 20 === 0) {
        setPrompts([...newPrompts]);
        await savePrompts([...newPrompts]);
      }
    }

    setPrompts([...newPrompts]);
    await savePrompts(newPrompts);
    setMigrating(false);
    
    if (hasError) {
      setErrorMsg(`上传存在失败: ${lastErrorMessage} (由于网络或速率限制，可刷新页面后点击继续)`);
    }
  };

  return (
    <div className="bg-amber-100 border-l-4 border-amber-500 p-4 m-4 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm gap-4">
      <div className="flex items-start gap-3">
        <Cloud className="text-amber-600 shrink-0 mt-1 sm:mt-0" />
        <div>
          <h3 className="text-sm font-bold text-amber-900">数据迁移提醒 / Cloud Migration Required</h3>
          <p className="text-xs text-amber-800 mt-1">您有 {prompts.filter(p => (p.imageUrl && p.imageUrl.startsWith('data:image')) || (p.imageUrls && p.imageUrls.some(u => u.startsWith('data:image')))).length} 个本地图片需要上传至云端，以保证同步和导出正常工作。</p>
          {errorMsg && <p className="text-xs text-red-600 font-bold mt-2">{errorMsg}</p>}
        </div>
      </div>
      <button 
        disabled={migrating}
        onClick={startMigration}
        className="bg-amber-600 text-white px-4 py-2 text-xs font-bold rounded shadow hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
      >
        {migrating ? <><Loader2 size={14} className="animate-spin" /> 上传中可以喝杯茶 ({progress.current}/{progress.total})</> : "开始一键上云"}
      </button>
    </div>
  );
}
