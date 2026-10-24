import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Task, TaskStatus, Project, ProjectMember, ActivityLog } from '@/types';
import { STATUS_CONFIG, PRIORITY_CONFIG, formatDate, isOverdue, formatRelative } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import { Loading } from '@/components/Loading';
import TaskModal from '@/pages/TaskModal';
import { ProjectModal } from '@/pages/ProjectsPage';
import MembersModal from '@/components/MembersModal';
import { ArrowLeft, Plus, Calendar, AlertTriangle, Users, MoreVertical, Pencil, UserPlus, Activity as ActivityIcon, X } from 'lucide-react';

export default function BoardView({ project, onBack, searchQuery }: { project: Project; onBack: () => void; searchQuery: string }) {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showEditProject, setShowEditProject] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addingToColumn, setAddingToColumn] = useState<TaskStatus | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  const columns: { status: TaskStatus; label: string }[] = [{ status: 'todo', label: 'To Do' }, { status: 'in_progress', label: 'In Progress' }, { status: 'completed', label: 'Completed' }];

  async function loadTasks() { const { data, error } = await supabase.from('tasks').select('*, assignee:profiles!tasks_assignee_id_fkey(*), creator:profiles!tasks_created_by_fkey(*)').eq('project_id', project.id).order('position', { ascending: true }); if (!error) setTasks(data as Task[] ?? []); }
  async function loadMembers() { const { data, error } = await supabase.from('project_members').select('*, profile:profiles(*)').eq('project_id', project.id); if (!error) setMembers(data as ProjectMember[] ?? []); }

  useEffect(() => { loadTasks(); loadMembers(); setLoading(false); const ch = supabase.channel(`tasks-${project.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${project.id}` }, () => loadTasks()).subscribe(); return () => { supabase.removeChannel(ch); }; }, [project.id]);

  async function handleAddTask(status: TaskStatus) {
    if (newTaskTitle.trim().length < 2 || !profile) return;
    const maxPos = tasks.filter(t => t.status === status).reduce((max, t) => Math.max(max, t.position), 0);
    const { data, error } = await supabase.from('tasks').insert({ project_id: project.id, title: newTaskTitle.trim(), status, position: maxPos + 1, created_by: profile.id }).select().single();
    if (!error && data) await supabase.from('activity_log').insert({ project_id: project.id, user_id: profile.id, action: 'task_created', entity_type: 'task', entity_id: data.id, description: 'created a new task' });
    setNewTaskTitle(''); setAddingToColumn(null);
  }
  async function handleDragEnd() {
    if (!draggingId || !dragOverCol) { setDraggingId(null); setDragOverCol(null); return; }
    const task = tasks.find(t => t.id === draggingId);
    if (!task || task.status === dragOverCol) { setDraggingId(null); setDragOverCol(null); return; }
    const maxPos = tasks.filter(t => t.status === dragOverCol).reduce((max, t) => Math.max(max, t.position), 0);
    await supabase.from('tasks').update({ status: dragOverCol, position: maxPos + 1, updated_at: new Date().toISOString() }).eq('id', draggingId);
    if (profile) { const sl = dragOverCol === 'todo' ? 'To Do' : dragOverCol === 'in_progress' ? 'In Progress' : 'Completed'; await supabase.from('activity_log').insert({ project_id: project.id, user_id: profile.id, action: 'status_changed', entity_type: 'task', entity_id: draggingId, description: `moved a task to ${sl}` }); }
    setDraggingId(null); setDragOverCol(null);
  }
  async function loadActivity() { const { data } = await supabase.from('activity_log').select('*, profile:profiles(*)').eq('project_id', project.id).order('created_at', { ascending: false }).limit(30); if (data) setActivity(data as ActivityLog[]); }

  const filteredTasks = searchQuery ? tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase())) : tasks;
  if (loading) return <Loading text="Loading board..." />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="btn-ghost px-2.5"><ArrowLeft className="w-5 h-5" /></button>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: project.color + '20' }}><div className="w-4 h-4 rounded-md" style={{ backgroundColor: project.color }} /></div>
        <div className="flex-1 min-w-0"><h1 className="font-display text-xl font-bold text-dark-900 truncate">{project.name}</h1><p className="text-dark-500 text-sm truncate">{project.description || 'No description'}</p></div>
        <div className="flex -space-x-2">{members.slice(0, 5).map(m => <div key={m.id} className="ring-2 ring-dark-50 rounded-full"><Avatar profile={m.profile} size="sm" /></div>)}</div>
        <div className="relative"><button onClick={() => setMenuOpen(!menuOpen)} className="btn-ghost px-2.5"><MoreVertical className="w-5 h-5" /></button>{menuOpen && (<><div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} /><div className="absolute right-0 mt-1 w-44 card shadow-lg z-20 py-1.5 animate-fade-in"><button onClick={() => { setShowMembers(true); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-dark-700 hover:bg-dark-50"><UserPlus className="w-4 h-4" /> Manage Members</button><button onClick={() => { setShowEditProject(true); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-dark-700 hover:bg-dark-50"><Pencil className="w-4 h-4" /> Edit Project</button><button onClick={async () => { await loadActivity(); setShowActivity(true); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-dark-700 hover:bg-dark-50"><ActivityIcon className="w-4 h-4" /> Activity History</button></div></>)}</div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh]">
        {columns.map(({ status, label }) => { const colTasks = filteredTasks.filter(t => t.status === status); const config = STATUS_CONFIG[status]; return (
          <div key={status} className={`flex-shrink-0 w-80 rounded-2xl transition-all duration-200 ${dragOverCol === status ? 'bg-primary-50/50 ring-2 ring-primary-400 ring-offset-1' : 'bg-dark-100/60'}`} onDragOver={(e) => { e.preventDefault(); setDragOverCol(status); }} onDragLeave={() => setDragOverCol(null)} onDrop={(e) => { e.preventDefault(); handleDragEnd(); }}>
            <div className="p-4 pb-2"><div className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${config.dot}`} /><span className="font-display font-semibold text-dark-800 text-sm">{label}</span><span className="text-xs text-dark-400 bg-dark-200/70 px-1.5 py-0.5 rounded-md font-medium">{colTasks.length}</span></div></div>
            <div className="px-3 pb-3 space-y-2.5 min-h-[100px]">
              {colTasks.map(task => { const pr = PRIORITY_CONFIG[task.priority]; const od = isOverdue(task.due_date, task.status); return (
                <div key={task.id} draggable onDragStart={() => setDraggingId(task.id)} onDragEnd={handleDragEnd} onClick={() => setSelectedTaskId(task.id)} className={`bg-white rounded-xl p-3.5 border border-dark-200/60 shadow-sm hover:shadow-md hover:border-primary-300 cursor-pointer transition-all ${draggingId === task.id ? 'opacity-50 rotate-1' : ''}`}>
                  <div className="flex items-start justify-between gap-2 mb-1.5"><p className="text-sm font-medium text-dark-800 leading-snug flex-1">{task.title}</p><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${pr.bg} ${pr.color} ${pr.border} shrink-0`}>{pr.label}</span></div>
                  {task.description && <p className="text-xs text-dark-500 line-clamp-2 mb-2">{task.description}</p>}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-dark-100"><div>{task.assignee ? <Avatar profile={task.assignee} size="sm" /> : <div className="w-7 h-7 rounded-full bg-dark-100 flex items-center justify-center"><Users className="w-3 h-3 text-dark-400" /></div>}</div>{task.due_date && <span className={`text-[11px] flex items-center gap-1 ${od ? 'text-error-600 font-medium' : 'text-dark-400'}`}>{od ? <AlertTriangle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}{formatDate(task.due_date)}</span>}</div>
                </div>
              ); })}
              {addingToColumn === status ? (
                <div className="bg-white rounded-xl p-3 border border-primary-300 animate-fade-in"><input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(status); if (e.key === 'Escape') { setAddingToColumn(null); setNewTaskTitle(''); } }} placeholder="Task title..." className="w-full px-2.5 py-2 text-sm rounded-lg border border-dark-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500" autoFocus /><div className="flex gap-1.5 mt-2"><button onClick={() => handleAddTask(status)} className="btn-primary text-xs py-1.5 px-3">Add</button><button onClick={() => { setAddingToColumn(null); setNewTaskTitle(''); }} className="btn-ghost text-xs py-1.5 px-3">Cancel</button></div></div>
              ) : <button onClick={() => setAddingToColumn(status)} className="w-full flex items-center gap-1.5 p-2.5 rounded-xl text-dark-400 hover:text-dark-600 hover:bg-white text-sm font-medium transition-all"><Plus className="w-4 h-4" /> Add Task</button>}
            </div>
          </div>
        ); })}
      </div>
      {selectedTaskId && <TaskModal taskId={selectedTaskId} projectId={project.id} members={members} onClose={() => setSelectedTaskId(null)} onTaskUpdated={loadTasks} onTaskDeleted={() => { setSelectedTaskId(null); loadTasks(); }} />}
      {showEditProject && <ProjectModal project={project} onClose={() => setShowEditProject(false)} onSaved={() => setShowEditProject(false)} />}
      {showMembers && <MembersModal project={project} members={members} onClose={() => setShowMembers(false)} onUpdated={loadMembers} />}
      {showActivity && <ActivityModal activity={activity} onClose={() => setShowActivity(false)} />}
    </div>
  );
}

function ActivityModal({ activity, onClose }: { activity: ActivityLog[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] overflow-y-auto">
      <div className="fixed inset-0 bg-dark-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-lg card p-6 animate-slide-up shadow-xl">
        <div className="flex items-center justify-between mb-5"><h2 className="font-display text-lg font-bold text-dark-900 flex items-center gap-2"><ActivityIcon className="w-5 h-5 text-primary-500" /> Activity History</h2><button onClick={onClose} className="p-1.5 rounded-lg text-dark-400 hover:bg-dark-100 hover:text-dark-600 transition-all"><X className="w-5 h-5" /></button></div>
        <div className="space-y-1 max-h-96 overflow-y-auto">{activity.length === 0 ? <p className="text-sm text-dark-400 text-center py-6">No activity yet</p> : activity.map(a => <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-dark-50"><Avatar profile={a.profile} size="sm" /><div className="flex-1 min-w-0"><p className="text-sm text-dark-700"><span className="font-medium">{a.profile?.display_name ?? 'Unknown'}</span> {a.description}</p><p className="text-xs text-dark-400 mt-0.5">{formatRelative(a.created_at)}</p></div></div>)}</div>
      </div>
    </div>
  );
}
