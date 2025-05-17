import { defineConfig  } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'



export default defineConfig(({ mode }) => {

  
  if (!fs.existsSync('./.env')) {
    throw new Error('.env file not found. Please create it with the VITE_BACKEND_ORIGIN variable.');
  }

  let backendOrigin = process.env.VITE_BACKEND_ORIGIN;
  backendOrigin = "nin7o.net:8021";
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
          target: `https://${backendOrigin}`,
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
          target: `wss://${backendOrigin}`,
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
