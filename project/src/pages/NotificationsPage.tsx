import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Notification } from '@/types';
import { formatRelative } from '@/lib/utils';
import { Loading, EmptyState } from '@/components/Loading';
import { Bell, Check, Trash2 } from 'lucide-react';

export default function NotificationsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      const { data } = await supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false });
      setNotifications(data as Notification[] ?? []);
      setLoading(false);
    }
    load();
    if (profile) {
      const ch = supabase.channel('notif-page').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, () => load()).subscribe();
      return () => { supabase.removeChannel(ch); };
    }
  }, [profile]);

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  }

  async function markAllRead() {
    if (!profile) return;
    await supabase.from('notifications').update({ read: true }).eq('read', false).eq('user_id', profile.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  async function deleteNotif(id: string) {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  if (loading) return <Loading text="Loading notifications..." />;
  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-2xl font-bold text-dark-900">Notifications</h1><p className="text-dark-500 text-sm mt-1">{unread} unread of {notifications.length} total</p></div>
        {unread > 0 && <button onClick={markAllRead} className="btn-secondary"><Check className="w-4 h-4" /> Mark all read</button>}
      </div>
      {notifications.length === 0 ? (
        <EmptyState icon={<Bell className="w-12 h-12 mx-auto" />} title="No notifications" description="You'll see updates about task assignments, comments, and project activity here" />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id} className={`card p-4 flex items-start gap-3 hover:shadow-md transition-all ${!n.read ? 'border-primary-200 bg-primary-50/30' : ''}`}>
              <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!n.read ? 'bg-primary-500' : 'bg-dark-300'}`} />
              <div className="flex-1 min-w-0"><p className="text-sm text-dark-800">{n.message}</p><p className="text-xs text-dark-400 mt-1">{formatRelative(n.created_at)}</p></div>
              <div className="flex items-center gap-1 shrink-0">
                {!n.read && <button onClick={() => markRead(n.id)} className="p-1.5 rounded-lg text-dark-300 hover:bg-success-50 hover:text-success-600 transition-all" title="Mark read"><Check className="w-4 h-4" /></button>}
                <button onClick={() => deleteNotif(n.id)} className="p-1.5 rounded-lg text-dark-300 hover:bg-error-50 hover:text-error-500 transition-all" title="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
