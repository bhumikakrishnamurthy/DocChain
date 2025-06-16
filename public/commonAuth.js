// Load the auth middleware dynamically
const script = document.createElement('script');
script.type = 'module';
script.src = '/authMiddleware.js';
document.head.appendChild(script);