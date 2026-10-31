// vite.config.mjs
//
// Многостраничная сборка для GitHub Pages /rep/.
// Локальная разработка: http://127.0.0.1:5500/.
//
// images и assets также копируются с прежними именами:
// это нужно для путей внутри HTML-строк каталога.

import { defineConfig } from 'vite';

import {
  readdirSync,
  existsSync,
  cpSync
} from 'node:fs';

import {
  resolve,
  dirname
} from 'node:path';

import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));

const htmlPages = readdirSync(projectRoot, {
  withFileTypes: true
})
  .filter(entry =>
    entry.isFile() &&
    entry.name.endsWith('.html')
  )
  .map(entry => resolve(projectRoot, entry.name));

function copyLegacyStaticDirectories() {
  let outputDirectory;

  return {
    name: 'mt-copy-legacy-static-directories',
    apply: 'build',

    configResolved(config) {
      outputDirectory = resolve(
        config.root,
        config.build.outDir
      );
    },

    closeBundle() {
      for (const directory of ['images', 'assets']) {
        const source = resolve(projectRoot, directory);

        if (!existsSync(source)) continue;

        const destination = resolve(
          outputDirectory,
          directory
        );

        cpSync(source, destination, {
          recursive: true,

          filter(path) {
            return ![
              '.DS_Store',
              '.git'
            ].includes(path.split(/[\\/]/).pop());
          }
        });
      }
    }
  };
}

export default defineConfig(({ command, isPreview }) => ({
  root: projectRoot,

  base: command === 'serve' && !isPreview ? '/' : '/rep/',

  appType: 'mpa',

  plugins: [
    copyLegacyStaticDirectories()
  ],

  server: {
    host: '127.0.0.1',
    port: 5500,
    strictPort: true
  },

  preview: {
    host: '127.0.0.1',
    port: 5501,
    strictPort: true
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: '_vite',

    rollupOptions: {
      input: htmlPages,

      // Firebase SDK остаётся внешним браузерным импортом.
      // Vite не скачивает и не обновляет его.
      external: id => /^https?:\/\//i.test(id)
    }
  }
}));