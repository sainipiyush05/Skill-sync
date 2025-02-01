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
      }
    })
  );

  // Proxy requests to the Node.js server
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://127.0.0.1:5001',
      changeOrigin: true
    })
  );
}; 