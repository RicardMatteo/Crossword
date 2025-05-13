import { defineConfig  } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'



export default defineConfig(({ mode }) => {

  
  if (!fs.existsSync('./.env')) {
    throw new Error('.env file not found. Please create it with the VITE_BACKEND_ORIGIN variable.');
  }

  let backendOrigin = process.env.VITE_BACKEND_ORIGIN;
  backendOrigin = "192.168.68.58:8000";
  console.log('VITE_BACKEND_ORIGIN:', backendOrigin);
  
  if (!backendOrigin) {
    throw new Error('VITE_BACKEND_ORIGIN is not defined. Please set it in your .env file.');
  }

  if (!fs.existsSync('./ssl/localhost-key.pem') || !fs.existsSync('./ssl/localhost.pem')) {
    throw new Error('SSL certificates not found. Please generate them using mkcert.');
  }

  const httpsOptions = {
    key : fs.readFileSync('./ssl/localhost-key.pem'),
    cert: fs.readFileSync('./ssl/localhost.pem'),
  };

  return{
    plugins: [react()],
    server: {

      https: httpsOptions,
      host: '0.0.0.0',
      port: 5173,

  
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