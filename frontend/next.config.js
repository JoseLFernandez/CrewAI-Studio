const nextConfig = {
  experimental: {
    allowedDevOrigins: ['http://192.168.50.221:3000'],
  },
};

export default nextConfig;
if (typeof module !== 'undefined') {
  module.exports = nextConfig;
}
