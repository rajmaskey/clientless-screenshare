"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Monitor, Users, Zap, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useScreenShare } from "@/components/screen-share-provider"
import { VideoDisplay } from "@/components/video-display"
import { SessionStats, ActiveSessionsList } from "@/components/session-stats"
import { SessionBrowser } from "@/components/session-browser"
import { SessionControls } from "@/components/session-controls"
import { SessionManager } from "@/lib/session-manager"

export default function HomePage() {
  const [joinId, setJoinId] = useState<string>("")
  const [activeTab, setActiveTab] = useState("share")
  const { toast } = useToast()

  const {
    localStream,
    remoteStream,
    isSharing,
    isViewing,
    sessionData,
    startScreenShare,
    stopScreenShare,
    joinSession,
    leaveSession,
  } = useScreenShare()

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const joinParam = urlParams.get("join")
    if (joinParam && !isSharing && !isViewing) {
      setJoinId(joinParam)
      setActiveTab("join")
    }
  }, [isSharing, isViewing])

  const handleStartSharing = async () => {
    try {
      await startScreenShare({
        title: "Screen Share Session",
        description: "Sharing desktop screen",
        maxViewers: 10,
      })
      toast({
        title: "Screen sharing started",
        description: `Session ID: ${SessionManager.formatSessionId(sessionData?.id || "")}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start screen sharing. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleStopSharing = () => {
    stopScreenShare()
    toast({
      title: "Screen sharing stopped",
      description: "Your session has been ended.",
    })
  }

  const handleJoinSession = async () => {
    if (!joinId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid session ID.",
        variant: "destructive",
      })
      return
    }

    try {
      await joinSession(joinId)
      toast({
        title: "Joined session",
        description: `Connected to session: ${SessionManager.formatSessionId(joinId)}`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join session. Please check the session ID.",
        variant: "destructive",
      })
    }
  }

  const handleLeaveSession = () => {
    leaveSession()
    setJoinId("")
    toast({
      title: "Left session",
      description: "You have disconnected from the session.",
    })
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Monitor className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-balance">ShareScreen</h1>
          </div>
          <p className="text-xl text-muted-foreground text-balance max-w-2xl mx-auto">
            Share your screen instantly with anyone using a simple 8-character code. No downloads, no accounts required.
          </p>
        </div>

        {/* Session Stats */}
        <SessionStats />

        {/* Video Display and Controls */}
        {(isSharing || isViewing) && (
          <div className="max-w-6xl mx-auto mb-8">
            <div className="grid lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                {isSharing && <VideoDisplay stream={localStream} isLocal={true} title="Your Screen" />}
                {isViewing && (
                  <VideoDisplay
                    stream={remoteStream}
                    isLocal={false}
                    title={`Session: ${SessionManager.formatSessionId(sessionData?.id || "")}`}
                  />
                )}
              </div>
              <div className="lg:col-span-1">
                <SessionControls />
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-6xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="share" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Share Screen
              </TabsTrigger>
              <TabsTrigger value="join" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Join Session
              </TabsTrigger>
              <TabsTrigger value="browse" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Browse Sessions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="share" className="mt-6">
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                  <CardHeader className="relative">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      <CardTitle>Share Your Screen</CardTitle>
                    </div>
                    <CardDescription>Start sharing your screen and get a unique session ID</CardDescription>
                  </CardHeader>
                  <CardContent className="relative space-y-4">
                    {!isSharing ? (
                      <Button onClick={handleStartSharing} className="w-full" size="lg">
                        <Monitor className="mr-2 h-4 w-4" />
                        Start Screen Share
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                          <div>
                            <Label className="text-sm font-medium">Session ID</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="text-lg font-mono font-bold text-primary">
                                {sessionData ? SessionManager.formatSessionId(sessionData.id) : ""}
                              </code>
                              <Button variant="ghost" size="sm" onClick={copySessionId}>
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
                            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                            Live
                          </Badge>
                        </div>
                        {sessionData && sessionData.viewers.length > 0 && (
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{sessionData.viewers.length}</span>
                              <span className="text-muted-foreground">
                                {sessionData.viewers.length === 1 ? "viewer" : "viewers"} connected
                              </span>
                            </div>
                          </div>
                        )}
                        <Button onClick={handleStopSharing} variant="destructive" className="w-full">
                          Stop Sharing
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <ActiveSessionsList />
              </div>
            </TabsContent>

            <TabsContent value="join" className="mt-6">
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent" />
                  <CardHeader className="relative">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-accent" />
                      <CardTitle>Join a Session</CardTitle>
                    </div>
                    <CardDescription>Enter a session ID to view someone's screen</CardDescription>
                  </CardHeader>
                  <CardContent className="relative space-y-4">
                    {!isViewing ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="join-id">Session ID</Label>
                          <Input
                            id="join-id"
                            placeholder="ABCD-EFGH or ABCDEFGH"
                            value={joinId}
                            onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                            maxLength={9} // Allow for dash
                            className="font-mono text-center text-lg tracking-wider"
                          />
                          <p className="text-xs text-muted-foreground text-center">
                            Enter 8-character code (with or without dash)
                          </p>
                        </div>
                        <Button onClick={handleJoinSession} className="w-full" size="lg">
                          Join Session
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <Label className="text-sm font-medium">Connected to</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-lg font-mono font-bold text-accent">
                              {sessionData ? SessionManager.formatSessionId(sessionData.id) : ""}
                            </code>
                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse" />
                              Viewing
                            </Badge>
                          </div>
                        </div>
                        <Button onClick={handleLeaveSession} variant="outline" className="w-full bg-transparent">
                          Leave Session
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Quick Tips</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">1</span>
                        </div>
                        <div>
                          <p className="font-medium">Get the Session ID</p>
                          <p className="text-muted-foreground">
                            Ask the person sharing their screen for the 8-character session ID
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">2</span>
                        </div>
                        <div>
                          <p className="font-medium">Enter the Code</p>
                          <p className="text-muted-foreground">Type or paste the session ID in the field above</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">3</span>
                        </div>
                        <div>
                          <p className="font-medium">Start Viewing</p>
                          <p className="text-muted-foreground">
                            Click "Join Session" to connect and start viewing their screen
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="browse" className="mt-6">
              <SessionBrowser />
            </TabsContent>
          </Tabs>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Instant Sharing</h3>
              <p className="text-sm text-muted-foreground">Start sharing your screen in seconds with just one click</p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Monitor className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">High Quality</h3>
              <p className="text-sm text-muted-foreground">Crystal clear screen sharing with audio support</p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="font-semibold mb-2">No Setup Required</h3>
              <p className="text-sm text-muted-foreground">
                No downloads or accounts needed. Works in any modern browser
              </p>
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  )
}
