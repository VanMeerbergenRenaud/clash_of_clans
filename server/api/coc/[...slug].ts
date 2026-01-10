export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const token = config.cocApiToken

    // Nitro/Nuxt decodes the params, so we might get 'clans/#TAG' which breaks the URL
    const slug = event.context.params?.slug || ''
    // Ensure we encode the # if it was decoded
    const fixedSlug = slug.replace(/#/g, '%23')
    const query = getQuery(event)

    console.log('--- CoC Proxy Debug ---')
    console.log('Token configured:', !!token, 'Length:', token?.length)
    console.log('Incoming Slug:', slug)
    console.log('Fixed Slug:', fixedSlug)

    if (!token) {
        console.error('Error: COC_API_TOKEN is missing in runtimeConfig')
        throw createError({
            statusCode: 500,
            statusMessage: 'COC_API_TOKEN is not configured'
        })
    }

    const baseUrl = 'https://api.clashofclans.com/v1'
    const targetUrl = `${baseUrl}/${fixedSlug}`
    console.log('Fetch Target URL:', targetUrl)

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

        // Silence verbose logging for 404s (common for leaguegroup)
        if (statusCode === 404) {
            console.log(`[CoC Proxy] Resource not found (404): ${fixedSlug}`)
        } else {
            console.error('CoC API Proxy Error:', error)
            if (error.data) {
                console.error('Error Body:', JSON.stringify(error.data, null, 2))
            }
        }

        throw createError({
            statusCode: statusCode,
            statusMessage: error.message || 'Failed to fetch from CoC API',
            data: error.data
        })
    }
})
