export default defineNuxtRouteMiddleware((to, from) => {
    // We no longer redirect to login. Everyone has access to the site.
    // Specific actions will be restricted in components.
})
