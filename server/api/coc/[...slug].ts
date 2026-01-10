export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const token = config.cocApiToken

    // Get the path to proxy (e.g., 'clans/%23CLANTAG')
    const slug = event.context.params?.slug || ''
    const query = getQuery(event)

    if (!token) {
        throw createError({
            statusCode: 500,
            statusMessage: 'COC_API_TOKEN is not configured'
        })
    }

    const baseUrl = 'https://api.clashofclans.com/v1'
    const targetUrl = `${baseUrl}/${slug}`

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
        console.error('CoC API Proxy Error:', error)
        throw createError({
            statusCode: error.response?.status || 500,
            statusMessage: error.message || 'Failed to fetch from CoC API',
            data: error.data
        })
    }
})
