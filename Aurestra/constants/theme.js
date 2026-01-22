export const theme = {
    light: {
        dark: false,
        colors: {
            background: '#F8FAFC',
            card: '#FFFFFF',
            text: '#1E293B',
            textSecondary: '#64748B',
            primary: '#3B82F6',
            secondary: '#10B981',
            border: '#E2E8F0',
            error: '#EF4444',
            success: '#10B981',
            warning: '#F59E0B',
            info: '#3B82F6',
            inputBackground: '#FFFFFF',
            icon: '#64748B',
            iconActive: '#3B82F6',
            divider: '#E2E8F0',
            modalOverlay: 'rgba(0, 0, 0, 0.5)',
            statusBar: 'light-content', // Usually we want dark content on light bg, but the current design uses dark headers. keeping 'light-content' for dark headers or 'dark-content' for light headers.
            // Current app has dark headers on light mode mostly? No, it has gradients.
            // Let's stick to specific Semantic names if possible, or just base colors.
            headerBackground: ['#1E293B', '#334155', '#1E293B'], // Gradient colors
            headerText: '#FFFFFF',
        },
    },
    dark: {
        dark: true,
        colors: {
            background: '#0F172A',
            card: '#1E293B',
            text: '#F1F5F9', // Slate 100
            textSecondary: '#94A3B8', // Slate 400
            primary: '#60A5FA', // Blue 400 (lighter for dark mode)
            secondary: '#34D399', // Emerald 400
            border: '#334155', // Slate 700
            error: '#F87171', // Red 400
            success: '#34D399', // Emerald 400
            warning: '#FBBF24', // Amber 400
            info: '#60A5FA', // Blue 400
            inputBackground: '#1E293B',
            icon: '#94A3B8',
            iconActive: '#60A5FA',
            divider: '#334155',
            modalOverlay: 'rgba(0, 0, 0, 0.7)',
            statusBar: 'light-content',
            headerBackground: ['#0F172A', '#1E293B', '#0F172A'], // Darker gradient
            headerText: '#FFFFFF',
        },
    },
};
