"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Camera, ShieldCheck, ImageIcon, User } from "lucide-react"
import { useAuth } from "@/lib/supabase"

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [userName, setUserName] = useState("")
  const [galleryCount, setGalleryCount] = useState(0)
  const [latestImages, setLatestImages] = useState<string[]>([])

  useEffect(() => {
    // Wait for auth to load
    if (loading) return

    // If no user after loading, redirect to signin
    if (!user) {
      router.push("/signin")
      return
    }

    // Set user name from Supabase user
    const name = user.user_metadata?.name || user.email?.split('@')[0] || 'User'
    setUserName(name)

    // Load user's gallery
    const loadGallery = () => {
      const savedMedia = JSON.parse(localStorage.getItem("factum_gallery") || "[]")
      const currentUserId = user.id
      const userImages = savedMedia.filter((item: any) => item.userId === currentUserId)
      setGalleryCount(userImages.length)
      // Get last 3 images for preview
      const recentImages = userImages.slice(-3).reverse().map((item: any) => item.data)
      setLatestImages(recentImages)
    }

    loadGallery()

    // Listen for storage changes to sync gallery
    const handleStorageChange = () => {
      loadGallery()
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [user, loading, router])

  // Show loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center overflow-hidden">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render until user is loaded
  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/home" className="flex items-center gap-2">
            <Image
              src="/images/logo.png"
              alt="Factum Logo"
              width={64}
              height={64}
              className="h-16 w-16 object-contain"
            />
            <span className="text-xl font-bold">Factum</span>
          </Link>
          <Button asChild variant="ghost" size="icon">
            <Link href="/profile">
              <User className="h-6 w-6" />
              <span className="sr-only">Profile</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-4">
        <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
          {/* Mascot */}
          <div className="flex justify-center">
            <Image
              src="/images/signup.png"
              alt="Dashboard Mascot"
              width={160}
              height={160}
              className="h-56 w-auto object-contain"
              priority
            />
          </div>

          {/* Welcome Message */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Welcome, {userName}!</h1>
            <p className="text-sm text-muted-foreground">Select an option to get started</p>
          </div>

          {/* Action Buttons */}
          <div className="flex w-full gap-3">
            <Button asChild size="lg" className="flex-1 text-sm h-auto py-4 flex-col gap-2">
              <Link href="/camera">
                <Camera className="h-6 w-6" />
                <span>Camera</span>
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="flex-1 text-sm h-auto py-4 flex-col gap-2 bg-transparent">
              <Link href="/verify">
                <ShieldCheck className="h-6 w-6" />
                <span>Verify</span>
              </Link>
            </Button>
          </div>

          {/* Gallery Preview Section */}
          {galleryCount > 0 && (
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Recent Captures</h2>
                <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                  <Link href="/gallery">
                    View All ({galleryCount})
                  </Link>
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {latestImages.map((img, idx) => (
                  <div key={idx} className="aspect-square rounded-md overflow-hidden bg-muted relative">
                    <img src={img} alt={`Recent ${idx + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="shrink-0 border-t border-border bg-card">
        <div className="container mx-auto flex items-center justify-around px-4 pt-2 pb-6">
          <Button asChild variant="ghost" className="flex flex-col gap-1 h-auto py-1">
            <Link href="/gallery">
              <ImageIcon className="h-5 w-5" />
              <span className="text-[10px]">Gallery</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" className="flex flex-col gap-1 h-auto py-1">
            <Link href="/camera">
              <Camera className="h-5 w-5" />
              <span className="text-[10px]">Camera</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" className="flex flex-col gap-1 h-auto py-1">
            <Link href="/profile">
              <User className="h-5 w-5" />
              <span className="text-[10px]">Profile</span>
            </Link>
          </Button>
        </div>
      </nav>
    </div>
  )
}
