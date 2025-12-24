"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseClient } from "@/lib/supabase"

export default function VerifyEmailPage() {
  const { toast } = useToast()
  const [processing, setProcessing] = useState(false)
  const [email, setEmail] = useState("")
  const router = useRouter()

  useEffect(() => {
    ;(async () => {
      try {
        const supabase = getSupabaseClient()
        if (!supabase) return
        // If the confirmation link returned a session/token in the URL, process it
        // This will sign the user in if the URL contains an access_token/refresh_token
        const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true })
        if (error) {
          // not necessarily fatal — just show a toast
          toast({ title: "Verification", description: error.message || "Could not parse sign-in from URL.", variant: "destructive" })
          return
        }

        if (data?.session) {
          toast({ title: "Email confirmed", description: "You are now signed in." })
          router.push("/home")
        }
      } catch (err: any) {
        // ignore
      }
    })()
  }, [router, toast])

  const handleSendMagic = async () => {
    setProcessing(true)
    try {
      const supabase = getSupabaseClient()
      if (!supabase) throw new Error("Supabase not configured")
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`
        }
      })
      if (error) throw error
      toast({ title: "Magic link sent", description: "Check your email for a sign-in link." })
    } catch (err: any) {
      toast({ title: "Failed", description: err.message || String(err), variant: "destructive" })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-card p-8 shadow-sm border border-border">
        <h2 className="text-2xl font-bold">Verify your email</h2>
        <p className="text-sm text-muted-foreground">If you clicked a confirmation link, we processed it. If not, enter your email below to receive a magic link.</p>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>

        <div className="flex gap-2">
          <Button className="flex-1" onClick={handleSendMagic} disabled={processing || !email}>
            {processing ? "Sending..." : "Send magic link"}
          </Button>
          <Button variant="outline" asChild>
            <a href="/">Back</a>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">If you still don't receive emails, verify your Supabase project's SMTP / Email settings and allowed redirect URLs in the dashboard.</p>
      </div>
    </div>
  )
}
