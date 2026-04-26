/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseHostname = "localhost";
let supabaseOrigin = "";
let supabaseWsOrigin = "";
try {
  if (supabaseUrl) {
    const u = new URL(supabaseUrl);
    supabaseHostname = u.hostname;
    supabaseOrigin = u.origin;
    supabaseWsOrigin = `wss://${u.host}`;
  }
} catch {
  /* keep defaults */
}

const isDev = process.env.NODE_ENV === "development";

function contentSecurityPolicy() {
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com"
    : "script-src 'self' 'unsafe-inline' https://js.stripe.com";

  const connectParts = [
    "'self'",
    supabaseOrigin,
    supabaseWsOrigin,
    "https://api.openai.com",
    "https://api.stripe.com",
    "https://r.stripe.com",
    "https://m.stripe.com",
    "https://m.stripe.network",
    "https://*.stripe.com",
  ].filter(Boolean);

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    `connect-src ${connectParts.join(" ")}`,
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com https://hooks.stripe.com",
  ].join("; ");
}

const nextConfig = {
  /** Lint debt is tracked separately; blocking deploys on ESLint breaks shipping hotfixes. */
  eslint: {
    ignoreDuringBuilds: true,
  },
  /**
   * Voice memo uploads (FormData) can approach 15MB; the default 1MB
   * App Router body limit would reject `POST /api/ai/voice-to-chapter`.
   */
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
    optimizePackageImports: [
      "lucide-react",
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@tiptap/extension-link",
      "@tiptap/extension-underline",
      "@tiptap/extension-bubble-menu",
      "date-fns",
      "sonner",
    ],
  },
  /**
   * Dev: memory cache (Windows paths with spaces), and a generous chunk load
   * timeout so first-time compilation of large route chunks is less likely to
   * surface as `ChunkLoadError: Loading chunk app/layout failed (timeout)`.
   */
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.cache = { type: "memory" };
      if (!isServer && config.output) {
        config.output.chunkLoadTimeout = 5 * 60 * 1000;
      }
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHostname,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    // CSP is for production; in dev it can interact badly with HMR/chunk loading on Windows.
    if (isDev) {
      return [];
    }
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
