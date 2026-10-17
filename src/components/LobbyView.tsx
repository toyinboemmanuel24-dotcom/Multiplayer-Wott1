import React, { useState, useEffect } from 'react';
import {
  Users,
  Copy,
  Check,
  Share2,
  Play,
  Bot,
  Sparkles,
  BookOpen,
  ArrowRight,
  LogOut,
  Crown,
  CheckCircle2,
  Clock,
  UserCheck,
  Zap,
} from 'lucide-react';
import { GameRoom, PlayerSummary } from '../types/wott';
import { User } from 'firebase/auth';

interface LobbyViewProps {
  room: GameRoom | null;
  currentUser: User | null;
  currentUserId: string;
  userName: string;
  setUserName: (name: string) => void;
  userEmail: string;
  setUserEmail: (email: string) => void;
  userAvatar: string;
  setUserAvatar: (avatar: string) => void;
  onCreateRoom: (maxPlayers: number) => Promise<void>;
  onJoinRoom: (roomCode: string) => Promise<void>;
  onStartGame: () => Promise<void>;
  onAddBot: () => Promise<void>;
  onToggleReady: () => Promise<void>;
  onOpenRules: () => void;
  onSignInWithGoogle: () => Promise<void>;
  onSignOut: () => Promise<void>;
  isCreatingOrJoining: boolean;
  errorMessage: string | null;
  clearError: () => void;
}

const AVATARS = ['🦁', '🦅', '🐆', '🐘', '👑', '⚡️', '🦏', '🐅', '🔥', '⭐️'];

export const LobbyView: React.FC<LobbyViewProps> = ({
  room,
  currentUser,
  currentUserId,
  userName,
  setUserName,
  userEmail,
  setUserEmail,
  userAvatar,
  setUserAvatar,
  onCreateRoom,
  onJoinRoom,
  onStartGame,
  onAddBot,
  onToggleReady,
  onOpenRules,
  onSignInWithGoogle,
  onSignOut,
  isCreatingOrJoining,
  errorMessage,
  clearError,
}) => {
  const [targetPlayers, setTargetPlayers] = useState<number>(2);
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  // Check URL query parameters for auto-join
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && !room) {
      setJoinCodeInput(roomParam.toUpperCase());
      setActiveTab('join');
    }
  }, [room]);

  const copyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.id);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInviteLink = () => {
    if (!room) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${room.id}`;
    if (navigator.share) {
      navigator.share({
        title: 'Join my Wott Game!',
        text: `Play classic Wott with me! Room code: ${room.id}`,
        url,
      }).catch(() => {
        navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      });
    } else {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const isHost = room?.hostId === currentUserId || (room?.players && room.players[0]?.id === currentUserId);
  const me = room?.players.find((p) => p.id === currentUserId);
  const myReadyState = me?.isReady ?? isHost;

  // Count ready players
  const readyPlayersCount = room?.players.filter((p) => p.isReady || p.isHost || p.isBot).length ?? 0;
  const totalPlayers = room?.players.length ?? 0;
  const allReady = totalPlayers >= 2 && readyPlayersCount === totalPlayers;

  // Render Waiting Room Lobby if already in a room
  if (room && room.status === 'waiting') {
    return (
      <div className="max-w-2xl w-full mx-auto p-4 sm:p-6 bg-stone-900/90 border border-amber-600/40 rounded-3xl shadow-2xl backdrop-blur-md text-stone-100 animate-fade-in">
        {/* Lobby Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Users size={14} /> Room Lobby
          </div>
          <h2 className="text-3xl font-black text-amber-300 tracking-tight">
            Game Room: <span className="font-mono text-white tracking-widest">{room.id}</span>
          </h2>
          <p className="text-sm text-stone-300 mt-1">
            Share the code with friends! Once players click <strong className="text-emerald-400">Ready</strong>, the host can start the game.
          </p>
        </div>

        {/* Room Code & Share Box */}
        <div className="bg-stone-950/80 p-4 rounded-2xl border border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
          <div className="text-center sm:text-left">
            <div className="text-xs text-stone-400 uppercase tracking-wider font-semibold">
              Multiplayer Room Code
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-amber-400">
              {room.id}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={copyCode}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold border border-stone-700 transition-all cursor-pointer"
            >
              {copiedCode ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              {copiedCode ? 'Copied Code!' : 'Copy Code'}
            </button>

            <button
              onClick={copyInviteLink}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black shadow-lg transition-all cursor-pointer"
            >
              {copiedLink ? <Check size={16} /> : <Share2 size={16} />}
              {copiedLink ? 'Link Copied!' : 'Share Invite'}
            </button>
          </div>
        </div>

        {/* Ready Action Banner for Current Player */}
        <div className="mb-5 p-3.5 rounded-2xl bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 border border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow ${
                myReadyState
                  ? 'bg-emerald-500 text-stone-950'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}
            >
              {myReadyState ? <Check size={20} /> : <Clock size={18} />}
            </div>
            <div>
              <div className="text-xs font-bold text-stone-200">
                Your Status:{' '}
                <span className={myReadyState ? 'text-emerald-400 font-black' : 'text-amber-400 font-bold'}>
                  {myReadyState ? 'Ready to Play!' : 'Not Ready Yet'}
                </span>
              </div>
              <div className="text-[11px] text-stone-400">
                {myReadyState
                  ? 'Waiting for host to start the game...'
                  : 'Click Ready so the host can start!'}
              </div>
            </div>
          </div>

          <button
            onClick={onToggleReady}
            disabled={isCreatingOrJoining}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-black text-xs shadow-lg transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 ${
              myReadyState
                ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-stone-950 shadow-emerald-500/25 animate-pulse'
            }`}
          >
            {myReadyState ? (
              <>
                <CheckCircle2 size={15} className="text-emerald-400" />
                <span>You are Ready (Click to Cancel)</span>
              </>
            ) : (
              <>
                <Zap size={15} />
                <span>Click Here to Ready Up!</span>
              </>
            )}
          </button>
        </div>

        {/* Players in Room */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
              <Users size={16} /> Players in Lobby ({room.players.length} / {room.maxPlayers})
              <span className="text-xs font-normal text-stone-500">
                ({readyPlayersCount} Ready)
              </span>
            </h3>
            {isHost && room.players.length < room.maxPlayers && (
              <button
                onClick={onAddBot}
                disabled={isCreatingOrJoining}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-bold border border-stone-700 transition-colors cursor-pointer"
              >
                <Bot size={14} /> Add AI Bot
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {room.players.map((p) => {
              const isCurrent = p.id === currentUserId;
              const isPlayerReady = p.isReady || p.isHost || p.isBot;

              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/30'
                      : 'bg-stone-950/50 border-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-stone-800 border border-stone-700 flex items-center justify-center text-2xl shadow-inner">
                      {p.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-stone-100">
                          {p.name} {isCurrent && '(You)'}
                        </span>
                        {p.isHost && (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <Crown size={10} /> Host
                          </span>
                        )}
                        {p.isBot && (
                          <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            BOT
                          </span>
                        )}
                      </div>

                      {/* Ready Badge */}
                      <div className="mt-1 flex items-center gap-1">
                        {isPlayerReady ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                            <Clock size={11} />
                            Waiting...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty Slots */}
            {Array.from({ length: Math.max(0, room.maxPlayers - room.players.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center justify-center p-3.5 rounded-2xl border border-dashed border-stone-800 bg-stone-950/20 text-stone-500 text-xs font-medium"
              >
                Waiting for friend to join...
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-stone-800">
          <button
            onClick={onOpenRules}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors cursor-pointer"
          >
            <BookOpen size={16} /> Game Rules & Cheatsheet
          </button>

          {isHost ? (
            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
              {room.players.length === 1 && (
                <button
                  onClick={onAddBot}
                  disabled={isCreatingOrJoining}
                  className="w-full sm:w-auto px-4 py-3.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-bold border border-amber-500/40 transition-colors cursor-pointer"
                >
                  <Bot size={15} className="inline mr-1" /> Add Bot to Play Solo
                </button>
              )}

              <button
                onClick={onStartGame}
                disabled={isCreatingOrJoining}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-sm font-black shadow-xl shadow-amber-500/25 transition-all cursor-pointer active:scale-95"
              >
                <Play size={18} fill="currentColor" />
                {isCreatingOrJoining
                  ? 'Starting Wott...'
                  : allReady
                  ? `Start Game Now (${room.players.length} Players)`
                  : room.players.length === 1
                  ? 'Start Game (Adds Bot)'
                  : `Start Game (${readyPlayersCount}/${room.players.length} Ready)`}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-300 font-medium animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Waiting for host to start the game...
            </div>
          )}
        </div>
      </div>
    );
  }

  // Initial Screen: Create or Join
  return (
    <div className="max-w-xl w-full mx-auto p-4 sm:p-6 bg-stone-900/95 border border-amber-600/40 rounded-3xl shadow-2xl backdrop-blur-md text-stone-100 animate-fade-in">
      {/* Brand Title */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-pink-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles size={14} /> Classic African Card Game
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 tracking-tight drop-shadow-sm">
          WOTT MULTIPLAYER
        </h1>
        <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-md mx-auto">
          Play the legendary game of strategy, quick wit, Pick 3s, General Market, and Hold Ons with friends!
        </p>
      </div>

      {/* Account / Player Bar */}
      <div className="mb-5 bg-stone-950/80 p-3.5 rounded-2xl border border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center justify-center font-bold">
            <UserCheck size={14} />
          </div>
          <div>
            <div className="font-bold text-stone-200 flex items-center gap-1.5">
              <span>Playing as:</span>
              <strong className="text-amber-400 font-black">{userName}</strong>
              {currentUser && <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1 rounded">Google Verified</span>}
            </div>
            <div className="text-[11px] text-stone-400 font-mono">
              {userEmail || 'Active Player'}
            </div>
          </div>
        </div>

        {/* Optional Google Login */}
        <div className="flex items-center gap-2">
          {!currentUser ? (
            <button
              onClick={onSignInWithGoogle}
              disabled={isCreatingOrJoining}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-bold text-xs shadow-sm transition-all cursor-pointer"
              title="Sign in with your Google account"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Link Google</span>
            </button>
          ) : (
            <button
              onClick={onSignOut}
              className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-red-400 transition-colors cursor-pointer"
            >
              <LogOut size={13} /> Sign Out
            </button>
          )}
        </div>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-2xl bg-amber-950/80 border border-amber-700/80 text-amber-200 text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={clearError} className="font-bold underline ml-2 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Player Customizer */}
      <div className="bg-stone-950/80 p-4 rounded-2xl border border-stone-800 mb-6 space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">
          Player Profile & Email
        </label>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-stone-800 border-2 border-amber-500/60 flex items-center justify-center text-3xl shadow-inner shrink-0">
            {userAvatar}
          </div>

          <div className="flex-1 w-full space-y-2">
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value.slice(0, 18))}
              placeholder="Your Player Name"
              className="w-full bg-stone-900 border border-stone-700 text-stone-100 font-bold px-3.5 py-2 rounded-xl focus:outline-none focus:border-amber-500 text-sm"
            />
            <div className="relative">
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="your.email@gmail.com"
                className="w-full bg-stone-900 border border-stone-700 text-stone-300 font-medium px-3.5 py-1.5 rounded-xl focus:outline-none focus:border-amber-500 text-xs"
              />
              <span className="absolute right-3 top-2 text-[10px] text-stone-500">Verified Email</span>
            </div>
          </div>
        </div>

        {/* Quick Avatar Picker */}
        <div>
          <div className="text-[11px] text-stone-400 mb-1 font-semibold">Choose Your Avatar:</div>
          <div className="flex items-center justify-between gap-1 overflow-x-auto scrollbar-none pt-0.5">
            {AVATARS.map((av) => (
              <button
                key={av}
                type="button"
                onClick={() => setUserAvatar(av)}
                className={`p-1.5 rounded-xl text-xl hover:bg-stone-800 transition-all cursor-pointer ${
                  userAvatar === av ? 'bg-amber-500/20 ring-2 ring-amber-400 scale-110' : 'opacity-70'
                }`}
              >
                {av}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs: Create Game vs Join Game */}
      <div className="flex rounded-2xl bg-stone-950 p-1.5 border border-stone-800 mb-6">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeTab === 'create'
              ? 'bg-amber-500 text-stone-950 shadow-lg'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Create New Game
        </button>
        <button
          onClick={() => setActiveTab('join')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeTab === 'join'
              ? 'bg-amber-500 text-stone-950 shadow-lg'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Join with Code
        </button>
      </div>

      {/* Tab 1: Create Game */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
              Select Number of Players (2 to 8)
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {[2, 3, 4, 5, 6, 7, 8].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setTargetPlayers(num)}
                  className={`py-3 rounded-xl font-black text-sm flex flex-col items-center justify-center transition-all cursor-pointer border ${
                    targetPlayers === num
                      ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-stone-950 border-amber-300 shadow-lg shadow-amber-500/25 scale-105'
                      : 'bg-stone-950/80 text-stone-300 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <span className="text-base">{num}</span>
                  <span className="text-[10px] font-semibold opacity-80">Players</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-stone-400 mt-2">
              Each player receives 5 cards. General Market starts with 30 cards. 25s turn timer with 35s penalty protection.
            </p>
          </div>

          <button
            onClick={() => onCreateRoom(targetPlayers)}
            disabled={isCreatingOrJoining}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-stone-950 font-black text-base shadow-xl shadow-amber-500/25 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isCreatingOrJoining ? (
              'Creating Room...'
            ) : (
              <>
                Generate Room & Code <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      )}

      {/* Tab 2: Join Game */}
      {activeTab === 'join' && (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
              Enter Room Code
            </label>
            <input
              type="text"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. WOTT-8241"
              maxLength={12}
              className="w-full bg-stone-950 border border-stone-700 font-mono text-xl sm:text-2xl font-black text-amber-400 tracking-widest text-center px-4 py-3 rounded-2xl focus:outline-none focus:border-amber-500 uppercase"
            />
          </div>

          <button
            onClick={() => onJoinRoom(joinCodeInput)}
            disabled={isCreatingOrJoining || !joinCodeInput.trim()}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-stone-950 font-black text-base shadow-xl shadow-amber-500/25 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isCreatingOrJoining ? 'Connecting to Room...' : 'Enter Game Room'}
          </button>
        </div>
      )}

      {/* Rules Quick Link */}
      <div className="mt-6 pt-4 border-t border-stone-800/80 flex items-center justify-center">
        <button
          onClick={onOpenRules}
          className="flex items-center gap-2 text-xs font-bold text-amber-400/90 hover:text-amber-300 transition-colors cursor-pointer"
        >
          <BookOpen size={16} /> Learn Game Rules (5 Pick 3, 2 Pick 2, 14 General Market)
        </button>
      </div>
    </div>
  );
};
