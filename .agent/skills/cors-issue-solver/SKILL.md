---
name: CORS Issue Solver
description: Detects, diagnoses, and resolves all categories of CORS errors across frontend and backend codebases.
---

# Skill: CORS Issue Solver

## Overview

| Field | Value |
|-------|-------|
| **Skill ID** | `cors-issue-solver` |
| **Version** | `1.0.0` |
| **Author** | Prasanth |
| **Category** | Debugging / HTTP / Security |
| **Complexity** | Medium |
| **Supported Runtimes** | Node.js, Python, Java, Go, PHP, .NET, Serverless, Edge |

---

## Description

This skill detects, diagnoses, and resolves all categories of Cross-Origin Resource Sharing (CORS) errors across frontend and backend codebases. It works with raw error messages, pasted code, or natural language descriptions of the problem. The skill outputs targeted, copy-paste-ready fixes with security-safe defaults.

---

## Trigger Conditions

This skill activates when the user's message contains **any** of the following:

```yaml
trigger_phrases:
  - "CORS error"
  - "CORS issue"
  - "cross-origin"
  - "Access-Control-Allow-Origin"
  - "blocked by CORS policy"
  - "No 'Access-Control-Allow-Origin' header"
  - "preflight"
  - "has been blocked"
  - "credentials mode"
  - "CORS policy"
  - "OPTIONS request failed"
  - "cors blocked"
  - "cors fix"
  - "cors not working"
  - "fetch blocked"
  - "XMLHttpRequest blocked"
  - "withCredentials"
  - "cors headers missing"

trigger_code_patterns:
  - "Access-Control-Allow-Origin: *"
  - "cors({ origin: '*' })"
  - "CORS(app)"
  - "add_header Access-Control"
  - "CorsMiddleware"
  - "addCorsMappings"
  - "withCredentials: true"
  - "credentials: 'include'"
```

---

## Input Schema

```yaml
inputs:
  error_message:
    type: string
    required: false
    description: The raw browser console or server error message related to CORS

  code_snippet:
    type: string
    required: false
    description: The backend or frontend code that has the CORS issue

  stack:
    type: string
    required: false
    enum:
      - express
      - fastapi
      - django
      - flask
      - spring
      - dotnet
      - go
      - php
      - nginx
      - apache
      - vercel
      - cloudflare
      - aws-lambda
      - next.js
      - vite
      - cra
      - socket.io
      - unknown
    description: The framework or platform the user is working with

  frontend_origin:
    type: string
    required: false
    description: "The origin of the frontend app (e.g. https://app.example.com)"

  use_credentials:
    type: boolean
    required: false
    description: Whether the request includes cookies or Authorization headers
```

---

## Output Schema

```yaml
outputs:
  category:
    type: string
    description: The identified CORS error category

  root_cause:
    type: string
    description: One-line explanation of why the error is occurring

  fix:
    type: code_block
    description: Ready-to-use code fix for the user's specific stack

  security_note:
    type: string
    description: Any security warnings related to the fix

  follow_up:
    type: string
    description: Optional follow-up check or test the user should perform
```

---

## Reasoning Instructions

When this skill is triggered, follow this reasoning chain **step by step**:

### Step 1 — Identify the Error Category

Map the error or description to one of these categories:

| # | Category ID | Key Signal |
|---|-------------|------------|
| 1 | `missing-acao-header` | "No 'Access-Control-Allow-Origin' header" |
| 2 | `preflight-failure` | "preflight", "OPTIONS", "does not have HTTP ok status" |
| 3 | `wildcard-with-credentials` | "must not be the wildcard '*'" + credentials |
| 4 | `header-not-exposed` | "Refused to get unsafe header" |
| 5 | `multipart-upload-cors` | file upload / `multipart/form-data` + CORS |
| 6 | `dev-server-proxy` | localhost + dev environment |
| 7 | `serverless-edge` | Lambda / Vercel / Cloudflare / edge function |
| 8 | `websocket-cors` | WebSocket / Socket.IO |
| 9 | `cdn-proxy-stripping` | CloudFront / ALB / Nginx proxy + headers dropped |
| 10 | `multiple-acao-headers` | "Multiple values in Access-Control-Allow-Origin" |
| 11 | `redirect-cors` | Redirect (301/302) + CORS, fetches follow redirect |
| 12 | `mixed-content-cors` | HTTP origin hitting HTTPS API |
| 13 | `false-cors-backend-crash` | 500 / net::ERR_FAILED / "No 'Access-Control-Allow-Origin'" (backend actually crashed) |
| 14 | `false-cors-ipv6-docker-drop` | net::ERR_FAILED hitting localhost (IPv6/Docker loopback mapped poorly) |

### Step 2 — Detect the Stack

If not explicitly provided, infer stack from:
- Package names in code (`cors`, `flask_cors`, `CorsRegistry`, etc.)
- File extensions (`.py`, `.java`, `.ts`, `.go`)
- Config file syntax (`nginx.conf`, `serverless.yml`, etc.)
- Framework keywords (`app.use`, `@app.route`, `@Bean`, etc.)

### Step 3 — Apply Security Defaults

Before generating any fix, enforce these rules:

```
IF use_credentials == true OR "credentials" in code:
    NEVER use origin: '*'
    ALWAYS use explicit origin or dynamic whitelist
    ALWAYS add credentials: true

IF stack involves a CDN or proxy:
    ALWAYS add Vary: Origin to the origin server response

IF multiple environments (dev/staging/prod):
    ALWAYS use an environment-based origin whitelist, NOT hardcoded values
```

### Step 4 — Generate Fix

Pick the exact fix block from the Fix Library below that matches:
- `category_id` × `stack`

If stack is `unknown`, output fixes for Express + FastAPI + Nginx as the most common trio.

### Step 5 — Format Response

Always respond in this structure:

```
🔍 CORS Category: <category name>
🧠 Root Cause: <one sentence>
🛠️ Fix (<stack>):
<code block>
🔒 Security Note: <warning if any>
✅ Test: <how to verify the fix worked>
```

---

## Fix Library

---

### FIX-01 · Missing `Access-Control-Allow-Origin`

#### Express / Node.js
```js
const cors = require('cors');

const allowedOrigins = [
  'https://app.example.com',
  'https://staging.example.com',
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400, // Cache preflight for 24h
}));
```

#### FastAPI (Python)
```python
from fastapi.middleware.cors import CORSMiddleware
import os

ALLOWED_ORIGINS = [
    "https://app.example.com",
    "https://staging.example.com",
]
if os.getenv("ENV") == "development":
    ALLOWED_ORIGINS.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    max_age=86400,
)
```

#### Django
```python
# 1. pip install django-cors-headers

# settings.py
INSTALLED_APPS = [
    'corsheaders',
    # ... other apps
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # ← MUST be first
    'django.middleware.common.CommonMiddleware',
    # ...
]

CORS_ALLOWED_ORIGINS = [
    "https://app.example.com",
    "https://staging.example.com",
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    "accept",
    "authorization",
    "content-type",
    "x-requested-with",
]

# For development only:
# CORS_ALLOW_ALL_ORIGINS = True  # Never in production
```

#### Flask (Python)
```python
# pip install flask-cors
from flask_cors import CORS

CORS(app,
    origins=["https://app.example.com"],
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    max_age=86400
)
```

#### Spring Boot (Java)
```java
// Option A: Global config
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Value("${app.allowed-origins}")
    private String[] allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins(allowedOrigins)
            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            .allowedHeaders("Content-Type", "Authorization", "X-Requested-With")
            .allowCredentials(true)
            .maxAge(86400);
    }
}

// Option B: Per-controller annotation
@CrossOrigin(origins = "${app.allowed-origins}", allowCredentials = "true")
@RestController
@RequestMapping("/api")
public class MyController { }
```

#### ASP.NET Core (C#)
```csharp
// Program.cs
builder.Services.AddCors(options => {
    options.AddPolicy("AllowFrontend", policy => {
        policy.WithOrigins("https://app.example.com")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// After builder.Build():
app.UseCors("AllowFrontend"); // Before UseAuthorization
```

#### Go (net/http or Gin)
```go
// Gin
import "github.com/gin-contrib/cors"

r.Use(cors.New(cors.Config{
    AllowOrigins:     []string{"https://app.example.com"},
    AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
    AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
    ExposeHeaders:    []string{"Content-Length"},
    AllowCredentials: true,
    MaxAge:           86400 * time.Second,
}))
```

#### PHP (Laravel)
```php
// config/cors.php
return [
    'paths'                => ['api/*'],
    'allowed_methods'      => ['*'],
    'allowed_origins'      => ['https://app.example.com'],
    'allowed_origins_patterns' => [],
    'allowed_headers'      => ['Content-Type', 'Authorization', 'X-Requested-With'],
    'exposed_headers'      => [],
    'max_age'              => 86400,
    'supports_credentials' => true,
];
```

#### Nginx
```nginx
map $http_origin $cors_origin {
    default "";
    "https://app.example.com" $http_origin;
    "https://staging.example.com" $http_origin;
}

server {
    location /api/ {
        proxy_pass http://backend;

        add_header 'Access-Control-Allow-Origin'      $cors_origin always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Allow-Methods'     'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers'     'Authorization, Content-Type, X-Requested-With' always;
        add_header 'Vary'                              'Origin' always;

        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Max-Age' 86400;
            return 204;
        }
    }
}
```

#### Apache (.htaccess)
```apache
Header always set Access-Control-Allow-Origin "https://app.example.com"
Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
Header always set Access-Control-Allow-Headers "Authorization, Content-Type"
Header always set Access-Control-Allow-Credentials "true"
Header always set Vary "Origin"

RewriteEngine On
RewriteCond %{REQUEST_METHOD} OPTIONS
RewriteRule ^(.*)$ $1 [R=204,L]
```

---

### FIX-02 · Preflight (OPTIONS) Failure

#### Express
```js
// Must be placed BEFORE route definitions
app.options('*', cors(corsOptions)); // Handle ALL preflight globally

// Or for a specific route:
app.options('/api/resource', cors(corsOptions));
```

#### FastAPI
```python
# FastAPI handles OPTIONS automatically with CORSMiddleware — ensure middleware is added
# If using custom routes, add explicit OPTIONS handler:
@app.options("/api/{path:path}")
async def options_handler():
    return Response(
        status_code=204,
        headers={
            "Access-Control-Allow-Origin": "https://app.example.com",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "86400",
        }
    )
```

#### AWS API Gateway (SAM)
```yaml
# template.yaml
Globals:
  Api:
    Cors:
      AllowMethods: "'GET,POST,PUT,DELETE,OPTIONS'"
      AllowHeaders: "'Content-Type,Authorization,X-Amz-Date,X-Api-Key'"
      AllowOrigin: "'https://app.example.com'"
      AllowCredentials: true
      MaxAge: "'86400'"
```

#### AWS Lambda (manual)
```js
exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://app.example.com',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' }, body: '' };
  }

  // ... main handler
  return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(result) };
};
```

---

### FIX-03 · Wildcard `*` with Credentials

```js
// ❌ This combination is INVALID — browsers will reject it
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Credentials', 'true');

// ✅ Correct — reflect the exact origin dynamically
const origin = req.headers.origin;
const allowed = ['https://app.example.com', 'https://staging.example.com'];
if (allowed.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin'); // Critical for caching
}
```

---

### FIX-04 · Custom Header Not Exposed

```js
// Express — expose specific headers to the browser JS
app.use(cors({
  exposedHeaders: [
    'X-Request-Id',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-Total-Count',
    'Authorization',
  ],
}));

// Raw header
res.setHeader('Access-Control-Expose-Headers',
  'X-Request-Id, X-Total-Count, X-RateLimit-Remaining');
```

---

### FIX-05 · Multipart / File Upload CORS

```js
// Include multipart-related headers in allowedHeaders
app.use(cors({
  allowedHeaders: [
    'Content-Type',         // ← Required for multipart/form-data
    'Content-Disposition',
    'Authorization',
    'X-Requested-With',
  ],
  methods: ['POST', 'PUT', 'OPTIONS'],
  credentials: true,
}));
```

---

### FIX-06 · Dev Server Proxy (No Backend Change Needed)

#### Vite (`vite.config.ts`)
```ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: path => path.replace(/^\/api/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => console.error('Proxy error:', err));
        },
      },
    },
  },
});
```

#### Create React App (`package.json`)
```json
{
  "proxy": "http://localhost:8000"
}
```

#### Next.js (`next.config.js`)
```js
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGIN || '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};
```

#### Angular (`proxy.conf.json`)
```json
{
  "/api/*": {
    "target": "http://localhost:8000",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug",
    "pathRewrite": { "^/api": "" }
  }
}
```
```json
// angular.json — add under serve > options
{ "proxyConfig": "proxy.conf.json" }
```

---

### FIX-07 · Serverless / Edge Functions

#### Vercel (Edge Function / API Route)
```ts
import type { NextRequest } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN!,
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  // handler logic
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
```

#### Cloudflare Workers
```js
const ALLOWED_ORIGINS = ['https://app.example.com', 'https://staging.example.com'];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  };
}

addEventListener('fetch', event => {
  const { request } = event;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') {
    event.respondWith(new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    }));
    return;
  }

  event.respondWith(handleRequest(request, origin));
});

async function handleRequest(request, origin) {
  const response = await fetch(request);
  const newResponse = new Response(response.body, response);
  Object.entries(corsHeaders(origin)).forEach(([k, v]) => {
    newResponse.headers.set(k, v);
  });
  return newResponse;
}
```

---

### FIX-08 · WebSocket (Socket.IO)

```js
const { Server } = require('socket.io');

const io = new Server(httpServer, {
  cors: {
    origin: ['https://app.example.com', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Authorization'],
  },
  transports: ['websocket', 'polling'],
});
```

---

### FIX-09 · CDN / Proxy Stripping Headers

#### AWS CloudFront
```json
// Origin Request Policy — include these headers
{
  "HeadersConfig": {
    "HeaderBehavior": "whitelist",
    "Headers": {
      "Items": [
        "Origin",
        "Access-Control-Request-Headers",
        "Access-Control-Request-Method"
      ]
    }
  }
}
```
- Set **Cache Policy** to forward the `Origin` header or use `CachingDisabled` for API routes.
- Add `Vary: Origin` on the origin server.

#### Nginx (forwarding + preserving CORS)
```nginx
proxy_pass_header Access-Control-Allow-Origin;
proxy_pass_header Access-Control-Allow-Methods;
proxy_pass_header Access-Control-Allow-Headers;
proxy_pass_header Access-Control-Allow-Credentials;
```

---

### FIX-10 · Multiple `Access-Control-Allow-Origin` Headers

**Symptom:**
```
The 'Access-Control-Allow-Origin' header contains multiple values 'X, Y',
but only one is allowed.
```

**Cause:** Both the app server AND proxy are setting this header.

#### Fix
```nginx
# In Nginx — remove the upstream header before adding your own
proxy_hide_header Access-Control-Allow-Origin;
add_header 'Access-Control-Allow-Origin' $cors_origin always;
```

```js
// Express — ensure cors() runs ONCE and is not duplicated in middleware chain
// Remove any manual res.setHeader('Access-Control-Allow-Origin', ...) elsewhere
```

---

### FIX-11 · CORS on Redirect (301/302)

**Cause:** Browser sends CORS request → server redirects → browser drops Origin on redirect → CORS fails.

#### Fix
```js
// Backend: Avoid redirecting CORS API routes
// OR return 200 with a Location field in JSON:
res.status(200).json({ redirectTo: 'https://new-url.com/api/resource' });

// Frontend: Handle the redirect manually
const res = await fetch(url, { redirect: 'manual' });
if (res.type === 'opaqueredirect') {
  const newUrl = res.headers.get('location');
  // follow with proper CORS headers
}
```

---

### FIX-12 · Mixed Content (HTTP → HTTPS)

**Symptom:** CORS error on HTTP origin calling HTTPS API.

```
Mixed Content: The page was loaded over HTTPS, but requested an insecure HTTP resource.
```

#### Fix
```
1. Serve your frontend over HTTPS — not HTTP
2. In development: use https://localhost with a self-signed cert (vite --https)
3. Never call an HTTP API from an HTTPS page — upgrade your API to HTTPS
```

#### Vite HTTPS Dev Server
```ts
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [basicSsl()],
  server: { https: true },
});
```

---

### FIX-13 · False CORS (Backend Crash / DB Init Failure)

**Symptom:** Browser console shows a classic CORS error (`No 'Access-Control-Allow-Origin' header` or `net::ERR_FAILED`) but checking the backend logs reveals a crash, `500 Internal Server Error`, or `Connection Refused` on startup.

**Cause:** The browser's preflight or primary request fails at the network/socket level because the API container is restarting, crashing (e.g., database connection race condition), or rejecting the TCP connection entirely. The browser generically categorizes all low-level cross-origin connection failures as CORS policy violations.

#### Fix
```
1. Verify the backend is actually running and listening on the designated port (e.g., `docker ps`).
2. Check backend container logs for unhandled exceptions during startup (`psycopg2.OperationalError`, etc.).
3. Ensure Docker Compose dependencies are properly handled (e.g., `restart: always` on backend relying on a DB).
4. If a 500 API exception strips CORS headers, verify exception handlers in frameworks like FastAPI inject CORS headers back into error responses.
```

---

### FIX-14 · False CORS (IPv6/Localhost Mapping in Docker/WSL)

**Symptom:** Browser consistently reports `net::ERR_FAILED` or blocked CORS when trying to hit `http://localhost:8000` from the frontend, despite backend CORS configuration being perfectly open.

**Cause:** Chrome on Windows may resolve `localhost` to the IPv6 loopback address (`::1`). When hitting a backend running inside WSL/Docker, the port mapping may only be bound to the IPv4 address (`127.0.0.1`), causing the connection to be silently dropped. Chrome interprets the dropped cross-origin preflight as a CORS block.

#### Fix
```javascript
// Option A: Explicit IPv4 in Frontend Code (Bypass IPv6 routing bugs)
// src/api/axios.js
const BASE_URL = "http://127.0.0.1:8000";

// Option B (Recommended): Dev Server Proxy (Bypass Browser CORS entirely)
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      '^/api': {
        target: 'http://backend:8000', // Reference Docker container name directly
        changeOrigin: true,
      }
    }
  }
});
// Then set Frontend BASE_URL to "" (relative path to Vite)
```

---

## Security Checklist

```yaml
security_rules:
  - id: no-wildcard-with-credentials
    rule: "Never use origin: '*' when credentials: true"
    severity: CRITICAL

  - id: use-env-origins
    rule: "Always read allowed origins from environment variables, not hardcoded strings"
    severity: HIGH

  - id: vary-origin-header
    rule: "Always return 'Vary: Origin' when using dynamic origin reflection"
    severity: HIGH

  - id: explicit-methods
    rule: "List only the HTTP methods your API actually uses — avoid allowMethods: '*'"
    severity: MEDIUM

  - id: minimal-exposed-headers
    rule: "Only expose headers the frontend actually reads"
    severity: LOW

  - id: preflight-max-age
    rule: "Set maxAge/Access-Control-Max-Age to reduce preflight requests (recommended: 86400)"
    severity: LOW
```

---

## Diagnosis Flow

```
User reports CORS error
        │
        ▼
Does it have an error message?
  ├─ YES → Match to Category (FIX-01 to FIX-12)
  └─ NO  → Ask: "Can you paste the browser console error?"
        │
        ▼
Is the stack known?
  ├─ YES → Use matching fix block
  └─ NO  → Infer from code or output Express + FastAPI + Nginx trio
        │
        ▼
Does the request use credentials / cookies / Authorization header?
  ├─ YES → Enforce FIX-03 (no wildcard), add credentials: true
  └─ NO  → Standard ACAO fix
        │
        ▼
Is there a proxy, CDN, or load balancer involved?
  ├─ YES → Apply FIX-09 + add Vary: Origin
  └─ NO  → Skip
        │
        ▼
Output fix in standard format
```

---

## Example Interactions

### Example 1 — Simple Express Error
**User:** `"Getting CORS error: No 'Access-Control-Allow-Origin' header. Using Express."`

**Agent Output:**
```
🔍 CORS Category: Missing Access-Control-Allow-Origin Header
🧠 Root Cause: The Express server is not returning CORS headers in its HTTP response.
🛠️ Fix (Express):
[FIX-01 Express block]
🔒 Security Note: Replace 'https://app.example.com' with your actual frontend origin. 
   Never use '*' if you're sending cookies or Authorization headers.
✅ Test: Open DevTools → Network → your request → check for 
   'Access-Control-Allow-Origin' in Response Headers.
```

### Example 2 — Credentials + Wildcard
**User:** `"CORS works but breaks when I add credentials: 'include'"`

**Agent Output:**
```
🔍 CORS Category: Wildcard '*' with Credentials
🧠 Root Cause: Browsers block wildcard origins when credentials mode is 'include'.
🛠️ Fix:
[FIX-03 block]
🔒 Security Note: Using a dynamic whitelist instead of '*' is the only valid fix.
✅ Test: Check that 'Access-Control-Allow-Credentials: true' and a specific 
   origin (not '*') both appear in the response headers.
```

---

## Changelog

| Version | Date | Notes |
|---------|------|-------|
| 1.0.0 | 2026-03-10 | Initial release — 12 categories, 10 stacks |
| 1.1.0 | 2026-03-18 | Added FIX-13 (Backend crash fake CORS) and FIX-14 (IPv6 Docker network drop CORS) |
