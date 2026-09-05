import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { execSync } from 'child_process'
import { writeFileSync } from 'fs'

// Get current git commit hash (short)
let commitHash = 'dev'
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim()
} catch { /* not a git repo or no commits */ }

// Write version.json to public/ so the running app can poll it
writeFileSync('public/version.json', JSON.stringify({ version: commitHash }))

export default defineConfig({
  plugins: [react()],
  define: {
    // Inject version into the app bundle
    __APP_VERSION__: JSON.stringify(commitHash),
  },
})
