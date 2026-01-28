import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import { workflow } from 'workflow/vite';

const config = defineConfig({
  plugins: [
    workflow(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart(),
    nitro(),
    tailwindcss(),
    viteReact(),
  ],
  nitro: {
    plugins: ['./plugins/start-pg-world.ts'],
  },
});

export default config;
