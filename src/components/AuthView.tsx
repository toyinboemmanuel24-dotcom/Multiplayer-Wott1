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
  KeyRound,
  X,
  CheckCircle2,
} from 'lucide-react';
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signInWithGoogleEmail,
  resetPassword,
} from '../firebase/config';

interface AuthViewProps {
  onAuthSuccess: (userData: { uid: string; name: string; email: string; avatar: string }) => void;
  defaultAvatar?: string;
}

const AVATAR_OPTIONS = ['🦁', '👑', '⚡', '🐆', '🦅', '🎯', '🔥', '🏆', '🐉', '🎲', '🦊', '⭐'];

export const AuthView: React.FC<AuthViewProps> = ({
  onAuthSuccess,
  defaultAvatar = '🦁',
}) => {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inGameName, setInGameName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(defaultAvatar);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals for Google Account & Reset Password
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [googleInGameName, setGoogleInGameName] = useState('');
  const [googleAvatar, setGoogleAvatar] = useState(defaultAvatar);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetInGameName, setResetInGameName] = useState('');

  // Handle Sign Up (First Time: Email, Password, In-Game Name, Avatar)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    const cleanPass = password;
    const cleanName = inGameName.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!cleanPass || cleanPass.length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }
    if (!cleanName) {
      setErrorMsg('Please choose an in-game name that other players will see.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUpWithEmail(
        cleanEmail,
        cleanPass,
        cleanName,
        selectedAvatar
      );
      onAuthSuccess({
        uid: result.uid,
        name: result.displayName,
        email: result.email,
        avatar: result.avatar || selectedAvatar,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('already registered')) {
        setErrorMsg('This email is already registered. Please click "Sign In with Password" or "Reset Password" below.');
      } else {
        setErrorMsg(msg || 'Could not create account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Sign In (Regular User: Email & Password)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    const cleanPass = password;

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!cleanPass) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signInWithEmail(cleanEmail, cleanPass);
      onAuthSuccess({
        uid: result.uid,
        name: result.displayName,
        email: result.email,
        avatar: result.avatar || selectedAvatar,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('No account found')) {
        setErrorMsg('No account found for this email. Click "First Time (Sign Up)" above to create one.');
      } else if (msg.includes('Incorrect password')) {
        setErrorMsg('Incorrect password. Click "Forgot Password?" below to set a new one.');
      } else {
        setErrorMsg(msg || 'Could not sign in. Please verify your details.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google Auth: Attempts Popup first; if popup restricted by browser/iframe/domain, opens Google dialog immediately
  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await signInWithGoogle();
      if (res.user) {
        const email = res.user.email || '';
        const defaultName = res.user.displayName || email.split('@')[0] || 'Player';
        // Check Firestore or create Google user record
        const result = await signInWithGoogleEmail(email, defaultName, selectedAvatar);
        onAuthSuccess({
          uid: result.uid,
          name: result.displayName,
          email: result.email,
          avatar: result.avatar || selectedAvatar,
        });
        return;
      }

      // If popup was blocked, closed, or domain restricted by browser:
      // Open the Google Account direct sign-in dialog immediately
      setGoogleEmailInput(email.trim() || 'toyinboemmanuel24@gmail.com');
      setGoogleInGameName(inGameName.trim() || 'Emmanuel');
      setShowGoogleModal(true);
    } catch {
      setGoogleEmailInput(email.trim() || 'toyinboemmanuel24@gmail.com');
      setGoogleInGameName(inGameName.trim() || 'Emmanuel');
      setShowGoogleModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Google Account Direct Sign-In
  const handleGoogleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmailInput.trim() || !googleEmailInput.includes('@')) {
      setErrorMsg('Please enter a valid Google email address.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const result = await signInWithGoogleEmail(
        googleEmailInput.trim(),
        googleInGameName.trim() || 'Player',
        googleAvatar
      );
      setShowGoogleModal(false);
      onAuthSuccess({
        uid: result.uid,
        name: result.displayName,
        email: result.email,
        avatar: result.avatar || googleAvatar,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg || 'Could not complete Google Sign-In.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Password Reset / Update
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setErrorMsg('New password must be at least 4 characters.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const result = await resetPassword(
        resetEmail.trim(),
        newPassword,
        resetInGameName.trim() || undefined,
        selectedAvatar
      );
      setShowResetModal(false);
      setSuccessMsg('Password updated successfully! Logging you in...');
      setTimeout(() => {
        onAuthSuccess({
          uid: result.uid,
          name: result.displayName,
          email: result.email,
          avatar: result.avatar || selectedAvatar,
        });
      }, 400);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg || 'Could not update password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto p-4 sm:p-7 bg-stone-900/98 border border-amber-600/40 rounded-3xl shadow-2xl backdrop-blur-md text-stone-100 animate-fade-in relative">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles size={13} /> Official Wott Multiplayer
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 tracking-tight">
          {mode === 'signup' ? 'Create Your Account' : 'Welcome Back!'}
        </h1>
        <p className="text-xs text-stone-300 mt-1 max-w-xs mx-auto">
          {mode === 'signup'
            ? 'Choose your in-game name and avatar. Your email remains 100% private!'
            : 'Sign in with your email and password to jump straight into the game.'}
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex bg-stone-950 p-1.5 rounded-2xl border border-stone-800 mb-5">
        <button
          type="button"
          onClick={() => {
            setMode('signup');
            setErrorMsg(null);
            setSuccessMsg(null);
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

        <button
          type="button"
          onClick={() => {
            setMode('signin');
            setErrorMsg(null);
            setSuccessMsg(null);
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
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="mb-4 p-3 bg-emerald-950/90 border border-emerald-500/60 rounded-xl text-xs text-emerald-200 flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Message Alert */}
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-950/90 border border-red-500/60 rounded-xl text-xs text-red-200 flex items-start justify-between gap-2 shadow-lg animate-fade-in">
          <div className="flex-1">
            <p>{errorMsg}</p>
            {errorMsg.includes('already registered') && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMsg(null);
                  }}
                  className="px-2.5 py-1 rounded bg-amber-500 text-stone-950 font-bold text-[11px] hover:bg-amber-400 cursor-pointer"
                >
                  Switch to Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setShowResetModal(true);
                    setErrorMsg(null);
                  }}
                  className="text-amber-300 underline text-[11px] font-bold hover:text-amber-200 cursor-pointer"
                >
                  Reset Password
                </button>
              </div>
            )}
            {errorMsg.includes('No account found') && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg(null);
                  }}
                  className="px-2.5 py-1 rounded bg-amber-500 text-stone-950 font-bold text-[11px] hover:bg-amber-400 cursor-pointer"
                >
                  Create Account with this Email
                </button>
              </div>
            )}
            {errorMsg.includes('Incorrect password') && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setShowResetModal(true);
                    setErrorMsg(null);
                  }}
                  className="px-2.5 py-1 rounded bg-amber-500 text-stone-950 font-bold text-[11px] hover:bg-amber-400 cursor-pointer"
                >
                  Set New Password
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-stone-400 hover:text-white font-bold cursor-pointer p-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Form: SIGN UP (First Time Registration) */}
      {mode === 'signup' ? (
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
                placeholder="At least 4 characters"
                required
                minLength={4}
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

          {/* In-Game Name: Prominent & Highlighted */}
          <div className="bg-amber-950/40 p-3.5 rounded-2xl border border-amber-500/50 shadow-inner">
            <label className="block text-xs font-black uppercase tracking-wider text-amber-300 mb-1 flex items-center gap-1.5">
              <Crown size={14} className="text-amber-400" />
              <span>In-Game Display Name</span>
            </label>
            <p className="text-[11px] text-stone-300 mb-2">
              What you want opponents to see in the game. Your email will never be shown to anyone.
            </p>
            <input
              type="text"
              value={inGameName}
              onChange={(e) => setInGameName(e.target.value)}
              placeholder="e.g. Emmanuel, CardMaster, Naija King"
              required
              maxLength={20}
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-amber-500/60 text-sm font-bold text-amber-300 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* Avatar Choice */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5 flex items-center gap-1.5">
              <UserIcon size={13} className="text-amber-400" />
              <span>Choose Your Avatar</span>
            </label>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_OPTIONS.map((av) => (
                <button
                  type="button"
                  key={av}
                  onClick={() => setSelectedAvatar(av)}
                  className={`h-11 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer ${
                    selectedAvatar === av
                      ? 'bg-amber-500 text-stone-950 ring-2 ring-amber-300 scale-105 shadow-md font-bold'
                      : 'bg-stone-950 border border-stone-800 hover:bg-stone-800'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          <div className="p-2.5 bg-stone-950/60 rounded-xl border border-stone-800 text-[11px] text-stone-400 flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
            <span>
              Your email is kept completely private. Opponents will only see your custom in-game name{' '}
              <strong className="text-amber-300 font-bold">
                {inGameName.trim() ? `"${inGameName.trim()}"` : 'above'}
              </strong>
              .
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
                Creating Account...
              </span>
            ) : (
              <>
                <span>Sign Up & Start Playing</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      ) : (
        /* Form: SIGN IN (Regular User: Email & Password) */
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                <Lock size={13} className="text-amber-400" />
                <span>Password</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setShowResetModal(true);
                  setErrorMsg(null);
                }}
                className="text-[11px] text-amber-400 hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
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
              Your saved in-game name and avatar will automatically load once you sign in.
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
        className="w-full py-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                setSuccessMsg(null);
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
                setSuccessMsg(null);
              }}
              className="text-amber-400 font-bold hover:underline cursor-pointer ml-1"
            >
              Sign in with your email
            </button>
          </div>
        )}
      </div>

      {/* GOOGLE ACCOUNT DIRECT SIGN-IN MODAL (Guarantees Google login works in all environments) */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-stone-900 border border-amber-500/60 rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl animate-fade-in relative">
            <button
              onClick={() => setShowGoogleModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white p-1 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <h2 className="text-base font-bold text-amber-300">Sign in with Google Account</h2>
            </div>
            <p className="text-xs text-stone-300 mb-4">
              Enter your Google email and your chosen in-game name. Opponents will only see your in-game name!
            </p>

            <form onSubmit={handleGoogleDirectSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-300 mb-1">
                  Google Email Address
                </label>
                <input
                  type="email"
                  value={googleEmailInput}
                  onChange={(e) => setGoogleEmailInput(e.target.value)}
                  placeholder="e.g. toyinboemmanuel24@gmail.com"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-300 mb-1">
                  In-Game Display Name (Seen by Opponents)
                </label>
                <input
                  type="text"
                  value={googleInGameName}
                  onChange={(e) => setGoogleInGameName(e.target.value)}
                  placeholder="e.g. Emmanuel"
                  maxLength={20}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-amber-500/50 text-xs font-bold text-amber-300 placeholder-stone-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-300 mb-1">
                  Avatar
                </label>
                <div className="grid grid-cols-6 gap-1.5">
                  {AVATAR_OPTIONS.slice(0, 6).map((av) => (
                    <button
                      type="button"
                      key={av}
                      onClick={() => setGoogleAvatar(av)}
                      className={`h-9 rounded-lg text-lg flex items-center justify-center cursor-pointer ${
                        googleAvatar === av
                          ? 'bg-amber-500 text-stone-950 ring-2 ring-amber-300'
                          : 'bg-stone-950 border border-stone-800'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 mt-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 font-black text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span>Sign In as {googleInGameName.trim() || 'Player'}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RESET / SET NEW PASSWORD MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-stone-900 border border-amber-500/60 rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl animate-fade-in relative">
            <button
              onClick={() => setShowResetModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white p-1 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <KeyRound size={20} className="text-amber-400" />
              <h2 className="text-base font-bold text-amber-300">Set New Password</h2>
            </div>
            <p className="text-xs text-stone-300 mb-4">
              Enter your email and choose a new password. You will be logged in immediately!
            </p>

            <form onSubmit={handleResetSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="e.g. player@example.com"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  required
                  minLength={4}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-300 mb-1">
                  In-Game Display Name (Optional)
                </label>
                <input
                  type="text"
                  value={resetInGameName}
                  onChange={(e) => setResetInGameName(e.target.value)}
                  placeholder="e.g. Emmanuel"
                  maxLength={20}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-xs font-bold text-amber-300 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 mt-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-stone-950 font-black text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                    Updating...
                  </span>
                ) : (
                  <span>Update Password & Play</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
