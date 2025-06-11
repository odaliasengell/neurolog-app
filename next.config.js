/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración TypeScript
  typescript: {
    // Ignorar errores de build durante desarrollo
    ignoreBuildErrors: false,
  },

  // Configuración ESLint
  eslint: {
    // Directorios a verificar durante build
    dirs: ['src/app', 'src/components', 'src/lib', 'src/hooks'],
    // No ignorar errores de ESLint durante build
    ignoreDuringBuilds: false,
  },

  // Configuración de imágenes para Supabase
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https', 
        hostname: 'supabase.com',
        port: '',
        pathname: '/**',
      }
    ],
    // Configuración adicional para optimización
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Configuración de headers de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // Redirects para mejorar UX
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/auth',
        destination: '/auth/login',
        permanent: false,
      }
    ];
  },

  // Configuración de compresión y optimización
  compress: true,
  poweredByHeader: false,
  trailingSlash: false,

  // Configuración para desarrollo local
  env: {
    CUSTOM_KEY: 'my-value',
  },

  // Configuración de Webpack personalizada
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimizaciones adicionales si es necesario
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Agregar reglas para archivos SVG si es necesario
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },

  // Configuración experimental (Next.js 15.3.3)
  experimental: {
    // Características experimentales estables en 15.3.3
    optimizePackageImports: ['recharts', 'lucide-react'],
    
    // Configuración de Turbopack (opcional)
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },

    // Configuración de servidor edge (si necesario para el futuro)
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },

  // Configuración de output para deploy
  output: 'standalone',

  // Configuración de logging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // Configuración de bundles
  bundlePagesRouterDependencies: true,
  
  // Configuración de análisis de bundles (descomentar si necesitas análisis)
  // analyzer: {
  //   enabled: process.env.ANALYZE === 'true',
  // },
};

module.exports = nextConfig;