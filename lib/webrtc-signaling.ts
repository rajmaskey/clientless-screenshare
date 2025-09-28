export interface SignalingMessage {
  type: "offer" | "answer" | "ice-candidate" | "join" | "leave" | "error"
  sessionId: string
  senderId: string
  data?: any
  timestamp: number
}

export interface PeerConnection {
  id: string
  connection: RTCPeerConnection
  dataChannel?: RTCDataChannel
  isHost: boolean
}

export class WebRTCSignaling {
  private static readonly SIGNALING_PREFIX = "sharescreen_signaling_"
  private static readonly MESSAGE_EXPIRY = 30000 // 30 seconds

  private sessionId: string
  private peerId: string
  private isHost: boolean
  private messageHandlers: Map<string, (message: SignalingMessage) => void> = new Map()
  private pollInterval?: NodeJS.Timeout

  constructor(sessionId: string, peerId: string, isHost = false) {
    this.sessionId = sessionId
    this.peerId = peerId
    this.isHost = isHost
    this.startPolling()
  }

  // Send a signaling message
  sendMessage(type: SignalingMessage["type"], data?: any, targetId?: string): void {
    const message: SignalingMessage = {
      type,
      sessionId: this.sessionId,
      senderId: this.peerId,
      data,
      timestamp: Date.now(),
    }

    try {
      const key = this.getMessageKey(targetId || "broadcast")
      const existingMessages = this.getMessages(key)
      existingMessages.push(message)

      // Keep only recent messages
      const recentMessages = existingMessages.filter((msg) => Date.now() - msg.timestamp < this.MESSAGE_EXPIRY)

      localStorage.setItem(key, JSON.stringify(recentMessages))
      console.log(`[WebRTC] Sent ${type} message:`, message)
    } catch (error) {
      console.error("[WebRTC] Failed to send message:", error)
    }
  }

  // Register a message handler
  onMessage(type: SignalingMessage["type"], handler: (message: SignalingMessage) => void): void {
    this.messageHandlers.set(type, handler)
  }

  // Start polling for messages
  private startPolling(): void {
    this.pollInterval = setInterval(() => {
      this.pollMessages()
    }, 1000) // Poll every second
  }

  // Stop polling and cleanup
  destroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = undefined
    }
    this.messageHandlers.clear()
  }

  // Poll for new messages
  private pollMessages(): void {
    try {
      // Check for broadcast messages
      const broadcastMessages = this.getMessages(this.getMessageKey("broadcast"))

      // Check for direct messages to this peer
      const directMessages = this.getMessages(this.getMessageKey(this.peerId))

      const allMessages = [...broadcastMessages, ...directMessages]

      // Process new messages (not from self and within expiry)
      allMessages.forEach((message) => {
        if (
          message.senderId !== this.peerId &&
          message.sessionId === this.sessionId &&
          Date.now() - message.timestamp < this.MESSAGE_EXPIRY
        ) {
          const handler = this.messageHandlers.get(message.type)
          if (handler) {
            handler(message)
          }
        }
      })

      // Cleanup old messages
      this.cleanupOldMessages()
    } catch (error) {
      console.error("[WebRTC] Error polling messages:", error)
    }
  }

  // Get messages from localStorage
  private getMessages(key: string): SignalingMessage[] {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error("[WebRTC] Error getting messages:", error)
      return []
    }
  }

  // Generate message key
  private getMessageKey(targetId: string): string {
    return `${this.SIGNALING_PREFIX}${this.sessionId}_${targetId}`
  }

  // Cleanup old messages
  private cleanupOldMessages(): void {
    try {
      const keys = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(this.SIGNALING_PREFIX)) {
          keys.push(key)
        }
      }

      keys.forEach((key) => {
        const messages = this.getMessages(key)
        const recentMessages = messages.filter((msg) => Date.now() - msg.timestamp < this.MESSAGE_EXPIRY)

        if (recentMessages.length === 0) {
          localStorage.removeItem(key)
        } else if (recentMessages.length !== messages.length) {
          localStorage.setItem(key, JSON.stringify(recentMessages))
        }
      })
    } catch (error) {
      console.error("[WebRTC] Error cleaning up messages:", error)
    }
  }
}

export class WebRTCManager {
  private signaling: WebRTCSignaling
  private peerConnections: Map<string, PeerConnection> = new Map()
  private localStream: MediaStream | null = null
  private onRemoteStreamCallback?: (stream: MediaStream, peerId: string) => void
  private onPeerDisconnectedCallback?: (peerId: string) => void

  constructor(sessionId: string, peerId: string, isHost = false) {
    this.signaling = new WebRTCSignaling(sessionId, peerId, isHost)
    this.setupSignalingHandlers()
  }

  // Set local stream (for hosts)
  setLocalStream(stream: MediaStream): void {
    this.localStream = stream

    // Add stream to all existing peer connections
    this.peerConnections.forEach((peer) => {
      if (peer.isHost) {
        stream.getTracks().forEach((track) => {
          peer.connection.addTrack(track, stream)
        })
      }
    })
  }

  // Set callback for remote streams
  onRemoteStream(callback: (stream: MediaStream, peerId: string) => void): void {
    this.onRemoteStreamCallback = callback
  }

  // Set callback for peer disconnections
  onPeerDisconnected(callback: (peerId: string) => void): void {
    this.onPeerDisconnectedCallback = callback
  }

  // Join session as viewer
  async joinAsViewer(): Promise<void> {
    this.signaling.sendMessage("join")
  }

  // Create offer (host to viewer)
  async createOffer(viewerId: string): Promise<void> {
    const peerConnection = this.createPeerConnection(viewerId, true)

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        peerConnection.connection.addTrack(track, this.localStream!)
      })
    }

    const offer = await peerConnection.connection.createOffer()
    await peerConnection.connection.setLocalDescription(offer)

    this.signaling.sendMessage("offer", {
      sdp: offer,
      targetId: viewerId,
    })
  }

  // Create answer (viewer to host)
  async createAnswer(offer: RTCSessionDescriptionInit, hostId: string): Promise<void> {
    const peerConnection = this.createPeerConnection(hostId, false)

    await peerConnection.connection.setRemoteDescription(offer)
    const answer = await peerConnection.connection.createAnswer()
    await peerConnection.connection.setLocalDescription(answer)

    this.signaling.sendMessage("answer", {
      sdp: answer,
      targetId: hostId,
    })
  }

  // Handle ICE candidate
  async handleIceCandidate(candidate: RTCIceCandidateInit, peerId: string): Promise<void> {
    const peer = this.peerConnections.get(peerId)
    if (peer) {
      await peer.connection.addIceCandidate(candidate)
    }
  }

  // Create peer connection
  private createPeerConnection(peerId: string, isHost: boolean): PeerConnection {
    const connection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
    })

    // Handle ICE candidates
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.sendMessage("ice-candidate", {
          candidate: event.candidate,
          targetId: peerId,
        })
      }
    }

    // Handle remote stream
    connection.ontrack = (event) => {
      console.log("[WebRTC] Received remote stream from:", peerId)
      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(event.streams[0], peerId)
      }
    }

    // Handle connection state changes
    connection.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state with ${peerId}:`, connection.connectionState)

      if (connection.connectionState === "disconnected" || connection.connectionState === "failed") {
        this.removePeerConnection(peerId)
        if (this.onPeerDisconnectedCallback) {
          this.onPeerDisconnectedCallback(peerId)
        }
      }
    }

    const peer: PeerConnection = {
      id: peerId,
      connection,
      isHost,
    }

    this.peerConnections.set(peerId, peer)
    return peer
  }

  // Remove peer connection
  private removePeerConnection(peerId: string): void {
    const peer = this.peerConnections.get(peerId)
    if (peer) {
      peer.connection.close()
      if (peer.dataChannel) {
        peer.dataChannel.close()
      }
      this.peerConnections.delete(peerId)
    }
  }

  // Setup signaling message handlers
  private setupSignalingHandlers(): void {
    this.signaling.onMessage("join", (message) => {
      console.log("[WebRTC] Viewer joined:", message.senderId)
      // Host creates offer for new viewer
      this.createOffer(message.senderId)
    })

    this.signaling.onMessage("offer", async (message) => {
      console.log("[WebRTC] Received offer from:", message.senderId)
      await this.createAnswer(message.data.sdp, message.senderId)
    })

    this.signaling.onMessage("answer", async (message) => {
      console.log("[WebRTC] Received answer from:", message.senderId)
      const peer = this.peerConnections.get(message.senderId)
      if (peer) {
        await peer.connection.setRemoteDescription(message.data.sdp)
      }
    })

    this.signaling.onMessage("ice-candidate", async (message) => {
      console.log("[WebRTC] Received ICE candidate from:", message.senderId)
      await this.handleIceCandidate(message.data.candidate, message.senderId)
    })

    this.signaling.onMessage("leave", (message) => {
      console.log("[WebRTC] Peer left:", message.senderId)
      this.removePeerConnection(message.senderId)
      if (this.onPeerDisconnectedCallback) {
        this.onPeerDisconnectedCallback(message.senderId)
      }
    })
  }

  // Cleanup
  destroy(): void {
    // Send leave message
    this.signaling.sendMessage("leave")

    // Close all peer connections
    this.peerConnections.forEach((peer) => {
      peer.connection.close()
      if (peer.dataChannel) {
        peer.dataChannel.close()
      }
    })
    this.peerConnections.clear()

    // Destroy signaling
    this.signaling.destroy()
  }
}
