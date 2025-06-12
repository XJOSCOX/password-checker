import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PasswordChecker.css';

function generateStrongPassword(length = 12) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const symbols = '!@#$%^&*()_-+=<>?';
  const all = lowercase + uppercase + digits + symbols;

  const crypto = window.crypto || window.msCrypto;
  const randomIndex = (max) => {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % max;
  };

  let pass = [
    lowercase[randomIndex(lowercase.length)],
    uppercase[randomIndex(uppercase.length)],
    digits[randomIndex(digits.length)],
    symbols[randomIndex(symbols.length)],
  ];
  for (let i = 4; i < length; i++) {
    pass.push(all[randomIndex(all.length)]);
  }
  for (let i = pass.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [pass[i], pass[j]] = [pass[j], pass[i]];
  }
  return pass.join('');
}

function PasswordChecker() {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [result, setResult] = useState(null);
  const [copyStatus, setCopyStatus] = useState('');
  const [length, setLength] = useState(12);
  const [loading, setLoading] = useState(false);

  // Initial password generation
  useEffect(() => {
    const randomPass = generateStrongPassword(length);
    setPassword(randomPass);
  }, [length]);

  // Debounced password strength check
  useEffect(() => {
    const debounce = setTimeout(async () => {
      if (password.length === 0) {
        setResult(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        const res = await axios.post(`${apiUrl}/api/check-password`, { password });
        setResult(res.data);
      } catch (err) {
        setResult({ strength: 'Error', suggestions: ['Server not reachable'] });
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [password]);

  const handleGenerate = () => {
    const randomPass = generateStrongPassword(length);
    setPassword(randomPass);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    setCopyStatus('Copied!');
    setTimeout(() => setCopyStatus(''), 1300);
  };

  const handleReset = () => {
    setPassword('');
    setResult(null);
  };

  const handleLengthChange = (e) => {
    const newLength = parseInt(e.target.value);
    setLength(newLength);
  };

  return (
    <div className="password-checker-container">
      <h2 className="checker-title">Password Strength Checker</h2>

      <div style={{ marginBottom: 15 }}>
        <label htmlFor="pw-length" style={{ fontWeight: 500, color: '#5b6ca8', fontSize: '1rem' }}>
          Password Length: <span style={{ fontWeight: 700, color: '#4725bc' }}>{length}</span>
        </label>
        <input
          id="pw-length"
          type="range"
          min="8"
          max="32"
          value={length}
          onChange={handleLengthChange}
          style={{
            width: '100%',
            marginTop: 4,
            accentColor: '#6c47fa',
            cursor: 'pointer',
          }}
        />
      </div>

      <div className="pw-input-row">
        <input
          type={show ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password..."
          className="password-input"
          aria-label="Password input"
        />
        <button className="pw-btn" onClick={() => setShow(!show)}>
          {show ? 'Hide' : 'Show'}
        </button>
        <button className="pw-btn" onClick={handleGenerate}>
          Generate Password
        </button>
        <button
          className="pw-btn"
          style={{
            background:
              copyStatus === 'Copied!'
                ? 'linear-gradient(95deg,#28e745 50%,#53c2fa 100%)'
                : undefined,
            marginLeft: 4,
          }}
          title="Copy to clipboard"
          onClick={handleCopy}
          aria-label="Copy password to clipboard"
        >
          <span role="img" aria-label="copy">📋</span>
        </button>
        <button className="pw-btn" onClick={handleReset}>
          Reset
        </button>
      </div>
      <div
        style={{
          minHeight: '1.2rem',
          marginBottom: '4px',
          color: '#28a745',
          fontWeight: 600,
          textAlign: 'right',
        }}
      >
        {copyStatus}
      </div>
      {loading && (
        <div className="loading">Checking password...</div>
      )}
      {result && !loading && (
        <div className="result-box" aria-live="polite">
          <div className="strength-label">{result.strength}</div>
          <div className="strength-bar">
            <div
              className="strength-bar-inner"
              style={{
                width:
                  result.strength === 'Strong'
                    ? '100%'
                    : result.strength === 'Good'
                    ? '75%'
                    : result.strength === 'Fair'
                    ? '50%'
                    : '25%',
                background:
                  result.strength === 'Strong'
                    ? 'linear-gradient(90deg,#28e745,#31c4ad)'
                    : result.strength === 'Good'
                    ? '#2974fa'
                    : result.strength === 'Fair'
                    ? '#f3b944'
                    : '#e04242',
              }}
            />
          </div>
          {result.breached && (
            <div
              style={{
                color: '#d91b2b',
                background: '#fde9eb',
                borderRadius: 7,
                padding: '8px 12px',
                fontWeight: 700,
                margin: '7px 0 7px 0',
                fontSize: '1rem',
              }}
            >
              ⚠️ This password has been found in real data breaches.  
              <br />
              <span style={{ fontWeight: 500 }}>
                Do <b>NOT</b> use it!
              </span>
            </div>
          )}
          {result.suggestions.length > 0 ? (
            <ul className="suggestion-list">
              {result.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          ) : (
            <div className="great-password">Great password!</div>
          )}
        </div>
      )}
    </div>
  );
}

export default PasswordChecker;
