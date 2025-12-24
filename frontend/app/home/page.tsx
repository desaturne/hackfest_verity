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
      <div className="flex min-h-screen items-center justify-center">
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
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/home" className="flex items-center gap-3">
            <Image
              src="/images/logo-20factuum.jpg"
              alt="Factum Logo"
              width={40}
              height={40}
              className="h-10 w-10 rounded-lg"
            />
            <span className="text-xl font-bold">Factum</span>
          </Link>
          <Button asChild variant="ghost" size="icon">
            <Link href="/profile">
              <User className="h-5 w-5" />
              <span className="sr-only">Profile</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
          {/* Welcome Message */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Welcome back, {userName}!</h1>
            <p className="text-muted-foreground">What would you like to do today?</p>
          </div>

          {/* Action Buttons */}
          <div className="flex w-full flex-col gap-4">
            <Button asChild size="lg" className="w-full text-base">
              <Link href="/camera">
                <Camera className="mr-2 h-5 w-5" />
                Camera
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full text-base bg-transparent">
              <Link href="/verify">
                <ShieldCheck className="mr-2 h-5 w-5" />
                Verify
              </Link>
            </Button>
          </div>

          {/* Gallery Preview Section */}
          {galleryCount > 0 && (
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recent Captures</h2>
                <Button asChild variant="link" size="sm">
                  <Link href="/gallery">
                    View All ({galleryCount})
                  </Link>
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {latestImages.map((img, idx) => (
                  <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={img} alt={`Recent ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="border-t border-border bg-card">
        <div className="container mx-auto flex items-center justify-around px-4 py-4">
          <Button asChild variant="ghost" className="flex flex-col gap-1 h-auto py-2">
            <Link href="/gallery">
              <ImageIcon className="h-6 w-6" />
              <span className="text-xs">Gallery</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" className="flex flex-col gap-1 h-auto py-2">
            <Link href="/camera">
              <Camera className="h-6 w-6" />
              <span className="text-xs">Camera</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" className="flex flex-col gap-1 h-auto py-2">
            <Link href="/profile">
              <User className="h-6 w-6" />
              <span className="text-xs">Profile</span>
            </Link>
          </Button>
        </div>
      </nav>
    </div>
  )
}
