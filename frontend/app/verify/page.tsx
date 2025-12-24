"use client"

import type React from "react"

import { useState, useRef } from "react"
import Link from "next/link"
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
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
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="ml-4 text-xl font-bold">Verify Media</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Upload Image or Video</CardTitle>
            <CardDescription>Upload a photo or video to verify its authenticity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upload Area */}
            {!preview && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 p-12 transition-colors hover:border-accent hover:bg-muted"
              >
                <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-sm font-medium">Click to upload</p>
                <p className="text-xs text-muted-foreground">Supports images and videos</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}

            {/* Preview */}
            {preview && (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-lg">
                  {file?.type.startsWith("image/") ? (
                    <img src={preview || "/placeholder.svg"} alt="Preview" className="w-full" />
                  ) : (
                    <video src={preview} controls className="w-full" />
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

            {/* Results */}
            {result && (
              <div className="space-y-4">
                {/* Verification Status Block */}
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-base">Verification Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center gap-4 text-center">
                      {getStatusIcon()}
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold">
                          {result.status === "verified" && "Verified"}
                          {result.status === "altered" && "Altered Detected"}
                          {result.status === "insufficient" && "Insufficient Data"}
                        </h3>
                        <p className="text-sm text-muted-foreground">{result.message}</p>
                      </div>

                      {result.timestamp && (
                        <p className="text-xs text-muted-foreground">Verified at {result.timestamp}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Capture Location Block */}
                <Card className="border-2 bg-muted/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MapPin className="h-4 w-4" />
                      Capture Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {result.latitude !== undefined && result.longitude !== undefined ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Latitude:</span>
                          <span className="font-mono text-muted-foreground">{result.latitude.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Longitude:</span>
                          <span className="font-mono text-muted-foreground">{result.longitude.toFixed(4)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Location unavailable</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
