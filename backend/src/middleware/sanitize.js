// Input sanitization middleware
import sanitizeHtml from 'sanitize-html';
export const sanitizeInput = (req, res, next) => {
  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// Recursively sanitize an object
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeValue(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }
  return sanitized;
}

// Sanitize individual values
function sanitizeValue(value) {
  if (typeof value !== 'string') {
    return value;
  }

  // Use a well-tested library to remove potential XSS attacks
  const sanitized = sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
    allowedSchemes: ['http', 'https', 'mailto'],
  });

  return typeof sanitized === 'string' ? sanitized.trim() : '';
}

export default sanitizeInput;
