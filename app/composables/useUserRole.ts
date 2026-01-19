// Composable to manage user role state
export const useUserRole = () => {
    const supabase = useSupabaseClient()
    const user = useSupabaseUser()

    const userRole = useState<string | null>('userRole', () => null)
    const userProfile = useState<{ id: string; email: string; username: string | null } | null>('userProfile', () => null)
    const loading = useState<boolean>('userRoleLoading', () => false)

    // Computed properties
    const isAuthenticated = computed(() => !!user.value)

    const isSuperAdmin = computed(() => userRole.value === 'super_admin')
    const isAdmin = computed(() => userRole.value === 'admin')
    const isEditor = computed(() => userRole.value === 'editor')
    const isViewer = computed(() => userRole.value === 'viewer')

    // Super Admin and Admin can access inscriptions and see the war planner
    // Super Admin and Admin can access inscriptions and see the war planner
    // MODIFIED: Access granted to everyone as requested
    const canAccessInscriptions = computed(() => true)

    // Fetch user profile from database
    const fetchUserProfile = async () => {
        if (!user.value) {
            userRole.value = null
            userProfile.value = null
            return
        }

        // 1. Try metadata first for immediate feedback
        if (user.value.user_metadata?.user_type) {
            console.log('DEBUG: Using metadata role:', user.value.user_metadata.user_type)
            userRole.value = user.value.user_metadata.user_type
        }

        if (!user.value.id) {
            console.log('DEBUG: User ID missing, skipping fetch')
            return
        }

        loading.value = true
        try {
            console.log('DEBUG: Fetching profile for ID:', user.value.id)
            const { data, error } = await supabase
                .from('users')
                .select('id, email, username, user_type')
                .eq('id', user.value.id)
                .single()

            if (error) {
                console.error('Error fetching user profile:', error)
                // Only default to viewer if we didn't find it in metadata
                if (!userRole.value) userRole.value = 'viewer'
                return
            }

            console.log('DEBUG: fetchUserProfile success:', data)

            if (data) {
                userRole.value = data.user_type || userRole.value || 'viewer'
                userProfile.value = {
                    id: data.id,
                    email: data.email,
                    username: data.username
                }
            }
        } catch (err) {
            console.error('Error in fetchUserProfile:', err)
            if (!userRole.value) userRole.value = 'viewer'
        } finally {
            loading.value = false
        }
    }

    // Logout function
    const logout = async () => {
        await supabase.auth.signOut()
        userRole.value = null
        userProfile.value = null
        navigateTo('/welcome')
    }

    // Watch for user changes and fetch profile
    watch(user, async (newUser) => {
        if (newUser) {
            await fetchUserProfile()
        } else {
            userRole.value = null
            userProfile.value = null
        }
    }, { immediate: true })

    return {
        user,
        userRole,
        userProfile,
        loading,
        isAuthenticated,
        isSuperAdmin,
        isAdmin,
        isEditor,
        isViewer,
        canAccessInscriptions,
        fetchUserProfile,
        logout
    }
}
