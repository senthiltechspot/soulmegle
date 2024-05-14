import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [react()],
    server: isProduction ? {} : {
      host: true,
      https: {
        key: fs.readFileSync('./key.pem'),
        cert: fs.readFileSync('./cert.pem')
      }
    }
  };
});
