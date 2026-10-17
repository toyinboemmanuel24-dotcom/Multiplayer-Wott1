import React, { useEffect } from 'react';
import { CardShape } from '../types/wott';
import { SHAPE_CONFIG } from '../utils/wottDeck';
import { ShapeIcon } from './CardView';
import { Crown, X } from 'lucide-react';

interface WottShapePickerModalProps {
  isOpen: boolean;
  onSelectShape: (shape: CardShape) => void;
  onCancel: () => void;
}

export const WottShapePickerModal: React.FC<WottShapePickerModalProps> = ({
  isOpen,
  onSelectShape,
  onCancel,
}) => {
  // Allow Esc key to cancel
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const standardShapes: CardShape[] = ['circle', 'triangle', 'cross', 'square', 'star'];

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="relative bg-stone-900 border-2 border-amber-500 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl shadow-amber-500/20 text-stone-100">
        {/* Top-Right Cancel Option */}
        <button
          onClick={onCancel}
          aria-label="Cancel playing Wott 20"
          className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-800/80 hover:bg-red-500/20 border border-stone-700 hover:border-red-500/50 text-stone-300 hover:text-red-400 transition-all cursor-pointer text-xs font-bold active:scale-95 group shadow-md"
        >
          <span>Cancel</span>
          <X size={16} className="group-hover:rotate-90 transition-transform duration-200" />
        </button>

        <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-pink-500 text-stone-950 mb-3 shadow-lg">
          <Crown size={32} />
        </div>

        <h3 className="text-2xl font-black text-amber-300 tracking-tight">
          WOTT 20 WILDCARD!
        </h3>
        <p className="text-stone-300 text-sm mt-1 mb-6 pr-12 pl-12 sm:px-0">
          You hold the crown! <strong className="text-amber-400">Declare which shape</strong> all players must follow next:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {standardShapes.map((shape) => {
            const config = SHAPE_CONFIG[shape];
            return (
              <button
                key={shape}
                onClick={() => onSelectShape(shape)}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-stone-800/80 hover:bg-stone-800 border-2 border-stone-700 hover:border-amber-400 transition-all cursor-pointer active:scale-95 group text-left"
              >
                <div
                  className={`p-2 rounded-xl text-white shadow-md flex items-center justify-center ${config.bgClass}`}
                >
                  <ShapeIcon shape={shape} size={24} />
                </div>
                <div>
                  <div className="font-black text-base text-stone-100 group-hover:text-amber-300 transition-colors">
                    {config.name}
                  </div>
                  <div className="text-[11px] text-stone-400">Follow with {config.name}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom Cancel & Keep Card in Hand Option */}
        <button
          onClick={onCancel}
          className="w-full py-2.5 px-4 rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 border border-transparent hover:border-stone-700 text-xs font-medium transition-colors cursor-pointer"
        >
          Never mind, keep card 20 in hand
        </button>
      </div>
    </div>
  );
};
