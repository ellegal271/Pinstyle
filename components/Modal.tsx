import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface shrink-0">
          <h2 className="text-lg font-bold text-text">{title}</h2>
          <button 
            onClick={onClose} 
            className="p-2 text-muted hover:text-text hover:bg-card rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>
        
        <div className="overflow-y-auto p-6 flex-1">
          {children}
        </div>

        {footer && (
          <footer className="px-6 py-4 border-t border-border bg-surface shrink-0 flex justify-end gap-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};