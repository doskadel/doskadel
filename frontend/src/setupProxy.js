const { createProxyMiddleware } = require('http-proxy-middleware');

// Dev-proxy: /api -> backend. Один origin -> cookie first-party, CORS не нужен.
// target: в Docker-сети бэк = http://backend:5000; вне Docker = http://localhost:5000.
// app.use('/api', ...) срезает префикс /api, поэтому возвращаем его pathRewrite.
const target = process.env.REACT_APP_PROXY_TARGET || 'http://backend:5000';

module.exports = function (app) {
  app.use(
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathFilter: '/api',
    })
  );
};
