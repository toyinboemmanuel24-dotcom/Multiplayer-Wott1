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
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(440, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.16);

      osc2.frequency.setValueAtTime(554.37, now);
      osc2.frequency.exponentialRampToValueAtTime(1108.73, now + 0.16);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.2);
      osc2.stop(now + 0.2);
    } catch {
      // Ignore audio failure
    }
  }

  // Heart / Like pop sound
  playHeart() {
    this.playHeartPop();
  }

  playHeartPop() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.12);

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

export const sounds = new SoundFx();

// Reliable Google & public STUN servers for WebRTC voice communication
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:openrelay.metered.ca:80' },
  ],
  iceCandidatePoolSize: 10,
};

// WebRTC Voice Chat Manager
export class VoiceChatController {
  private localStream: MediaStream | null = null;
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

  constructor(
    onSpeakingChange?: (isSpeaking: boolean) => void,
    onRemoteSpeakingChange?: (peerId: string, isSpeaking: boolean) => void
  ) {
    this.onSpeakingChange = onSpeakingChange;
    this.onRemoteSpeakingChange = onRemoteSpeakingChange;
    this.setupAutoplayUnlock();
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
  }

  // Ensure browser user interaction policy allows audio to play
  public unlockAudio() {
    this.initAudioContext();
    this.remoteAudioElements.forEach((audioEl) => {
      if (!this.isSpeakerMuted) {
        audioEl.muted = false;
        audioEl.volume = 1;
        audioEl.play().catch(() => {});
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

            // Process signals sequentially per peer
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
      // (Both peers can renegotiate anytime when mic is toggled)
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

    // Add audio track if local mic is already active, otherwise add sendrecv transceiver
    if (this.localStream && this.localStream.getAudioTracks().length > 0) {
      this.localStream.getAudioTracks().forEach((track) => {
        try {
          pc!.addTrack(track, this.localStream!);
        } catch {
          // Track already added
        }
      });
    } else {
      try {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
      } catch {
        // Fallback
      }
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

    // Remote audio track handler: opponent is speaking!
    pc.ontrack = (event) => {
      const stream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
      this.remoteStreams.set(peerId, stream);

      // Dedicated DOM Audio Element for opponent voice playback
      let audioEl = this.remoteAudioElements.get(peerId);
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.id = `audio-peer-${peerId}`;
        audioEl.autoplay = true;
        audioEl.setAttribute('autoplay', 'autoplay');
        audioEl.setAttribute('playsinline', 'playsinline');
        (audioEl as unknown as { playsInline: boolean }).playsInline = true;

        // Position off-screen without display: none (display: none can pause audio in Chrome/Safari)
        audioEl.style.position = 'fixed';
        audioEl.style.top = '-9999px';
        audioEl.style.left = '-9999px';
        audioEl.style.width = '1px';
        audioEl.style.height = '1px';
        audioEl.style.opacity = '0.01';
        audioEl.style.pointerEvents = 'none';

        document.body.appendChild(audioEl);
        this.remoteAudioElements.set(peerId, audioEl);
      }

      audioEl.srcObject = stream;
      audioEl.muted = this.isSpeakerMuted;
      audioEl.volume = this.isSpeakerMuted ? 0 : 1;

      const playAudio = () => {
        if (!this.isSpeakerMuted && audioEl) {
          audioEl.muted = false;
          audioEl.volume = 1;
          audioEl.play().catch((err) => {
            console.log('[WebRTC] Autoplay pending interaction:', err);
          });
        }
      };

      playAudio();

      event.track.onunmute = () => {
        playAudio();
      };

      // Attach voice activity detection for opponent speaking visualizer
      this.monitorRemoteVoice(peerId, stream);
    };

    // W3C Perfect Negotiation: onnegotiationneeded
    pc.onnegotiationneeded = async () => {
      try {
        await this.renegotiatePeer(peerId);
      } catch (err) {
        console.warn('[WebRTC] onnegotiationneeded error:', err);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc!.connectionState === 'failed') {
        pc!.restartIce();
      }
    };

    return pc;
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
          console.log('[WebRTC] Impolite peer ignoring offer collision from:', from);
          return;
        }

        if (offerCollision) {
          console.log('[WebRTC] Polite peer rolling back for incoming offer from:', from);
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

      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      // Default to un-muted
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      this.isMicMuted = false;

      // Attach audio tracks to all existing peer connections
      const localTrack = this.localStream.getAudioTracks()[0];
      if (localTrack) {
        this.peerConnections.forEach(async (pc, peerId) => {
          const transceivers = pc.getTransceivers();
          const audioTransceiver = transceivers.find(
            (t) => t.receiver.track.kind === 'audio' || t.sender.track?.kind === 'audio'
          );

          if (audioTransceiver && audioTransceiver.sender) {
            try {
              await audioTransceiver.sender.replaceTrack(localTrack);
              audioTransceiver.direction = 'sendrecv';
            } catch {}
          } else {
            try {
              pc.addTrack(localTrack, this.localStream!);
            } catch {}
          }

          // Trigger renegotiation so opponent receives updated SDP with audio
          if (pc.signalingState === 'stable') {
            await this.renegotiatePeer(peerId);
          }
        });
      }

      // Setup audio analyzer for speaking activity
      this.initAudioContext();
      if (this.audioContext) {
        const source = this.audioContext.createMediaStreamSource(this.localStream);
        this.localAnalyser = this.audioContext.createAnalyser();
        this.localAnalyser.fftSize = 256;
        source.connect(this.localAnalyser);
        this.startVoiceActivityDetection();
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
        const isSpeaking = average > 14;
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
          const isSpeaking = avg > 14;
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
    if (!this.localStream) {
      return await this.initLocalMicrophone();
    }
    this.isMicMuted = !this.isMicMuted;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !this.isMicMuted;
    });
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

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.remoteAudioElements.forEach((el) => {
      el.pause();
      el.srcObject = null;
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    this.remoteAudioElements.clear();
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
