import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Camera, ShieldCheck } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/logo-20factuum.jpg"
              alt="Factum Logo"
              width={40}
              height={40}
              className="h-10 w-10 rounded-lg"
            />
            <span className="text-xl font-bold">Factum</span>
          </Link>
          <Button asChild variant="outline">
            <Link href="/signin">Sign In</Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
          {/* Mascot */}
          <div className="relative">
            <Image
              src="/images/mascot-20factum.png"
              alt="Factum Mascot"
              width={200}
              height={200}
              className="h-48 w-auto"
            />
          </div>

          {/* Title */}
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-balance">Verify Your Media</h1>
            <p className="text-lg text-muted-foreground text-pretty">
              Capture photos and videos with verified authenticity or check existing media for alterations
            </p>
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

          {/* Guest Notice */}
          <p className="text-sm text-muted-foreground">
            You&apos;re in Guest Mode.{" "}
            <Link href="/signin" className="font-medium text-accent hover:underline">
              Sign in
            </Link>{" "}
            for full verification features.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2025 Factum. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
