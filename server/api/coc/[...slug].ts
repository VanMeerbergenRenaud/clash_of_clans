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
        console.error('CoC API Proxy Error:', error)
        // Log the response body if available
        if (error.data) {
            console.error('Error Body:', JSON.stringify(error.data, null, 2))
        }

        throw createError({
            statusCode: error.response?.status || 500,
            statusMessage: error.message || 'Failed to fetch from CoC API',
            data: error.data
        })
    }
})
