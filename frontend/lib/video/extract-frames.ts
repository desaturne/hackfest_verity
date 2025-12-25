export type ExtractedVideoFrame = {
  timeSec: number
  file: File
}

type ExtractFramesOptions = {
  mimeType?: "image/jpeg" | "image/png"
  quality?: number
}

function waitForEvent(target: EventTarget, eventName: string) {
  return new Promise<void>((resolve, reject) => {
    const onEvent = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error(`Failed waiting for event: ${eventName}`))
    }
    const cleanup = () => {
      target.removeEventListener(eventName, onEvent)
      target.removeEventListener("error", onError)
    }

    target.addEventListener(eventName, onEvent, { once: true })
    target.addEventListener("error", onError, { once: true })
  })
}

export async function getVideoDurationSeconds(videoBlob: Blob): Promise<number> {
  const url = URL.createObjectURL(videoBlob)
  try {
    const video = document.createElement("video")
    video.preload = "metadata"
    video.src = url
    await waitForEvent(video, "loadedmetadata")
    const duration = Number(video.duration)
    return Number.isFinite(duration) ? duration : 0
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function extractVideoFrames(
  videoBlob: Blob,
  timesSec: number[],
  options: ExtractFramesOptions = {},
): Promise<ExtractedVideoFrame[]> {
  const mimeType = options.mimeType ?? "image/jpeg"
  const quality = typeof options.quality === "number" ? options.quality : 0.92

  const url = URL.createObjectURL(videoBlob)
  try {
    const video = document.createElement("video")
    video.preload = "auto"
    video.muted = true
    video.playsInline = true
    video.src = url

    await waitForEvent(video, "loadedmetadata")
    await waitForEvent(video, "loadeddata")

    const width = video.videoWidth || 0
    const height = video.videoHeight || 0
    if (!width || !height) {
      throw new Error("Unable to read video dimensions")
    }

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext("2d")
    if (!ctx) {
      throw new Error("Unable to create canvas context")
    }

    const duration = Number(video.duration)
    const safeTimes = timesSec
      .map((t) => (Number.isFinite(t) ? Math.max(0, t) : 0))
      .map((t) => {
        if (!Number.isFinite(duration) || duration <= 0) return t
        // Avoid seeking to exact end.
        return Math.min(Math.max(0, duration - 0.001), t)
      })

    const frames: ExtractedVideoFrame[] = []

    for (let i = 0; i < safeTimes.length; i++) {
      const t = safeTimes[i]

      // Seek and wait for decoded frame.
      video.currentTime = t
      await waitForEvent(video, "seeked")
      // Let the browser present the frame.
      await new Promise((r) => setTimeout(r, 0))

      ctx.drawImage(video, 0, 0, width, height)

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (!b) return reject(new Error("Failed to extract frame blob"))
            resolve(b)
          },
          mimeType,
          quality,
        )
      })

      const name = `frame-${String(i).padStart(3, "0")}-${Math.round(t * 1000)}ms.${mimeType === "image/png" ? "png" : "jpg"}`
      const file = new File([blob], name, { type: blob.type || mimeType })
      frames.push({ timeSec: t, file })
    }

    return frames
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function makeEvenlySpacedTimes(durationSec: number, frameCount: number): number[] {
  const count = Math.max(1, Math.floor(frameCount))
  const d = Number.isFinite(durationSec) && durationSec > 0 ? durationSec : 0

  // For a 5s clip and count=5 -> 0,1,2,3,4
  const step = d > 0 ? d / count : 1
  return Array.from({ length: count }, (_, i) => i * step)
}
