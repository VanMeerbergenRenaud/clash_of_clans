export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const token = config.cocApiToken

    const slug = event.context.params?.slug || ''
    const fixedSlug = slug.replace(/#/g, '%23')
    const query = getQuery(event)

    if (!token) {
        throw createError({
            statusCode: 500,
            statusMessage: 'COC_API_TOKEN is not configured'
        })
    }

    const baseUrl = config.cocApiBaseUrl
    const targetUrl = `${baseUrl}/${fixedSlug}`

    try {
        const response = await $fetch(targetUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json'
            },
            query: query
        })
        return response
    } catch (error: any) {
        const statusCode = error.response?.status || 500

        // Return error directly to client for better handling
        throw createError({
            statusCode: statusCode,
            statusMessage: error.message || 'Failed to fetch from CoC API',
            data: error.data
        })
    }
})
