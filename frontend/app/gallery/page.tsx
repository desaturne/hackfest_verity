"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowLeft, CheckCircle2, XCircle, Trash2, MapPin, Clock, Hash, Link2 } from "lucide-react"
import { DeleteConfirmationModal } from "@/components/delete-confirmation-modal"
import { useAuth } from "@/lib/supabase"
import {
  getUserMedia,
  getMediaUrl,
  deleteMedia,
  downloadMediaFile,
  updateMediaVerification,
  type MediaItem,
} from "@/lib/supabase/media"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

type GalleryItem = MediaItem & {
  imageUrl?: string
}

export default function GalleryPage() {
  const { user, loading } = useAuth()
  const { toast } = useToast()
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loadingMedia, setLoadingMedia] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    if (loading) return

    const loadGallery = async () => {
      try {
        setLoadingMedia(true)
        const userId = user?.id || 'guest'
        const mediaItems = await getUserMedia(userId)

        // Get URLs for all media
        const itemsWithUrls = await Promise.all(
          mediaItems.map(async (item) => {
            const imageUrl = await getMediaUrl(item.storage_path)
            return { ...item, imageUrl }
          })
        )

        setItems(itemsWithUrls)
      } catch (error) {
        console.error("Error loading gallery:", error)
      } finally {
        setLoadingMedia(false)
      }
    }

    loadGallery()
  }, [user, loading])

  const handleDeleteClick = (itemId: string) => {
    setItemToDelete(itemId)
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (itemToDelete !== null) {
      try {
        const item = items.find((i) => i.id === itemToDelete)
        if (item) {
          await deleteMedia(itemToDelete, item.storage_path)
          const updatedItems = items.filter((item) => item.id !== itemToDelete)
          setItems(updatedItems)
          setDeleteModalOpen(false)
          setItemToDelete(null)

          // Close detail modal if the deleted item was being viewed
          if (selectedItem?.id === itemToDelete) {
            setDetailModalOpen(false)
            setSelectedItem(null)
          }
        }
      } catch (error) {
        console.error("Error deleting media:", error)
      }
    }
  }

  const handleItemClick = (item: GalleryItem) => {
    setSelectedItem(item)
    setDetailModalOpen(true)
  }

  const handleVerifySelected = async () => {
    if (!user || !selectedItem) return

    const latitude = selectedItem.metadata?.latitude
    const longitude = selectedItem.metadata?.longitude
    const timestampForHash = selectedItem.metadata?.blockchainTimestamp || selectedItem.timestamp

    if (!latitude || !longitude || !timestampForHash) {
      toast({
        title: "Cannot verify",
        description: "Missing required metadata (lat/long/timestamp).",
        variant: "destructive",
      })
      return
    }

    setIsVerifying(true)
    try {
      toast({
        title: "Verifying...",
        description: "Uploading this media from your gallery for verification",
      })

      const file = await downloadMediaFile(
        selectedItem.storage_path,
        `media-${selectedItem.id}.png`,
      )

      const fd = new FormData()
      fd.append("image", file)
      fd.append("latitude", latitude)
      fd.append("longitude", longitude)
      fd.append("timestamp", timestampForHash)

      const res = await fetch("/api/evidence/verify", { method: "POST", body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Verification failed")

      const verified = Boolean(data?.verified)
      const nextMetadata = {
        ...(selectedItem.metadata as any),
        verificationStatus: verified ? "confirmed" : "altered",
      }
      const nextVerified = verified ? true : selectedItem.verified

      try {
        const updated = await updateMediaVerification(selectedItem.id, nextVerified, nextMetadata)
        if (updated) {
          setItems((prev) => prev.map((it) => (it.id === selectedItem.id ? { ...it, ...updated } : it)))
          setSelectedItem((prev) => (prev && prev.id === selectedItem.id ? { ...prev, ...updated } : prev))
        }
      } catch (e: any) {
        console.warn("Unable to persist verification state:", e)
      }

      toast({
        title: verified ? "Verified" : "Not verified",
        description: verified
          ? "No alterations made."
          : "No matching proof found in backend ledger (or metadata mismatch).",
        variant: verified ? "default" : "destructive",
      })
    } catch (error: any) {
      toast({
        title: "Verification error",
        description: error?.message || "Unable to verify this media",
        variant: "destructive",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-muted/30">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-card">
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
            <h1 className="text-xl font-bold">Gallery</h1>
          </div>
        </div>
      </header>

      {/* Gallery Grid */}
      <main className="container mx-auto px-4 py-8">
        {loadingMedia ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-lg text-muted-foreground">Loading your media...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg text-muted-foreground">No media saved yet</p>
            <Button asChild className="mt-4">
              <Link href="/camera">Capture Your First Photo</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="group relative aspect-square overflow-hidden rounded-lg bg-card shadow-sm cursor-pointer"
                onClick={() => handleItemClick(item)}
              >
                <img
                  src={item.imageUrl || "/placeholder.svg"}
                  alt="Gallery item"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="absolute bottom-2 left-2 flex items-center gap-2">
                    {item.verified ? (
                      <CheckCircle2 className="h-5 w-5 text-green-400" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400" />
                    )}
                    <span className="text-xs text-white">{item.verified ? "Verified" : "Unverified"}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteClick(item.id)
                    }}
                    className="absolute right-2 top-2 rounded-full bg-destructive/90 p-2 text-destructive-foreground transition-colors hover:bg-destructive"
                    aria-label="Delete media"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleConfirmDelete}
      />

      {/* Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Media Details
              {selectedItem?.verified ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.verified ? "Verified and stored on blockchain" : "Unverified media (guest mode)"}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              {/* Image Preview */}
              <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                <img
                  src={selectedItem.imageUrl || "/placeholder.svg"}
                  alt="Media preview"
                  className="w-full h-full object-contain bg-muted"
                />
              </div>

              {user && (
                <Button className="w-full" onClick={handleVerifySelected} disabled={isVerifying}>
                  {isVerifying ? "Verifying..." : "Verify from Gallery"}
                </Button>
              )}

              {/* Metadata Cards */}
              <div className="space-y-3">
                {/* Hash */}
                {selectedItem.metadata?.hash && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        Content Hash
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded flex-1 overflow-x-auto">
                          {selectedItem.metadata.hash}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(selectedItem.metadata!.hash)}
                        >
                          Copy
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Location */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Latitude:</span>
                      <span className="text-sm font-mono">{selectedItem.metadata?.latitude || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Longitude:</span>
                      <span className="text-sm font-mono">{selectedItem.metadata?.longitude || 'N/A'}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Timestamp */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Timestamp
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      {new Date(selectedItem.timestamp).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>

                {/* Blockchain Data */}
                {selectedItem.verified && selectedItem.metadata?.blockchainTxId && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        Blockchain Data
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Transaction ID:</p>
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                            {selectedItem.metadata.blockchainTxId}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(selectedItem.metadata!.blockchainTxId!)}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Block Number:</span>
                        <span className="text-sm font-mono">{selectedItem.metadata.blockchainBlock}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <span className="text-sm font-semibold text-green-500 capitalize">
                          {selectedItem.metadata.verificationStatus}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Blockchain Timestamp:</p>
                        <p className="text-sm">
                          {selectedItem.metadata.blockchainTimestamp &&
                            new Date(selectedItem.metadata.blockchainTimestamp).toLocaleString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Unverified Notice */}
                {!selectedItem.verified && (
                  <Card className="border-yellow-500/50 bg-yellow-500/10">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-yellow-600" />
                        Unverified Media
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        This media was captured in guest mode and is not verified on the blockchain.
                        Sign in to enable verification for future captures.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
