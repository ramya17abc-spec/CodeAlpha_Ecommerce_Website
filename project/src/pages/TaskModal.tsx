import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Task, TaskStatus, TaskPriority, Profile, ProjectMember, Comment } from '@/types';
import { PRIORITY_CONFIG, formatDate, formatRelative, isOverdue } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import Modal from '@/components/Modal';
import { Trash2, Send, Calendar, User as UserIcon, MessageSquare, AlertTriangle, Loader2, CheckCircle2, Pencil } from 'lucide-react';

export default function TaskModal({ taskId, projectId, members, onClose, onTaskUpdated, onTaskDeleted }: { taskId: string; projectId: string; members: ProjectMember[]; onClose: () => void; onTaskUpdated: () => void; onTaskDeleted: () => void }) {
  const { profile } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');
  const [editDueDate, setEditDueDate] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [editStatus, setEditStatus] = useState<TaskStatus>('todo');
  const [postingComment, setPostingComment] = useState(false);

  async function loadData() {
    const { data: taskData } = await supabase.from('tasks').select('*, assignee:profiles!tasks_assignee_id_fkey(*), creator:profiles!tasks_created_by_fkey(*)').eq('id', taskId).maybeSingle();
    if (taskData) { setTask(taskData as Task); setEditTitle(taskData.title); setEditDesc(taskData.description || ''); setEditPriority(taskData.priority); setEditDueDate(taskData.due_date || ''); setEditAssignee(taskData.assignee_id || ''); setEditStatus(taskData.status); }
    setLoading(false);
  }
  async function loadComments() {
    const { data, error } = await supabase.from('comments').select('*, profile:profiles(*)').eq('task_id', taskId).order('created_at', { ascending: true });
    if (!error) setComments(data as Comment[] ?? []);
  }
  useEffect(() => { loadData(); loadComments(); }, [taskId]);
  useEffect(() => { const ch = supabase.channel(`comments-${taskId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `task_id=eq.${taskId}` }, () => loadComments()).subscribe(); return () => { supabase.removeChannel(ch); }; }, [taskId]);

  async function handleSave() {
    if (!task || editTitle.trim().length < 2) return;
    setSaving(true);
    const updates = { title: editTitle.trim(), description: editDesc.trim(), priority: editPriority, due_date: editDueDate || null, assignee_id: editAssignee || null, status: editStatus, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('tasks').update(updates).eq('id', task.id);
    if (!error) {
      if (editStatus !== task.status) { const sl = editStatus === 'todo' ? 'To Do' : editStatus === 'in_progress' ? 'In Progress' : 'Completed'; await supabase.from('activity_log').insert({ project_id: projectId, user_id: profile!.id, action: 'status_changed', entity_type: 'task', entity_id: task.id, description: `moved a task to ${sl}` }); if (editAssignee && editAssignee !== profile!.id) await supabase.from('notifications').insert({ user_id: editAssignee, project_id: projectId, task_id: task.id, type: 'task_updated', message: `${profile!.display_name} updated a task: "${editTitle}"` }); }
      if (editAssignee && editAssignee !== task.assignee_id && editAssignee !== profile!.id) await supabase.from('notifications').insert({ user_id: editAssignee, project_id: projectId, task_id: task.id, type: 'assignment', message: `${profile!.display_name} assigned you to "${editTitle}"` });
      setTask({ ...task, ...updates }); setEditing(false); onTaskUpdated();
    }
    setSaving(false);
  }
  async function handleDelete() { if (!confirm('Delete this task? All comments will be lost.')) return; await supabase.from('tasks').delete().eq('id', taskId); onTaskDeleted(); }
  async function handleComment(e: React.FormEvent) {
    e.preventDefault(); if (commentText.trim().length < 1 || !profile) return; setPostingComment(true);
    const { data } = await supabase.from('comments').insert({ task_id: taskId, user_id: profile.id, body: commentText.trim() }).select('*, profile:profiles(*)').single();
    if (data) { setComments([...comments, data as Comment]); const nu = task?.assignee_id ?? task?.created_by; if (nu && nu !== profile.id) await supabase.from('notifications').insert({ user_id: nu, project_id: projectId, task_id: taskId, type: 'comment', message: `${profile.display_name} commented on "${task?.title}"` }); await supabase.from('activity_log').insert({ project_id: projectId, user_id: profile.id, action: 'comment_added', entity_type: 'task', entity_id: taskId, description: 'commented on a task' }); }
    setCommentText(''); setPostingComment(false);
  }
  async function deleteComment(commentId: string) { await supabase.from('comments').delete().eq('id', commentId); setComments(comments.filter(c => c.id !== commentId)); }

  const memberProfiles = members.map(m => m.profile).filter(Boolean) as Profile[];
  const priority = task ? PRIORITY_CONFIG[task.priority] : null;
  const overdue = task ? isOverdue(task.due_date, task.status) : false;

  if (loading) return <Modal isOpen onClose={onClose} title="Loading task..." size="lg"><div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary-500 animate-spin" /></div></Modal>;
  if (!task) return null;

  return (
    <Modal isOpen onClose={onClose} title="" size="lg">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          {editing ? <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input-field text-lg font-display font-bold" /> : <h2 className="font-display text-xl font-bold text-dark-900 flex-1">{task.title}</h2>}
          {priority && !editing && <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${priority.bg} ${priority.color} ${priority.border}`}>{priority.label}</span>}
        </div>
        {!editing && <div className="flex items-center gap-2 flex-wrap"><span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${task.status === 'completed' ? 'bg-success-50 text-success-700' : task.status === 'in_progress' ? 'bg-primary-50 text-primary-700' : 'bg-dark-100 text-dark-600'}`}>{task.status === 'completed' && <CheckCircle2 className="w-3 h-3 inline mr-1" />}{task.status === 'todo' ? 'To Do' : task.status === 'in_progress' ? 'In Progress' : 'Completed'}</span>{overdue && <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-error-50 text-error-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Overdue</span>}</div>}
        {editing ? <div><label className="label-text">Description</label><textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="input-field resize-none" rows={3} placeholder="Add task details..." /></div> : <div>{task.description ? <p className="text-sm text-dark-700 leading-relaxed whitespace-pre-wrap">{task.description}</p> : <p className="text-sm text-dark-400 italic">No description</p>}</div>}
        <div className="grid grid-cols-2 gap-3">
          {editing ? (<><div><label className="label-text">Status</label><select value={editStatus} onChange={(e) => setEditStatus(e.target.value as TaskStatus)} className="input-field"><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select></div><div><label className="label-text">Priority</label><select value={editPriority} onChange={(e) => setEditPriority(e.target.value as TaskPriority)} className="input-field"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div><div><label className="label-text">Assignee</label><select value={editAssignee} onChange={(e) => setEditAssignee(e.target.value)} className="input-field"><option value="">Unassigned</option>{memberProfiles.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}</select></div><div><label className="label-text">Due Date</label><input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className="input-field" /></div></>) :
          (<><div className="flex items-center gap-2 p-2.5 rounded-xl bg-dark-50"><UserIcon className="w-4 h-4 text-dark-400 shrink-0" /><div className="min-w-0"><p className="text-[10px] text-dark-400 uppercase font-medium">Assignee</p>{task.assignee ? <div className="flex items-center gap-1.5 mt-0.5"><Avatar profile={task.assignee} size="sm" /><span className="text-sm text-dark-700 truncate">{task.assignee.display_name}</span></div> : <p className="text-sm text-dark-400 mt-0.5">Unassigned</p>}</div></div><div className="flex items-center gap-2 p-2.5 rounded-xl bg-dark-50"><Calendar className={`w-4 h-4 shrink-0 ${overdue ? 'text-error-500' : 'text-dark-400'}`} /><div><p className="text-[10px] text-dark-400 uppercase font-medium">Due Date</p><p className={`text-sm mt-0.5 ${overdue ? 'text-error-600 font-medium' : 'text-dark-700'}`}>{task.due_date ? formatDate(task.due_date) : 'No deadline'}</p></div></div></>)}
        </div>
        <div className="flex gap-2">{editing ? (<><button onClick={() => { setEditing(false); setEditTitle(task.title); setEditDesc(task.description); }} className="btn-secondary flex-1">Cancel</button><button onClick={handleSave} disabled={saving || editTitle.trim().length < 2} className="btn-primary flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}</button></>) : (<><button onClick={handleDelete} className="btn-danger px-3"><Trash2 className="w-4 h-4" /></button><button onClick={() => setEditing(true)} className="btn-secondary flex-1"><Pencil className="w-4 h-4" /> Edit Task</button></>)}</div>
        <div className="border-t border-dark-200 pt-4">
          <h3 className="font-display font-bold text-dark-900 text-sm flex items-center gap-2 mb-3"><MessageSquare className="w-4 h-4 text-dark-400" /> Comments ({comments.length})</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">{comments.map(c => <div key={c.id} className="flex gap-3"><Avatar profile={c.profile} size="sm" /><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="font-medium text-sm text-dark-800">{c.profile?.display_name ?? 'Unknown'}</span><span className="text-xs text-dark-400">{formatRelative(c.created_at)}</span>{c.user_id === profile?.id && <button onClick={() => deleteComment(c.id)} className="ml-auto p-1 text-dark-300 hover:text-error-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}</div><p className="text-sm text-dark-700 mt-0.5 break-words">{c.body}</p></div></div>)}{comments.length === 0 && <p className="text-sm text-dark-400 text-center py-3">No comments yet. Start the conversation!</p>}</div>
          <form onSubmit={handleComment} className="flex gap-2 mt-3"><Avatar profile={profile} size="sm" /><input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Write a comment..." className="input-field flex-1" disabled={postingComment} /><button type="submit" disabled={postingComment || commentText.trim().length < 1} className="btn-primary px-3">{postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</button></form>
        </div>
      </div>
    </Modal>
  );
}
