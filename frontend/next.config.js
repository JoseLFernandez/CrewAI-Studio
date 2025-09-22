const nextConfig = {
  allowedDevOrigins: ['192.168.50.221'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};
export default nextConfig;
if (typeof module !== 'undefined') {
  module.exports = nextConfig;
}
