// https://nuxt.com/docs/api/configuration/nuxt-config
import { readFileSync } from 'node:fs'

// Read CMS config.yml at build time so it's available in Netlify functions
// via runtimeConfig (server assets don't reliably bundle for all presets)
const cmsConfigYaml = readFileSync('./cms/config.yml', 'utf-8')

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  future: {
    compatibilityVersion: 4
  },
  devtools: { enabled: true },
  
  modules: [
    '@nuxt/content',
    '@nuxt/image',
    '@nuxt/icon'
  ],

  // Runtime config — server-only secrets + public client keys
  runtimeConfig: {
    // Server-only (never exposed to client)
    // NOTE: GITHUB_CLIENT_SECRET is intentionally NOT set here at build time.
    // Reading process.env at build time causes Rollup to inline the value into
    // the server bundle, which triggers Netlify's secrets scanner.
    // Instead, callback.get.ts reads process.env.GITHUB_CLIENT_SECRET directly
    // at runtime so the secret never appears in build output.
    githubClientSecret: '',        // unused placeholder — see callback.get.ts
    // Deploy commit SHA (Netlify provides COMMIT_REF at build time)
    deployCommitRef: process.env.COMMIT_REF || '',
    // CMS config.yml inlined at build time — available in Netlify functions
    cmsConfigYaml,
    // Public (available on client)
    public: {
      githubClientId: process.env.GITHUB_CLIENT_ID || '',
      siteUrl: process.env.SITE_URL || 'http://localhost:3000',
    },
  },

  vue: {
    compilerOptions: {
      isCustomElement: (tag) => tag === 'model-viewer'
    }
  },

  css: ['~/assets/css/tailwind.css', '~/assets/css/mdc-layout.css'],

  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
    },
  },

  components: {
    dirs: [
      {
        path: '~/components',
        ignore: ['**/index.ts'] // Exclude index.ts files to avoid conflicts with auto-imported components
      }
    ]
  },

  content: {
    // Nuxt Content configuration
    highlight: {
      theme: 'github-dark',
      preload: ['json', 'js', 'ts', 'html', 'css', 'vue', 'shell', 'markdown']
    },
    markdown: {
      toc: {
        depth: 3,
        searchDepth: 3
      },
      // Enable MDC syntax for inline components
      mdc: true
    }
  },

  app: {
    head: {
      title: 'Learning Materials',
      htmlAttrs: {
        lang: 'en'
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Learning materials powered by Nuxt Content and DecapCMS' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/android-chrome-192x192.png' },
        { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/android-chrome-512x512.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@100;200;300;400;500;600&display=swap' }
      ]
    }
  },

  nitro: {
    preset: 'netlify',
    prerender: {
      crawlLinks: true,
      routes: ['/'],
      ignore: ['/admin', '/docs/about', '/docs/home'],
      failOnError: false
    }
  }
})
