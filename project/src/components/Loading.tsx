import { Loader2 } from 'lucide-react';
export function Loading({ text = 'Loading...' }: { text?: string }) {
  return <div className="flex flex-col items-center justify-center py-16 animate-fade-in"><Loader2 className="w-7 h-7 text-primary-500 animate-spin mb-3" /><p className="text-dark-500 text-sm">{text}</p></div>;
}
export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">{icon && <div className="mb-4 text-dark-300">{icon}</div>}<h3 className="font-display font-semibold text-dark-700 text-lg mb-1">{title}</h3>{description && <p className="text-dark-500 text-sm max-w-sm">{description}</p>}{action && <div className="mt-5">{action}</div>}</div>;
}
