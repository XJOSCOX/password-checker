const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());

// Rate limiting for the API
app.use('/api/check-password', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP
  message: 'Too many requests, please try again later.'
}));

// Password strength check logic
function checkPasswordStrength(password) {
  const suggestions = [];
  let score = 0;

  if (password.length < 8) {
    suggestions.push('Make your password at least 8 characters.');
  } else {
    score += 1;
  }
  if (!/[a-z]/.test(password)) {
    suggestions.push('Add lowercase letters.');
  } else {
    score += 1;
  }
  if (!/[A-Z]/.test(password)) {
    suggestions.push('Add uppercase letters.');
  } else {
    score += 1;
  }
  if (!/[0-9]/.test(password)) {
    suggestions.push('Add numbers.');
  } else {
    score += 1;
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    suggestions.push('Add special characters (e.g. @, !, #, $).');
  } else {
    score += 1;
  }
  const commonPasswords = ['password', '123456', 'qwerty', 'letmein'];
  if (commonPasswords.includes(password.toLowerCase())) {
    suggestions.push("Don't use common passwords.");
    score = 0;
  }

  let strength = 'Weak';
  if (score >= 4) strength = 'Strong';
  else if (score === 3) strength = 'Good';
  else if (score === 2) strength = 'Fair';
  else strength = 'Weak';

  return { strength, suggestions };
}

// Breach check using HaveIBeenPwned API
async function checkPasswordBreach(password) {
  const sha1hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = sha1hash.slice(0, 5);
  const suffix = sha1hash.slice(5);

  try {
    const response = await axios.get(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': true }
    });
    const lines = response.data.split('\n');
    for (const line of lines) {
      const [hashSuffix, count] = line.trim().split(':');
      if (hashSuffix === suffix) {
        return true; // Breached!
      }
    }
    return false; // Not breached
  } catch (err) {
    console.error(`HIBP API error at ${new Date().toISOString()}: ${err.message}`);
    return false; // Assume not breached for user experience
  }
}

// Main endpoint
app.post('/api/check-password', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'No password provided.' });
  if (password.length > 100) return res.status(400).json({ error: 'Password too long.' });

  const result = checkPasswordStrength(password);
  let breached = false;
  try {
    breached = await checkPasswordBreach(password);
  } catch (err) {
    breached = false;
  }
  res.json({ ...result, breached });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Password Strength Checker backend running on port ${PORT}`);
});