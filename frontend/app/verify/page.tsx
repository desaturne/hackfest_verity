"use client"

import type React from "react"

import { useState, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, ArrowLeft, CheckCircle2, XCircle, AlertCircle, MapPin } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type VerificationResult = {
  status: "verified" | "altered" | "insufficient"
  message: string
  latitude?: number
  longitude?: number
  timestamp?: string
}

export default function VerifyPage() {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleVerify = () => {
    if (!file) return

    setLoading(true)

    // Mock verification logic
    setTimeout(() => {
      const random = Math.random()
      let mockResult: VerificationResult

      if (random < 0.4) {
        mockResult = {
          status: "verified",
          message: "No alterations made.",
          latitude: 37.7749,
          longitude: -122.4194,
          timestamp: new Date().toLocaleString(),
        }
      } else if (random < 0.7) {
        mockResult = {
          status: "altered",
          message: "The image is altered.",
          latitude: 40.7128,
          longitude: -74.006,
          timestamp: new Date().toLocaleString(),
        }
      } else {
        mockResult = {
          status: "insufficient",
          message: "Sorry, but we do not have sufficient data to check the credibility of the img/vid at the moment.",
        }
      }

      setResult(mockResult)
      setLoading(false)

      toast({
        title: "Verification Complete",
        description: mockResult.message,
      })
    }, 2000)
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
              <Button onClick={handleVerify} disabled={loading} className="flex-1">
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
