import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const Registration: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '+63',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (!value.startsWith('+63')) {
      value = '+63' + value.replace('+63', '');
    }
    setFormData(prev => ({
      ...prev,
      phone: value
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password should be at least 6 characters long');
      return;
    }

    if (!formData.phone.startsWith('+63') || formData.phone.length !== 13) {
      setError('Please enter a valid Philippine phone number (+63XXXXXXXXXX)');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      await updateProfile(userCredential.user, { 
        displayName: formData.username
      });
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
       
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        
        
      }}
    >
      
      {/* Logo */}
      <div style={{
        position: 'absolute',
        top: 32,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        zIndex: 2,
      }}>
        <img
          src="../images/gds-logo.png"
          alt="GDS Budgetarian Logo"
          width={150}
          height={150}
          style={{ filter: 'drop-shadow(0 4px 8px #e0b97355)', borderRadius: '50%', background: 'rgba(255,255,255,0.7)' }}
        />
      </div>
      {/* Registration Card */}
      <div
        style={{
          maxWidth: 420,
          width: '95%',
          margin: '0 auto',
          padding: '40px 32px 32px 32px',
          borderRadius: 18,
          background: 'rgba(255,255,255,0.88)',
          boxShadow: '0 8px 32px rgba(224,185,115,0.15), 0 2px 8px #e0b97322',
          backdropFilter: 'blur(8px)',
          position: 'relative',
          zIndex: 3,
        }}
      >
        <h2
          style={{
            marginBottom: 28,
            textAlign: 'center',
            color: '#e53e3e',
            fontSize: '2rem',
            letterSpacing: '2px',
            fontFamily: 'serif',
            fontWeight: 700,
            textShadow: '0 2px 8px #ecc94b33',
          }}
        >
          Create Your Account
        </h2>
        <form onSubmit={handleRegister}>
          <input
            type="text"
            name="username"
            placeholder="Full Name"
            value={formData.username}
            onChange={handleChange}
            style={{
              width: '100%',
              marginBottom: 16,
              padding: '12px',
              borderRadius: 8,
              border: '1px solid #ecc94b',
              backgroundColor: 'rgba(255,255,255,0.95)',
              fontSize: '1rem',
              fontFamily: 'serif',
              color: '#7d5a5a',
              boxShadow: '0 1px 4px #ecc94b11',
              outline: 'none',
              transition: 'border 0.2s',
            }}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            style={{
              width: '100%',
              marginBottom: 16,
              padding: '12px',
              borderRadius: 8,
              border: '1px solid #ecc94b',
              backgroundColor: 'rgba(255,255,255,0.95)',
              fontSize: '1rem',
              fontFamily: 'serif',
              color: '#7d5a5a',
              boxShadow: '0 1px 4px #ecc94b11',
              outline: 'none',
              transition: 'border 0.2s',
            }}
            required
          />
          <input
            type="tel"
            name="phone"
            placeholder="Phone Number (+63XXXXXXXXXX)"
            value={formData.phone}
            onChange={handlePhoneChange}
            style={{
              width: '100%',
              marginBottom: 16,
              padding: '12px',
              borderRadius: 8,
              border: '1px solid #ecc94b',
              backgroundColor: 'rgba(255,255,255,0.95)',
              fontSize: '1rem',
              fontFamily: 'serif',
              color: '#7d5a5a',
              boxShadow: '0 1px 4px #ecc94b11',
              outline: 'none',
              transition: 'border 0.2s',
            }}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            style={{
              width: '100%',
              marginBottom: 16,
              padding: '12px',
              borderRadius: 8,
              border: '1px solid #ecc94b',
              backgroundColor: 'rgba(255,255,255,0.95)',
              fontSize: '1rem',
              fontFamily: 'serif',
              color: '#7d5a5a',
              boxShadow: '0 1px 4px #ecc94b11',
              outline: 'none',
              transition: 'border 0.2s',
            }}
            required
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            style={{
              width: '100%',
              marginBottom: 18,
              padding: '12px',
              borderRadius: 8,
              border: '1px solid #ecc94b',
              backgroundColor: 'rgba(255,255,255,0.95)',
              fontSize: '1rem',
              fontFamily: 'serif',
              color: '#7d5a5a',
              boxShadow: '0 1px 4px #ecc94b11',
              outline: 'none',
              transition: 'border 0.2s',
            }}
            required
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              background: 'linear-gradient(90deg, #e53e3e 0%, #ecc94b 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: '1.1rem',
              fontFamily: 'serif',
              boxShadow: '0 2px 8px #e0b97333',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              letterSpacing: '1px',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        {error && (
          <div
            style={{
              color: '#e53e3e',
              background: '#fff6e7',
              marginTop: 18,
              textAlign: 'center',
              borderRadius: 8,
              padding: '10px 0',
              fontWeight: 500,
              fontFamily: 'serif',
              fontSize: '1rem',
              boxShadow: '0 1px 4px #ecc94b11',
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default Registration;
