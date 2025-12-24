export const runtime = "nodejs"

function getBackendBaseUrl() {
  return process.env.BACKEND_URL || "http://localhost:5000"
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()

    const upstream = new FormData()

    const image = formData.get("image")
    if (!image) {
      return Response.json({ error: "Missing image" }, { status: 400 })
    }

    upstream.set("image", image)
    upstream.set("latitude", String(formData.get("latitude") ?? ""))
    upstream.set("longitude", String(formData.get("longitude") ?? ""))
    upstream.set("timestamp", String(formData.get("timestamp") ?? ""))

    const res = await fetch(`${getBackendBaseUrl()}/api/evidence/verify`, {
      method: "POST",
      body: upstream,
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      return Response.json(
        { error: data?.error || "Backend verify failed" },
        { status: res.status },
      )
    }

    return Response.json(data)
  } catch (err: any) {
    return Response.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 },
    )
  }
}
