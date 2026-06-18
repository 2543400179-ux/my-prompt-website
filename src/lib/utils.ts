import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 解决本地 HTTP 环境下复制失败的问题
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn("Clipboard API failed, falling back", err);
    }
  }
  
  // 降级方案 (Fallback for HTTP/Local)
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    // 隐藏 textarea
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    textArea.remove();
    return successful;
  } catch (err) {
    console.error("Fallback copy failed", err);
    return false;
  }
}

// 解决本地 HTTP 环境下 crypto.randomUUID 无法使用导致保存失败、卡死的问题
export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // 忽略部分浏览器实现问题
    }
  }
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

// 压缩图片为 Base64，保存原始尺寸，转为 JPG 并设置质量为 0.82
export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const width = img.width;
        const height = img.height;
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // 填充白色背景以防透明PNG转JPG出现黑底
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          // 转为JPG格式，画质0.82，不缩小尺寸
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
}
