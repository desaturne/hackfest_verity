export type EvidencePackageV1 = {
  version: 1
  id: string
  createdAt: string
  userId: string
  mediaType: "photo" | "video"
  captureTimestamp: string
  mediaDataUrl?: string
  metadata: Record<string, any>
}

const STORAGE_KEY = "factum_evidence_packages_v1"

function safeNowIso() {
  return new Date().toISOString()
}

function randomId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Failed to read blob"))
    reader.onload = () => resolve(String(reader.result || ""))
    reader.readAsDataURL(blob)
  })
}

export function listEvidencePackages(): EvidencePackageV1[] {
  const ls = getLocalStorage()
  if (!ls) return []
  const raw = ls.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as EvidencePackageV1[]) : []
  } catch {
    return []
  }
}

export function saveEvidencePackage(pkg: EvidencePackageV1): void {
  const ls = getLocalStorage()
  if (!ls) throw new Error("Local storage not available")

  const existing = listEvidencePackages()
  existing.unshift(pkg)
  ls.setItem(STORAGE_KEY, JSON.stringify(existing))
}

export function createEvidencePackageV1(input: {
  userId: string
  mediaType: "photo" | "video"
  captureTimestamp: string
  mediaDataUrl?: string
  metadata: Record<string, any>
}): EvidencePackageV1 {
  return {
    version: 1,
    id: randomId(),
    createdAt: safeNowIso(),
    userId: input.userId,
    mediaType: input.mediaType,
    captureTimestamp: input.captureTimestamp,
    mediaDataUrl: input.mediaDataUrl,
    metadata: input.metadata,
  }
}

export function downloadEvidencePackage(pkg: EvidencePackageV1, fileName?: string) {
  if (typeof window === "undefined") return
  const name =
    fileName ||
    `evidence-${pkg.mediaType}-${pkg.userId}-${pkg.id}.json`

  const blob = new Blob([JSON.stringify(pkg, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()

  URL.revokeObjectURL(url)
}

function extensionFromDataUrl(dataUrl: string, fallback: "png" | "jpg" | "webm" | "bin") {
  const header = dataUrl.slice(0, dataUrl.indexOf(","))
  if (header.includes("image/png")) return "png"
  if (header.includes("image/jpeg")) return "jpg"
  if (header.includes("image/jpg")) return "jpg"
  if (header.includes("video/webm")) return "webm"
  if (header.includes("video/mp4")) return "mp4"
  return fallback
}

export function downloadEvidenceBundle(pkg: EvidencePackageV1) {
  // Downloads: 1) media file, 2) JSON package
  if (!pkg.mediaDataUrl) {
    // Still download the JSON (metadata-only)
    downloadEvidencePackage(pkg)
    return
  }

  const fallbackExt = pkg.mediaType === "video" ? "webm" : "jpg"
  const ext = extensionFromDataUrl(pkg.mediaDataUrl, fallbackExt as any)
  const mediaFileName = `evidence-${pkg.mediaType}-${pkg.userId}-${pkg.id}.${ext}`

  try {
    const mediaFile = dataUrlToFile(pkg.mediaDataUrl, mediaFileName)
    const url = URL.createObjectURL(mediaFile)

    const a = document.createElement("a")
    a.href = url
    a.download = mediaFileName
    document.body.appendChild(a)
    a.click()
    a.remove()

    URL.revokeObjectURL(url)
  } catch {
    // If dataURL conversion fails, at least ship the JSON.
  }

  // Download JSON second
  downloadEvidencePackage(pkg)
}

export async function readEvidencePackageFromJsonFile(file: File): Promise<EvidencePackageV1> {
  const text = await file.text()
  let parsed: any
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error("Invalid JSON")
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid evidence package")
  }
  if (parsed.version !== 1) {
    throw new Error("Unsupported evidence package version")
  }
  if (typeof parsed.mediaType !== "string" || (parsed.mediaType !== "photo" && parsed.mediaType !== "video")) {
    throw new Error("Invalid mediaType in evidence package")
  }
  if (!parsed.metadata || typeof parsed.metadata !== "object") {
    throw new Error("Invalid metadata in evidence package")
  }
  return parsed as EvidencePackageV1
}

// Helper for later usage:
// - To re-upload/verify, parse the JSON, convert mediaDataUrl back to a File,
//   then send FormData with image/video frames + metadata to existing endpoints.
export function dataUrlToFile(dataUrl: string, fileName: string): File {
  const [header, base64] = dataUrl.split(",")
  const match = header.match(/data:(.*?);base64/)
  const contentType = match?.[1] || "application/octet-stream"

  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }

  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: contentType })
  return new File([blob], fileName, { type: contentType })
}
