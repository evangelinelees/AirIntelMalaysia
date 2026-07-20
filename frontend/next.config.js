/** @type {import('next').NextConfig} */
const nextConfig = {
  // Capacitor needs a static export to bundle into the native shell.
  // The admin/API routes below run separately on Vercel (not exported)
  // — see README for the two-target build note.
  output: process.env.CAPACITOR_BUILD === 'true' ? 'export' : undefined,
  images: { unoptimized: true },
};

module.exports = nextConfig;
