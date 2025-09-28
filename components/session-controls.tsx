"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useScreenShare } from "@/components/screen-share-provider"
import { ConnectionStatus } from "@/components/connection-status"
import { SessionManager } from "@/lib/session-manager"
import { useToast } from "@/hooks/use-toast"
import { Monitor, Users, Copy, Share2, Volume2, VolumeX, Maximize, Minimize, StopCircle, Wifi } from "lucide-react"

export function SessionControls() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const {
    isSharing,
    isViewing,
    sessionData,
    localStream,
    remoteStream,
    connectionState,
    stopScreenShare,
    leaveSession,
  } = useScreenShare()
  const { toast } = useToast()

  if (!isSharing && !isViewing) {
    return null
  }

  const copySessionId = () => {
    if (sessionData) {
      navigator.clipboard.writeText(sessionData.id)
      toast({
        title: "Copied!",
        description: "Session ID copied to clipboard.",
      })
    }
  }

  const shareSession = async () => {
    if (sessionData && navigator.share) {
      try {
        await navigator.share({
          title: "Join my screen share",
          text: `Join my screen sharing session with ID: ${SessionManager.formatSessionId(sessionData.id)}`,
          url: `${window.location.origin}?join=${sessionData.id}`,
        })
      } catch (error) {
        copySessionId()
      }
    } else {
      copySessionId()
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const toggleMute = () => {
    const stream = isSharing ? localStream : remoteStream
    if (stream) {
      const audioTracks = stream.getAudioTracks()
      audioTracks.forEach((track) => {
        track.enabled = isMuted
      })
      setIsMuted(!isMuted)
    }
  }

  const handleEndSession = () => {
    if (isSharing) {
      stopScreenShare()
      toast({
        title: "Session ended",
        description: "Your screen sharing session has been stopped.",
      })
    } else if (isViewing) {
      leaveSession()
      toast({
        title: "Left session",
        description: "You have disconnected from the session.",
      })
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            <CardTitle className="text-lg">{isSharing ? "Sharing Controls" : "Viewing Controls"}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionStatus />
            <Badge
              variant="secondary"
              className={
                isSharing
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/20"
              }
            >
              <div
                className={`w-2 h-2 rounded-full mr-2 animate-pulse ${isSharing ? "bg-green-400" : "bg-blue-400"}`}
              />
              {isSharing ? "Sharing" : "Viewing"}
            </Badge>
          </div>
        </div>
        {sessionData && (
          <CardDescription>
            Session: <code className="font-mono">{SessionManager.formatSessionId(sessionData.id)}</code>
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection Status Info */}
        {connectionState !== "connected" && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Wifi className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {connectionState === "connecting" && "Establishing connection..."}
                {connectionState === "failed" && "Connection failed - please try again"}
                {connectionState === "disconnected" && "Not connected"}
              </span>
            </div>
            {connectionState === "connecting" && (
              <p className="text-xs text-muted-foreground mt-1">Setting up secure peer-to-peer connection</p>
            )}
          </div>
        )}

        {/* Session Info */}
        {sessionData && connectionState === "connected" && (
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{isSharing ? sessionData.viewers.length : "1"}</div>
              <div className="text-xs text-muted-foreground">{isSharing ? "Viewers" : "You"}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {Math.floor((Date.now() - sessionData.timestamp) / 60000)}m
              </div>
              <div className="text-xs text-muted-foreground">Duration</div>
            </div>
          </div>
        )}

        <Separator />

        {/* Controls */}
        <div className="grid grid-cols-2 gap-3">
          {/* Audio Control */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMute}
            className="flex items-center gap-2 bg-transparent"
            disabled={connectionState !== "connected"}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {isMuted ? "Unmute" : "Mute"}
          </Button>

          {/* Fullscreen Control */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="flex items-center gap-2 bg-transparent"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            {isFullscreen ? "Exit" : "Fullscreen"}
          </Button>

          {/* Share Session (only when sharing) */}
          {isSharing && (
            <Button
              variant="outline"
              size="sm"
              onClick={shareSession}
              className="flex items-center gap-2 bg-transparent"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          )}

          {/* Copy ID */}
          <Button
            variant="outline"
            size="sm"
            onClick={copySessionId}
            className="flex items-center gap-2 bg-transparent"
          >
            <Copy className="h-4 w-4" />
            Copy ID
          </Button>
        </div>

        <Separator />

        {/* End Session */}
        <Button variant="destructive" onClick={handleEndSession} className="w-full flex items-center gap-2">
          <StopCircle className="h-4 w-4" />
          {isSharing ? "Stop Sharing" : "Leave Session"}
        </Button>

        {/* Viewer List (only when sharing) */}
        {isSharing && sessionData && sessionData.viewers.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Connected Viewers ({sessionData.viewers.length})
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {sessionData.viewers.map((viewerId, index) => (
                  <div key={viewerId} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                    <span className="font-mono text-xs">Viewer {index + 1}</span>
                    <Badge variant="outline" className="text-xs">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-1" />
                      Online
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
