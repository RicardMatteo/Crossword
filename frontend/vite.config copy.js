import { defineConfig, loadEnv  } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'



export default defineConfig(({ mode }) => {
  // Load environment variables from .env file
  //const env = loadEnv(mode, process.cwd(), 'VITE_');
  //console.log('env:', env

  const env = loadEnv(mode, process.cwd(), 'VITE_');

  let backendOrigin = env.VITE_BACKEND_ORIGIN;
  if (!backendOrigin) {
    backendOrigin = 'http://192.168.68.75:8000';

    console.warn('VITE_BACKEND_ORIGIN is not defined. Using default value:', backendOrigin);
    //throw new Error('VITE_BACKEND_ORIGIN is not defined. Please set it in your .env file.');
  }
  console.log('VITE_BACKEND_ORIGIN_VITE:', backendOrigin);
  if (!fs.existsSync('./ssl/localhost-key.pem') || !fs.existsSync('./ssl/localhost.pem')) {
    throw new Error('SSL certificates not found. Please generate them using mkcert.');
  }

  // check if the .env file exists
  if (!fs.existsSync('./.env')) {
    throw new Error('.env file not found. Please create it with the VITE_BACKEND_ORIGIN variable.');
  }
  backendOrigin = 'http://192.168.68.75:8000';
  console.log('VITE_BACKEND_ORIGIN:', backendOrigin);
  return{
  plugins: [react()],
  //define: {
  //    ...Object.keys(env).reduce((prev, key) => {
  //      const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, "_");
  //
  //      prev[`process.env.${sanitizedKey}`] = JSON.stringify(env[key]);
  //
  //      return prev;
  //    }, {}),
  //  },
  //server: {
  //  host: true,
  //  https: {
  //    key: fs.readFileSync('./ssl/localhost-key.pem'),
  //    cert: fs.readFileSync('./ssl/localhost.pem'),
  //  },
  //  //proxy: {
  //  //  '/api': {
  //  //    target: backendOrigin,
  //  //    changeOrigin: true
  //  //  },
  //  //  '/ws': {
  //  //    target: backendOrigin.replace(/^http/, 'ws'),
  //  //    changeOrigin: true,
  //  //    ws: true
  //  //  }
  //  //}
  //}
  }
})