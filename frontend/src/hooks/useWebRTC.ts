"use client";

import { useRef, useCallback, useState } from "react";
import { Socket } from "socket.io-client";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  // Free public TURN relay (Open Relay Project / Metered) — needed when a
  // direct peer-to-peer connection can't be established (NAT/firewall).
  // No signup required; shared public credentials.
  { urls: "stun:openrelay.metered.ca:80" },
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
];

export function useWebRTC(socket: React.MutableRefObject<Socket | null>) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const createPeerConnection = useCallback(
    (matchId: string, isInitiator: boolean) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          socket.current?.emit("webrtc:ice-candidate", { matchId, candidate });
        }
      };

      pc.ontrack = ({ streams }) => {
        if (remoteAudioRef.current && streams[0]) {
          remoteAudioRef.current.srcObject = streams[0];
          remoteAudioRef.current.play().catch(() => {});
        }
      };

      pc.onconnectionstatechange = () => {
        setIsConnected(pc.connectionState === "connected");
        // eslint-disable-next-line no-console
        console.log(`[webrtc] connectionState (${isInitiator ? "initiator" : "answerer"}):`, pc.connectionState);
      };

      pc.oniceconnectionstatechange = () => {
        // eslint-disable-next-line no-console
        console.log(`[webrtc] iceConnectionState (${isInitiator ? "initiator" : "answerer"}):`, pc.iceConnectionState);
      };

      return pc;
    },
    [socket]
  );

  // ICE candidates can arrive over the signaling socket before the remote
  // description is set (setRemoteDescription is async and can take a beat,
  // especially while waiting on getUserMedia on the answering side). Adding a
  // candidate before that point throws and was being silently swallowed,
  // which could prevent the connection from ever completing. Queue them
  // instead and flush once the remote description is in place.
  const drainCandidates = async (pc: RTCPeerConnection, queue: RTCIceCandidateInit[]) => {
    while (queue.length) {
      const c = queue.shift()!;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[webrtc] failed to add queued ICE candidate", err);
      }
    }
  };

  const initiate = useCallback(
    async (localStream: MediaStream, matchId: string) => {
      const pc = createPeerConnection(matchId, true);
      const pendingCandidates: RTCIceCandidateInit[] = [];
      let remoteDescSet = false;

      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.current?.emit("webrtc:offer", { matchId, offer });
      // eslint-disable-next-line no-console
      console.log("[webrtc] offer sent");

      socket.current?.on("webrtc:answer", async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
        if (pc.signalingState === "closed") return;
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        remoteDescSet = true;
        // eslint-disable-next-line no-console
        console.log("[webrtc] remote description set (initiator)");
        await drainCandidates(pc, pendingCandidates);
      });

      socket.current?.on("webrtc:ice-candidate", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
        if (!candidate) return;
        if (remoteDescSet) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn("[webrtc] failed to add ICE candidate", err);
          }
        } else {
          pendingCandidates.push(candidate);
        }
      });
    },
    [createPeerConnection, socket]
  );

  const answer = useCallback(
    async (localStream: MediaStream, matchId: string, offer: RTCSessionDescriptionInit) => {
      const pc = createPeerConnection(matchId, false);
      const pendingCandidates: RTCIceCandidateInit[] = [];
      let remoteDescSet = false;

      // Register the candidate listener BEFORE awaiting anything below —
      // otherwise candidates that arrive while we're still negotiating
      // (setRemoteDescription/createAnswer/setLocalDescription, all async)
      // would be missed entirely instead of merely queued.
      socket.current?.on("webrtc:ice-candidate", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
        if (!candidate) return;
        if (remoteDescSet) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn("[webrtc] failed to add ICE candidate", err);
          }
        } else {
          pendingCandidates.push(candidate);
        }
      });

      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      remoteDescSet = true;
      // eslint-disable-next-line no-console
      console.log("[webrtc] remote description set (answerer)");
      await drainCandidates(pc, pendingCandidates);

      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);

      socket.current?.emit("webrtc:answer", { matchId, answer: ans });
      // eslint-disable-next-line no-console
      console.log("[webrtc] answer sent");
    },
    [createPeerConnection, socket]
  );

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    setIsConnected(false);
  }, []);

  return { isConnected, initiate, answer, cleanup, remoteAudioRef };
}
