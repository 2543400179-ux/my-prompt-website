import { cn } from '../lib/utils';
import { Category } from '../types';

interface SidebarProps {
  currentCategory: Category;
  onSelect: (cat: Category) => void;
}

const NAV_ITEMS: { id: Category; label: string; group: string }[] = [
  { id: 'main', label: '画风 / Style', group: 'Collection' },
  { id: 'clothing', label: '服装 / Clothing', group: 'Collection' },
  { id: 'characters', label: '角色库 / Characters', group: 'Collection' },
  { id: 'composition', label: '构图 / Composition', group: 'Library' },
  { id: 'actions', label: '动作 / Action', group: 'Library' },
  { id: 'negative', label: '负面 / Negative', group: 'Library' },
  { id: 'others', label: '特定 / Others', group: 'Library' },
];

export function Sidebar({ currentCategory, onSelect }: SidebarProps) {
  const collectionItems = NAV_ITEMS.filter(i => i.group === 'Collection');
  const libraryItems = NAV_ITEMS.filter(i => i.group === 'Library');

  return (
    <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border-subtle flex flex-col md:p-8 justify-between h-auto md:h-full bg-bg shrink-0">
      <div className="p-5 md:p-0 flex items-center justify-between md:block">
        <h1 className="font-serif text-2xl md:text-3xl mb-0 md:mb-12 tracking-tight text-ink leading-tight">
          NAI<span className="hidden md:inline"><br/></span><span className="md:hidden"> </span>MUSE.
        </h1>
        
        <div className="flex md:hidden items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-[10px] uppercase tracking-widest text-ink-lighter">Connected</span>
        </div>
      </div>

      <nav className="flex md:block overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border-t md:border-transparent border-border-subtle md:space-y-6 px-5 md:px-0 py-3 md:py-0">
        <div className="flex md:block space-x-6 md:space-x-0 md:space-y-3 shrink-0">
          <p className="hidden md:block text-[10px] uppercase tracking-widest text-ink-lighter mb-4">Collection</p>
          {collectionItems.map((item) => {
            const isActive = currentCategory === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={cn(
                  "block text-sm font-serif w-max md:w-fit text-left transition-all border-b md:py-0.5",
                  isActive ? "border-ink italic text-ink" : "border-transparent text-ink-light hover:text-ink"
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        
        <div className="flex md:block space-x-6 md:space-x-0 md:space-y-3 shrink-0 ml-6 md:ml-0 md:pt-4">
          <p className="hidden md:block text-[10px] uppercase tracking-widest text-ink-lighter mb-4">Library</p>
          {libraryItems.map((item) => {
            const isActive = currentCategory === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={cn(
                  "block text-sm font-serif w-max md:w-fit text-left transition-all border-b md:py-0.5",
                  isActive ? "border-ink italic text-ink" : "border-transparent text-ink-light hover:text-ink"
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="hidden md:flex pt-8 border-t border-border-subtle items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
        <span className="text-[10px] uppercase tracking-widest text-ink-lighter">Database Connected</span>
      </div>
    </aside>
  );
}
