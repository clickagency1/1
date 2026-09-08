import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  plugins: [
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    // Render runs the Node server directly, so use Nitro's Node output rather
    // than the Vercel function output (which has no standalone index.html).
    nitro({ config: { preset: 'node-server' } }),
    viteReact(),
  ],
})

export default config
