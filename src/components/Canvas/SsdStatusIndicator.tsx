'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { HardDrive, RefreshCw, AlertTriangle, CheckCircle, X, Smartphone } from 'lucide-react'
import { detectSSD, scanBrollClips, saveBrollClipsToDatabase, type BrollClip } from '@/lib/broll-storage'
import { detectIphone, type IphoneStatus } from '@/lib/iphone-storage'

interface SsdStatusIndicatorProps {
  onSsdStatusChange?: (connected: boolean, path: string | null, clips: BrollClip[]) => void
  onIphoneStatusChange?: (status: IphoneStatus) => void
  customPath?: string
  showModal?: boolean
}

export function SsdStatusIndicator({ onSsdStatusChange, onIphoneStatusChange, customPath, showModal = true }: SsdStatusIndicatorProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [ssdPath, setSsdPath] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [clipCount, setClipCount] = useState(0)
  const [showWarning, setShowWarning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // iPhone state
  const [iphoneConnected, setIphoneConnected] = useState(false)
  const [iphoneName, setIphoneName] = useState<string | null>(null)
  const [isCheckingIphone, setIsCheckingIphone] = useState(false)

  const checkSsdConnection = async () => {
    setIsChecking(true)
    setError(null)

    try {
      const result = await detectSSD(customPath)
      setIsConnected(result.connected)
      setSsdPath(result.path)

      if (result.connected && result.path) {
        // Scan for B-roll clips
        setIsScanning(true)
        const clips = await scanBrollClips(result.path)
        setClipCount(clips.length)

        // Save to database
        if (clips.length > 0) {
          await saveBrollClipsToDatabase(clips)
        }

        onSsdStatusChange?.(true, result.path, clips)
        setShowWarning(false)
      } else {
        onSsdStatusChange?.(false, null, [])
        if (showModal) {
          setShowWarning(true)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check SSD')
      onSsdStatusChange?.(false, null, [])
    } finally {
      setIsChecking(false)
      setIsScanning(false)
    }
  }

  const checkIphoneConnection = async () => {
    setIsCheckingIphone(true)
    try {
      const status = await detectIphone()
      setIphoneConnected(status.connected)
      setIphoneName(status.name)
      onIphoneStatusChange?.(status)
    } catch {
      setIphoneConnected(false)
      setIphoneName(null)
    } finally {
      setIsCheckingIphone(false)
    }
  }

  useEffect(() => {
    checkSsdConnection()
    checkIphoneConnection()
  }, [customPath])

  const handleRetry = () => {
    checkSsdConnection()
    checkIphoneConnection()
  }

  const handleContinueWithout = () => {
    setShowWarning(false)
  }

  return (
    <>
      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            isConnected
              ? 'bg-green-500/20 text-green-400'
              : 'bg-yellow-500/20 text-yellow-400'
          }`}
        >
          <HardDrive className="h-3 w-3" />
          {isChecking || isScanning ? (
            <>
              <RefreshCw className="h-3 w-3 animate-spin" />
              {isScanning ? 'Scanning...' : 'Checking...'}
            </>
          ) : isConnected ? (
            <>
              <CheckCircle className="h-3 w-3" />
              SSD ({clipCount} clips)
            </>
          ) : (
            <>
              <AlertTriangle className="h-3 w-3" />
              No SSD
            </>
          )}
        </div>

        {/* iPhone Badge */}
        <div
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            iphoneConnected
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-zinc-700/50 text-zinc-500'
          }`}
        >
          <Smartphone className="h-3 w-3" />
          {isCheckingIphone ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : iphoneConnected ? (
            <>
              <CheckCircle className="h-3 w-3" />
              {iphoneName || 'iPhone'}
            </>
          ) : (
            'No iPhone'
          )}
        </div>

        {(!isConnected || !iphoneConnected) && !isChecking && !isCheckingIphone && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={handleRetry}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Retry
          </Button>
        )}
      </div>

      {/* Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80">
          <div className="mx-4 max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/20">
                  <AlertTriangle className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">External SSD Not Detected</h3>
                  <p className="text-sm text-zinc-400">Connect SSD to proceed with B-roll overlay</p>
                </div>
              </div>
              <button
                onClick={() => setShowWarning(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-3">
              <p className="text-sm text-zinc-300">
                The B-roll auto-overlay feature requires your external SSD to be connected.
                The app will scan for B-roll clips in these locations:
              </p>
              <ul className="space-y-1 text-xs text-zinc-400">
                <li>/Volumes/ORICO</li>
                <li>/Volumes/SSD/broll</li>
                <li>/Volumes/External/broll</li>
                <li>/Volumes/BROLL</li>
              </ul>
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <Button
                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                onClick={handleRetry}
                disabled={isChecking}
              >
                {isChecking ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-zinc-700"
                onClick={handleContinueWithout}
              >
                Continue Without B-roll
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
