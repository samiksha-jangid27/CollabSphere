// ABOUTME: Socket.io client hook — exposes socket instance, connection status, and room helpers.
// ABOUTME: Wraps SocketContext with joinConversation/leaveConversation and isConnected tracking.

"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocketContext } from "@/context/SocketContext";

interface UseSocketReturn {
  socket: ReturnType<typeof useSocketContext>["socket"];
  isConnected: boolean;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
}

export function useSocket(): UseSocketReturn {
  const { socket } = useSocketContext();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socket) {
      setIsConnected(false);
      return;
    }

    // Sync initial state (socket may already be connected)
    setIsConnected(socket.connected);

    function handleConnect() {
      setIsConnected(true);
    }

    function handleDisconnect() {
      setIsConnected(false);
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket]);

  const joinConversation = useCallback(
    (conversationId: string) => {
      if (!socket?.connected) return;
      socket.emit("join_conversation", conversationId, (res: { ok: boolean }) => {
        if (!res.ok) {
          console.error("Failed to join conversation", conversationId);
        }
      });
    },
    [socket]
  );

  const leaveConversation = useCallback(
    (conversationId: string) => {
      if (!socket?.connected) return;
      socket.emit("leave_conversation", conversationId, (res: { ok: boolean }) => {
        if (!res.ok) {
          console.error("Failed to leave conversation", conversationId);
        }
      });
    },
    [socket]
  );

  const on = useCallback(
    (event: string, handler: (...args: unknown[]) => void) => {
      if (!socket) return;
      socket.on(event, handler);
    },
    [socket]
  );

  const off = useCallback(
    (event: string, handler: (...args: unknown[]) => void) => {
      if (!socket) return;
      socket.off(event, handler);
    },
    [socket]
  );

  return { socket, isConnected, joinConversation, leaveConversation, on, off };
}
