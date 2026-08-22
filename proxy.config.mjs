const backendHost = '127.0.0.1';
const backendPort = 8080;

/**
 * Dev Server Proxy Configuration
 * Proxies API requests to local backend during development
 * @type {import('vite').CommonServerOptions['proxy']}
 */
export default {
  '^/(api|management|v3/api-docs)': {
    target: `http://${backendHost}:${backendPort}`,
    xfwd: true,
  },
};
