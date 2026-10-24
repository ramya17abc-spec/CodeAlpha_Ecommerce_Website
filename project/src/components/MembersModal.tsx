import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Project, ProjectMember, Profile } from '@/types';
import { Avatar } from '@/components/Avatar';
import Modal from '@/components/Modal';
import { UserPlus, Trash2, Search, Loader2, Crown, Shield, User as UserIcon } from 'lucide-react';

export default function MembersModal({ project, members, onClose, onUpdated }: { project: Project; members: ProjectMember[]; onClose: () => void; onUpdated: () => void }) {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const memberUserIds = members.map(m => m.user_id);

  useEffect(() => {
    if (search.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    supabase.from('profiles').select('*').ilike('display_name', `%${search.trim()}%`).limit(10).then(({ data }) => {
      setSearchResults((data as Profile[] ?? []).filter(p => !memberUserIds.includes(p.id))); setSearching(false);
    });
  }, [search]);

  async function addMember(userId: string) {
    setAdding(userId);
    await supabase.from('project_members').insert({ project_id: project.id, user_id: userId, role: 'member' });
    await supabase.from('notifications').insert({ user_id: userId, project_id: project.id, type: 'member_added', message: `${profile?.display_name} added you to "${project.name}"` });
    await supabase.from('activity_log').insert({ project_id: project.id, user_id: profile!.id, action: 'member_added', entity_type: 'project', description: 'added a new member' });
    setAdding(null); onUpdated(); setSearch(''); setSearchResults([]);
  }

  async function removeMember(member: ProjectMember) {
    if (member.role === 'owner') return;
    if (!confirm(`Remove ${member.profile?.display_name} from this project?`)) return;
    await supabase.from('project_members').delete().eq('id', member.id);
    onUpdated();
  }

  const roleIcon = (role: string) => role === 'owner' ? <Crown className="w-3.5 h-3.5 text-warning-500" /> : role === 'admin' ? <Shield className="w-3.5 h-3.5 text-primary-500" /> : <UserIcon className="w-3.5 h-3.5 text-dark-400" />;

  return (
    <Modal isOpen onClose={onClose} title="Manage Members" size="md">
      <div className="space-y-4">
        <div><div className="relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users by name..." className="input-field pl-10" /></div>
          {searching && <p className="text-xs text-dark-400 mt-2">Searching...</p>}
          {searchResults.length > 0 && <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">{searchResults.map(u => <button key={u.id} onClick={() => addMember(u.id)} disabled={adding === u.id} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-primary-50 transition-colors text-left"><Avatar profile={u} size="sm" /><div className="flex-1 min-w-0"><p className="text-sm font-medium text-dark-800 truncate">{u.display_name}</p></div>{adding === u.id ? <Loader2 className="w-4 h-4 animate-spin text-primary-500" /> : <UserPlus className="w-4 h-4 text-primary-500" />}</button>)}</div>}
          {search.trim().length >= 2 && !searching && searchResults.length === 0 && <p className="text-xs text-dark-400 mt-2">No users found. They need to create an account first.</p>}
        </div>
        <div className="border-t border-dark-200 pt-4">
          <h3 className="font-display font-semibold text-dark-800 text-sm mb-3">Team Members ({members.length})</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">{members.map(m => <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-dark-50"><Avatar profile={m.profile} size="sm" /><div className="flex-1 min-w-0"><p className="text-sm font-medium text-dark-800 truncate">{m.profile?.display_name ?? 'Unknown'}</p><div className="flex items-center gap-1.5 mt-0.5">{roleIcon(m.role)}<span className="text-xs text-dark-400 capitalize">{m.role}</span>{m.user_id === profile?.id && <span className="text-xs text-primary-500 font-medium">(you)</span>}</div></div>{m.role !== 'owner' && <button onClick={() => removeMember(m)} className="p-1.5 rounded-lg text-dark-300 hover:bg-error-50 hover:text-error-500 transition-all"><Trash2 className="w-4 h-4" /></button>}</div>)}</div>
        </div>
      </div>
    </Modal>
  );
}
