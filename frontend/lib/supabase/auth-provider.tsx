"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import getSupabaseClient from "./client"

type AuthContextType = {
  user: any | null
  session: any | null
  loading: boolean
  signUp: (opts: { email: string; password: string; metadata?: Record<string, any> }) => Promise<any>
  signIn: (opts: { email: string; password: string }) => Promise<any>
  signInWithProvider: (provider: string) => Promise<any>
  signOut: () => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within SupabaseAuthProvider")
  return ctx
}

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [session, setSession] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        const client = getSupabaseClient()
        if (!client) {
          setLoading(false)
          return
        }

        // Check for session in URL (OAuth redirect)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken && refreshToken) {
          // OAuth redirect detected
          const { data, error } = await client.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (!error && data.session) {
            if (mounted) {
              setSession(data.session)
              setUser(data.session.user)
              
              // Clear hash from URL
              window.history.replaceState(null, '', window.location.pathname)
              
              // Redirect to home after successful OAuth
              router.push('/home')
            }
          }
        } else {
          // Check existing session
          const {
            data: { session: existingSession },
          } = await client.auth.getSession()

          if (mounted) {
            setSession(existingSession ?? null)
            setUser(existingSession?.user ?? null)
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    const client = getSupabaseClient()
    if (!client) {
      return () => {
        mounted = false
      }
    }
    
    const { data: authListener } = client.auth.onAuthStateChange(
      async (event, newSession) => {
        if (mounted) {
          setSession(newSession ?? null)
          setUser(newSession?.user ?? null)

          // Handle auth events
          if (event === 'SIGNED_IN' && newSession) {
            // User just signed in
            router.push('/home')
          } else if (event === 'SIGNED_OUT') {
            // User just signed out
            router.push('/')
          }
        }
      }
    ) || { subscription: { unsubscribe: () => {} } }

    return () => {
      mounted = false
      authListener?.subscription?.unsubscribe()
    }
  }, [router])

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp: async ({ email, password, metadata }) => {
      const client = getSupabaseClient()
      if (!client) throw new Error("Supabase client not initialized")
      
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/verify-email`
        : undefined

      return client.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: redirectUrl,
        },
      })
    },
    signIn: async ({ email, password }) => {
      const client = getSupabaseClient()
      if (!client) throw new Error("Supabase client not initialized")
      return client.auth.signInWithPassword({ email, password })
    },
    signInWithProvider: async (provider: string) => {
      const client = getSupabaseClient()
      if (!client) throw new Error("Supabase client not initialized")
      
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/home`
        : undefined

      return client.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: redirectUrl,
        },
      })
    },
    signOut: async () => {
      const client = getSupabaseClient()
      if (!client) throw new Error("Supabase client not initialized")
      await client.auth.signOut()
      router.push('/')
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
