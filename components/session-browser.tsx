"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { SessionManager, type SessionData } from "@/lib/session-manager"
import { useScreenShare } from "@/components/screen-share-provider"
import { useToast } from "@/hooks/use-toast"
import { Search, Users, Clock, Monitor, RefreshCw } from "lucide-react"

export function SessionBrowser() {
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { joinSession, isViewing } = useScreenShare()
  const { toast } = useToast()

  const refreshSessions = () => {
    setIsRefreshing(true)
    const activeSessions = SessionManager.getAllActiveSessions()
    setSessions(activeSessions)
    setTimeout(() => setIsRefreshing(false), 500) // Visual feedback
  }

  useEffect(() => {
    refreshSessions()
    const interval = setInterval(refreshSessions, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const filteredSessions = sessions.filter(
    (session) =>
      session.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.metadata?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.metadata?.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleJoinSession = async (sessionId: string) => {
    try {
      await joinSession(sessionId)
      toast({
        title: "Joined session",
        description: `Connected to session: ${SessionManager.formatSessionId(sessionId)}`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join session.",
        variant: "destructive",
      })
    }
  }

  const getTimeAgo = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000)
    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Browse Active Sessions
            </CardTitle>
            <CardDescription>Join any active screen sharing session</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refreshSessions} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sessions by ID or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sessions List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No active sessions found</p>
              <p className="text-sm">
                {searchTerm ? "Try adjusting your search terms" : "Start sharing your screen to create a session"}
              </p>
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="secondary" className="font-mono text-sm">
                      {SessionManager.formatSessionId(session.id)}
                    </Badge>
                    <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse" />
                      Live
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-medium text-sm truncate">
                      {session.metadata?.title || "Screen Share Session"}
                    </h4>
                    {session.metadata?.description && (
                      <p className="text-xs text-muted-foreground truncate">{session.metadata.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{session.viewers.length} viewers</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{getTimeAgo(session.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {session.metadata?.maxViewers && session.viewers.length >= session.metadata.maxViewers && (
                    <Badge variant="destructive" className="text-xs">
                      Full
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleJoinSession(session.id)}
                    disabled={
                      isViewing ||
                      (session.metadata?.maxViewers ? session.viewers.length >= session.metadata.maxViewers : false)
                    }
                  >
                    {isViewing ? "Connected" : "Join"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Stats */}
        {filteredSessions.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {filteredSessions.length} active session{filteredSessions.length !== 1 ? "s" : ""}
              </span>
              <span>{filteredSessions.reduce((sum, s) => sum + s.viewers.length, 0)} total viewers</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
