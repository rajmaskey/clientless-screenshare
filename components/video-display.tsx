"use client"

import { useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Monitor, Users } from "lucide-react"

interface VideoDisplayProps {
  stream: MediaStream | null
  isLocal?: boolean
  title?: string
}

export function VideoDisplay({ stream, isLocal = false, title }: VideoDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  if (!stream) {
    return (
      <Card className="aspect-video flex items-center justify-center bg-muted/50">
        <div className="text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            {isLocal ? (
              <Monitor className="h-8 w-8 text-muted-foreground" />
            ) : (
              <Users className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <p className="text-muted-foreground">{isLocal ? "No screen being shared" : "Waiting for stream..."}</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      {title && (
        <div className="px-4 py-2 bg-muted/50 border-b">
          <p className="text-sm font-medium">{title}</p>
        </div>
      )}
      <div className="aspect-video bg-black">
        <video ref={videoRef} autoPlay playsInline muted={isLocal} className="w-full h-full object-contain" />
      </div>
    </Card>
  )
}
