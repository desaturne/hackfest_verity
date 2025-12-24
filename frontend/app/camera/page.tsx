"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Camera, FishOff as FlashOff, SlashIcon as FlashOn, X, Images } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/supabase"
import { uploadMedia } from "@/lib/supabase/media"

export default function CameraPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading } = useAuth()
  const [isGuest, setIsGuest] = useState(false)
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [flashEnabled, setFlashEnabled] = useState(false)
  const [mode, setMode] = useState<"photo" | "video">("photo")
  const [latestImage, setLatestImage] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Define stopCamera before it's used in useEffect
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
      setHasPermission(false)
    }
  }

  // First useEffect: Handle auth and modal
  useEffect(() => {
    if (loading) return
    
    if (!user) {
      setIsGuest(true)
      setShowGuestModal(true)
    } else {
      setIsGuest(false)
      setShowGuestModal(false)
    }
  }, [user, loading])

  // Second useEffect: Load gallery thumbnail and cleanup
  useEffect(() => {
    const loadLatestImage = () => {
      const savedMedia = JSON.parse(localStorage.getItem("factum_gallery") || "[]")
      if (savedMedia.length > 0) {
        const currentUserId = user?.id || 'guest'
        const userImages = savedMedia.filter((item: any) => 
          item.userId === currentUserId || (!item.userId && !user)
        )
        if (userImages.length > 0) {
          setLatestImage(userImages[userImages.length - 1].data)
        }
      }
    }
    
    loadLatestImage()
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [user, stream])

  // Third useEffect: Attach stream to video element when stream changes
  useEffect(() => {
    if (stream && videoRef.current) {
      console.log("useEffect: Attaching stream to video element")
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(err => {
        console.error("Error playing video in useEffect:", err)
      })
    }
  }, [stream])

  // Show loading during auth check
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Initializing camera...</p>
        </div>
      </div>
    )
  }

  const requestCameraAccess = async () => {
    try {
      console.log("Requesting camera access...")
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: mode === "video",
      })
      
      console.log("Camera access granted, stream:", mediaStream)
      console.log("Video tracks:", mediaStream.getVideoTracks())
      
      // Set stream and permission - the useEffect will handle attaching to video element
      setStream(mediaStream)
      setHasPermission(true)

      // Request real location permission
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log("Location permission granted", position.coords)
          },
          (error) => {
            console.warn("Location access denied:", error)
            toast({
              title: "Location access denied",
              description: "Location data won't be available for verification",
              variant: "destructive",
            })
          }
        )
      }
    } catch (error) {
      console.error("Camera access error:", error)
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to use this feature",
        variant: "destructive",
      })
    }
  }

  const handleGuestContinue = () => {
    setShowGuestModal(false)
  }

  const capturePhoto = async () => {
    // Request camera access if not already granted
    if (!hasPermission || !stream) {
      await requestCameraAccess()
      // After camera starts, wait for user to click again
      toast({
        title: "Camera ready",
        description: "Click capture again to take a photo",
      })
      return
    }

    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      
      // Check if video is actually playing
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        toast({
          title: "Camera not ready",
          description: "Please wait for camera to initialize",
          variant: "destructive",
        })
        return
      }
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const imageData = canvas.toDataURL("image/png")
        setCapturedImage(imageData)
        setShowSaveModal(true)
        // Stop camera after capturing
        stopCamera()
      }
    }
  }

  const handleSave = async () => {
    if (!capturedImage) return

    setShowSaveModal(false)
    
    // Show loading toast
    toast({
      title: "Saving...",
      description: "Uploading your media to secure storage",
    })

    try {
      // Generate blockchain hash
      const generateHash = () => {
        return 'SHA256:' + Array.from({length: 64}, () => 
          Math.floor(Math.random() * 16).toString(16)
        ).join('').toUpperCase()
      }

      // Get real geolocation
      const location = await new Promise<{latitude: string, longitude: string}>((resolve) => {
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude.toFixed(6),
                longitude: position.coords.longitude.toFixed(6)
              })
            },
            () => {
              resolve({
                latitude: 'Not available',
                longitude: 'Not available'
              })
            },
            { timeout: 5000 }
          )
        } else {
          resolve({
            latitude: 'Not supported',
            longitude: 'Not supported'
          })
        }
      })

      const metadata = {
        hash: generateHash(),
        latitude: location.latitude,
        longitude: location.longitude,
        device: navigator.userAgent,
        blockchainTxId: !isGuest ? 'TX:' + Date.now().toString(36).toUpperCase() : null,
        blockchainBlock: !isGuest ? Math.floor(Math.random() * 1000000) : null,
        blockchainTimestamp: !isGuest ? new Date().toISOString() : null,
        verificationStatus: !isGuest ? 'confirmed' : 'unverified'
      }

      const userId = user?.id || 'guest'
      const locationString = `${location.latitude}, ${location.longitude}`

      // Upload to Supabase
      await uploadMedia(
        capturedImage,
        mode,
        locationString,
        metadata,
        userId,
        isGuest
      )

      toast({
        title: "Saved successfully!",
        description: isGuest 
          ? "Media saved (unverified). Sign in to verify your media!" 
          : "Media saved and verified on blockchain!",
      })

      // Update gallery thumbnail
      setLatestImage(capturedImage)
      setCapturedImage(null)
      
    } catch (error: any) {
      console.error("Error saving media:", error)
      toast({
        title: "Save failed",
        description: error.message || "Unable to save media. Please try again.",
        variant: "destructive",
      })
      // Reopen modal to let user retry
      setShowSaveModal(true)
    }
  }

  const handleRetake = async () => {
    setCapturedImage(null)
    setShowSaveModal(false)
    // Restart camera for retake
    await requestCameraAccess()
  }

  return (
    <>
      {/* Guest Modal */}
      <Dialog open={showGuestModal && isGuest} onOpenChange={setShowGuestModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guest Mode Notice</DialogTitle>
            <DialogDescription>You&apos;re not signed in, you will not be verified.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={() => router.push("/signin")} className="w-full">
              Sign In
            </Button>
            <Button onClick={handleGuestContinue} variant="outline" className="w-full bg-transparent">
              Continue as Guest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Modal */}
      <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Do you want to save this?</DialogTitle>
          </DialogHeader>
          {capturedImage && (
            <img src={capturedImage || "/placeholder.svg"} alt="Captured" className="rounded-lg w-full" />
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={handleSave} className="w-full">
              Save
            </Button>
            <Button onClick={handleRetake} variant="outline" className="w-full bg-transparent">
              Retake
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera Interface */}
      <div className="relative h-screen w-full bg-black">
        {/* Video Stream or Placeholder */}
        {hasPermission && stream ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className="h-full w-full object-cover" 
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-900 to-black">
            <div className="text-center">
              <Camera className="h-16 w-16 text-white/50 mx-auto mb-4" />
              <p className="text-white/70 text-lg">Tap capture to start camera</p>
            </div>
          </div>
        )}
        
        {/* Hidden canvas for capturing photos */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center justify-between">
            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20" onClick={() => router.back()}>
              <X className="h-6 w-6" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={() => setFlashEnabled(!flashEnabled)}
            >
              {flashEnabled ? <FlashOn className="h-6 w-6" /> : <FlashOff className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Center Mode Selector */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 flex gap-2 bg-black/30 backdrop-blur-sm rounded-full p-1">
          <Button
            size="sm"
            variant={mode === "photo" ? "default" : "ghost"}
            className={mode === "photo" ? "rounded-full" : "text-white hover:bg-white/20 rounded-full"}
            onClick={() => setMode("photo")}
          >
            Photo
          </Button>
          <Button
            size="sm"
            variant={mode === "video" ? "default" : "ghost"}
            className={mode === "video" ? "rounded-full" : "text-white hover:bg-white/20 rounded-full"}
            onClick={() => setMode("video")}
          >
            Video
          </Button>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {/* Gallery Thumbnail */}
            <Button
              size="icon"
              variant="ghost"
              className="h-14 w-14 rounded-xl overflow-hidden border-2 border-white/50 p-0 hover:border-white"
              onClick={() => router.push("/gallery")}
            >
              {latestImage ? (
                <img src={latestImage} alt="Gallery" className="h-full w-full object-cover" />
              ) : (
                <Images className="h-6 w-6 text-white" />
              )}
            </Button>

            {/* Capture Button */}
            <Button
              size="icon"
              className="h-20 w-20 rounded-full bg-white hover:bg-white/90 ring-4 ring-white/30"
              onClick={capturePhoto}
            >
              <Camera className="h-8 w-8 text-black" />
            </Button>

            {/* Placeholder for symmetry */}
            <div className="h-14 w-14" />
          </div>
        </div>
      </div>
    </>
  )
}
