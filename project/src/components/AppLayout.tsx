import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Notification } from '@/types';
import { formatRelative } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import { CheckSquare, LayoutDashboard, FolderKanban, Bell, LogOut, Menu, X, Search, User as UserIcon, ChevronDown } from 'lucide-react';

export type View = 'dashboard' | 'projects' | 'notifications' | 'profile';

export default function AppLayout({ currentView, onViewChange, children, searchQuery, onSearchChange }: {
  currentView: View; onViewChange: (v: View) => void; children: React.ReactNode; searchQuery: string; onSearchChange: (q: string) => void;
}) {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const navItems: { key: View; label: string; icon: typeof LayoutDashboard }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, { key: 'projects', label: 'Projects', icon: FolderKanban },
    { key: 'notifications', label: 'Notifications', icon: Bell }, { key: 'profile', label: 'Profile', icon: UserIcon },
  ];

  useEffect(() => {
    async function fetchNotifs() {
      if (!profile) return;
      const { data } = await supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(20);
      if (data) setNotifications(data as Notification[]);
    }
    if (profile) {
      fetchNotifs();
      const channel = supabase.channel('notif-rt').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, () => fetchNotifs()).subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [profile]);

  useEffect(() => { setUnreadCount(notifications.filter(n => !n.read).length); }, [notifications]);

  async function markAllRead() {
    if (!profile) return;
    const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false).eq('user_id', profile.id);
    if (!error) setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  const navBtn = (key: View) => `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full ${currentView === key ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/30' : 'text-dark-500 hover:bg-dark-100 hover:text-dark-800'}`;

  return (
    <div className="min-h-screen bg-dark-50 flex">
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-dark-900/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-dark-200 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm shadow-primary-500/30"><CheckSquare className="w-5 h-5 text-white" /></div>
            <div><h1 className="font-display font-bold text-dark-900 text-lg leading-none">TaskFlow</h1><p className="text-[10px] text-dark-400 mt-0.5">Smart Workspace</p></div>
          </div>
          <button className="lg:hidden p-1 text-dark-400" onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 px-3 space-y-1 pt-2">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => { onViewChange(key); setSidebarOpen(false); }} className={navBtn(key)}>
              <Icon className="w-4 h-4 shrink-0" strokeWidth={2} /><span>{label}</span>
              {key === 'notifications' && unreadCount > 0 && <span className="ml-auto bg-error-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{unreadCount}</span>}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-dark-200">
          <div className="flex items-center gap-3 p-2 rounded-xl">
            <Avatar profile={profile} size="sm" />
            <div className="flex-1 min-w-0"><p className="font-medium text-sm text-dark-800 truncate">{profile?.display_name ?? 'User'}</p><p className="text-xs text-dark-400 truncate">{profile?.role === 'admin' ? 'Admin' : 'Team Member'}</p></div>
            <button onClick={signOut} className="p-2 rounded-lg text-dark-400 hover:bg-error-50 hover:text-error-600 transition-all" title="Sign out"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-dark-200 px-4 lg:px-6 py-3 flex items-center gap-3">
          <button className="lg:hidden p-2 text-dark-600" onClick={() => setSidebarOpen(true)}><Menu className="w-5 h-5" /></button>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input type="text" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search projects, tasks..." className="w-full pl-10 pr-4 py-2 rounded-xl bg-dark-50 border border-dark-200 text-sm text-dark-800 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all" />
          </div>
          <div className="relative">
            <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2.5 rounded-xl text-dark-600 hover:bg-dark-100 transition-all"><Bell className="w-5 h-5" />{unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-error-500 rounded-full ring-2 ring-white animate-pulse-soft" />}</button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 mt-2 w-80 card shadow-xl z-20 max-h-96 overflow-y-auto animate-fade-in">
                  <div className="flex items-center justify-between p-4 border-b border-dark-200"><h3 className="font-display font-bold text-dark-900 text-sm">Notifications</h3>{unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-primary-600 hover:text-primary-700 font-medium">Mark all read</button>}</div>
                  {notifications.length === 0 ? <div className="p-8 text-center text-dark-400 text-sm"><Bell className="w-8 h-8 mx-auto mb-2 text-dark-300" />No notifications yet</div>
                    : notifications.slice(0, 10).map(n => <div key={n.id} className={`flex gap-3 p-3.5 border-b border-dark-100 last:border-0 hover:bg-dark-50 transition-colors ${!n.read ? 'bg-primary-50/40' : ''}`}><div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.read ? 'bg-primary-500' : 'bg-dark-300'}`} /><div className="flex-1 min-w-0"><p className="text-sm text-dark-800">{n.message}</p><p className="text-xs text-dark-400 mt-0.5">{formatRelative(n.created_at)}</p></div></div>)}
                </div>
              </>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setProfileMenuOpen(!profileMenuOpen)} className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-dark-100 transition-all"><Avatar profile={profile} size="sm" /><ChevronDown className="w-4 h-4 text-dark-400 hidden sm:block" /></button>
            {profileMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 card shadow-xl z-20 py-1.5 animate-fade-in">
                  <button onClick={() => { onViewChange('profile'); setProfileMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-dark-700 hover:bg-dark-50"><UserIcon className="w-4 h-4" /> My Profile</button>
                  <button onClick={() => { onViewChange('dashboard'); setProfileMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-dark-700 hover:bg-dark-50"><LayoutDashboard className="w-4 h-4" /> Dashboard</button>
                  <hr className="my-1.5 border-dark-100" />
                  <button onClick={signOut} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-error-600 hover:bg-error-50"><LogOut className="w-4 h-4" /> Sign Out</button>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
