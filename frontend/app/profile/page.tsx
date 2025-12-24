"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, User, Mail, Calendar, LogOut } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/supabase"

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading, signOut } = useAuth()
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    dob: "",
  })

  useEffect(() => {
    // Wait for auth to load
    if (loading) return

    // If no user, redirect to signin
    if (!user) {
      router.push("/signin")
      return
    }

    // Set user data from Supabase user
    setUserData({
      name: user.user_metadata?.name || user.email?.split('@')[0] || "User",
      email: user.email || "",
      dob: user.user_metadata?.dob || "",
    })
  }, [user, loading, router])

  const handleLogout = async () => {
    try {
      await signOut()
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      })
    }
  }

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
            <h1 className="text-xl font-bold">Profile</h1>
          </div>
        </div>
      </header>

      {/* Profile Content */}
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <div className="space-y-6">
          {/* Profile Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 rounded-lg bg-muted p-4">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-base font-semibold">{userData.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-lg bg-muted p-4">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-base font-semibold">{userData.email}</p>
                </div>
              </div>

              {userData.dob && (
                <div className="flex items-center gap-4 rounded-lg bg-muted p-4">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                    <p className="text-base font-semibold">{new Date(userData.dob).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            <Button variant="outline" className="w-full bg-transparent" disabled>
              Edit Profile
            </Button>
            <Button variant="destructive" className="w-full" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
