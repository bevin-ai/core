import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    // bind mounts in docker-compose.dev.yml don't emit fs events reliably
    watch: { usePolling: process.env.CHOKIDAR_USEPOLLING === 'true' },
  },
})
