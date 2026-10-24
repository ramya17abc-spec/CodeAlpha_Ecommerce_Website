import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Project, Task, ActivityLog } from '@/types';
import { Avatar } from '@/components/Avatar';
import { Loading, EmptyState } from '@/components/Loading';
import { formatRelative } from '@/lib/utils';
import { FolderKanban, CheckCircle2, Clock, AlertTriangle, ArrowRight, Calendar, Activity, TrendingUp } from 'lucide-react';
import type { View } from '@/components/AppLayout';

export default function Dashboard({ onViewChange }: { onViewChange: (v: View) => void }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [myTaskCount, setMyTaskCount] = useState(0);

  useEffect(() => {
    async function loadData() {
      if (!profile) return;
      const { data: memberData } = await supabase.from('project_members').select('project_id').eq('user_id', profile.id);
      const projectIds = (memberData ?? []).map(m => m.project_id);
      if (projectIds.length === 0) { setLoading(false); return; }
      const { data: projData } = await supabase.from('projects').select('*').in('id', projectIds).order('updated_at', { ascending: false });
      setProjects(projData as Project[] ?? []);
      const { data: taskData } = await supabase.from('tasks').select('*').in('project_id', projectIds).order('created_at', { ascending: false });
      setTasks(taskData as Task[] ?? []);
      setMyTaskCount((taskData as Task[] ?? []).filter(t => t.assignee_id === profile.id).length);
      const { data: activityData } = await supabase.from('activity_log').select('*').in('project_id', projectIds).order('created_at', { ascending: false }).limit(10);
      const activity = activityData as ActivityLog[] ?? [];
      const profileIds = [...new Set(activity.map(a => a.user_id).filter(Boolean))] as string[];
      const { data: profilesData } = await supabase.from('profiles').select('*').in('id', profileIds);
      const profileMap = new Map((profilesData ?? []).map(p => [p.id, p]));
      setRecentActivity(activity.map(a => ({ ...a, profile: profileMap.get(a.user_id!) ?? null })));
      setLoading(false);
    }
    if (profile) loadData();
  }, [profile]);

  if (loading) return <Loading text="Loading your dashboard..." />;

  const stats = {
    projects: projects.length, completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    overdue: tasks.filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date(new Date().toDateString())).length,
  };
  const completionRate = tasks.length > 0 ? Math.round((stats.completed / tasks.length) * 100) : 0;
  const statusData = [{ label: 'To Do', count: tasks.filter(t => t.status === 'todo').length, color: '#94a3b8' }, { label: 'In Progress', count: stats.inProgress, color: '#3b82f6' }, { label: 'Completed', count: stats.completed, color: '#22c55e' }];
  const maxCount = Math.max(...statusData.map(s => s.count), 1);
  const priorityData = [{ label: 'Low', count: tasks.filter(t => t.priority === 'low').length, color: '#22c55e' }, { label: 'Medium', count: tasks.filter(t => t.priority === 'medium').length, color: '#3b82f6' }, { label: 'High', count: tasks.filter(t => t.priority === 'high').length, color: '#f59e0b' }, { label: 'Urgent', count: tasks.filter(t => t.priority === 'urgent').length, color: '#ef4444' }];
  const statCards = [
    { label: 'Active Projects', value: stats.projects, icon: FolderKanban, iconBg: 'bg-primary-100', iconColor: 'text-primary-600' },
    { label: 'Completed Tasks', value: stats.completed, icon: CheckCircle2, iconBg: 'bg-success-100', iconColor: 'text-success-600' },
    { label: 'In Progress', value: stats.inProgress, icon: Clock, iconBg: 'bg-warning-100', iconColor: 'text-warning-600' },
    { label: 'Overdue Tasks', value: stats.overdue, icon: AlertTriangle, iconBg: 'bg-error-100', iconColor: 'text-error-600' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="font-display text-2xl font-bold text-dark-900">Welcome back, {profile?.display_name?.split(' ')[0]}!</h1><p className="text-dark-500 text-sm mt-1">Here's what's happening with your teams today.</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => { const Icon = stat.icon; return (
          <div key={stat.label} className="card p-5 hover:shadow-md transition-shadow animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-start justify-between"><div><p className="text-sm text-dark-500 font-medium">{stat.label}</p><p className="text-3xl font-display font-bold text-dark-900 mt-1.5">{stat.value}</p></div><div className={`w-11 h-11 rounded-xl ${stat.iconBg} flex items-center justify-center`}><Icon className={`w-5 h-5 ${stat.iconColor}`} /></div></div>
          </div>
        ); })}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5"><h3 className="font-display font-bold text-dark-900 text-sm mb-1">Completion Rate</h3><p className="text-xs text-dark-400 mb-4">Across all your projects</p>
          <div className="flex flex-col items-center justify-center py-4"><div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" /><circle cx="50" cy="50" r="42" fill="none" stroke="#3b82f6" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 42}`} strokeDashoffset={`${2 * Math.PI * 42 * (1 - completionRate / 100)}`} className="transition-all duration-700 ease-out" /></svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-display font-bold text-dark-900">{completionRate}%</span><span className="text-xs text-dark-400">completed</span></div>
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs"><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success-500" />{stats.completed} done</span><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary-500" />{stats.inProgress} active</span></div>
          </div>
        </div>
        <div className="card p-5"><h3 className="font-display font-bold text-dark-900 text-sm mb-1">Task Status</h3><p className="text-xs text-dark-400 mb-4">Distribution by column</p>
          <div className="space-y-4">{statusData.map(s => <div key={s.label}><div className="flex items-center justify-between mb-1.5"><span className="text-sm text-dark-600 font-medium">{s.label}</span><span className="text-sm text-dark-400 font-semibold">{s.count}</span></div><div className="h-2.5 bg-dark-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${(s.count / maxCount) * 100}%`, backgroundColor: s.color }} /></div></div>)}</div>
        </div>
        <div className="card p-5"><h3 className="font-display font-bold text-dark-900 text-sm mb-1">Priority Breakdown</h3><p className="text-xs text-dark-400 mb-4">Tasks by priority level</p>
          <div className="flex items-end justify-between h-32 gap-2 pt-2">{priorityData.map(p => { const maxP = Math.max(...priorityData.map(x => x.count), 1); return <div key={p.label} className="flex-1 flex flex-col items-center gap-2"><span className="text-xs font-semibold text-dark-700">{p.count}</span><div className="w-full rounded-t-lg transition-all duration-700 ease-out" style={{ height: `${(p.count / maxP) * 100}%`, backgroundColor: p.color, minHeight: '4px' }} /><span className="text-[10px] text-dark-400 font-medium">{p.label}</span></div>; })}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4"><h3 className="font-display font-bold text-dark-900 text-sm flex items-center gap-2"><FolderKanban className="w-4 h-4 text-primary-500" /> Your Projects</h3><button onClick={() => onViewChange('projects')} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></button></div>
          {projects.length === 0 ? <EmptyState icon={<FolderKanban className="w-10 h-10 mx-auto" />} title="No projects yet" description="Create your first project to get started" action={<button onClick={() => onViewChange('projects')} className="btn-primary">Create Project</button>} />
          : <div className="space-y-2">{projects.slice(0, 4).map(p => { const projTasks = tasks.filter(t => t.project_id === p.id); const completed = projTasks.filter(t => t.status === 'completed').length; const pct = projTasks.length > 0 ? Math.round((completed / projTasks.length) * 100) : 0; return (
            <button key={p.id} onClick={() => onViewChange('projects')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-dark-50 transition-colors text-left"><div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: p.color + '20' }}><div className="w-4 h-4 rounded-md" style={{ backgroundColor: p.color }} /></div><div className="flex-1 min-w-0"><p className="font-medium text-sm text-dark-800 truncate">{p.name}</p><div className="flex items-center gap-2 mt-1"><div className="flex-1 h-1.5 bg-dark-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: p.color }} /></div><span className="text-xs text-dark-400 font-medium">{completed}/{projTasks.length}</span></div></div></button>
          ); })}</div>}
        </div>
        <div className="card p-5"><h3 className="font-display font-bold text-dark-900 text-sm flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-primary-500" /> Recent Activity</h3>
          {recentActivity.length === 0 ? <EmptyState icon={<Activity className="w-10 h-10 mx-auto" />} title="No activity yet" description="Activity from your projects will appear here" />
          : <div className="space-y-1">{recentActivity.slice(0, 6).map(a => <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-dark-50 transition-colors"><Avatar profile={a.profile} size="sm" /><div className="flex-1 min-w-0"><p className="text-sm text-dark-700"><span className="font-medium">{a.profile?.display_name ?? 'Someone'}</span> {a.description}</p><p className="text-xs text-dark-400 mt-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatRelative(a.created_at)}</p></div></div>)}</div>}
        </div>
      </div>
      {myTaskCount > 0 && (
        <div className="card p-5"><h3 className="font-display font-bold text-dark-900 text-sm flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-primary-500" /> Tasks Assigned to You</h3>
          <div className="flex items-center gap-6"><div className="text-center"><p className="text-3xl font-display font-bold text-primary-600">{myTaskCount}</p><p className="text-xs text-dark-400 mt-0.5">Total assigned</p></div>
            <div className="flex-1 flex items-center gap-4">{(['todo', 'in_progress', 'completed'] as const).map(st => { const count = tasks.filter(t => t.assignee_id === profile?.id && t.status === st).length; const colors = { todo: 'bg-dark-400', in_progress: 'bg-primary-500', completed: 'bg-success-500' }; const labels = { todo: 'To Do', in_progress: 'Active', completed: 'Done' }; return <div key={st} className="flex-1"><div className="flex justify-between text-xs text-dark-500 mb-1"><span>{labels[st]}</span><span>{count}</span></div><div className="h-2 bg-dark-100 rounded-full overflow-hidden"><div className={`h-full ${colors[st]} rounded-full`} style={{ width: `${myTaskCount > 0 ? (count / myTaskCount) * 100 : 0}%` }} /></div></div>; })}</div>
          </div>
        </div>
      )}
    </div>
  );
}
