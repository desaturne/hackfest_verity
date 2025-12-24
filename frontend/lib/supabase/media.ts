import getSupabaseClient from "./client"

export type MediaMetadata = {
  hash: string
  latitude: string
  longitude: string
  device?: string
  blockchainTxId?: string | null
  blockchainBlock?: number | null
  blockchainTimestamp?: string | null
  verificationStatus?: string
}

export type MediaItem = {
  id: string
  type: "photo" | "video"
  timestamp: string
  verified: boolean
  location: string
  user_id: string
  storage_path: string
  metadata: MediaMetadata
  created_at?: string
}

/**
 * Upload media to Supabase Storage and create database record
 */
export async function uploadMedia(
  imageData: string,
  type: "photo" | "video",
  location: string,
  metadata: MediaMetadata,
  userId: string,
  isGuest: boolean
) {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Supabase client not initialized")

  try {
    // Convert base64 to blob
    const base64Data = imageData.split(",")[1]
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: "image/png" })

    // Generate unique filename
    const timestamp = Date.now()
    const fileName = `${userId}/${timestamp}.png`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("media")
      .upload(fileName, blob, {
        contentType: "image/png",
        upsert: false,
      })

    if (uploadError) throw uploadError

    // Insert metadata into database
    const { data: dbData, error: dbError } = await supabase
      .from("media")
      .insert({
        type,
        timestamp: new Date().toISOString(),
        verified: !isGuest,
        location,
        user_id: userId,
        storage_path: uploadData.path,
        metadata,
      })
      .select()
      .single()

    if (dbError) throw dbError

    return dbData
  } catch (error) {
    console.error("Error uploading media:", error)
    throw error
  }
}

/**
 * Get all media for a user
 */
export async function getUserMedia(userId: string) {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Supabase client not initialized")

  const { data, error } = await supabase
    .from("media")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data as MediaItem[]
}

/**
 * Get media URL from storage
 */
export async function getMediaUrl(storagePath: string) {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Supabase client not initialized")

  const { data } = supabase.storage.from("media").getPublicUrl(storagePath)

  return data.publicUrl
}

/**
 * Delete media
 */
export async function deleteMedia(id: string, storagePath: string) {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Supabase client not initialized")

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from("media")
    .remove([storagePath])

  if (storageError) console.error("Error deleting from storage:", storageError)

  // Delete from database
  const { error: dbError } = await supabase.from("media").delete().eq("id", id)

  if (dbError) throw dbError
}
