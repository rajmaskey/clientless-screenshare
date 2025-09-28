"use client"

import { createContext, useContext, useRef, useState, useCallback, useEffect, type ReactNode } from "react"
import { SessionManager, type SessionData } from "@/lib/session-manager"
import { WebRTCManager } from "@/lib/webrtc-signaling"

interface ScreenShareContextType {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  isSharing: boolean
  isViewing: boolean
  sessionData: SessionData | null
  viewerId: string | null
  connectionState: "disconnected" | "connecting" | "connected" | "failed"
  startScreenShare: (metadata?: SessionData["metadata"]) => Promise<void>
  stopScreenShare: () => void
  joinSession: (id: string) => Promise<void>
  leaveSession: () => void
}

const ScreenShareContext = createContext<ScreenShareContextType | null>(null)

export function useScreenShare() {
  const context = useContext(ScreenShareContext)
  if (!context) {
    throw new Error("useScreenShare must be used within a ScreenShareProvider")
  }
  return context
}

interface ScreenShareProviderProps {
  children: ReactNode
}

export function ScreenShareProvider({ children }: ScreenShareProviderProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [isViewing, setIsViewing] = useState(false)
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<"disconnected" | "connecting" | "connected" | "failed">(
    "disconnected",
  )

  const webrtcManager = useRef<WebRTCManager | null>(null)
  const hostId = useRef<string>(SessionManager.generateViewerId())

  const leaveSession = useCallback(() => {
    if (webrtcManager.current) {
      webrtcManager.current.destroy()
      webrtcManager.current = null
    }

    if (sessionData && viewerId) {
      SessionManager.removeViewer(sessionData.id, viewerId)
    }

    setRemoteStream(null)
    setIsViewing(false)
    setSessionData(null)
    setViewerId(null)
    setConnectionState("disconnected")
  }, [sessionData, viewerId])

  useEffect(() => {
    return () => {
      if (webrtcManager.current) {
        webrtcManager.current.destroy()
        webrtcManager.current = null
      }

      if (isSharing && sessionData) {
        SessionManager.updateSessionStatus(sessionData.id, "inactive")
      }
      if (isViewing && sessionData && viewerId) {
        SessionManager.removeViewer(sessionData.id, viewerId)
      }
    }
  }, [isSharing, isViewing, sessionData, viewerId])

  const startScreenShare = useCallback(
    async (metadata?: SessionData["metadata"]) => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            mediaSource: "screen",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          },
        })

        setLocalStream(stream)
        setIsSharing(true)
        setConnectionState("connected")

        // Create session
        const session = SessionManager.createSession(hostId.current, metadata)
        setSessionData(session)

        webrtcManager.current = new WebRTCManager(session.id, hostId.current, true)
        webrtcManager.current.setLocalStream(stream)

        // Handle remote stream connections (shouldn't happen for host, but good to have)
        webrtcManager.current.onRemoteStream((remoteStream, peerId) => {
          console.log("[Host] Received remote stream from:", peerId)
        })

        // Handle peer disconnections
        webrtcManager.current.onPeerDisconnected((peerId) => {
          console.log("[Host] Peer disconnected:", peerId)
          if (sessionData) {
            SessionManager.removeViewer(sessionData.id, peerId)
          }
        })

        // Handle stream end
        stream.getVideoTracks()[0].onended = () => {
          stopScreenShare()
        }
      } catch (error) {
        console.error("Error starting screen share:", error)
        setConnectionState("failed")
        throw error
      }
    },
    [sessionData],
  )

  const stopScreenShare = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
      setLocalStream(null)
    }

    if (webrtcManager.current) {
      webrtcManager.current.destroy()
      webrtcManager.current = null
    }

    if (sessionData) {
      SessionManager.updateSessionStatus(sessionData.id, "inactive")
      setSessionData(null)
    }

    setIsSharing(false)
    setConnectionState("disconnected")
  }, [localStream, sessionData])

  const joinSession = useCallback(
    async (id: string) => {
      try {
        const cleanId = SessionManager.parseSessionId(id)

        if (!SessionManager.validateSessionId(cleanId)) {
          throw new Error("Invalid session ID format")
        }

        const session = SessionManager.getSession(cleanId)
        if (!session) {
          throw new Error("Session not found or expired")
        }

        if (session.status !== "active") {
          throw new Error("Session is not active")
        }

        const newViewerId = SessionManager.generateViewerId()

        if (!SessionManager.addViewer(cleanId, newViewerId)) {
          throw new Error("Failed to join session")
        }

        setIsViewing(true)
        setSessionData(session)
        setViewerId(newViewerId)
        setConnectionState("connecting")

        webrtcManager.current = new WebRTCManager(cleanId, newViewerId, false)

        // Handle remote stream from host
        webrtcManager.current.onRemoteStream((stream, peerId) => {
          console.log("[Viewer] Received remote stream from host:", peerId)
          setRemoteStream(stream)
          setConnectionState("connected")
        })

        // Handle peer disconnections
        webrtcManager.current.onPeerDisconnected((peerId) => {
          console.log("[Viewer] Host disconnected:", peerId)
          setConnectionState("disconnected")
          setRemoteStream(null)
          // Auto-leave if host disconnects
          setTimeout(() => {
            leaveSession()
          }, 2000)
        })

        // Join as viewer
        await webrtcManager.current.joinAsViewer()

        // Simulate connection delay for demo
        setTimeout(() => {
          if (connectionState === "connecting") {
            console.log(`[Viewer] Connected to session ${cleanId}`)
            // In a real implementation, the connection would be established via WebRTC
            // For demo purposes, we'll show a placeholder
          }
        }, 2000)
      } catch (error) {
        console.error("Error joining session:", error)
        setIsViewing(false)
        setConnectionState("failed")
        throw error
      }
    },
    [connectionState],
  )

  const value: ScreenShareContextType = {
    localStream,
    remoteStream,
    isSharing,
    isViewing,
    sessionData,
    viewerId,
    connectionState,
    startScreenShare,
    stopScreenShare,
    joinSession,
    leaveSession,
  }

  return <ScreenShareContext.Provider value={value}>{children}</ScreenShareContext.Provider>
}
