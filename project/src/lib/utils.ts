import type { TaskPriority, TaskStatus } from '@/types';
export function formatDate(date: string | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
export function formatRelative(date: string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const m = Math.floor(diffMs / 60000), h = Math.floor(diffMs / 3600000), d = Math.floor(diffMs / 86400000);
  if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`; if (h < 24) return `${h}h ago`; if (d < 7) return `${d}d ago`;
  return formatDate(date);
}
export function isOverdue(dueDate: string | null, status: TaskStatus): boolean {
  if (!dueDate || status === 'completed') return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}
export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0].charAt(0).toUpperCase() : (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
const COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#14b8a6','#f97316','#6366f1'];
export function getAvatarColor(id: string): string {
  let hash = 0; for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}
export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string; border: string }> = {
  low: { label: 'Low', color: 'text-success-700', bg: 'bg-success-50', border: 'border-success-200' },
  medium: { label: 'Medium', color: 'text-primary-700', bg: 'bg-primary-50', border: 'border-primary-200' },
  high: { label: 'High', color: 'text-warning-700', bg: 'bg-warning-50', border: 'border-warning-200' },
  urgent: { label: 'Urgent', color: 'text-error-700', bg: 'bg-error-50', border: 'border-error-200' },
};
export const STATUS_CONFIG: Record<TaskStatus, { label: string; dot: string }> = {
  todo: { label: 'To Do', dot: 'bg-dark-400' }, in_progress: { label: 'In Progress', dot: 'bg-primary-500' }, completed: { label: 'Completed', dot: 'bg-success-500' },
};
export const PROJECT_COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#14b8a6','#f97316','#6366f1'];
