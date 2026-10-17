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
  Mic,
} from 'lucide-react';
import { GameRoom, PlayerSummary } from '../types/wott';
import { User } from 'firebase/auth';

interface LobbyViewProps {
  room: GameRoom | null;
  currentUser: { uid?: string; email?: string | null; displayName?: string | null } | null;
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

  const me =
    room?.players.find((p) => p.id === currentUserId) ||
    room?.players.find((p) => p.name === userName) ||
    (room?.players && room.players[0]);
  const effectiveUserId = me?.id || currentUserId;
  const isHost =
    room?.hostId === effectiveUserId ||
    (room?.players && room.players[0]?.id === effectiveUserId) ||
    me?.isHost === true;
  const myReadyState = me?.isReady ?? isHost;

  // Strict opponent ready check: Every human opponent MUST click ready before game can start
  const humanOpponents = room?.players.filter((p) => p.id !== effectiveUserId && !p.isBot) ?? [];
  const unreadyOpponents = humanOpponents.filter((p) => !p.isReady);
  const areAllOpponentsReady = humanOpponents.length === 0 || unreadyOpponents.length === 0;
  const readyPlayersCount = room?.players.filter((p) => p.isReady || p.isHost || p.isBot).length ?? 0;
  const totalPlayers = room?.players.length ?? 0;
  const canStartGame = areAllOpponentsReady && (totalPlayers >= 2 || (isHost && totalPlayers === 1));

  // Render Waiting Room Lobby if already in a room
  if (room && room.status === 'waiting') {
    return (
      <div className="max-w-2xl w-full mx-auto p-4 sm:p-6 bg-stone-900/90 border border-amber-600/40 rounded-3xl shadow-2xl backdrop-blur-md text-stone-100 animate-fade-in">
        {/* Error Alert if any */}
        {errorMessage && (
          <div className="mb-4 p-3.5 bg-red-950/90 border border-red-500/50 rounded-2xl flex items-center justify-between text-xs text-red-200 shadow-lg">
            <span>{errorMessage}</span>
            <button
              onClick={clearError}
              className="text-stone-400 hover:text-white font-bold ml-2 cursor-pointer px-2 py-0.5 rounded-lg bg-stone-800"
            >
              ✕
            </button>
          </div>
        )}

        {/* Lobby Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Users size={14} /> Room Lobby
          </div>
          <h2 className="text-3xl font-black text-amber-300 tracking-tight">
            Game Room: <span className="font-mono text-white tracking-widest">{room.id}</span>
          </h2>
          <p className="text-sm text-stone-300 mt-1">
            Share the code with friends! Once players click <strong className="text-emerald-400">Ready</strong>, click <strong className="text-amber-400">Start Game</strong> to begin immediately.
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

                      {/* Ready Badge & Voice Status */}
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
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
                        {!p.isBot && p.isMicActive && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/40">
                            <Mic size={10} className="animate-pulse" /> Mic On
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
                disabled={!canStartGame || isCreatingOrJoining}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-black transition-all cursor-pointer ${
                  canStartGame && !isCreatingOrJoining
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-xl shadow-amber-500/25 active:scale-95 animate-pulse'
                    : 'bg-stone-800 text-stone-400 border border-stone-700 cursor-not-allowed opacity-80'
                }`}
                title={
                  !areAllOpponentsReady
                    ? `Opponents must click Ready first! Waiting for: ${unreadyOpponents.map((o) => o.name).join(', ')}`
                    : 'Start Game'
                }
              >
                <Play size={18} fill="currentColor" />
                {isCreatingOrJoining
                  ? 'Starting Wott...'
                  : !areAllOpponentsReady
                  ? `Waiting for ${unreadyOpponents[0]?.name || 'Opponent'} to click Ready...`
                  : room.players.length === 1
                  ? 'Start Game (With Bot)'
                  : `Everyone Ready! Start Game (${room.players.length} Players)`}
              </button>
            </div>
          ) : (
            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-amber-300 font-medium">
                <span className={`w-2.5 h-2.5 rounded-full ${myReadyState ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {myReadyState ? (
                  <span>
                    You are Ready! Waiting for host to click <strong>Start Game</strong>...
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold animate-pulse">
                    ⚠️ Please click "Click Here to Ready Up!" above so the game can start!
                  </span>
                )}
              </div>
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

      {/* Account / Player Bar - Displays ONLY in-game name and avatar (Zero email exposure) */}
      <div className="mb-5 bg-stone-950/80 p-3.5 rounded-2xl border border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-lg font-bold shadow-inner">
            {userAvatar}
          </div>
          <div>
            <div className="font-bold text-stone-200 flex items-center gap-1.5">
              <span>Playing as:</span>
              <strong className="text-amber-400 font-black text-sm">{userName}</strong>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-semibold border border-emerald-500/30">
                Verified
              </span>
            </div>
            <div className="text-[11px] text-stone-400">
              Ready for Online Multiplayer
            </div>
          </div>
        </div>

        {/* Switch User / Sign Out */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-red-400 border border-stone-700 text-xs font-bold transition-all cursor-pointer"
            title="Sign out or switch account"
          >
            <LogOut size={13} />
            <span>Switch User / Logout</span>
          </button>
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
