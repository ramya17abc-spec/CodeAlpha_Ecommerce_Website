import { useEffect } from 'react';
import { X } from 'lucide-react';
export default function Modal({ isOpen, onClose, title, children, size = 'md' }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
      window.addEventListener('keydown', handler);
      return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', handler); };
    }
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] overflow-y-auto">
      <div className="fixed inset-0 bg-dark-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} card p-6 animate-slide-up shadow-xl`}>
        {title && <div className="flex items-center justify-between mb-5"><h2 className="font-display text-lg font-bold text-dark-900">{title}</h2><button onClick={onClose} className="p-1.5 rounded-lg text-dark-400 hover:bg-dark-100 hover:text-dark-600 transition-all"><X className="w-5 h-5" /></button></div>}
        {children}
      </div>
    </div>
  );
}
