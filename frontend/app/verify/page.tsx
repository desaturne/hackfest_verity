"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, ArrowLeft, CheckCircle2, XCircle, AlertCircle, MapPin } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/supabase"
import { downloadMediaFile, getMediaUrl, getUserMedia, updateMediaVerification, type MediaItem } from "@/lib/supabase/media"

type VerificationResult = {
  status: "verified" | "altered" | "insufficient"
  message: string
  latitude?: number
  longitude?: number
  timestamp?: string
  blockIndex?: number
}

type GalleryItem = MediaItem & {
  imageUrl?: string
}

export default function VerifyPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mediaItems, setMediaItems] = useState<GalleryItem[]>([])
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  const selectedItem = useMemo(
    () => mediaItems.find((m) => m.id === selectedItemId) || null,
    [mediaItems, selectedItemId],
  )

  const storedLatitude = selectedItem?.metadata?.latitude
  const storedLongitude = selectedItem?.metadata?.longitude
  const storedTimestampForHash = selectedItem?.metadata?.blockchainTimestamp || selectedItem?.timestamp

  useEffect(() => {
    if (!user) return

    ;(async () => {
      try {
        setLoadingMedia(true)
        const media = await getUserMedia(user.id)
        const withUrls = await Promise.all(
          media
            .filter((m) => m.type === "photo")
            .map(async (m) => ({ ...m, imageUrl: await getMediaUrl(m.storage_path) })),
        )
        setMediaItems(withUrls)
        if (!selectedItemId && withUrls.length > 0) setSelectedItemId(withUrls[0].id)
      } catch (error) {
        console.error("Error loading media for verification:", error)
      } finally {
        setLoadingMedia(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.type.startsWith("image/") || droppedFile.type.startsWith("video/"))) {
      processFile(droppedFile)
    }
  }

  const processFile = (selectedFile: File) => {
    setFile(selectedFile)
    setResult(null)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(selectedFile)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processFile(selectedFile)
    }
  }

  const ensureStoredMetadata = () => {
    if (!user) {
      throw new Error("Please sign in to verify using saved metadata.")
    }
    if (!selectedItem) {
      throw new Error("Select a saved record to verify against.")
    }
    if (!storedLatitude || !storedLongitude || !storedTimestampForHash) {
      throw new Error("Missing stored latitude/longitude/timestamp for this record.")
    }
    if (storedLatitude === "N/A" || storedLongitude === "N/A" || storedTimestampForHash === "N/A") {
      throw new Error("This record does not have usable verification metadata.")
    }
    return {
      latitude: storedLatitude,
      longitude: storedLongitude,
      timestamp: storedTimestampForHash,
    }
  }

  const verifyWithBackend = async (imageFile: File) => {
    const stored = ensureStoredMetadata()

    const fd = new FormData()
    fd.append("image", imageFile)
    fd.append("latitude", stored.latitude)
    fd.append("longitude", stored.longitude)
    fd.append("timestamp", stored.timestamp)

    const res = await fetch("/api/evidence/verify", { method: "POST", body: fd })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data?.error || "Verification failed")
    }
    return data as { verified?: boolean; blockIndex?: number; timestamp?: string }
  }

  const persistVerification = async (verified: boolean, apiTimestamp?: string, apiBlockIndex?: number) => {
    if (!selectedItem) return

    const nextMetadata = {
      ...(selectedItem.metadata as any),
      verificationStatus: verified ? "confirmed" : "altered",
      verifiedAt: new Date().toISOString(),
      verifiedBlockIndex: typeof apiBlockIndex === "number" ? apiBlockIndex : (selectedItem.metadata as any)?.verifiedBlockIndex,
      verifiedBackendTimestamp: apiTimestamp || (selectedItem.metadata as any)?.verifiedBackendTimestamp,
    }
    const nextVerified = verified ? true : selectedItem.verified
    const updated = await updateMediaVerification(selectedItem.id, nextVerified, nextMetadata)
    if (!updated) return

    setMediaItems((prev) => prev.map((m) => (m.id === selectedItem.id ? { ...m, ...updated } : m)))
  }

  const handleVerifyUploadedFile = () => {
    if (!file) return

    setLoading(true)
    ;(async () => {
      try {
        if (!file.type.startsWith("image/")) {
          const next: VerificationResult = {
            status: "insufficient",
            message:
              "Sorry, but we do not have sufficient data to check the credibility of the img/vid at the moment.",
          }
          setResult(next)
          toast({ title: "Verification Complete", description: next.message })
          return
        }

        const data = await verifyWithBackend(file)
        const verified = Boolean(data?.verified)

        const next: VerificationResult = verified
          ? {
              status: "verified",
              message: "No alterations made.",
              latitude: Number(storedLatitude),
              longitude: Number(storedLongitude),
              timestamp: data?.timestamp ? new Date(data.timestamp).toLocaleString() : undefined,
              blockIndex: typeof data?.blockIndex === "number" ? data.blockIndex : undefined,
            }
          : {
              status: "altered",
              message: "No matching block found for this image + metadata.",
            }

        setResult(next)
        try {
          await persistVerification(verified, data?.timestamp, data?.blockIndex)
        } catch (e: any) {
          console.warn("Unable to persist verification state:", e)
        }

        toast({ title: "Verification Complete", description: next.message, variant: verified ? "default" : "destructive" })
      } catch (error: any) {
        toast({
          title: "Verification failed",
          description: error?.message || "Unable to verify media",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    })()
  }

  const handleVerifyFromSaved = async () => {
    setLoading(true)
    try {
      ensureStoredMetadata()
      if (!selectedItem) return

      toast({ title: "Verifying...", description: "Downloading saved media and verifying" })
      const savedFile = await downloadMediaFile(selectedItem.storage_path, `media-${selectedItem.id}.png`)
      const data = await verifyWithBackend(savedFile)
      const verified = Boolean(data?.verified)

      const next: VerificationResult = verified
        ? {
            status: "verified",
            message: "No alterations made.",
            latitude: Number(storedLatitude),
            longitude: Number(storedLongitude),
            timestamp: data?.timestamp ? new Date(data.timestamp).toLocaleString() : undefined,
            blockIndex: typeof data?.blockIndex === "number" ? data.blockIndex : undefined,
          }
        : {
            status: "altered",
            message: "No matching block found for this image + metadata.",
          }

      setResult(next)
      try {
        await persistVerification(verified, data?.timestamp, data?.blockIndex)
      } catch (e: any) {
        console.warn("Unable to persist verification state:", e)
      }

      toast({ title: "Verification Complete", description: next.message, variant: verified ? "default" : "destructive" })
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error?.message || "Unable to verify media",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = () => {
    switch (result?.status) {
      case "verified":
        return <CheckCircle2 className="h-12 w-12 text-green-600" />
      case "altered":
        return <XCircle className="h-12 w-12 text-red-600" />
      case "insufficient":
        return <AlertCircle className="h-12 w-12 text-yellow-600" />
      default:
        return null
    }
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-muted/30">
      {/* Header */}
      <header className="border-b border-border bg-card shrink-0">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/">
              <ArrowLeft className="h-6 w-6" />
            </Link>
          </Button>
          <div className="ml-4 flex items-center gap-2">
            <Image
              src="/images/logo.png"
              alt="Factum Logo"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
            <h1 className="text-xl font-bold">Verify Media</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container flex-1 mx-auto max-w-2xl px-4 py-4 overflow-y-auto">
        <div className="flex justify-center mb-6">
          <Image
            src="/images/verify.png"
            alt="Verify Mascot"
            width={200}
            height={200}
            className="h-40 w-auto object-contain"
            priority
          />
        </div>

        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle>Upload Image or Video</CardTitle>
            <CardDescription>Upload a photo or video to verify its authenticity</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Saved Record Selector */}
            <div className="mb-4 space-y-2">
              <p className="text-sm font-medium">Select saved record (metadata source)</p>
              {!user ? (
                <p className="text-sm text-muted-foreground">Sign in to verify using saved metadata.</p>
              ) : loadingMedia ? (
                <p className="text-sm text-muted-foreground">Loading saved media...</p>
              ) : mediaItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved photos found.</p>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {mediaItems.slice(0, 12).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedItemId(m.id)
                        setResult(null)
                      }}
                      className={`shrink-0 rounded-md border ${m.id === selectedItemId ? "border-primary" : "border-border"}`}
                      aria-label="Select saved media"
                    >
                      <img
                        src={m.imageUrl || "/placeholder.svg"}
                        alt="Saved media thumbnail"
                        className="h-16 w-16 rounded-md object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {selectedItem && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>
                      lat: {String(storedLatitude || "-")}, lon: {String(storedLongitude || "-")}
                    </span>
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    timestamp (for hash): {String(storedTimestampForHash || "-")}
                  </div>
                </div>
              )}

              {user && selectedItem && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleVerifyFromSaved}
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Verify using saved Supabase media"}
                </Button>
              )}
            </div>

            {/* Upload Area */}
            <div
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${isDragging ? "border-primary bg-primary/10" : "border-border bg-muted/50"
                }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
              <p className="mb-2 text-sm font-medium">Drag and drop your file here</p>
              <p className="mb-4 text-xs text-muted-foreground">Supports JPG, PNG, MP4</p>
              <Button onClick={() => fileInputRef.current?.click()} disabled={loading} size="sm">
                {loading ? "Analyzing..." : "Select File"}
              </Button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {preview && (
          <div className="mt-4 space-y-4">
            <div className="relative overflow-hidden rounded-lg max-h-48">
              {file?.type.startsWith("image/") ? (
                <img src={preview || "/placeholder.svg"} alt="Preview" className="w-full h-full object-contain" />
              ) : (
                <video src={preview} controls className="w-full h-full object-contain" />
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleVerifyUploadedFile} disabled={loading} className="flex-1">
                {loading ? "Verifying..." : "Verify"}
              </Button>
              <Button
                onClick={() => {
                  setFile(null)
                  setPreview(null)
                  setResult(null)
                }}
                variant="outline"
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-4">
            {/* Verification Status Block */}
            <Card className="border-2">
              <CardHeader className="py-3">
                <CardTitle className="text-base">Verification Status</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="flex flex-col items-center gap-2 text-center">
                  {getStatusIcon()}
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold">
                      {result.status === "verified" && "Verified"}
                      {result.status === "altered" && "Altered Detected"}
                      {result.status === "insufficient" && "Insufficient Data"}
                    </h3>
                    <p className="text-xs text-muted-foreground">{result.message}</p>
                  </div>

                  {result.timestamp && (
                    <p className="text-[10px] text-muted-foreground">Verified at {result.timestamp}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Capture Location Block */}
            <Card className="border-2 bg-muted/50">
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4" />
                  Capture Location
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                {result.latitude !== undefined && result.longitude !== undefined ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">Latitude:</span>
                      <span className="font-mono text-muted-foreground">{result.latitude.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">Longitude:</span>
                      <span className="font-mono text-muted-foreground">{result.longitude.toFixed(4)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Location unavailable</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="shrink-0 pt-4 pb-8 text-center border-t border-border bg-card">
        <p className="text-xs text-muted-foreground">&copy; 2025 Factum. All rights reserved.</p>
      </footer>
    </div>
  )
}
