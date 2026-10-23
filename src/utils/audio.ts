import { collection, addDoc, onSnapshot, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Sound effects via Web Audio API (zero external network dependencies)
class SoundFx {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Lazy initialize on first user gesture
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }

  // Card played click sound
  playCard() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Ignore audio failure
    }
  }

  // Draw card from market rustle sound
  playDraw() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.09);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Ignore audio failure
    }
  }

  // Turn start sound (gentle pleasant alert)
  playTurn() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // Ignore audio failure
    }
  }

  playTurnAlert() {
    this.playTurn();
  }

  // Timer ticking warning sound
  playTick() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch {
      // Ignore audio failure
    }
  }

  // Special Card Action (Wott 20, Hold On, General Market, Pick Two)
  playSpecial() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(440, nowTime(this.ctx));
      osc1.frequency.exponentialRampToValueAtTime(880, nowTime(this.ctx) + 0.16);

      osc2.frequency.setValueAtTime(554.37, nowTime(this.ctx));
      osc2.frequency.exponentialRampToValueAtTime(1108.73, nowTime(this.ctx) + 0.16);

      gain.gain.setValueAtTime(0.25, nowTime(this.ctx));
      gain.gain.exponentialRampToValueAtTime(0.001, nowTime(this.ctx) + 0.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(nowTime(this.ctx));
      osc2.start(nowTime(this.ctx));
      osc1.stop(nowTime(this.ctx) + 0.2);
      osc2.stop(nowTime(this.ctx) + 0.2);
    } catch {
      // Ignore audio failure
    }
  }

  // Hold-to-like building tension hum
  playHold(progress: number) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      // Pitch rises from 200Hz to 600Hz as progress approaches 100%
      osc.frequency.setValueAtTime(200 + progress * 400, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Ignore audio failure
    }
  }

  // Like completed pop chime
  playLike() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12); // D6

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Ignore audio failure
    }
  }

  playHeartPop() {
    this.playLike();
  }

  // Incoming message notification chime
  playMessage() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.setValueAtTime(880, now + 0.08); // A5

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.24);
    } catch {
      // Ignore audio failure
    }
  }

  // Victory Fanfare
  playWin() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const chord = [523.25, 659.25, 783.99, 1046.5]; // C major fanfare
      const now = this.ctx.currentTime;

      chord.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = now + i * 0.12;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.6);
      });
    } catch {
      // Ignore audio failure
    }
  }
}

function nowTime(ctx: AudioContext): number {
  return ctx.currentTime;
}

export const sounds = new SoundFx();

// Rock-solid STUN + OpenRelay TURN servers for WebRTC voice communication across all networks & mobile devices
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayprojectsecret',
    },
  ],
  iceCandidatePoolSize: 10,
};

// WebRTC Voice Chat Manager
export class VoiceChatController {
  private realMicStream: MediaStream | null = null;
  private silentAudioContext: AudioContext | null = null;
  private silentTrack: MediaStreamTrack | null = null;
  private silentStream: MediaStream | null = null;

  private isMicMuted: boolean = true;
  private isSpeakerMuted: boolean = false;
  private audioContext: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;

  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteAudioElements: Map<string, HTMLAudioElement> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private isMakingOffer: Map<string, boolean> = new Map();
  private ignoreOffer: Map<string, boolean> = new Map();
  private isSettingRemoteAnswerPending: Map<string, boolean> = new Map();
  private signalQueues: Map<string, Promise<void>> = new Map();

  private onSpeakingChange?: (isSpeaking: boolean) => void;
  private onRemoteSpeakingChange?: (peerId: string, isSpeaking: boolean) => void;

  private localVadFrameId: number | null = null;
  private remoteVadFrameIds: Map<string, number> = new Map();
  private unsubscribeSignals: (() => void) | null = null;
  private currentRoomId: string | null = null;
  private currentUserId: string | null = null;
  private knownOpponents: Set<string> = new Set();
  private containerEl: HTMLElement | null = null;

  constructor(
    onSpeakingChange?: (isSpeaking: boolean) => void,
    onRemoteSpeakingChange?: (peerId: string, isSpeaking: boolean) => void
  ) {
    this.onSpeakingChange = onSpeakingChange;
    this.onRemoteSpeakingChange = onRemoteSpeakingChange;
    this.ensureAudioContainer();
    this.setupAutoplayUnlock();
    this.initSilentTrack();
  }

  private ensureAudioContainer(): HTMLElement {
    let container = document.getElementById('wott-voice-audio-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'wott-voice-audio-container';
      container.style.position = 'fixed';
      container.style.bottom = '0';
      container.style.right = '0';
      container.style.width = '1px';
      container.style.height = '1px';
      container.style.overflow = 'hidden';
      container.style.opacity = '0.01';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);
    }
    this.containerEl = container;
    return container;
  }

  // Pre-generate a continuous silent audio track via Web Audio
  // This guarantees an active RTP audio transceiver is negotiated from the very start,
  // allowing instant replaceTrack when the user unmutes their mic!
  private initSilentTrack() {
    if (this.silentTrack && this.silentTrack.readyState === 'live') {
      return;
    }
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.silentAudioContext = new AudioCtx();
      const dest = this.silentAudioContext.createMediaStreamDestination();
      const osc = this.silentAudioContext.createOscillator();
      const gain = this.silentAudioContext.createGain();
      gain.gain.value = 0; // Pure silence
      osc.connect(gain);
      gain.connect(dest);
      osc.start();

      this.silentTrack = dest.stream.getAudioTracks()[0];
      this.silentStream = dest.stream;
    } catch (e) {
      console.warn('[WebRTC] Silent track initialization:', e);
    }
  }

  private getCurrentLocalTrack(): MediaStreamTrack | null {
    if (this.realMicStream) {
      const realTrack = this.realMicStream.getAudioTracks()[0];
      if (realTrack && realTrack.readyState === 'live') {
        return realTrack;
      }
    }
    this.initSilentTrack();
    return this.silentTrack || null;
  }

  private getCurrentLocalStream(): MediaStream | null {
    if (this.realMicStream) {
      return this.realMicStream;
    }
    this.initSilentTrack();
    return this.silentStream || null;
  }

  private initAudioContext() {
    if (!this.audioContext) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    if (this.silentAudioContext && this.silentAudioContext.state === 'suspended') {
      this.silentAudioContext.resume().catch(() => {});
    }
  }

  // Unlocks browser audio playback across mobile Safari, Chrome, and desktop
  public unlockAudio() {
    this.initAudioContext();
    this.remoteAudioElements.forEach((audioEl) => {
      if (!this.isSpeakerMuted) {
        audioEl.muted = false;
        audioEl.volume = 1;
        if (audioEl.paused) {
          audioEl.play().catch(() => {});
        }
      }
    });
  }

  private setupAutoplayUnlock() {
    const unlock = () => {
      this.unlockAudio();
    };

    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  // Connect to room for WebRTC P2P signaling
  connectToRoom(roomId: string, currentUserId: string, opponentIds: string[]) {
    if (this.currentRoomId === roomId && this.currentUserId === currentUserId) {
      // Sync any new peers that may have joined
      this.syncPeers(opponentIds);
      return;
    }

    this.cleanup();
    this.currentRoomId = roomId;
    this.currentUserId = currentUserId;
    this.initAudioContext();
    this.initSilentTrack();

    // Listen for incoming WebRTC signals addressed to current player
    const signalsRef = collection(db, `rooms/${roomId}/signals`);
    const q = query(signalsRef, where('to', '==', currentUserId));

    this.unsubscribeSignals = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const docData = change.doc.data();
            const { from, type, payload } = docData;

            // Delete processed signal from Firestore immediately
            deleteDoc(change.doc.ref).catch(() => {});

            // Process signals sequentially per peer to avoid races
            this.enqueueSignal(from, type, payload);
          }
        });
      },
      (error) => {
        console.warn('[WebRTC] Signals subscription error:', error);
      }
    );

    // Sync mesh peers
    this.syncPeers(opponentIds);
  }

  // Sequential queue per peer to prevent race conditions
  private enqueueSignal(from: string, type: string, payload: string) {
    const previousQueue = this.signalQueues.get(from) || Promise.resolve();
    const nextQueue = previousQueue
      .then(async () => {
        await this.handleIncomingSignal(from, type, payload);
      })
      .catch((err) => {
        console.warn('[WebRTC] Signal queue execution error:', err);
      });
    this.signalQueues.set(from, nextQueue);
  }

  // Initiate peer connections with opponents
  syncPeers(opponentIds: string[]) {
    if (!this.currentRoomId || !this.currentUserId) return;

    opponentIds.forEach((targetId) => {
      if (targetId === this.currentUserId) return;

      const hadConnection = this.peerConnections.has(targetId);
      const pc = this.getOrCreatePeerConnection(targetId);

      // Deterministic initial offer: peer with smaller ID initiates initial handshake
      if (!hadConnection && this.currentUserId! < targetId && pc.signalingState === 'stable') {
        this.renegotiatePeer(targetId);
      }

      this.knownOpponents.add(targetId);
    });
  }

  private getOrCreatePeerConnection(peerId: string): RTCPeerConnection {
    let pc = this.peerConnections.get(peerId);
    if (pc && pc.signalingState !== 'closed') {
      return pc;
    }

    pc = new RTCPeerConnection(RTC_CONFIG);
    this.peerConnections.set(peerId, pc);
    this.isMakingOffer.set(peerId, false);
    this.ignoreOffer.set(peerId, false);
    this.isSettingRemoteAnswerPending.set(peerId, false);

    // Attach active or silent audio track immediately
    const trackToSend = this.getCurrentLocalTrack();
    const streamToSend = this.getCurrentLocalStream();
    if (trackToSend && streamToSend) {
      try {
        pc.addTrack(trackToSend, streamToSend);
      } catch {
        // Track already attached
      }
    } else {
      try {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
      } catch {}
    }

    // ICE Candidate handler
    pc.onicecandidate = async (event) => {
      if (event.candidate && this.currentRoomId && this.currentUserId) {
        try {
          await addDoc(collection(db, `rooms/${this.currentRoomId}/signals`), {
            from: this.currentUserId,
            to: peerId,
            type: 'candidate',
            payload: JSON.stringify(event.candidate),
            timestamp: Date.now(),
          });
        } catch (err) {
          console.warn('[WebRTC] Candidate send error:', err);
        }
      }
    };

    // Remote audio track handler: opponent audio received!
    pc.ontrack = (event) => {
      const stream =
        event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
      this.attachRemoteStream(peerId, stream);
    };

    // W3C Perfect Negotiation: onnegotiationneeded
    pc.onnegotiationneeded = async () => {
      try {
        await this.renegotiatePeer(peerId);
      } catch (err) {
        console.warn('[WebRTC] onnegotiationneeded error:', err);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc!.iceConnectionState === 'failed') {
        pc!.restartIce();
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc!.connectionState === 'connected') {
        this.unlockAudio();
      } else if (pc!.connectionState === 'failed') {
        pc!.restartIce();
      }
    };

    return pc;
  }

  // Dedicated DOM audio element attachment with zero-delay playback
  private attachRemoteStream(peerId: string, stream: MediaStream) {
    this.remoteStreams.set(peerId, stream);

    let audioEl = this.remoteAudioElements.get(peerId);
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.id = `audio-peer-${peerId}`;
      audioEl.autoplay = true;
      audioEl.setAttribute('autoplay', 'autoplay');
      audioEl.setAttribute('playsinline', 'playsinline');
      audioEl.setAttribute('webkit-playsinline', 'webkit-playsinline');
      (audioEl as unknown as { playsInline: boolean }).playsInline = true;

      // Mount inside persistent container
      const container = this.ensureAudioContainer();
      container.appendChild(audioEl);
      this.remoteAudioElements.set(peerId, audioEl);
    }

    if (audioEl.srcObject !== stream) {
      audioEl.srcObject = stream;
    }

    audioEl.muted = this.isSpeakerMuted;
    audioEl.volume = this.isSpeakerMuted ? 0 : 1;

    const playAudio = () => {
      if (!this.isSpeakerMuted && audioEl) {
        audioEl.muted = false;
        audioEl.volume = 1;
        audioEl.play().catch((err) => {
          console.log('[WebRTC] Autoplay waiting for interaction:', err);
        });
      }
    };

    playAudio();

    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.onunmute = () => {
        playAudio();
      };
    }

    // Attach voice activity detection for opponent speaking visualizer
    this.monitorRemoteVoice(peerId, stream);
  }

  // Send SDP offer to peer
  private async renegotiatePeer(targetId: string) {
    if (!this.currentRoomId || !this.currentUserId) return;
    const pc = this.getOrCreatePeerConnection(targetId);

    try {
      this.isMakingOffer.set(targetId, true);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
      });

      if (pc.signalingState !== 'stable') return;

      await pc.setLocalDescription(offer);

      await addDoc(collection(db, `rooms/${this.currentRoomId}/signals`), {
        from: this.currentUserId,
        to: targetId,
        type: 'offer',
        payload: JSON.stringify(pc.localDescription),
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn('[WebRTC] Error initiating offer:', err);
    } finally {
      this.isMakingOffer.set(targetId, false);
    }
  }

  // W3C Perfect Negotiation Signal Handler
  private async handleIncomingSignal(from: string, type: string, payload: string) {
    if (!payload || !this.currentRoomId || !this.currentUserId) return;
    const pc = this.getOrCreatePeerConnection(from);

    // Deterministic politeness: peer with larger ID is polite (rolls back on collision)
    const isPolite = this.currentUserId > from;

    if (type === 'offer') {
      try {
        const offerCollision =
          this.isMakingOffer.get(from) ||
          pc.signalingState !== 'stable' ||
          this.isSettingRemoteAnswerPending.get(from);

        this.ignoreOffer.set(from, !isPolite && !!offerCollision);
        if (this.ignoreOffer.get(from)) {
          return;
        }

        if (offerCollision) {
          try {
            await pc.setLocalDescription({ type: 'rollback' });
          } catch (rbErr) {
            console.warn('[WebRTC] Rollback error:', rbErr);
          }
        }

        const desc = new RTCSessionDescription(JSON.parse(payload));
        await pc.setRemoteDescription(desc);

        // Process queued ICE candidates
        const queued = this.pendingCandidates.get(from) || [];
        this.pendingCandidates.delete(from);
        for (const cand of queued) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch {}
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await addDoc(collection(db, `rooms/${this.currentRoomId}/signals`), {
          from: this.currentUserId,
          to: from,
          type: 'answer',
          payload: JSON.stringify(pc.localDescription),
          timestamp: Date.now(),
        });

        // Ensure remote audio receivers are attached
        const receivers = pc.getReceivers();
        receivers.forEach((receiver) => {
          if (receiver.track && receiver.track.kind === 'audio') {
            const stream = new MediaStream([receiver.track]);
            this.attachRemoteStream(from, stream);
          }
        });
      } catch (err) {
        console.warn('[WebRTC] Error handling offer:', err);
      }
    } else if (type === 'answer') {
      try {
        if (pc.signalingState === 'have-local-offer') {
          this.isSettingRemoteAnswerPending.set(from, true);
          const desc = new RTCSessionDescription(JSON.parse(payload));
          await pc.setRemoteDescription(desc);
          this.isSettingRemoteAnswerPending.set(from, false);

          // Process queued ICE candidates
          const queued = this.pendingCandidates.get(from) || [];
          this.pendingCandidates.delete(from);
          for (const cand of queued) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch {}
          }

          // Ensure remote audio receivers are attached
          const receivers = pc.getReceivers();
          receivers.forEach((receiver) => {
            if (receiver.track && receiver.track.kind === 'audio') {
              const stream = new MediaStream([receiver.track]);
              this.attachRemoteStream(from, stream);
            }
          });
        }
      } catch (err) {
        this.isSettingRemoteAnswerPending.set(from, false);
        console.warn('[WebRTC] Error handling answer:', err);
      }
    } else if (type === 'candidate') {
      try {
        const candData = JSON.parse(payload);
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(candData));
        } else {
          const list = this.pendingCandidates.get(from) || [];
          list.push(candData);
          this.pendingCandidates.set(from, list);
        }
      } catch (err) {
        if (!this.ignoreOffer.get(from)) {
          console.warn('[WebRTC] Error adding ICE candidate:', err);
        }
      }
    }
  }

  // Acquire local microphone
  async initLocalMicrophone(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('getUserMedia not supported in this environment');
        return false;
      }

      this.realMicStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      const realTrack = this.realMicStream.getAudioTracks()[0];
      if (!realTrack) return false;

      realTrack.enabled = true;
      this.isMicMuted = false;

      // Replace silent track with real microphone track across all active peer connections
      for (const [peerId, pc] of this.peerConnections.entries()) {
        const senders = pc.getSenders();
        const audioSender = senders.find(
          (s) => s.track && s.track.kind === 'audio'
        ) || senders[0];

        if (audioSender) {
          try {
            await audioSender.replaceTrack(realTrack);
          } catch {
            try {
              pc.addTrack(realTrack, this.realMicStream);
              await this.renegotiatePeer(peerId);
            } catch {}
          }
        } else {
          try {
            pc.addTrack(realTrack, this.realMicStream);
            await this.renegotiatePeer(peerId);
          } catch {}
        }
      }

      // Setup audio analyzer for speaking activity
      this.initAudioContext();
      if (this.audioContext) {
        try {
          const source = this.audioContext.createMediaStreamSource(this.realMicStream);
          this.localAnalyser = this.audioContext.createAnalyser();
          this.localAnalyser.fftSize = 256;
          source.connect(this.localAnalyser);
          this.startVoiceActivityDetection();
        } catch {}
      }

      return true;
    } catch (err) {
      console.warn('Could not acquire microphone stream:', err);
      return false;
    }
  }

  private startVoiceActivityDetection() {
    if (!this.localAnalyser) return;
    const dataArray = new Uint8Array(this.localAnalyser.frequencyBinCount);

    const checkVolume = () => {
      if (!this.localAnalyser || this.isMicMuted) {
        if (this.onSpeakingChange) this.onSpeakingChange(false);
      } else {
        this.localAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const isSpeaking = average > 12;
        if (this.onSpeakingChange) {
          this.onSpeakingChange(isSpeaking);
        }
      }
      this.localVadFrameId = requestAnimationFrame(checkVolume);
    };

    this.localVadFrameId = requestAnimationFrame(checkVolume);
  }

  private monitorRemoteVoice(peerId: string, stream: MediaStream) {
    try {
      this.initAudioContext();
      if (!this.audioContext) return;

      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const checkRemote = () => {
        if (this.isSpeakerMuted) {
          if (this.onRemoteSpeakingChange) this.onRemoteSpeakingChange(peerId, false);
        } else {
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const avg = sum / data.length;
          const isSpeaking = avg > 12;
          if (this.onRemoteSpeakingChange) {
            this.onRemoteSpeakingChange(peerId, isSpeaking);
          }
        }
        const frameId = requestAnimationFrame(checkRemote);
        this.remoteVadFrameIds.set(peerId, frameId);
      };

      const frameId = requestAnimationFrame(checkRemote);
      this.remoteVadFrameIds.set(peerId, frameId);
    } catch {
      // Audio analysis optional
    }
  }

  // Toggle Microphone (Mute / Unmute)
  async toggleMic(): Promise<boolean> {
    if (!this.realMicStream) {
      return await this.initLocalMicrophone();
    }

    const realTrack = this.realMicStream.getAudioTracks()[0];
    if (!realTrack || realTrack.readyState !== 'live') {
      return await this.initLocalMicrophone();
    }

    this.isMicMuted = !this.isMicMuted;
    realTrack.enabled = !this.isMicMuted;

    if (this.isMicMuted && this.onSpeakingChange) {
      this.onSpeakingChange(false);
    }
    return !this.isMicMuted; // returns isMicActive
  }

  // Toggle Speaker (Mute / Unmute all incoming audio)
  toggleSpeaker(): boolean {
    this.isSpeakerMuted = !this.isSpeakerMuted;
    this.applySpeakerMuteState();
    return !this.isSpeakerMuted; // returns isSpeakerActive
  }

  setSpeaker(active: boolean) {
    this.isSpeakerMuted = !active;
    this.applySpeakerMuteState();
  }

  private applySpeakerMuteState() {
    // 1. Mute/unmute all DOM audio elements playing opponent audio
    this.remoteAudioElements.forEach((audio) => {
      audio.muted = this.isSpeakerMuted;
      audio.volume = this.isSpeakerMuted ? 0 : 1;
      if (!this.isSpeakerMuted) {
        audio.play().catch(() => {});
      }
    });

    // 2. Mute/unmute game sound effects
    sounds.setMuted(this.isSpeakerMuted);

    // 3. Clear speaking animations when speaker is muted
    if (this.isSpeakerMuted && this.onRemoteSpeakingChange) {
      this.knownOpponents.forEach((oppId) => {
        this.onRemoteSpeakingChange!(oppId, false);
      });
    }
  }

  getMicState(): boolean {
    return !this.isMicMuted;
  }

  getSpeakerState(): boolean {
    return !this.isSpeakerMuted;
  }

  cleanup() {
    if (this.unsubscribeSignals) {
      this.unsubscribeSignals();
      this.unsubscribeSignals = null;
    }
    if (this.localVadFrameId) {
      cancelAnimationFrame(this.localVadFrameId);
      this.localVadFrameId = null;
    }
    this.remoteVadFrameIds.forEach((frameId) => cancelAnimationFrame(frameId));
    this.remoteVadFrameIds.clear();

    if (this.realMicStream) {
      this.realMicStream.getTracks().forEach((t) => t.stop());
      this.realMicStream = null;
    }

    if (this.silentTrack) {
      this.silentTrack.stop();
      this.silentTrack = null;
    }
    if (this.silentAudioContext && this.silentAudioContext.state !== 'closed') {
      this.silentAudioContext.close().catch(() => {});
      this.silentAudioContext = null;
    }
    this.silentStream = null;

    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();

    this.remoteAudioElements.forEach((el) => {
      el.pause();
      el.srcObject = null;
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    this.remoteAudioElements.clear();

    if (this.containerEl && this.containerEl.parentNode) {
      this.containerEl.parentNode.removeChild(this.containerEl);
      this.containerEl = null;
    }

    this.remoteStreams.clear();
    this.pendingCandidates.clear();
    this.knownOpponents.clear();

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.currentRoomId = null;
    this.currentUserId = null;
  }
}
