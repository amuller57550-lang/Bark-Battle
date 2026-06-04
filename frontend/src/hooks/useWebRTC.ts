"use client";

import { useRef, useCallback, useState } from "react";
import { Socket } from "socket.io-client";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
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
      };

      return pc;
    },
    [socket]
  );

  const initiate = useCallback(
    async (localStream: MediaStream, matchId: string) => {
      const pc = createPeerConnection(matchId, true);

      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.current?.emit("webrtc:offer", { matchId, offer });

      socket.current?.on("webrtc:answer", async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
        if (pc.signalingState !== "closed") {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      });

      socket.current?.on("webrtc:ice-candidate", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {}
      });
    },
    [createPeerConnection, socket]
  );

  const answer = useCallback(
    async (localStream: MediaStream, matchId: string, offer: RTCSessionDescriptionInit) => {
      const pc = createPeerConnection(matchId, false);

      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);

      socket.current?.emit("webrtc:answer", { matchId, answer: ans });

      socket.current?.on("webrtc:ice-candidate", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {}
      });
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
