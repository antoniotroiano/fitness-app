/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }

// Beta-Build (Workflow beta.yml): eigener Pfad, eigener Name, eigene Datenbank (siehe data/version.ts)
const BETA = process.env.APP_CHANNEL === 'beta'
const BASE = process.env.APP_BASE ?? '/fitness-app/'

export default defineConfig({
    base: BASE,

    // Version aus package.json (einzige Quelle), in der App als APP_VERSION (data/version.ts)
    define: { __APP_VERSION__: JSON.stringify(pkg.version), __APP_BETA__: JSON.stringify(BETA) },

    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            // 'prompt': der neue Service Worker wartet, bis der Nutzer im Banner aktualisiert (components/UpdatePrompt.tsx)
            registerType: 'prompt',
            // Poster (klein, ~1,4 MB) mit vorcachen, damit sie offline sichtbar sind
            workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,jpg,woff2}'] },
            manifest: {
                name: BETA ? 'TRAINRATE: WORKOUT Beta' : 'TRAINRATE: WORKOUT',
                short_name: BETA ? 'TRAINRATE Beta' : 'TRAINRATE',
                description: 'Trainingsplaner mit automatischer Progression',
                theme_color: '#0f172a',
                background_color: '#0f172a',
                display: 'standalone',

                // Wichtig für GitHub Pages und die PWA
                start_url: BASE,
                scope: BASE,

                icons: [
                    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                    { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
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
