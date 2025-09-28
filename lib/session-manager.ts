export interface SessionData {
  id: string
  timestamp: number
  status: "active" | "inactive" | "expired"
  hostId: string
  viewers: string[]
  metadata?: {
    title?: string
    description?: string
    maxViewers?: number
  }
}

export class SessionManager {
  private static readonly SESSION_PREFIX = "sharescreen_session_"
  private static readonly SESSION_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours
  private static readonly CLEANUP_INTERVAL = 60 * 60 * 1000 // 1 hour

  static generateSessionId(): string {
    // Use a mix of consonants and vowels for better readability
    const consonants = "BCDFGHJKLMNPQRSTVWXYZ"
    const vowels = "AEIOU"
    const numbers = "23456789" // Exclude 0, 1 to avoid confusion with O, I

    let result = ""

    // Pattern: CVNC-VCNV (C=Consonant, V=Vowel, N=Number)
    result += consonants.charAt(Math.floor(Math.random() * consonants.length))
    result += vowels.charAt(Math.floor(Math.random() * vowels.length))
    result += numbers.charAt(Math.floor(Math.random() * numbers.length))
    result += consonants.charAt(Math.floor(Math.random() * consonants.length))
    result += vowels.charAt(Math.floor(Math.random() * vowels.length))
    result += consonants.charAt(Math.floor(Math.random() * consonants.length))
    result += numbers.charAt(Math.floor(Math.random() * numbers.length))
    result += vowels.charAt(Math.floor(Math.random() * vowels.length))

    return result
  }

  static generateViewerId(): string {
    return "viewer_" + Math.random().toString(36).substr(2, 9)
  }

  static createSession(hostId: string, metadata?: SessionData["metadata"]): SessionData {
    const sessionId = this.generateSessionId()
    const sessionData: SessionData = {
      id: sessionId,
      timestamp: Date.now(),
      status: "active",
      hostId,
      viewers: [],
      metadata,
    }

    this.saveSession(sessionData)
    this.scheduleCleanup()

    return sessionData
  }

  static getSession(sessionId: string): SessionData | null {
    try {
      const key = this.SESSION_PREFIX + sessionId
      const data = localStorage.getItem(key)

      if (!data) return null

      const session: SessionData = JSON.parse(data)

      // Check if session is expired
      if (Date.now() - session.timestamp > this.SESSION_EXPIRY) {
        this.removeSession(sessionId)
        return null
      }

      return session
    } catch (error) {
      console.error("Error getting session:", error)
      return null
    }
  }

  static saveSession(session: SessionData): void {
    try {
      const key = this.SESSION_PREFIX + session.id
      localStorage.setItem(key, JSON.stringify(session))
    } catch (error) {
      console.error("Error saving session:", error)
    }
  }

  static removeSession(sessionId: string): void {
    try {
      const key = this.SESSION_PREFIX + sessionId
      localStorage.removeItem(key)
    } catch (error) {
      console.error("Error removing session:", error)
    }
  }

  static addViewer(sessionId: string, viewerId: string): boolean {
    const session = this.getSession(sessionId)
    if (!session) return false

    if (!session.viewers.includes(viewerId)) {
      session.viewers.push(viewerId)
      this.saveSession(session)
    }

    return true
  }

  static removeViewer(sessionId: string, viewerId: string): boolean {
    const session = this.getSession(sessionId)
    if (!session) return false

    session.viewers = session.viewers.filter((id) => id !== viewerId)
    this.saveSession(session)

    return true
  }

  static updateSessionStatus(sessionId: string, status: SessionData["status"]): boolean {
    const session = this.getSession(sessionId)
    if (!session) return false

    session.status = status
    this.saveSession(session)

    return true
  }

  static getAllActiveSessions(): SessionData[] {
    const sessions: SessionData[] = []

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(this.SESSION_PREFIX)) {
          const data = localStorage.getItem(key)
          if (data) {
            const session: SessionData = JSON.parse(data)
            if (session.status === "active" && Date.now() - session.timestamp <= this.SESSION_EXPIRY) {
              sessions.push(session)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error getting active sessions:", error)
    }

    return sessions
  }

  static cleanupExpiredSessions(): void {
    try {
      const keysToRemove: string[] = []

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(this.SESSION_PREFIX)) {
          const data = localStorage.getItem(key)
          if (data) {
            const session: SessionData = JSON.parse(data)
            if (Date.now() - session.timestamp > this.SESSION_EXPIRY) {
              keysToRemove.push(key)
            }
          }
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key))

      if (keysToRemove.length > 0) {
        console.log(`Cleaned up ${keysToRemove.length} expired sessions`)
      }
    } catch (error) {
      console.error("Error cleaning up sessions:", error)
    }
  }

  private static scheduleCleanup(): void {
    // Run cleanup periodically
    if (typeof window !== "undefined") {
      setTimeout(() => {
        this.cleanupExpiredSessions()
        this.scheduleCleanup()
      }, this.CLEANUP_INTERVAL)
    }
  }

  static validateSessionId(sessionId: string): boolean {
    // Check format: 8 characters, alphanumeric
    const regex = /^[A-Z0-9]{8}$/
    return regex.test(sessionId)
  }

  static formatSessionId(sessionId: string): string {
    // Add dashes for better readability: ABCD-EFGH
    if (sessionId.length === 8) {
      return `${sessionId.slice(0, 4)}-${sessionId.slice(4)}`
    }
    return sessionId
  }

  static parseSessionId(formattedId: string): string {
    // Remove dashes and convert to uppercase
    return formattedId.replace(/-/g, "").toUpperCase()
  }
}

// Initialize cleanup on module load
if (typeof window !== "undefined") {
  SessionManager.cleanupExpiredSessions()
}
