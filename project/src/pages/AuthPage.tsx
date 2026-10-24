import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { CheckSquare, Mail, Lock, User, Loader2, AlertCircle } from 'lucide-react';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    if (mode === 'signup' && displayName.trim().length < 2) { setError('Display name must be at least 2 characters.'); setLoading(false); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); setLoading(false); return; }
    const result = mode === 'signin' ? await signIn(email, password) : await signUp(email, password, displayName);
    if (result.error) setError(result.error);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-dark-900 via-primary-950 to-dark-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary-600/10 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/30 mb-4"><CheckSquare className="w-9 h-9 text-white" /></div>
          <h1 className="font-display text-3xl font-bold text-white tracking-tight">TaskFlow</h1>
          <p className="text-dark-400 mt-1.5 text-sm">Smart Team Workspace</p>
        </div>
        <div className="card p-8 animate-scale-in">
          <h2 className="font-display text-xl font-bold text-dark-900 mb-1">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="text-dark-500 text-sm mb-6">{mode === 'signin' ? 'Sign in to manage your projects and tasks' : 'Start collaborating with your team today'}</p>
          {error && <div className="flex items-start gap-2 p-3 rounded-xl bg-error-50 border border-error-200 text-error-700 text-sm mb-5 animate-fade-in"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span></div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && <div><label className="label-text">Display Name</label><div className="relative"><User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" /><input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="John Doe" className="input-field pl-10" required minLength={2} /></div></div>}
            <div><label className="label-text">Email</label><div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input-field pl-10" required /></div></div>
            <div><label className="label-text">Password</label><div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className="input-field pl-10" required minLength={6} /></div></div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">{loading ? <><Loader2 className="w-4 h-4 animate-spin" />{mode === 'signin' ? 'Signing in...' : 'Creating account...'}</> : mode === 'signin' ? 'Sign In' : 'Create Account'}</button>
          </form>
          <div className="mt-6 text-center text-sm text-dark-500">{mode === 'signin' ? <>Don't have an account? <button onClick={() => { setMode('signup'); setError(null); }} className="text-primary-600 font-medium hover:text-primary-700">Sign up</button></> : <>Already have an account? <button onClick={() => { setMode('signin'); setError(null); }} className="text-primary-600 font-medium hover:text-primary-700">Sign in</button></>}</div>
        </div>
      </div>
    </div>
  );
}
