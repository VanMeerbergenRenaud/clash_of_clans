/**
 * Composable for uploading images to Supabase Storage
 */
export function useImageUpload() {
    const supabase = useSupabaseClient()

    /**
     * Upload a file to the specified bucket
     * @param file - The file to upload
     * @param bucket - The storage bucket name ('bases' or 'strategies')
     * @returns The public URL of the uploaded file
     */
    const uploadImage = async (file: File, bucket: 'bases' | 'strategies'): Promise<string> => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
        return data.publicUrl
    }

    return { uploadImage }
}
