import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    // Add allowedHosts to specifically allow the ngrok domain
    allowedHosts: [
      'localhost', 
      '127.0.0.1',
      '8011-130-204-253-161.ngrok-free.app', // Your specific ngrok domain
      '.ngrok-free.app', // Allow all ngrok-free.app subdomains
    ],
    hmr: {
      clientPort: 443, // This helps with ngrok
      host: 'localhost', // Use localhost for HMR websocket connection
    },
    cors: true, // Enable CORS for all routes
  },
  resolve: {
    alias: {
      '@hooks': path.resolve(__dirname, 'src/hooks'),  // Alias for the hooks folder
      '@components': path.resolve(__dirname, 'src/components'),
    },
  },
  define: {
    'process.env': process.env, // Expose environment variables to the app
  },
})