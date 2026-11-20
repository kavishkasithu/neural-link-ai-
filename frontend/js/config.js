/**
 * FRONTEND CONFIGURATION
 * Change API_BASE_URL to your deployed Render / Railway / VPS URL when hosting on Netlify or Vercel.
 */
window.NEURAL_CONFIG = {
  API_BASE_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : window.location.origin
};
