import React, { useState } from 'react';
import { auth, googleProvider, setPendingSignupRole } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { toToastString } from '../utils/errorMessages';

const SIGNUP_ROLES = [
  { value: 'agent', label: 'Agent / Operator', description: 'Manage leads, deals, and properties' },
  { value: 'buyer', label: 'Buyer', description: 'Browse and purchase properties' },
  { value: 'seller', label: 'Seller', description: 'List a property for sale' }
];

const LoginPage = ({ onLoginSuccess, embedded = false }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [signupRole, setSignupRole] = useState('agent');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      if (isSignup) {
        setPendingSignupRole(signupRole);
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onLoginSuccess();
    } catch (err) {
      setError(toToastString(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      if (isSignup) {
        setPendingSignupRole(signupRole);
      }
      await signInWithPopup(auth, googleProvider);
      onLoginSuccess();
    } catch (err) {
      setError(toToastString(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Enter your email above first, then click "Forgot password?"');
      return;
    }
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await sendPasswordResetEmail(auth, email);
      setNotice(`Password reset link sent to ${email}. Check your inbox.`);
    } catch (err) {
      setError(toToastString(err));
    } finally {
      setLoading(false);
    }
  };

  const card = (
      <div className={embedded ? 'public-auth-card' : undefined} style={{ background: '#0a0a0a', border: '2px solid #1a1a1a', borderRadius: '8px', padding: embedded ? '30px' : '40px', maxWidth: '450px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ width: '60px', height: '60px', background: '#00ff88', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', fontSize: '28px', fontWeight: '700', color: '#000000', margin: '0 auto 20px' }}>R</div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#ffffff', marginBottom: '8px', letterSpacing: '-0.5px' }}>
            {isSignup ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-faint)' }}>
            {isSignup ? 'Sign up to get started' : 'Sign in to your account'}
          </p>
        </div>
        {error && (
          <div role="alert" style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '13px', color: 'var(--danger)' }}>
            {error}
          </div>
        )}
        {notice && (
          <div role="status" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '13px', color: 'var(--accent)' }}>
            {notice}
          </div>
        )}
        <form onSubmit={handleEmailAuth}>
          {isSignup && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '8px' }}>
                I am signing up as a...
              </label>
              <div role="radiogroup" aria-label="Account type" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {SIGNUP_ROLES.map((role) => {
                  const isSelected = signupRole === role.value;
                  return (
                    <div
                      key={role.value}
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onClick={() => setSignupRole(role.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSignupRole(role.value);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: isSelected ? '#00ff8810' : '#0f0f0f',
                        border: isSelected ? '1px solid #00ff88' : '1px solid #1a1a1a',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        flexShrink: 0,
                        border: isSelected ? '4px solid #00ff88' : '2px solid #444444',
                        background: isSelected ? '#000000' : 'transparent'
                      }} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: isSelected ? '#ffffff' : '#cccccc' }}>
                          {role.label}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>{role.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="form-field" style={{ marginBottom: '15px' }}>
            <label>Email</label>
            <input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-field" style={{ marginBottom: isSignup ? '8px' : '6px' }}>
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
            />
          </div>
          {isSignup ? (
            <div style={{ fontSize: '12px', color: 'var(--text-faint)', marginBottom: '20px' }}>
              At least 6 characters
            </div>
          ) : (
            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
              <span
                onClick={loading ? undefined : handleForgotPassword}
                onKeyDown={(e) => { if (e.key === 'Enter') handleForgotPassword(); }}
                role="button"
                tabIndex={0}
                style={{ fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
              >
                Forgot password?
              </span>
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginBottom: '15px' }}>
            {loading
              ? (isSignup ? 'Creating Account...' : 'Signing In...')
              : (isSignup ? 'Create Account' : 'Sign In')}
          </button>
        </form>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0', color: 'var(--text-faint)', fontSize: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: '#1a1a1a' }}></div>
          <span>OR</span>
          <div style={{ flex: 1, height: '1px', background: '#1a1a1a' }}></div>
        </div>
        <button onClick={handleGoogleAuth} disabled={loading} style={{ width: '100%', background: '#ffffff', color: '#000000', border: 'none', padding: '12px', fontSize: '13px', fontWeight: '600', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>
        <div style={{ textAlign: 'center', fontSize: '13px', color: '#888888' }}>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <span
            onClick={() => { setIsSignup(!isSignup); setError(''); setNotice(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { setIsSignup(!isSignup); setError(''); setNotice(''); } }}
            role="button"
            tabIndex={0}
            style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: '600' }}
          >
            {isSignup ? 'Sign In' : 'Sign Up'}
          </span>
        </div>
        <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-faint)', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #1a1a1a' }}>
          Secured with Firebase Authentication · Your data is encrypted in transit
        </div>
      </div>
  );

  if (embedded) return card;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#000000', padding: '20px' }}>
      {card}
    </div>
  );
};

export default LoginPage;
