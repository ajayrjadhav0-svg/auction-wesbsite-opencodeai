import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch:
        process.env.DISABLE_HMR === 'true'
          ? null
          : {
              // The Express server rewrites the auction database and exported
              // report files on every change (add player, sell player, save...).
              // Watching those generated files makes Vite force a FULL page
              // reload after each action, which kicks the admin back to the
              // spectator dashboard mid-auction. Ignore them so the app keeps
              // running while the data files update on disk in the background.
              ignored: [
                '**/node_modules/**',
                '**/.git/**',
                '**/dist/**',
                '**/data/**',
                '**/myauctionkpl.json',
                '**/myauctionkpl.html',
                '**/cricket_auction_report.html',
                '**/*_players_list.csv',
              ],
            },
    },
  };
});
