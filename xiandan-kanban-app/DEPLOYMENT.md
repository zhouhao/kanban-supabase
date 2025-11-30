# Deployment Guide

This guide explains how to deploy the Xiandan Kanban application to various hosting platforms.

## Problem: 404 on Page Refresh

When deploying a Single Page Application (SPA) like this React app, you may encounter 404 errors when:
- Refreshing the page on any route other than `/` (e.g., `/board/123`)
- Directly accessing a deep link (e.g., `https://yourdomain.com/board/123`)

### Why This Happens

1. When you navigate within the app, React Router handles routing on the client side
2. When you refresh or directly access a URL, the browser makes a request to the server
3. The server looks for a file at that path (e.g., `/board/123/index.html`)
4. The file doesn't exist, so the server returns 404

### Solution

Configure your hosting platform to redirect all routes to `index.html`, allowing React Router to handle the routing.

---

## Deployment Platforms

### 1. Netlify

**Configuration files already included:**
- `public/_redirects` - Automatically copied to `dist/` during build
- `netlify.toml` - Alternative configuration method

**Steps:**
1. Push your code to GitHub/GitLab
2. Connect your repository to Netlify
3. Build settings:
   - Build command: `pnpm build`
   - Publish directory: `dist`
4. Deploy!

The `_redirects` file will automatically handle SPA routing.

**Manual deployment:**
```bash
pnpm build
netlify deploy --prod --dir=dist
```

---

### 2. Vercel

**Configuration file already included:**
- `vercel.json` - Configures rewrites for SPA routing

**Steps:**
1. Push your code to GitHub/GitLab
2. Import your repository on Vercel
3. Build settings (auto-detected):
   - Build command: `pnpm build`
   - Output directory: `dist`
4. Deploy!

**Manual deployment:**
```bash
pnpm build
vercel --prod
```

---

### 3. Cloudflare Pages

**Configuration file already included:**
- `public/_redirects` - Works with Cloudflare Pages

**Steps:**
1. Push your code to GitHub/GitLab
2. Create a new Cloudflare Pages project
3. Build settings:
   - Build command: `pnpm build`
   - Build output directory: `dist`
4. Deploy!

---

### 4. AWS S3 + CloudFront

**Additional configuration needed:**

1. Upload `dist/` contents to S3 bucket
2. Configure CloudFront distribution
3. Set up error page handling:
   - Error code: `403` → Response page: `/index.html` → Response code: `200`
   - Error code: `404` → Response page: `/index.html` → Response code: `200`

---

### 5. Nginx

**Add to your nginx configuration:**

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

---

### 6. Apache

**Create `.htaccess` in your `public/` directory:**

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## Environment Variables

Make sure to set these environment variables in your hosting platform:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Platform-specific instructions:**

- **Netlify**: Site settings → Environment variables
- **Vercel**: Project settings → Environment Variables
- **Cloudflare Pages**: Settings → Environment variables

---

## Build Verification

Before deploying, verify your build locally:

```bash
# Build the project
pnpm build

# Verify _redirects file exists
ls -la dist/_redirects

# Preview the build locally
pnpm preview
```

Then test these URLs in the preview:
- `http://localhost:4173/` (root)
- `http://localhost:4173/dashboard` (direct access)
- `http://localhost:4173/board/test-id` (deep link)
- Refresh the page on each route

All routes should load without 404 errors.

---

## Troubleshooting

### Still getting 404 errors?

1. **Check build output**: Ensure `dist/_redirects` exists after build
2. **Check platform**: Verify your hosting platform supports `_redirects` or uses `vercel.json`
3. **Clear cache**: Clear your browser cache and CDN cache
4. **Check deployment logs**: Look for errors during deployment

### Redirect loop?

If you get a redirect loop, check that:
- The `_redirects` file uses status code `200` (rewrite), not `301` or `302` (redirect)
- You're not using both `_redirects` and server-side redirects

### Assets not loading?

Ensure your asset paths are relative or use the base URL correctly:
- Images: `/logo.svg` or relative `./logo.svg`
- Scripts: Use Vite's asset handling
- CSS: Imported in components or main.tsx

---

## Production Checklist

Before deploying to production:

- [ ] Set environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [ ] Test all routes locally with `pnpm preview`
- [ ] Verify `dist/_redirects` exists after build
- [ ] Configure custom domain (if applicable)
- [ ] Set up SSL certificate (HTTPS)
- [ ] Test page refresh on all routes in production
- [ ] Monitor error logs for 404s

---

## Need Help?

- Check your hosting platform's documentation for SPA routing
- Search for "[platform name] SPA routing" or "[platform name] react router"
- Review deployment logs for specific error messages
