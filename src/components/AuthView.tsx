import React, { useState } from 'react';
import {
  Sparkles,
  Lock,
  Mail,
  User as UserIcon,
  LogIn,
  UserPlus,
  ArrowRight,
  ShieldCheck,
  Crown,
  Eye,
  EyeOff,
} from 'lucide-react';
import { signUpWithEmail, signInWithEmail, signInWithGoogle } from '../firebase/config';

interface AuthViewProps {
  onAuthSuccess: (userData: { uid: string; name: string; email: string; avatar: string }) => void;
  defaultAvatar?: string;
}

const AVATAR_OPTIONS = ['🦁', '👑', '⚡', '🐆', '🦅', '🎯', '🔥', '🏆', '🐉', '🎲', '🦊', '⭐'];

export const AuthView: React.FC<AuthViewProps> = ({
  onAuthSuccess,
  defaultAvatar = '🦁',
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inGameName, setInGameName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(defaultAvatar);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle Sign In (Email & Password)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const result = await signInWithEmail(email.trim(), password);
      onAuthSuccess({
        uid: result.uid,
        name: result.displayName || email.split('@')[0],
        email: result.email || email.trim(),
        avatar: result.avatar || selectedAvatar,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential') || msg.includes('Incorrect password') || msg.includes('Incorrect email')) {
        setErrorMsg('Incorrect email or password. Please check and try again.');
      } else if (msg.includes('invalid-email')) {
        setErrorMsg('Please enter a valid email address.');
      } else if (msg.includes('too-many-requests')) {
        setErrorMsg('Too many unsuccessful attempts. Please wait a moment or reset your password.');
      } else if (msg.includes('No account found')) {
        setErrorMsg('No account found with this email. Please switch to First Time (Sign Up) above.');
      } else {
        setErrorMsg(msg || 'Could not sign in. Please verify your details.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Sign Up (Email, Password, In-Game Name, Avatar)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !inGameName.trim()) {
      setErrorMsg('Please enter your email, password, and in-game name.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const result = await signUpWithEmail(
        email.trim(),
        password,
        inGameName.trim(),
        selectedAvatar
      );
      onAuthSuccess({
        uid: result.uid,
        name: result.displayName,
        email: result.email || email.trim(),
        avatar: result.avatar || selectedAvatar,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('email-already-in-use') || msg.includes('already registered')) {
        setErrorMsg('This email is already registered. Please click Regular User (Sign In) to log in.');
      } else if (msg.includes('invalid-email')) {
        setErrorMsg('Please enter a valid email address.');
      } else if (msg.includes('weak-password')) {
        setErrorMsg('Password should be at least 6 characters.');
      } else {
        setErrorMsg(msg || 'Could not create account. Please check your details.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google Sign In
  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        const resolvedName = user.displayName || user.email?.split('@')[0] || 'Player';
        onAuthSuccess({
          uid: user.uid,
          name: resolvedName,
          email: user.email || '',
          avatar: selectedAvatar,
        });
      }
    } catch (err) {
      console.warn('Google sign-in error:', err);
      setErrorMsg('Google Sign-In was cancelled or not allowed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto p-4 sm:p-7 bg-stone-900/95 border border-amber-600/40 rounded-3xl shadow-2xl backdrop-blur-md text-stone-100 animate-fade-in">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles size={13} /> Official Wott Multiplayer
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 tracking-tight">
          {mode === 'signin' ? 'Welcome Back!' : 'Join the Table'}
        </h1>
        <p className="text-xs text-stone-300 mt-1 max-w-xs mx-auto">
          {mode === 'signin'
            ? 'Sign in with your email and password to jump straight into the game.'
            : 'Create your account and choose what other players will see as your name.'}
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex bg-stone-950 p-1 rounded-2xl border border-stone-800 mb-5">
        <button
          type="button"
          onClick={() => {
            setMode('signin');
            setErrorMsg(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            mode === 'signin'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-md font-black'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <LogIn size={15} />
          <span>Regular User (Sign In)</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup');
            setErrorMsg(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            mode === 'signup'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-md font-black'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <UserPlus size={15} />
          <span>First Time (Sign Up)</span>
        </button>
      </div>

      {/* Error Message Alert */}
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-950/90 border border-red-500/60 rounded-xl text-xs text-red-200 flex items-start justify-between gap-2 shadow-lg">
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-stone-400 hover:text-white font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Form: SIGN IN (Regular User: Just Email and Password) */}
      {mode === 'signin' ? (
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5 flex items-center gap-1.5">
              <Mail size={13} className="text-amber-400" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. player@example.com"
              required
              autoComplete="email"
              className="w-full px-3.5 py-3 rounded-xl bg-stone-950/90 border border-stone-700 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5 flex items-center gap-1.5">
              <Lock size={13} className="text-amber-400" />
              <span>Password</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full px-3.5 py-3 pr-10 rounded-xl bg-stone-950/90 border border-stone-700 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 cursor-pointer p-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800 text-[11px] text-stone-400 flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
            <span>
              Your email is kept completely private. Opponents will only see your custom in-game name.
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              <>
                <span>Sign In & Play</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      ) : (
        /* Form: SIGN UP (First-Time User: Email, Password, In-Game Name, Avatar) */
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1 flex items-center gap-1.5">
              <Mail size={13} className="text-amber-400" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. player@example.com"
              required
              autoComplete="email"
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/90 border border-stone-700 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1 flex items-center gap-1.5">
              <Lock size={13} className="text-amber-400" />
              <span>Create Password</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-stone-950/90 border border-stone-700 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 cursor-pointer p-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* In-Game Name (Critical Requirement: What you want people to see in the game) */}
          <div className="bg-amber-950/30 p-3 rounded-2xl border border-amber-600/40">
            <label className="block text-xs font-black uppercase tracking-wider text-amber-300 mb-1 flex items-center gap-1.5">
              <Crown size={14} className="text-amber-400" />
              <span>In-Game Name</span>
            </label>
            <p className="text-[11px] text-stone-300 mb-2">
              What you want opponents and friends to see as your name in the game.
            </p>
            <input
              type="text"
              value={inGameName}
              onChange={(e) => setInGameName(e.target.value)}
              placeholder="e.g. CardMaster, Chidi, Kemi Champion"
              required
              maxLength={20}
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-amber-500/50 text-sm font-bold text-amber-300 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* Avatar Choice */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5 flex items-center gap-1.5">
              <UserIcon size={13} className="text-amber-400" />
              <span>Choose Avatar</span>
            </label>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_OPTIONS.map((av) => (
                <button
                  type="button"
                  key={av}
                  onClick={() => setSelectedAvatar(av)}
                  className={`h-11 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer ${
                    selectedAvatar === av
                      ? 'bg-amber-500 text-stone-950 ring-2 ring-amber-300 scale-105 shadow-md'
                      : 'bg-stone-950 border border-stone-800 hover:bg-stone-800'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-stone-400 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
            <span>
              Whenever you sign in with this email, your chosen name{' '}
              <strong className="text-amber-300">
                {inGameName.trim() ? `"${inGameName.trim()}"` : 'above'}
              </strong>{' '}
              will always display for everyone to see!
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                Registering...
              </span>
            ) : (
              <>
                <span>Create Account & Start Playing</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      )}

      {/* Divider */}
      <div className="my-5 flex items-center gap-3">
        <div className="flex-1 h-[1px] bg-stone-800" />
        <span className="text-[11px] text-stone-500 uppercase tracking-wider font-semibold">
          Or Continue With
        </span>
        <div className="flex-1 h-[1px] bg-stone-800" />
      </div>

      {/* Google Sign In option */}
      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={isLoading}
        className="w-full py-2.5 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        <span>Continue with Google</span>
      </button>

      {/* Switch between Sign In / Sign Up footer */}
      <div className="mt-5 text-center text-xs text-stone-400">
        {mode === 'signin' ? (
          <div>
            First time playing Wott?{' '}
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
              }}
              className="text-amber-400 font-bold hover:underline cursor-pointer ml-1"
            >
              Sign Up and choose your name
            </button>
          </div>
        ) : (
          <div>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
              }}
              className="text-amber-400 font-bold hover:underline cursor-pointer ml-1"
            >
              Sign in with your email
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
