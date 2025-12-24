import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Camera, ShieldCheck } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/logo.png"
              alt="Factum Logo"
              width={64}
              height={64}
              className="h-10 w-12 object-contain"
            />
            <span className="text-xl font-bold">Factum</span>
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link href="/signin">Sign In</Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
        <div className="flex w-full max-w-md flex-col items-center gap-8">
          {/* Mascot */}
          <div className="relative flex justify-center">
            <div className="absolute -inset-4 rounded-full bg-primary/20 blur-3xl" />
            <Image
              src="/images/homepage.png"
              alt="Factum Homepage Mascot"
              width={100}
              height={100}
              className="relative h-48 w-auto object-contain drop-shadow-xl"
              priority
            />
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Verify Your Media
            </h1>
            <p className="text-muted-foreground">
              Ensure authenticity in the digital age. Upload images or videos to detect alterations and verify sources.
            </p>
          </div>

          <div className="flex w-full gap-3">
            <Button asChild size="lg" className="flex-1">
              <Link href="/camera">Camera</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="flex-1 bg-transparent">
              <Link href="/verify">Verify</Link>
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            You&apos;re in Guest Mode.{" "}
            <Link href="/signin" className="font-medium underline underline-offset-4 hover:text-primary">
              Sign in
            </Link>{" "}
            for full features.
          </div>
        </div>
      </main>

      <footer className="shrink-0 py-6 text-center text-xs text-muted-foreground">
        <p>&copy; 2025 Factum. All rights reserved.</p>
      </footer>
    </div>
  )
}
