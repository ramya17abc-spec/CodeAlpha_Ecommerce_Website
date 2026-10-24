import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/Avatar';
import { Loading } from '@/components/Loading';
import { formatDate } from '@/lib/utils';
import { Pencil, Save, Loader2, Calendar, User as UserIcon, CheckCircle2 } from 'lucide-react';

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [saving, setSaving] = useState(false);

  if (!profile) return <Loading />;

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ display_name: displayName.trim(), bio: bio.trim(), avatar_url: avatarUrl.trim() || null, updated_at: new Date().toISOString() }).eq('id', profile!.id);
    if (!error) { await refreshProfile(); setEditing(false); }
    setSaving(false);
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div><h1 className="font-display text-2xl font-bold text-dark-900">My Profile</h1><p className="text-dark-500 text-sm mt-1">Manage your personal information</p></div>
      <div className="card p-6">
        <div className="flex items-start gap-5">
          <Avatar profile={profile} size="lg" />
          <div className="flex-1">
            {editing ? (
              <div className="space-y-4">
                <div><label className="label-text">Display Name</label><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input-field" /></div>
                <div><label className="label-text">Avatar URL</label><input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." className="input-field" /></div>
                <div><label className="label-text">Bio</label><textarea value={bio} onChange={(e) => setBio(e.target.value)} className="input-field resize-none" rows={3} placeholder="Tell your team about yourself..." /></div>
                <div className="flex gap-2"><button onClick={() => { setEditing(false); setDisplayName(profile!.display_name); setBio(profile!.bio); setAvatarUrl(profile!.avatar_url ?? ''); }} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={saving || displayName.trim().length < 2} className="btn-primary">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}</button></div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3"><h2 className="font-display text-xl font-bold text-dark-900">{profile.display_name}</h2><span className={`px-2 py-0.5 rounded-md text-xs font-medium ${profile.role === 'admin' ? 'bg-primary-100 text-primary-700' : 'bg-dark-100 text-dark-600'}`}>{profile.role}</span></div>
                <p className="text-dark-500 text-sm mt-1">{bio || 'No bio yet'}</p>
                <button onClick={() => setEditing(true)} className="btn-secondary mt-4"><Pencil className="w-4 h-4" /> Edit Profile</button>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="card p-6">
        <h3 className="font-display font-bold text-dark-900 text-sm mb-4">Account Information</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-50"><UserIcon className="w-4 h-4 text-dark-400" /><div><p className="text-[10px] text-dark-400 uppercase font-medium">User ID</p><p className="text-sm text-dark-700 mt-0.5 font-mono truncate">{profile.id}</p></div></div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-50"><Calendar className="w-4 h-4 text-dark-400" /><div><p className="text-[10px] text-dark-400 uppercase font-medium">Member Since</p><p className="text-sm text-dark-700 mt-0.5">{formatDate(profile.created_at)}</p></div></div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-50"><CheckCircle2 className="w-4 h-4 text-success-500" /><div><p className="text-[10px] text-dark-400 uppercase font-medium">Status</p><p className="text-sm text-success-700 mt-0.5">Active Account</p></div></div>
        </div>
      </div>
    </div>
  );
}
