/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

export default defineConfig({
    base: '/fitness-app/',

    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            registerType: 'autoUpdate',
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
