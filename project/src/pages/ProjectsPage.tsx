import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Project, ProjectMember } from '@/types';
import { PROJECT_COLORS } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import Modal from '@/components/Modal';
import { Loading, EmptyState } from '@/components/Loading';
import { Plus, FolderKanban, MoreVertical, Trash2, Pencil, Users, ArrowRight, Loader2 } from 'lucide-react';

export default function ProjectsPage({ searchQuery, onOpenProject }: { searchQuery: string; onOpenProject: (p: Project) => void }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<(Project & { members: ProjectMember[]; taskCount: number; completedCount: number })[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  async function loadProjects() {
    if (!profile) return;
    const { data: memberData } = await supabase.from('project_members').select('project_id').eq('user_id', profile.id);
    const projectIds = (memberData ?? []).map(m => m.project_id);
    if (projectIds.length === 0) { setProjects([]); setLoading(false); return; }
    const { data: projData } = await supabase.from('projects').select('*').in('id', projectIds).order('updated_at', { ascending: false });
    const { data: membersData } = await supabase.from('project_members').select('*, profile:profiles(*)').in('project_id', projectIds);
    const { data: taskData } = await supabase.from('tasks').select('id, project_id, status').in('project_id', projectIds);
    setProjects(((projData as Project[]) ?? []).map(p => { const members = (membersData as ProjectMember[] ?? []).filter(m => m.project_id === p.id); const tasks = (taskData ?? []).filter(t => t.project_id === p.id); return { ...p, members, taskCount: tasks.length, completedCount: tasks.filter(t => t.status === 'completed').length }; }));
    setLoading(false);
  }

  useEffect(() => { loadProjects(); }, [profile]);

  async function handleDelete(project: Project) {
    if (!confirm(`Delete "${project.name}"? All tasks and comments will be lost.`)) return;
    await supabase.from('projects').delete().eq('id', project.id);
    setMenuOpen(null); loadProjects();
  }

  const filtered = projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase()));
  if (loading) return <Loading text="Loading projects..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between"><div><h1 className="font-display text-2xl font-bold text-dark-900">Projects</h1><p className="text-dark-500 text-sm mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p></div><button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Project</button></div>
      {filtered.length === 0 ? <EmptyState icon={<FolderKanban className="w-12 h-12 mx-auto" />} title={searchQuery ? 'No projects found' : 'No projects yet'} description={searchQuery ? 'Try a different search term' : 'Create your first project to start collaborating with your team'} action={!searchQuery ? <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4" /> Create Project</button> : undefined} />
      : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map((p, i) => { const pct = p.taskCount > 0 ? Math.round((p.completedCount / p.taskCount) * 100) : 0; return (
        <div key={p.id} className="card p-5 hover:shadow-md transition-all group cursor-pointer animate-slide-up" style={{ animationDelay: `${i * 50}ms` }} onClick={() => onOpenProject(p)}>
          <div className="flex items-start justify-between mb-3"><div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: p.color + '20' }}><div className="w-5 h-5 rounded-md" style={{ backgroundColor: p.color }} /></div>
            <div className="relative"><button onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === p.id ? null : p.id); }} className="p-1.5 rounded-lg text-dark-400 hover:bg-dark-100 hover:text-dark-600 transition-all opacity-0 group-hover:opacity-100"><MoreVertical className="w-4 h-4" /></button>
              {menuOpen === p.id && (<><div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenuOpen(null); }} /><div className="absolute right-0 mt-1 w-36 card shadow-lg z-20 py-1.5 animate-fade-in"><button onClick={(e) => { e.stopPropagation(); setMenuOpen(null); setEditingProject(p); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-700 hover:bg-dark-50"><Pencil className="w-3.5 h-3.5" /> Edit</button>{p.owner_id === profile?.id && <button onClick={(e) => { e.stopPropagation(); handleDelete(p); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error-600 hover:bg-error-50"><Trash2 className="w-3.5 h-3.5" /> Delete</button>}</div></>)}</div></div>
          <h3 className="font-display font-bold text-dark-900 text-base mb-1">{p.name}</h3><p className="text-dark-500 text-sm line-clamp-2 min-h-[40px]">{p.description || 'No description'}</p>
          <div className="mt-4"><div className="flex justify-between text-xs text-dark-500 mb-1.5"><span>Progress</span><span className="font-medium">{p.completedCount}/{p.taskCount} tasks</span></div><div className="h-2 bg-dark-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: p.color }} /></div></div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-dark-100"><div className="flex items-center"><div className="flex -space-x-2">{p.members.slice(0, 4).map(m => <div key={m.id} className="ring-2 ring-white rounded-full"><Avatar profile={m.profile} size="sm" /></div>)}{p.members.length > 4 && <div className="w-7 h-7 rounded-full bg-dark-100 ring-2 ring-white flex items-center justify-center text-[10px] font-semibold text-dark-500">+{p.members.length - 4}</div>}</div><span className="text-xs text-dark-400 ml-2 flex items-center gap-1"><Users className="w-3 h-3" /> {p.members.length}</span></div><ArrowRight className="w-4 h-4 text-dark-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" /></div>
        </div>
      ); })}</div>}
      {showCreate && <ProjectModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); loadProjects(); }} />}
      {editingProject && <ProjectModal project={editingProject} onClose={() => setEditingProject(null)} onSaved={() => { setEditingProject(null); loadProjects(); }} />}
    </div>
  );
}

export function ProjectModal({ project, onClose, onSaved }: { project?: Project; onClose: () => void; onSaved: () => void }) {
  const { profile } = useAuth();
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [color, setColor] = useState(project?.color ?? PROJECT_COLORS[0]);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (name.trim().length < 2) return;
    setSaving(true);
    if (project) { await supabase.from('projects').update({ name: name.trim(), description: description.trim(), color, updated_at: new Date().toISOString() }).eq('id', project.id); }
    else {
      const { data: newProject } = await supabase.from('projects').insert({ name: name.trim(), description: description.trim(), color, owner_id: profile!.id }).select().single();
      if (newProject) { await supabase.from('project_members').insert({ project_id: newProject.id, user_id: profile!.id, role: 'owner' }); await supabase.from('activity_log').insert({ project_id: newProject.id, user_id: profile!.id, action: 'project_created', entity_type: 'project', entity_id: newProject.id, description: 'created project' }); }
    }
    setSaving(false); onSaved();
  }

  return (
    <Modal isOpen onClose={onClose} title={project ? 'Edit Project' : 'New Project'}>
      <div className="space-y-4">
        <div><label className="label-text">Project Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Website Redesign" className="input-field" autoFocus minLength={2} /></div>
        <div><label className="label-text">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this project about?" className="input-field resize-none" rows={3} /></div>
        <div><label className="label-text">Color</label><div className="flex flex-wrap gap-2">{PROJECT_COLORS.map(c => <button key={c} onClick={() => setColor(c)} className={`w-9 h-9 rounded-lg transition-all ${color === c ? 'ring-2 ring-offset-2 ring-dark-800 scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: c }} />)}</div></div>
        <div className="flex gap-3 pt-2"><button onClick={onClose} className="btn-secondary flex-1">Cancel</button><button onClick={handleSave} disabled={saving || name.trim().length < 2} className="btn-primary flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : project ? 'Save Changes' : 'Create Project'}</button></div>
      </div>
    </Modal>
  );
}
