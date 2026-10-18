import React, { useState } from 'react';
import { event } from '@/lib/gtag';
import { 
  SlidersHorizontal, 
  X, 
  MapPin, 
  Globe, 
  Users, 
  Heart, 
  Compass, 
  Sun,
  Clock
} from 'lucide-react';

export interface FilterState {
  styles: string[]; // ['domestic', 'international', 'family', 'honeymoon', 'adventure', 'spiritual']
  duration: string | null; // '1-3' | '4-5' | '6-7' | '8+' | null
}

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters: FilterState;
}

const STYLE_OPTIONS = [
  { id: 'domestic', label: 'Domestic', icon: MapPin },
  { id: 'international', label: 'International', icon: Globe },
  { id: 'family', label: 'Family Tour', icon: Users },
  { id: 'honeymoon', label: 'Honeymoon', icon: Heart },
  { id: 'adventure', label: 'Adventure', icon: Compass },
  { id: 'spiritual', label: 'Spiritual', icon: Sun },
];

const DURATION_OPTIONS = [
  { id: '1-3', label: '1 – 3 Days' },
  { id: '4-5', label: '4 – 5 Days' },
  { id: '6-7', label: '6 – 7 Days' },
  { id: '8+', label: '8+ Days' },
];

export default function FilterSidebar({ 
  isOpen, 
  onClose, 
  onApply, 
  initialFilters,
}: FilterSidebarProps) {
  const [selectedStyles, setSelectedStyles] = useState<string[]>(initialFilters?.styles || []);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(initialFilters?.duration || null);

  // Sync state if initialFilters change externally
  React.useEffect(() => {
    setSelectedStyles(initialFilters?.styles || []);
    setSelectedDuration(initialFilters?.duration || null);
  }, [initialFilters]);

  // Prevent background scrolling when filter sidebar is open on mobile
  React.useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleStyle = (styleId: string) => {
    setSelectedStyles(prev => 
      prev.includes(styleId) 
        ? prev.filter(s => s !== styleId) 
        : [...prev, styleId]
    );
  };

  const selectDuration = (durId: string) => {
    setSelectedDuration(prev => (prev === durId ? null : durId));
  };

  const handleResetAll = () => {
    setSelectedStyles([]);
    setSelectedDuration(null);
    onApply({ styles: [], duration: null });
    onClose();
  };

  const handleApplyAll = () => {
    event({
      action: 'apply_filters',
      category: 'search_filter',
      label: `styles:${selectedStyles.join(',') || 'all'},duration:${selectedDuration || 'all'}`,
    });
    onApply({ styles: selectedStyles, duration: selectedDuration });
    onClose();
  };

  return (
    <>
      {/* Mobile Dark Backdrop Overlay */}
      <div 
        className="sm:hidden fixed inset-0 z-[140] bg-black/60 backdrop-blur-xs transition-opacity duration-200 touch-none"
        onClick={onClose}
      />
      
      {/* Desktop Transparent Click-Outside Overlay (No blur to keep background crisp) */}
      <div 
        className="hidden sm:block fixed inset-0 z-[100]" 
        onClick={onClose}
      />

      {/* =========================================================
          MOBILE VIEW: Clean Bottom Sheet
          ========================================================= */}
      <div 
        className="sm:hidden fixed inset-x-0 bottom-0 z-[140] bg-white rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-200 border-t border-slate-200 flex flex-col max-h-[85vh]"
      >
        {/* Drag Pill */}
        <div className="w-full flex items-center justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-bold text-slate-900">Filters</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-md hover:bg-slate-100 text-slate-500 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options */}
        <div className="p-4 space-y-4 overflow-y-auto overscroll-contain touch-pan-y flex-1">
          {/* Section 1: Travel Style (Multi-select) */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Travel Style
            </div>
            <div className="grid grid-cols-2 gap-2">
              {STYLE_OPTIONS.map((opt) => {
                const isSelected = selectedStyles.includes(opt.id);
                const IconComponent = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleStyle(opt.id)}
                    className={`h-10 px-3 flex items-center justify-start gap-2.5 border text-xs transition-all duration-150 cursor-pointer rounded-lg ${
                      isSelected
                        ? 'bg-orange-50 border-orange-500 text-orange-600 font-bold ring-1 ring-orange-400/40 shadow-xs'
                        : 'bg-slate-50/80 border-slate-200/90 text-slate-700 font-medium hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 shrink-0 ${isSelected ? 'text-orange-600' : 'text-slate-500'}`} />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Duration in Days (Single-select) */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Duration (in Days)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DURATION_OPTIONS.map((opt) => {
                const isSelected = selectedDuration === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => selectDuration(opt.id)}
                    className={`h-10 px-3 flex items-center justify-start gap-2.5 border text-xs transition-all duration-150 cursor-pointer rounded-lg ${
                      isSelected
                        ? 'bg-orange-50 border-orange-500 text-orange-600 font-bold ring-1 ring-orange-400/40 shadow-xs'
                        : 'bg-slate-50/80 border-slate-200/90 text-slate-700 font-medium hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <Clock className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-orange-600' : 'text-slate-400'}`} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
          <button 
            onClick={handleResetAll}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors px-2 py-1.5 cursor-pointer"
          >
            Clear all
          </button>
          <button 
            onClick={handleApplyAll}
            className="flex-1 h-10 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg shadow-sm shadow-orange-500/25 transition-all flex items-center justify-center cursor-pointer active:scale-98"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* =========================================================
          DESKTOP / LAPTOP VIEW: Compact, Sleek Popover
          ========================================================= */}
      <div 
        className="hidden sm:flex absolute right-0 top-full mt-2 w-[340px] bg-white z-[210] shadow-[0_12px_36px_-6px_rgba(0,0,0,0.18)] flex-col rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-bold text-slate-900">Filters</span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close filters"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4">
          {/* Section 1: Travel Style (Multi-Select) */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Travel Style
            </div>

            <div className="grid grid-cols-2 gap-2">
              {STYLE_OPTIONS.map((opt) => {
                const isSelected = selectedStyles.includes(opt.id);
                const IconComponent = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleStyle(opt.id)}
                    className={`h-9 px-2.5 flex items-center justify-start gap-2 border text-xs transition-all duration-150 cursor-pointer rounded-lg ${
                      isSelected
                        ? 'bg-orange-50 border-orange-500 text-orange-600 font-bold ring-1 ring-orange-400/40 shadow-xs'
                        : 'bg-slate-50/70 border-slate-200 text-slate-700 font-medium hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <IconComponent className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-orange-600' : 'text-slate-500'}`} />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-slate-100 w-full" />

          {/* Section 2: Duration in Days (Single-Select) */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Duration (in Days)
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DURATION_OPTIONS.map((opt) => {
                const isSelected = selectedDuration === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => selectDuration(opt.id)}
                    className={`h-9 px-2.5 flex items-center justify-start gap-2 border text-xs transition-all duration-150 cursor-pointer rounded-lg ${
                      isSelected
                        ? 'bg-orange-50 border-orange-500 text-orange-600 font-bold ring-1 ring-orange-400/40 shadow-xs'
                        : 'bg-slate-50/70 border-slate-200 text-slate-700 font-medium hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <Clock className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-orange-600' : 'text-slate-400'}`} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
          <button 
            onClick={handleResetAll}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors px-1 py-1 cursor-pointer"
          >
            Clear all
          </button>
          <button 
            onClick={handleApplyAll}
            className="flex-1 h-9 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg shadow-sm shadow-orange-500/25 transition-all flex items-center justify-center cursor-pointer active:scale-98"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}
