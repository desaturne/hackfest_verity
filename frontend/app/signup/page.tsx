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

export default function SignUpPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      toast({ 
        title: "Error", 
        description: "Passwords do not match", 
        variant: "destructive" 
      })
      setLoading(false)
      return
    }

    // Validate password strength
    if (formData.password.length < 6) {
      toast({ 
        title: "Error", 
        description: "Password must be at least 6 characters long", 
        variant: "destructive" 
      })
      setLoading(false)
      return
    }

    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        throw new Error("Supabase not configured. Please check your environment variables.")
      }
      
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: { 
            name: formData.name.trim(), 
            dob: formData.dob 
          },
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      })
      
      if (error) throw error
      
      toast({ 
        title: "Success!", 
        description: "Account created. Check your email for verification link." 
      })
      router.push("/verify-email")
    } catch (err: any) {
      const errorMessage = err.message || String(err)
      toast({ 
        title: "Sign up failed", 
        description: errorMessage.includes("already registered") 
          ? "This email is already registered. Please sign in instead."
          : errorMessage,
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
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
        title: "Google sign up failed", 
        description: err.message || "Unable to sign up with Google", 
        variant: "destructive" 
      })
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/images/logo-20factuum.jpg"
            alt="Factum Logo"
            width={60}
            height={60}
            className="h-16 w-16 rounded-xl"
          />
          <h1 className="text-3xl font-bold">Sign Up</h1>
        </div>

        {/* Sign Up Form */}
        <form onSubmit={handleSignUp} className="space-y-6 rounded-xl bg-card p-8 shadow-sm border border-border">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" type="date" value={formData.dob} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Account..." : "Sign Up"}
            </Button>
            <Button type="button" variant="outline" className="w-full bg-transparent" onClick={handleGoogleSignUp}>
              Sign up with Google
            </Button>
          </div>
        </form>

        {/* Sign In Link */}
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/signin" className="font-medium text-accent hover:underline">
            Sign in
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
