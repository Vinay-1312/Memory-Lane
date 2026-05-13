import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main:  'index.html',
        admin: 'admin.html'
      },
      output: {
        manualChunks: {
          three:    ['three'],
          firebase: ['firebase/app', 'firebase/storage'],
          supabase: ['@supabase/supabase-js'],
        }
      }
    }
  }
})
