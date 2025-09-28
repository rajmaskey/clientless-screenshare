"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SessionManager, type SessionData } from "@/lib/session-manager"
import { Users, Clock, Activity } from "lucide-react"

export function SessionStats() {
  const [activeSessions, setActiveSessions] = useState<SessionData[]>([])

  useEffect(() => {
    const updateStats = () => {
      const sessions = SessionManager.getAllActiveSessions()
      setActiveSessions(sessions)
    }

    updateStats()
    const interval = setInterval(updateStats, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  const totalViewers = activeSessions.reduce((sum, session) => sum + session.viewers.length, 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeSessions.length}</div>
          <p className="text-xs text-muted-foreground">Currently sharing screens</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Viewers</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalViewers}</div>
          <p className="text-xs text-muted-foreground">People watching screens</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {activeSessions.length > 0
              ? Math.floor((Date.now() - Math.min(...activeSessions.map((s) => s.timestamp))) / 60000)
              : 0}
            m
          </div>
          <p className="text-xs text-muted-foreground">Since last session started</p>
        </CardContent>
      </Card>
    </div>
  )
}

export function ActiveSessionsList() {
  const [activeSessions, setActiveSessions] = useState<SessionData[]>([])

  useEffect(() => {
    const updateSessions = () => {
      const sessions = SessionManager.getAllActiveSessions()
      setActiveSessions(sessions.slice(0, 5)) // Show only first 5
    }

    updateSessions()
    const interval = setInterval(updateSessions, 5000)

    return () => clearInterval(interval)
  }, [])

  if (activeSessions.length === 0) {
    return null
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg">Recent Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeSessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="font-mono">
                  {SessionManager.formatSessionId(session.id)}
                </Badge>
                <div className="text-sm">
                  <div className="font-medium">{session.metadata?.title || "Screen Share Session"}</div>
                  <div className="text-muted-foreground">
                    Started {Math.floor((Date.now() - session.timestamp) / 60000)}m ago
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  {session.viewers.length}
                </Badge>
                <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse" />
                  Live
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
