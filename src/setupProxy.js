const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy requests to the ML service
  app.use(
    '/api/ml',
    createProxyMiddleware({
      target: 'http://127.0.0.1:5002',
      changeOrigin: true,
      pathRewrite: {
        '^/api/ml': ''
      },
      timeout: 30000,
      logLevel: 'debug'
    })
  );

  // Proxy requests to the coding stats and LinkedIn API
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://127.0.0.1:5001',
      changeOrigin: true,
      timeout: 30000,
      logLevel: 'debug'
    })
  );
}; 