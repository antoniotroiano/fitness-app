/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
    base: '/fitness-app/',

    // Version aus package.json (einzige Quelle), in der App als APP_VERSION (data/version.ts)
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },

    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            // 'prompt': der neue Service Worker wartet, bis der Nutzer im Banner aktualisiert (components/UpdatePrompt.tsx)
            registerType: 'prompt',
            // Poster (klein, ~1,4 MB) mit vorcachen, damit sie offline sichtbar sind
            workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,jpg,woff2}'] },
            manifest: {
                name: 'Lift Lab',
                short_name: 'Lift Lab',
                description: 'Trainingsplaner mit automatischer Progression',
                theme_color: '#0f172a',
                background_color: '#0f172a',
                display: 'standalone',

                // Wichtig für GitHub Pages und die PWA
                start_url: '/fitness-app/',
                scope: '/fitness-app/',

                icons: [
                    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                    { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
                ],
            },
        }),
    ],

    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
})
