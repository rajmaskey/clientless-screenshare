"use client"

import { Badge } from "@/components/ui/badge"
import { useScreenShare } from "@/components/screen-share-provider"
import { Wifi, WifiOff, Loader2, AlertTriangle } from "lucide-react"

export function ConnectionStatus() {
  const { connectionState, isSharing, isViewing } = useScreenShare()

  if (!isSharing && !isViewing) {
    return null
  }

  const getStatusConfig = () => {
    switch (connectionState) {
      case "connected":
        return {
          icon: <Wifi className="h-3 w-3" />,
          text: "Connected",
          className: "bg-green-500/10 text-green-400 border-green-500/20",
        }
      case "connecting":
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: "Connecting...",
          className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
        }
      case "failed":
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          text: "Connection Failed",
          className: "bg-red-500/10 text-red-400 border-red-500/20",
        }
      case "disconnected":
      default:
        return {
          icon: <WifiOff className="h-3 w-3" />,
          text: "Disconnected",
          className: "bg-gray-500/10 text-gray-400 border-gray-500/20",
        }
    }
  }

  const config = getStatusConfig()

  return (
    <Badge variant="secondary" className={config.className}>
      {config.icon}
      <span className="ml-1">{config.text}</span>
    </Badge>
  )
}
