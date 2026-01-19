export default defineNuxtRouteMiddleware((to, from) => {
    const user = useSupabaseUser()

    // Public routes that don't require authentication
    const publicRoutes = ['/welcome', '/login']

    // Routes that require admin or editor role
    const adminEditorRoutes = ['/inscription']

    // Allow access to public routes for everyone
    if (publicRoutes.includes(to.path)) {
        // If user is already logged in and tries to access welcome/login, redirect to dashboard
        if (user.value && (to.path === '/welcome' || to.path === '/login')) {
            return navigateTo('/')
        }
        return
    }

    // For all other routes, require authentication
    if (!user.value) {
        return navigateTo('/welcome')
    }

    // Role-based access control will be handled by the pages themselves
    // since we need to fetch the role from the database asynchronously
})
