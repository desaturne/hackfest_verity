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
import { extractVideoFrames, getVideoDurationSeconds, makeEvenlySpacedTimes } from "@/lib/video/extract-frames"
import {
  blobToDataUrl,
  createEvidencePackageV1,
  dataUrlToFile,
  downloadEvidenceBundle,
  readEvidencePackageFromJsonFile,
  type EvidencePackageV1,
} from "@/lib/storage"

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
  const evidenceJsonInputRef = useRef<HTMLInputElement>(null)
  const [evidencePackage, setEvidencePackage] = useState<EvidencePackageV1 | null>(null)

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
  const storedVideoFrameTimesSec = (selectedItem?.metadata as any)?.videoFrameTimesSec as number[] | undefined
  const storedVideoFrameTimestamps = (selectedItem?.metadata as any)?.videoFrameTimestamps as string[] | undefined

  const ensureEvidenceMetadata = () => {
    if (!evidencePackage) {
      throw new Error("Import an evidence JSON file first.")
    }
    const meta: any = evidencePackage.metadata || {}
    const latitude = meta?.latitude
    const longitude = meta?.longitude
    const timestamp = String(meta?.blockchainTimestamp || evidencePackage.captureTimestamp || "")
    if (!latitude || !longitude || !timestamp) {
      throw new Error("Evidence JSON is missing latitude/longitude/timestamp.")
    }
    if (latitude === "N/A" || longitude === "N/A" || timestamp === "N/A") {
      throw new Error("Evidence JSON does not have usable verification metadata.")
    }
    return {
      latitude: String(latitude),
      longitude: String(longitude),
      timestamp,
    }
  }

  const ensureEvidenceVideoMetadata = () => {
    if (!evidencePackage) {
      throw new Error("Import an evidence JSON file first.")
    }
    if (evidencePackage.mediaType !== "video") {
      throw new Error("Import a VIDEO evidence JSON to verify a video.")
    }
    const meta: any = evidencePackage.metadata || {}
    const latitude = meta?.latitude
    const longitude = meta?.longitude
    if (!latitude || !longitude) {
      throw new Error("Evidence JSON is missing latitude/longitude.")
    }
    if (latitude === "N/A" || longitude === "N/A") {
      throw new Error("Evidence JSON does not have usable location metadata.")
    }

    const timesSec = Array.isArray(meta?.videoFrameTimesSec) ? (meta.videoFrameTimesSec as number[]) : []
    const frameTimestamps = Array.isArray(meta?.videoFrameTimestamps) ? (meta.videoFrameTimestamps as string[]) : []
    if (timesSec.length === 0 || frameTimestamps.length === 0 || timesSec.length !== frameTimestamps.length) {
      throw new Error("Evidence JSON is missing saved frame metadata.")
    }

    return {
      latitude: String(latitude),
      longitude: String(longitude),
      frameTimesSec: timesSec,
      frameTimestamps,
    }
  }

  useEffect(() => {
    if (!user) return

      ; (async () => {
        try {
          setLoadingMedia(true)
          const media = await getUserMedia(user.id)
          const withUrls = await Promise.all(
            media
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

  const ensureStoredVideoMetadata = () => {
    if (!user) {
      throw new Error("Please sign in to verify using saved metadata.")
    }
    if (!selectedItem) {
      throw new Error("Select a saved record to verify against.")
    }
    if (selectedItem.type !== "video") {
      throw new Error("Select a saved VIDEO record to verify a video.")
    }
    if (!storedLatitude || !storedLongitude) {
      throw new Error("Missing stored latitude/longitude for this record.")
    }
    if (storedLatitude === "N/A" || storedLongitude === "N/A") {
      throw new Error("This record does not have usable location metadata.")
    }

    const timesSec = Array.isArray(storedVideoFrameTimesSec) ? storedVideoFrameTimesSec : []
    const frameTimestamps = Array.isArray(storedVideoFrameTimestamps) ? storedVideoFrameTimestamps : []
    if (timesSec.length === 0 || frameTimestamps.length === 0 || timesSec.length !== frameTimestamps.length) {
      throw new Error("This video record is missing saved frame metadata. Re-capture and save the video.")
    }

    return {
      latitude: storedLatitude,
      longitude: storedLongitude,
      frameTimesSec: timesSec,
      frameTimestamps,
    }
  }

  const verifyWithBackendUsing = async (
    imageFile: File,
    meta: { latitude: string; longitude: string; timestamp: string },
  ) => {
    const fd = new FormData()
    fd.append("image", imageFile)
    fd.append("latitude", meta.latitude)
    fd.append("longitude", meta.longitude)
    fd.append("timestamp", meta.timestamp)

    const res = await fetch("/api/evidence/verify", { method: "POST", body: fd })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data?.error || "Verification failed")
    }
    return data as { verified?: boolean; blockIndex?: number; timestamp?: string }
  }

  const verifyWithBackend = async (imageFile: File) => {
    const stored = ensureStoredMetadata()
    return verifyWithBackendUsing(imageFile, stored)
  }

  const verifyVideoWithBackendUsing = async (
    videoFile: File,
    meta: { latitude: string; longitude: string; frameTimesSec: number[]; frameTimestamps: string[] },
  ) => {
    const durationSec = await getVideoDurationSeconds(videoFile)
    // Prefer the same timestamps used during capture; if duration is unavailable, still use stored times.
    const times = meta.frameTimesSec.length > 0 ? meta.frameTimesSec : makeEvenlySpacedTimes(durationSec || 5, 5)

    toast({ title: "Processing video...", description: "Extracting frames for verification" })
    const frames = await extractVideoFrames(videoFile, times, { mimeType: "image/jpeg", quality: 0.92 })

    const results: Array<{ verified: boolean; blockIndex?: number; timestamp?: string }> = []
    for (let i = 0; i < frames.length; i++) {
      const fd = new FormData()
      fd.append("image", frames[i].file)
      fd.append("latitude", meta.latitude)
      fd.append("longitude", meta.longitude)
      fd.append("timestamp", meta.frameTimestamps[i])

      const res = await fetch("/api/evidence/verify", { method: "POST", body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || `Verification failed for frame ${i + 1}`)
      }
      results.push({
        verified: Boolean((data as any)?.verified),
        blockIndex: typeof (data as any)?.blockIndex === "number" ? (data as any).blockIndex : undefined,
        timestamp: typeof (data as any)?.timestamp === "string" ? (data as any).timestamp : undefined,
      })
    }

    const failedIndices = results
      .map((r, idx) => ({ ok: r.verified, idx }))
      .filter((x) => !x.ok)
      .map((x) => x.idx)

    return {
      allVerified: failedIndices.length === 0,
      verifiedCount: results.filter((r) => r.verified).length,
      total: results.length,
      failedIndices,
      // Expose first verified block/timestamp for display.
      anyBlockIndex: results.find((r) => typeof r.blockIndex === "number")?.blockIndex,
      anyTimestamp: results.find((r) => typeof r.timestamp === "string")?.timestamp,
    }
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

  const uploadFromEvidenceJson = async (pkg: EvidencePackageV1) => {
    if (!pkg.mediaDataUrl) {
      throw new Error("This evidence JSON does not include media data.")
    }

    const mediaFile = dataUrlToFile(
      pkg.mediaDataUrl,
      pkg.mediaType === "video" ? `evidence-${pkg.id}.webm` : `evidence-${pkg.id}.jpg`,
    )

    if (pkg.mediaType === "photo") {
      const meta = ensureEvidenceMetadata()
      const fd = new FormData()
      fd.append("image", mediaFile)
      fd.append("latitude", meta.latitude)
      fd.append("longitude", meta.longitude)
      fd.append("timestamp", meta.timestamp)

      const res = await fetch("/api/evidence/upload", { method: "POST", body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || "Upload failed")
      }
      return
    }

    if (pkg.mediaType === "video") {
      const meta = ensureEvidenceVideoMetadata()
      const frames = await extractVideoFrames(mediaFile, meta.frameTimesSec, { mimeType: "image/jpeg", quality: 0.92 })

      for (let i = 0; i < frames.length; i++) {
        const fd = new FormData()
        fd.append("image", frames[i].file)
        fd.append("latitude", meta.latitude)
        fd.append("longitude", meta.longitude)
        fd.append("timestamp", meta.frameTimestamps[i])

        const res = await fetch("/api/evidence/upload", { method: "POST", body: fd })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.error || `Upload failed for frame ${i + 1}`)
        }
      }
      return
    }

    throw new Error("Unsupported mediaType")
  }

  const handleVerify = async () => {
    if (!file) {
      toast({ title: "No file selected", description: "Select a file to verify.", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      if (file.type.startsWith("image/")) {
        const meta = evidencePackage ? ensureEvidenceMetadata() : ensureStoredMetadata()
        const data = evidencePackage ? await verifyWithBackendUsing(file, meta) : await verifyWithBackend(file)
        const verified = Boolean(data?.verified)

        const next: VerificationResult = verified
          ? {
              status: "verified",
              message: "No alterations made.",
              latitude: Number(meta.latitude),
              longitude: Number(meta.longitude),
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

        if (!verified && evidencePackage?.mediaDataUrl) {
          toast({ title: "Not found", description: "Uploading evidence from JSON to blockchain..." })
          await uploadFromEvidenceJson(evidencePackage)
          toast({ title: "Uploaded", description: "Evidence uploaded to blockchain." })
        }

        toast({ title: "Verification Complete", description: next.message, variant: verified ? "default" : "destructive" })
        return
      }

      if (file.type.startsWith("video/")) {
        if (!evidencePackage) {
          throw new Error("To verify a video file, import the matching evidence JSON first.")
        }
        const meta = ensureEvidenceVideoMetadata()
        const data = await verifyVideoWithBackendUsing(file, meta)
        const verified = Boolean(data.allVerified)

        const next: VerificationResult = verified
          ? {
              status: "verified",
              message: `Video verified. ${data.verifiedCount}/${data.total} frames matched.`,
              latitude: Number(meta.latitude),
              longitude: Number(meta.longitude),
              timestamp: data.anyTimestamp ? new Date(data.anyTimestamp).toLocaleString() : undefined,
              blockIndex: typeof data.anyBlockIndex === "number" ? data.anyBlockIndex : undefined,
            }
          : {
              status: "altered",
              message: `Video altered. ${data.verifiedCount}/${data.total} frames matched. Failed frames: ${data.failedIndices.map((i) => i + 1).join(", ")}.`,
            }

        setResult(next)
        try {
          // Persist the summary on the saved video record
          if (selectedItem) {
            const nextMetadata = {
              ...(selectedItem.metadata as any),
              verificationStatus: verified ? "confirmed" : "altered",
              verifiedAt: new Date().toISOString(),
              videoVerifiedFrameCount: data.verifiedCount,
              videoFailedFrameIndices: data.failedIndices,
            }
            const nextVerified = verified ? true : selectedItem.verified
            const updated = await updateMediaVerification(selectedItem.id, nextVerified, nextMetadata)
            if (updated) {
              setMediaItems((prev) => prev.map((m) => (m.id === selectedItem.id ? { ...m, ...updated } : m)))
            }
          }
        } catch (e: any) {
          console.warn("Unable to persist verification state:", e)
        }

        if (!verified && evidencePackage.mediaDataUrl) {
          toast({ title: "Not found", description: "Uploading video frames from JSON to blockchain..." })
          await uploadFromEvidenceJson(evidencePackage)
          toast({ title: "Uploaded", description: "Video frames uploaded to blockchain." })
        }

        toast({ title: "Verification Complete", description: next.message, variant: verified ? "default" : "destructive" })
        return
      }

      const next: VerificationResult = {
        status: "insufficient",
        message: "Unsupported file type.",
      }
      setResult(next)
      toast({ title: "Verification Complete", description: next.message })
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

  const handleImportEvidenceJson = async (jsonFile: File) => {
    try {
      const pkg = await readEvidencePackageFromJsonFile(jsonFile)
      setEvidencePackage(pkg)
      toast({
        title: "Evidence JSON imported",
        description: `Loaded ${pkg.mediaType} metadata (${pkg.id}).`,
      })
    } catch (e: any) {
      toast({
        title: "Import failed",
        description: e?.message || "Unable to read evidence JSON",
        variant: "destructive",
      })
    } finally {
      if (evidenceJsonInputRef.current) evidenceJsonInputRef.current.value = ""
    }
  }


  const handleVerifyFromSaved = async () => {
    setLoading(true)
    try {
      if (!selectedItem) {
        throw new Error("Select a saved record to verify.")
      }
      if (!selectedItem) return

      toast({ title: "Verifying...", description: "Downloading saved media and verifying" })
      const ext = selectedItem.type === "video" ? "webm" : "png"
      const savedFile = await downloadMediaFile(selectedItem.storage_path, `media-${selectedItem.id}.${ext}`)

      if (selectedItem.type === "photo") {
        ensureStoredMetadata()
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
        return
      }

      if (selectedItem.type === "video") {
        const data = await verifyVideoWithBackend(savedFile)
        const verified = Boolean(data.allVerified)

        const next: VerificationResult = verified
          ? {
              status: "verified",
              message: `Video verified. ${data.verifiedCount}/${data.total} frames matched.`,
              latitude: Number(storedLatitude),
              longitude: Number(storedLongitude),
              timestamp: data.anyTimestamp ? new Date(data.anyTimestamp).toLocaleString() : undefined,
              blockIndex: typeof data.anyBlockIndex === "number" ? data.anyBlockIndex : undefined,
            }
          : {
              status: "altered",
              message: `Video altered. ${data.verifiedCount}/${data.total} frames matched. Failed frames: ${data.failedIndices.map((i) => i + 1).join(", ")}.`,
            }

        setResult(next)
        try {
          const nextMetadata = {
            ...(selectedItem.metadata as any),
            verificationStatus: verified ? "confirmed" : "altered",
            verifiedAt: new Date().toISOString(),
            videoVerifiedFrameCount: data.verifiedCount,
            videoFailedFrameIndices: data.failedIndices,
          }
          const nextVerified = verified ? true : selectedItem.verified
          const updated = await updateMediaVerification(selectedItem.id, nextVerified, nextMetadata)
          if (updated) {
            setMediaItems((prev) => prev.map((m) => (m.id === selectedItem.id ? { ...m, ...updated } : m)))
          }
        } catch (e: any) {
          console.warn("Unable to persist verification state:", e)
        }

        toast({ title: "Verification Complete", description: next.message, variant: verified ? "default" : "destructive" })
        return
      }

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

  const handleExportSelectedEvidenceJson = async () => {
    if (!selectedItem) {
      toast({ title: "Nothing selected", description: "Select a saved record first.", variant: "destructive" })
      return
    }
    try {
      const ext = selectedItem.type === "video" ? "webm" : "png"
      const savedFile = await downloadMediaFile(selectedItem.storage_path, `media-${selectedItem.id}.${ext}`)
      const mediaDataUrl = await blobToDataUrl(savedFile)

      const pkg = createEvidencePackageV1({
        userId: selectedItem.user_id,
        mediaType: selectedItem.type,
        captureTimestamp: String(selectedItem.metadata?.blockchainTimestamp || selectedItem.timestamp),
        mediaDataUrl,
        metadata: (selectedItem.metadata as any) || {},
      })

      downloadEvidenceBundle(pkg)
      toast({ title: "Exported", description: "Evidence JSON downloaded." })
    } catch (e: any) {
      toast({
        title: "Export failed",
        description: e?.message || "Unable to export evidence JSON",
        variant: "destructive",
      })
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
            <Link href="/home">
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
                <p className="text-sm text-muted-foreground">No saved media found.</p>
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
                      {m.type === "video" ? (
                        <video
                          src={m.imageUrl || ""}
                          muted
                          playsInline
                          preload="metadata"
                          className="h-16 w-16 rounded-md object-cover"
                        />
                      ) : (
                        <img
                          src={m.imageUrl || "/placeholder.svg"}
                          alt="Saved media thumbnail"
                          className="h-16 w-16 rounded-md object-cover"
                        />
                      )}
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
                    {selectedItem.type === "video"
                      ? `video frames: ${Array.isArray(storedVideoFrameTimestamps) ? storedVideoFrameTimestamps.length : 0}`
                      : `timestamp (for hash): ${String(storedTimestampForHash || "-")}`}
                  </div>
                </div>
              )}

              {selectedItem && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleExportSelectedEvidenceJson}
                  disabled={loading}
                >
                  Export evidence JSON
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
              <Button
                variant="outline"
                onClick={() => evidenceJsonInputRef.current?.click()}
                disabled={loading}
                size="sm"
                className="mt-2"
              >
                Import evidence JSON
              </Button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />
              <input
                type="file"
                ref={evidenceJsonInputRef}
                className="hidden"
                accept="application/json,.json"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleImportEvidenceJson(f)
                }}
              />
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
              <Button onClick={handleVerify} disabled={loading} className="flex-1">
                {loading ? "Verifying..." : "Verify"}
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
