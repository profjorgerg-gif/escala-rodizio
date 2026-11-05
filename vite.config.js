import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' faz o app funcionar em qualquer endereço do GitHub Pages (usuario.github.io/nome-do-repositorio/)
export default defineConfig({
  plugins: [react()],
  base: './',
});
