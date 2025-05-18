import { defineConfig  } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'



export default defineConfig(({ mode }) => {

  let backendOrigin = process.env.VITE_BACKEND_ORIGIN
  console.log('VITE_BACKEND_ORIGIN:', backendOrigin);
  
  if (!backendOrigin) {
    throw new Error('VITE_BACKEND_ORIGIN is not defined. Please set it in your .env file.');
  }


  return{
    plugins: [react()],
    server: {

      host: '0.0.0.0',
      port: 5173,
      allowedHosts: [
        'mots.nin7o.net'
      ],
      proxy: {
        '/api': {
          target: `http://${backendOrigin}`,
          changeOrigin: true, 
          secure: false, // For self-signed certificates (dev only)
          
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log(`[Vite Proxy] Requête vers le backend: ${req.url} via ${options.target}`);
            });
            proxy.on('error', (err, req, res) => {
              console.error('[Vite Proxy] Erreur:', err);
            });
          }
        },
        '/ws': {
          target: `ws://${backendOrigin}`,
          ws: true,
          changeOrigin: true,
          secure: false,

          configure: (proxy, options) => {
            proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
              console.log(`[Vite Proxy WS] Requête vers le backend: ${req.url} via ${options.target}`);
            });
            proxy.on('error', (err, req, res) => {
              console.error('[Vite Proxy WS] Erreur:', err);
            });
          }
        },
      },
    },
  }
})
