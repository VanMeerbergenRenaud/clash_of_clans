
export const useSidebar = () => {
    // Persist the expanded state in a cookie
    const isExpanded = useCookie<boolean>('sidebar-expanded', {
        default: () => true, // Default to expanded
        watch: true,
    })

    // Mobile sidebar state (not persisted)
    // Mobile sidebar state (not persisted)
    const isMobileOpen = useState('mobile-sidebar-open', () => false)

    const toggleSidebar = () => {
        isExpanded.value = !isExpanded.value
    }

    const toggleMobileSidebar = () => {
        isMobileOpen.value = !isMobileOpen.value
    }

    const closeMobileSidebar = () => {
        isMobileOpen.value = false
    }

    return {
        isExpanded,
        isMobileOpen,
        toggleSidebar,
        toggleMobileSidebar,
        closeMobileSidebar,
    }
}
