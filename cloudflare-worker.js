/**
 * Cloudflare Worker - Clash of Clans API Proxy
 * 
 * Instructions:
 * 1. Créez un compte sur https://workers.cloudflare.com (gratuit)
 * 2. Créez un nouveau Worker
 * 3. Copiez-collez ce code
 * 4. Ajoutez une variable d'environnement 'COC_API_TOKEN' avec votre clé API
 * 5. Déployez le worker
 * 6. Notez l'URL du worker (ex: https://coc-proxy.votre-compte.workers.dev)
 * 7. Sur developer.clashofclans.com, créez une clé avec l'IP du worker Cloudflare
 *    (vous pouvez utiliser 0.0.0.0/0 pour accepter toutes les IPs si Cloudflare change)
 */

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const url = new URL(request.url)

        // Extract the API path (everything after /api/)
        const apiPath = url.pathname.replace('/api/', '')

        if (!apiPath) {
            return new Response('Missing API path', { status: 400 })
        }

        // Build the target URL
        const targetUrl = `https://api.clashofclans.com/v1/${apiPath}${url.search}`

        // Forward the request to CoC API
        const response = await fetch(targetUrl, {
            method: request.method,
            headers: {
                'Authorization': `Bearer ${COC_API_TOKEN}`,
                'Accept': 'application/json',
            }
        })

        // Get response data
        const data = await response.text()

        // Return response with CORS headers
        return new Response(data, {
            status: response.status,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
            }
        })

    } catch (error) {
        return new Response(JSON.stringify({
            error: error.message
        }), {
            status: 500,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
            }
        })
    }
}
