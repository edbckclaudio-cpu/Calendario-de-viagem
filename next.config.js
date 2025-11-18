/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Documented env vars for optional real flight API integration.
  env: {
    // Configure these in your environment to enable real upstream lookups.
    // FLIGHT_API_URL: "https://YOUR_PROVIDER_ENDPOINT/flight-info",
    // FLIGHT_API_KEY: "YOUR_API_KEY",
  },
};

module.exports = nextConfig;