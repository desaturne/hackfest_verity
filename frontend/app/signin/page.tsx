"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseClient } from "@/lib/supabase"

export default function SignInPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        throw new Error("Supabase not configured. Please check your environment variables.")
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password 
      })
      
      if (error) throw error
      
      if (data.user) {
        toast({ 
          title: "Signed in successfully", 
          description: "Welcome back!" 
        })
        // When using persisted sessions, redirect to protected area
        router.push("/home")
      }
    } catch (err: any) {
      const errorMessage = err.message || String(err)
      toast({ 
        title: "Sign in failed", 
        description: errorMessage.includes("Invalid login credentials") 
          ? "Invalid email or password. Please try again."
          : errorMessage,
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        throw new Error("Supabase not configured. Please check your environment variables.")
      }
      
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/home`
        }
      })
      
      if (error) throw error
    } catch (err: any) {
      toast({ 
        title: "Google sign in failed", 
        description: err.message || "Unable to sign in with Google", 
        variant: "destructive" 
      })
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Mascot */}
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/images/logo-20factuum.jpg"
            alt="Factum Logo"
            width={60}
            height={60}
            className="h-16 w-16 rounded-xl"
          />
          <Image
            src="/images/mascot-20factum.png"
            alt="Factum Mascot"
            width={120}
            height={120}
            className="h-28 w-auto"
          />
          <h1 className="text-3xl font-bold">Sign In</h1>
        </div>

        {/* Sign In Form */}
        <form onSubmit={handleSignIn} className="space-y-6 rounded-xl bg-card p-8 shadow-sm border border-border">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
            Sign in with Google
          </Button>
        </form>

        {/* Sign Up Link */}
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-accent hover:underline">
            Sign up
          </Link>
        </p>

        {/* Back to Home */}
        <div className="text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
