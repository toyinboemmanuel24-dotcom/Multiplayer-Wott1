import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  ChevronUp,
  ChevronDown,
  Heart,
  Reply,
  X,
} from 'lucide-react';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { ChatMessage, PlayerSummary } from '../types/wott';
import { VoiceChatController, sounds } from '../utils/audio';

interface ChatVoiceBarProps {
  roomId: string;
  currentPlayer: { id: string; name: string; avatar: string };
  players: PlayerSummary[];
  recentMessages?: ChatMessage[];
  chatOpenTrigger?: number;
  onPlayerVoiceUpdate?: (micActive: boolean, speakerActive: boolean) => void;
  onRemoteSpeakingUpdate?: (peerId: string, isSpeaking: boolean) => void;
}

const QUICK_SHOUTS = [
  'General Market! 🛒',
  'Pick 3! 🔥',
  'Pick 2! ✌️',
  'Hold On! ✋',
  'Last Card! 🃏',
  'Oya play! ⏳',
  'Check! 🏆',
  'Nice move! 👏',
  'I have you! 😂',
];

const EMOJI_REACTIONS = ['❤️', '👍', '😂', '🔥', '👏'];
const HOLD_DURATION_MS = 3000; // 3 seconds required hold to like

export const ChatVoiceBar: React.FC<ChatVoiceBarProps> = ({
  roomId,
  currentPlayer,
  players,
  recentMessages = [],
  chatOpenTrigger = 0,
  onPlayerVoiceUpdate,
  onRemoteSpeakingUpdate,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [replyingTo, setReplyingTo] = useState<{ id: string; senderName: string; text: string } | null>(null);

  useEffect(() => {
    if (chatOpenTrigger > 0) {
      setIsExpanded(true);
    }
  }, [chatOpenTrigger]);

  // Floating preview for newest incoming message when collapsed
  const [livePreviewMessage, setLivePreviewMessage] = useState<ChatMessage | null>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSendingRef = useRef<boolean>(false);

  // Voice States
  const [isMicOn, setIsMicOn] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  // Hold-to-Like States (3 seconds requirement)
  const [holdingMessageId, setHoldingMessageId] = useState<string | null>(null);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [recentlyLikedId, setRecentlyLikedId] = useState<string | null>(null);

  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdStartTimeRef = useRef<number | null>(null);
  const voiceCtrlRef = useRef<VoiceChatController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevMsgCountRef = useRef<number>(0);
  const isExpandedRef = useRef<boolean>(isExpanded);

  // Keep isExpandedRef in sync so callbacks see the latest value without restarting effects
  useEffect(() => {
    isExpandedRef.current = isExpanded;
    if (isExpanded) {
      setUnreadCount(0);
      setLivePreviewMessage(null);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [isExpanded]);

  // Ref for remote speaking callback to prevent controller recreation on re-render
  const onRemoteSpeakingUpdateRef = useRef(onRemoteSpeakingUpdate);
  useEffect(() => {
    onRemoteSpeakingUpdateRef.current = onRemoteSpeakingUpdate;
  }, [onRemoteSpeakingUpdate]);

  // Initialize Voice Controller ONCE on mount
  useEffect(() => {
    voiceCtrlRef.current = new VoiceChatController(
      (speaking) => {
        setIsSpeaking(speaking);
      },
      (peerId, speaking) => {
        if (onRemoteSpeakingUpdateRef.current) {
          onRemoteSpeakingUpdateRef.current(peerId, speaking);
        }
      }
    );

    return () => {
      if (voiceCtrlRef.current) {
        voiceCtrlRef.current.cleanup();
      }
    };
  }, []);

  // Compute stable opponent IDs list
  const opponentIds = useMemo(() => {
    return players
      .filter((p) => p.id !== currentPlayer.id && !p.isBot)
      .map((p) => p.id)
      .sort();
  }, [players, currentPlayer.id]);

  const opponentIdsKey = opponentIds.join(',');

  // Connect WebRTC signaling for room
  useEffect(() => {
    if (!roomId || !currentPlayer.id || !voiceCtrlRef.current) return;
    voiceCtrlRef.current.connectToRoom(roomId, currentPlayer.id, opponentIds);
  }, [roomId, currentPlayer.id, opponentIdsKey]);

  // Listen to Firestore real-time messages (WITHOUT orderBy to prevent indexing lag)
  useEffect(() => {
    if (!roomId) return;
    const messagesRef = collection(db, `rooms/${roomId}/messages`);

    const unsubscribe = onSnapshot(
      messagesRef,
      (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          msgs.push({ id: docSnap.id, ...(docSnap.data() as Omit<ChatMessage, 'id'>) });
        });

        // Sort client-side by timestamp
        msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        setMessages((prev) => {
          // Merge with any optimistic messages not yet in snapshot, deduplicating strictly by ID and content
          const realIds = new Set(msgs.map((m) => m.id));
          const stillPending = prev.filter(
            (p) =>
              p.id.startsWith('temp_') &&
              !realIds.has(p.id) &&
              !msgs.some(
                (m) =>
                  m.senderId === p.senderId &&
                  m.text === p.text &&
                  Math.abs((m.timestamp || 0) - (p.timestamp || 0)) < 6000
              )
          );
          return [...msgs, ...stillPending];
        });

        // Check for new incoming message from opponent
        if (msgs.length > prevMsgCountRef.current && prevMsgCountRef.current > 0) {
          const newest = msgs[msgs.length - 1];
          if (newest && newest.senderId !== currentPlayer.id) {
            sounds.playMessage();

            // If chat drawer is closed, pop up above dock and leave after exactly 1 second
            if (!isExpandedRef.current) {
              setUnreadCount((prev) => prev + 1);
              setLivePreviewMessage(newest);

              if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
              previewTimerRef.current = setTimeout(() => {
                setLivePreviewMessage(null);
              }, 1000); // Leaves after 1 second!
            }
          }
        }
        prevMsgCountRef.current = msgs.length;

        // Auto-scroll to bottom if open
        if (isExpandedRef.current) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 40);
        }
      },
      (error) => {
        console.warn('Live messages snapshot notice:', error);
      }
    );

    return () => {
      unsubscribe();
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [roomId, currentPlayer.id]);

  // Clean up any active hold timer on unmount
  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, []);

  // Handle message hold start (3-second timer)
  const startHoldMessage = (message: ChatMessage) => {
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);

    setHoldingMessageId(message.id);
    setHoldProgress(0);
    holdStartTimeRef.current = Date.now();

    holdIntervalRef.current = setInterval(() => {
      if (!holdStartTimeRef.current) return;
      const elapsed = Date.now() - holdStartTimeRef.current;
      const progress = Math.min(100, Math.round((elapsed / HOLD_DURATION_MS) * 100));
      setHoldProgress(progress);

      if (elapsed >= HOLD_DURATION_MS) {
        // 3 seconds reached! Trigger like!
        if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
        holdIntervalRef.current = null;
        holdStartTimeRef.current = null;
        setHoldingMessageId(null);
        setHoldProgress(0);

        handleTriggerLike(message);
      }
    }, 40);
  };

  // Cancel hold if user releases or moves away before 3 seconds
  const cancelHoldMessage = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    holdStartTimeRef.current = null;
    setHoldingMessageId(null);
    setHoldProgress(0);
  };

  // Toggle Like in Firestore
  const handleTriggerLike = async (message: ChatMessage) => {
    sounds.playHeartPop();

    setRecentlyLikedId(message.id);
    setTimeout(() => setRecentlyLikedId(null), 1200);

    try {
      const msgRef = doc(db, `rooms/${roomId}/messages`, message.id);
      const currentLikes = message.likes || [];
      const hasLiked = currentLikes.includes(currentPlayer.id);

      const updatedLikes = hasLiked
        ? currentLikes.filter((id) => id !== currentPlayer.id)
        : [...currentLikes, currentPlayer.id];

      // Optimistic update
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, likes: updatedLikes } : m))
      );

      await updateDoc(msgRef, {
        likes: updatedLikes,
      });
    } catch (err) {
      console.warn('Could not update likes:', err);
    }
  };

  // Toggle Emoji reaction
  const handleToggleReaction = async (message: ChatMessage, emoji: string) => {
    sounds.playHeartPop();
    try {
      const msgRef = doc(db, `rooms/${roomId}/messages`, message.id);
      const currentReactions = message.reactions || {};
      const usersForEmoji = currentReactions[emoji] || [];
      const hasReacted = usersForEmoji.includes(currentPlayer.id);

      const updatedUsers = hasReacted
        ? usersForEmoji.filter((id) => id !== currentPlayer.id)
        : [...usersForEmoji, currentPlayer.id];

      const newReactions = {
        ...currentReactions,
        [emoji]: updatedUsers,
      };

      // Optimistic update
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, reactions: newReactions } : m))
      );

      await updateDoc(msgRef, {
        reactions: newReactions,
      });
    } catch (err) {
      console.warn('Could not update reaction:', err);
    }
  };

  const handleStartReply = (message: ChatMessage) => {
    setReplyingTo({
      id: message.id,
      senderName: message.senderName,
      text: message.text,
    });
    setIsExpanded(true);
    setLivePreviewMessage(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !roomId || isSendingRef.current) return;

    isSendingRef.current = true;
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newMsg: ChatMessage = {
      id: tempId,
      roomId,
      senderId: currentPlayer.id,
      senderName: currentPlayer.name,
      senderAvatar: currentPlayer.avatar,
      text,
      type: 'chat',
      likes: [],
      reactions: {},
      timestamp: Date.now(),
      replyTo: replyingTo || undefined,
    };

    // 1. Optimistic update: appear immediately on sender's screen once
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    setReplyingTo(null);

    // Auto-scroll
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 40);

    // 2. Add to Firestore subcollection (single canonical message source)
    try {
      const messagesRef = collection(db, `rooms/${roomId}/messages`);
      const docRef = await addDoc(messagesRef, {
        roomId,
        senderId: currentPlayer.id,
        senderName: currentPlayer.name,
        senderAvatar: currentPlayer.avatar,
        text,
        type: 'chat',
        likes: [],
        reactions: {},
        timestamp: Date.now(),
        ...(replyingTo ? { replyTo: replyingTo } : {}),
      });

      // Update optimistic message with real doc ID
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: docRef.id } : m))
      );
    } catch (err) {
      console.warn('Could not send message to subcollection:', err);
    } finally {
      isSendingRef.current = false;
    }

    // 3. Update room.lastAction for table banner announcement (WITHOUT duplicating in recentMessages)
    try {
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        lastAction: {
          text: `💬 ${currentPlayer.name}: "${text.length > 30 ? text.slice(0, 30) + '...' : text}"`,
          playerId: currentPlayer.id,
          playerName: currentPlayer.name,
          timestamp: Date.now(),
          badgeType: 'info',
        },
      });
    } catch {
      // Non-critical
    }
  };

  // Toggle Microphone
  const toggleMic = async () => {
    if (!voiceCtrlRef.current) return;
    setMicError(null);

    try {
      voiceCtrlRef.current.unlockAudio();
      const active = await voiceCtrlRef.current.toggleMic();
      setIsMicOn(active);
      if (onPlayerVoiceUpdate) {
        onPlayerVoiceUpdate(active, isSpeakerOn);
      }
    } catch (err) {
      console.warn('Error toggling microphone:', err);
      setMicError('Could not start microphone. Please check permissions.');
    }
  };

  // Toggle Speaker
  const toggleSpeaker = () => {
    if (!voiceCtrlRef.current) return;
    voiceCtrlRef.current.unlockAudio();
    const active = voiceCtrlRef.current.toggleSpeaker();
    setIsSpeakerOn(active);
    if (onPlayerVoiceUpdate) {
      onPlayerVoiceUpdate(isMicOn, active);
    }
  };

  return (
    <div className="fixed bottom-3 right-3 sm:right-6 z-40 max-w-sm w-[92vw] sm:w-96 flex flex-col justify-end pointer-events-none">
      {/* Live Floating Message Toast for Opponent's New Message (pops up above dock and vanishes after 1s) */}
      {!isExpanded && livePreviewMessage && (
        <div className="pointer-events-auto mb-2 bg-stone-900/98 border border-amber-500 rounded-2xl px-3 py-2 shadow-2xl backdrop-blur-md animate-bounce-subtle flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl shrink-0">{livePreviewMessage.senderAvatar}</span>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-amber-300 truncate">
                {livePreviewMessage.senderName} says:
              </div>
              <div className="text-xs text-stone-100 font-bold truncate max-w-[220px]">
                "{livePreviewMessage.text}"
              </div>
            </div>
          </div>
          <button
            onClick={() => setLivePreviewMessage(null)}
            className="text-stone-400 hover:text-stone-200 p-0.5 cursor-pointer shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Expanded Message Box */}
      {isExpanded && (
        <div className="pointer-events-auto mb-2 bg-stone-900/98 border border-amber-600/40 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden flex flex-col max-h-[460px] h-[400px]">
          {/* Header */}
          <div className="px-4 py-2.5 bg-stone-950/95 border-b border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-amber-400" />
              <span className="font-bold text-xs text-amber-200">Table Chat & Live Banter</span>
              <span className="text-[10px] bg-stone-800 text-stone-400 px-1.5 py-0.2 rounded-full font-mono">
                {messages.length}
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-stone-400 hover:text-stone-200 text-xs p-1 cursor-pointer"
              title="Minimize chat"
            >
              <ChevronDown size={18} />
            </button>
          </div>

          {/* Hold-to-Like instructions banner */}
          <div className="px-3 py-1 bg-amber-950/50 border-b border-amber-900/30 flex items-center justify-between text-[10px] text-amber-300 font-medium">
            <span className="flex items-center gap-1">
              <Heart size={10} className="text-pink-400 fill-pink-400 animate-pulse" />
              <span>
                Hold message for <strong>3s</strong> to like ❤️ or tap emoji reactions!
              </span>
            </span>
            <span className="text-stone-400 font-mono">3s Hold</span>
          </div>

          {/* Quick Reaction Shouts */}
          <div className="p-2 border-b border-stone-800/80 bg-stone-950/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {QUICK_SHOUTS.map((phrase) => (
              <button
                key={phrase}
                onClick={() => handleSendMessage(phrase)}
                className="whitespace-nowrap px-2.5 py-1 text-[11px] font-bold rounded-full bg-stone-800 hover:bg-amber-600/30 text-amber-200 hover:text-amber-100 border border-stone-700/60 transition-all cursor-pointer active:scale-95"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Message List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs select-none">
            {messages.length === 0 ? (
              <div className="text-center text-stone-500 py-10 italic text-xs">
                No messages yet. Drop a message or quick shout above to chat with opponents!
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === currentPlayer.id;
                const isHoldingThis = holdingMessageId === msg.id;
                const likesCount = (msg.likes || []).length;
                const hasLiked = (msg.likes || []).includes(currentPlayer.id);
                const isBursting = recentlyLikedId === msg.id;
                const reactions = msg.reactions || {};

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col relative group ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {/* Reply quote indicator if responding to another message */}
                    {msg.replyTo && (
                      <div
                        className={`text-[10px] text-stone-400 flex items-center gap-1 mb-0.5 px-2 py-0.5 rounded bg-stone-950/60 border border-stone-800/80 max-w-[85%] truncate ${
                          isMe ? 'self-end' : 'self-start'
                        }`}
                      >
                        <Reply size={10} className="text-amber-400 shrink-0" />
                        <span className="font-semibold text-stone-300">
                          @{msg.replyTo.senderName}:
                        </span>
                        <span className="truncate italic">"{msg.replyTo.text}"</span>
                      </div>
                    )}

                    {/* Sender Header */}
                    <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mb-0.5">
                      <span>{msg.senderAvatar}</span>
                      <span className="font-medium text-stone-300">
                        {isMe ? 'You' : msg.senderName}
                      </span>
                    </div>

                    {/* Interactive Message Bubble with 3-Second Hold */}
                    <div
                      onMouseDown={() => startHoldMessage(msg)}
                      onMouseUp={cancelHoldMessage}
                      onMouseLeave={cancelHoldMessage}
                      onTouchStart={() => startHoldMessage(msg)}
                      onTouchEnd={cancelHoldMessage}
                      onTouchCancel={cancelHoldMessage}
                      className={`relative px-3 py-1.5 rounded-xl max-w-[85%] break-words leading-relaxed shadow-sm transition-all cursor-pointer select-none ${
                        isMe
                          ? 'bg-amber-600 text-stone-950 font-medium rounded-tr-none'
                          : 'bg-stone-800 text-stone-100 border border-stone-700/60 rounded-tl-none'
                      } ${isHoldingThis ? 'scale-105 ring-2 ring-pink-500 shadow-pink-500/30' : ''}`}
                    >
                      {/* Message Text */}
                      <span>{msg.text}</span>

                      {/* Hold-to-Like Progress Overlay */}
                      {isHoldingThis && (
                        <div className="absolute inset-0 bg-stone-950/85 backdrop-blur-xs rounded-xl flex items-center justify-between px-2.5 text-[10px] text-pink-300 font-bold z-20 overflow-hidden">
                          <div
                            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-pink-600/50 to-pink-500/80 transition-all duration-75"
                            style={{ width: `${holdProgress}%` }}
                          />
                          <div className="relative z-10 flex items-center gap-1">
                            <Heart size={12} className="text-pink-400 fill-pink-400 animate-ping" />
                            <span>Holding {Math.ceil(((100 - holdProgress) * 3) / 100)}s...</span>
                          </div>
                          <span className="relative z-10 font-mono text-[9px] text-pink-200">
                            {holdProgress}%
                          </span>
                        </div>
                      )}

                      {/* Floating Burst Heart on Completion */}
                      {isBursting && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 pointer-events-none z-30 animate-bounce">
                          <span className="text-xl">❤️</span>
                        </div>
                      )}
                    </div>

                    {/* Reactions & Actions Row */}
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {/* Likes Badge */}
                      {likesCount > 0 && (
                        <button
                          onClick={() => handleTriggerLike(msg)}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm transition-all cursor-pointer ${
                            hasLiked
                              ? 'bg-pink-950/90 text-pink-300 border border-pink-700/60'
                              : 'bg-stone-950/80 text-stone-400 border border-stone-800'
                          }`}
                        >
                          <Heart
                            size={10}
                            className={hasLiked ? 'text-pink-400 fill-pink-400' : 'text-stone-400'}
                          />
                          <span>{likesCount}</span>
                        </button>
                      )}

                      {/* Emoji reaction badges */}
                      {Object.entries(reactions).map(([emoji, userIds]) => {
                        if (!userIds || userIds.length === 0) return null;
                        const hasReactedEmoji = userIds.includes(currentPlayer.id);
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleToggleReaction(msg, emoji)}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm transition-all cursor-pointer ${
                              hasReactedEmoji
                                ? 'bg-amber-950/90 text-amber-300 border border-amber-600/60'
                                : 'bg-stone-950/80 text-stone-300 border border-stone-800'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span>{userIds.length}</span>
                          </button>
                        );
                      })}

                      {/* Quick reaction trigger buttons */}
                      <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        {EMOJI_REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleToggleReaction(msg, emoji)}
                            className="p-0.5 text-[11px] rounded hover:bg-stone-800 transition-transform active:scale-125 cursor-pointer"
                            title={`React ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}

                        {/* Reply Button */}
                        <button
                          onClick={() => handleStartReply(msg)}
                          className="flex items-center gap-0.5 text-[10px] text-stone-400 hover:text-amber-300 px-1 py-0.5 rounded hover:bg-stone-800 transition-colors cursor-pointer ml-0.5"
                          title="Reply to this message"
                        >
                          <Reply size={11} />
                          <span>Reply</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Replying banner if active */}
          {replyingTo && (
            <div className="px-3 py-1.5 bg-amber-950/80 border-t border-amber-800 flex items-center justify-between text-xs text-amber-200">
              <div className="flex items-center gap-1.5 truncate">
                <Reply size={13} className="text-amber-400 shrink-0" />
                <span className="font-semibold text-amber-300">Replying to {replyingTo.senderName}:</span>
                <span className="truncate italic text-stone-300">"{replyingTo.text}"</span>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-stone-400 hover:text-stone-200 p-0.5 cursor-pointer shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2 bg-stone-950/95 border-t border-stone-800 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={replyingTo ? `Reply to ${replyingTo.senderName}...` : 'Chat or hold message 3s to like ❤️'}
              maxLength={200}
              className="flex-1 bg-stone-900 border border-stone-700 text-xs text-stone-100 px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 rounded-xl bg-amber-500 text-stone-950 font-bold hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      {/* Floating Bottom Dock: Chat Launcher + Voice Controls (Mic & Speaker) */}
      <div className="pointer-events-auto flex items-center gap-2 bg-stone-950/95 border border-amber-600/40 p-1.5 rounded-full shadow-2xl backdrop-blur-md self-end">
        {/* Toggle Chat button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-800/80 hover:bg-stone-800 text-amber-300 text-xs font-bold transition-colors cursor-pointer"
        >
          <MessageSquare size={16} />
          <span className="hidden sm:inline">Messages</span>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          {unreadCount > 0 && !isExpanded && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow">
              {unreadCount}
            </span>
          )}
        </button>

        <div className="w-[1px] h-5 bg-stone-800" />

        {/* Microphone Toggle */}
        <div className="relative group">
          <button
            onClick={toggleMic}
            className={`p-2 rounded-full transition-all cursor-pointer relative ${
              isMicOn
                ? 'bg-emerald-500 text-stone-950 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                : 'bg-stone-800/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
            title={
              isMicOn
                ? 'Microphone ON: Opponents can hear you (Click to Mute)'
                : 'Microphone MUTED: Opponents cannot hear you (Click to Talk)'
            }
          >
            {isMicOn ? <Mic size={17} /> : <MicOff size={17} />}
            {isSpeaking && isMicOn && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full animate-ping" />
            )}
          </button>
          {micError && (
            <div className="absolute bottom-full mb-2 right-0 bg-red-900 border border-red-600 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
              {micError}
            </div>
          )}
        </div>

        {/* Speaker Toggle */}
        <button
          onClick={toggleSpeaker}
          className={`p-2 rounded-full transition-all cursor-pointer ${
            isSpeakerOn
              ? 'bg-stone-800/80 text-amber-400 hover:text-amber-300'
              : 'bg-red-500/20 text-red-400 border border-red-500/40'
          }`}
          title={
            isSpeakerOn
              ? 'Speaker ON: You can hear opponents and game sounds (Click to Mute)'
              : 'Speaker MUTED: Opponent voice and game sounds are silenced (Click to Unmute)'
          }
        >
          {isSpeakerOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>
      </div>
    </div>
  );
};
