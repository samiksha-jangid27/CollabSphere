// ABOUTME: Socket.io client provider — connects when authenticated, disconnects on logout.
// ABOUTME: Passes JWT access token via handshake auth; exposes socket instance via React context.

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/hooks/useAuth";
import { getAccessToken } from "@/services/api";

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

function getSocketUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
  // Strip the /api/v1 path to get the base server URL
  return apiUrl.replace(/\/api\/v1\/?$/, "");
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Wait for silent-refresh to complete before acting
    if (isLoading) return;

    if (!isAuthenticated) {
      // Disconnect if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    const token = getAccessToken();
    if (!token) {
      return;
    }

    const newSocket = io(getSocketUrl(), {
      // Callback form: re-evaluated on every connection attempt so reconnects
      // always use the latest access token after a silent refresh.
      auth: (cb: (data: { token: string | null }) => void) => {
        cb({ token: getAccessToken() });
      },
      autoConnect: false,
    });

    newSocket.connect();
    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [isAuthenticated, isLoading]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext(): SocketContextType {
  return useContext(SocketContext);
}
