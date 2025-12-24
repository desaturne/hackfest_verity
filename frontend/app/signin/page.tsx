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

import { ArrowLeft } from "lucide-react"

export default function SignInPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        throw new Error("Supabase not configured. Please check your environment variables.")
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password
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

  const handleGoogleSignIn = async () => {
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
    <div className="flex min-h-screen w-full flex-col bg-muted/30">
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
            <h1 className="text-xl font-bold">Sign In</h1>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6 text-center">
          {/* Mascot */}
          <div className="flex justify-center">
            <Image
              src="/images/signin.png"
              alt="Sign In Mascot"
              width={240}
              height={240}
              className="h-60 w-auto object-contain"
              priority
            />
          </div>

          <h1 className="text-2xl font-bold">Welcome Back</h1>

          <form onSubmit={handleSignIn} className="space-y-4 text-left">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="#" className="text-xs text-muted-foreground hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2 pt-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              <Button type="button" variant="outline" className="w-full bg-transparent" onClick={handleGoogleSignIn}>
                Sign in with Google
              </Button>
            </div>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
