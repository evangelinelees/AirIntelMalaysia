import { Capacitor } from '@capacitor/core';

/**
 * On the Vercel-hosted web app, we call our own Next.js API routes
 * (relative paths) which proxy to n8n server-side, keeping
 * AIRINTEL_SHARED_SECRET out of the client bundle entirely.
 *
 * On the Capacitor native build there is no Next.js server running on
 * the device, so calls must go to the deployed API base directly
 * (NEXT_PUBLIC_API_BASE_URL, e.g. your Vercel domain) which still does
 * the proxying — the secret never ships inside the mobile binary either way.
 */
function resolveUrl(path: string) {
  if (Capacitor.isNativePlatform()) {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL!.replace(/\/$/, '');
    return `${base}${path}`;
  }
  return path; // relative — resolved by the browser against the current origin
}

export async function apiPost<T = any>(path: string, body: unknown): Promise<T> {
  const res = await fetch(resolveUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}
