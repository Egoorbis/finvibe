// Input sanitization middleware
import sanitizeHtml from 'sanitize-html';
export const sanitizeInput = (req, res, next) => {
  // Sanitize request body
  if (req.body) {
    const sanitizedBody = sanitizeInPlace(req.body);
    // If body isn't an object/array (e.g., raw string), fall back to direct assignment
    if (sanitizedBody !== req.body) {
      req.body = sanitizedBody;
    }
  }

  // Sanitize query parameters
  if (req.query) {
    sanitizeInPlace(req.query);
  }

  // Sanitize URL parameters
  if (req.params) {
    sanitizeInPlace(req.params);
  }

  next();
};

// Sanitize an object/array in place to avoid reassigning read-only request properties
function sanitizeInPlace(target) {
  const sanitized = sanitizeObject(target);

  if (Array.isArray(target)) {
    target.length = 0;
    target.push(...sanitized);
    return target;
  }

  if (target && typeof target === 'object') {
    for (const key of Object.keys(target)) {
      delete target[key];
    }

    Object.assign(target, sanitized);
    return target;
  }

  // Primitive values can be returned to be assigned by the caller when appropriate
  return sanitized;
}

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
