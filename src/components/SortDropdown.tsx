import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export type SortMode = 'manual' | 'tags' | 'imgCountDesc';

interface SortDropdownProps {
  value: SortMode;
  onChange: (value: SortMode) => void;
}

const SORT_OPTIONS: { label: string; value: SortMode }[] = [
  { label: '排: 手动', value: 'manual' },
  { label: '排: 标签', value: 'tags' },
  { label: '排: 多图', value: 'imgCountDesc' },
];

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const selectedOption = SORT_OPTIONS.find(opt => opt.value === value) || SORT_OPTIONS[0];

  return (
    <div className="relative flex h-full" ref={dropdownRef}>
      <button 
        type="button"
        onPointerDown={(e) => {
           e.stopPropagation();
           setIsOpen(!isOpen);
        }}
        className="flex h-[34px] w-[90px] sm:w-[100px] items-center justify-between gap-1 sm:gap-2 text-[10px] md:text-[11px] uppercase tracking-widest border border-border-medium bg-white px-2 md:px-3 text-ink hover:border-ink transition-colors whitespace-nowrap outline-none"
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-full min-w-[100px] bg-white border border-ink shadow-lg py-1 z-[100]">
          {SORT_OPTIONS.map(option => (
             <button
               key={option.value}
               onPointerDown={(e) => {
                 e.stopPropagation();
                 onChange(option.value);
                 setIsOpen(false);
               }}
               className={`w-full text-left px-3 py-2 text-[10px] md:text-[11px] uppercase tracking-widest transition-colors ${
                 value === option.value ? 'bg-ink text-white' : 'hover:bg-bg'
               }`}
             >
               {option.label}
             </button>
          ))}
        </div>
      )}
    </div>
  );
}
