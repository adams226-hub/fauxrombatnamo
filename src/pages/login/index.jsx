import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "components/AppIcon";
import Button from "components/ui/Button";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        navigate('/');
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Erreur de connexion:', err);
      setError('Erreur lors de la connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(145deg, #1A2E1C 0%, #2C5530 40%, #E55B2D 100%)",
      }}
    >
      <div className="w-full max-w-sm">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div
            className="mx-auto mb-5 flex items-center justify-center"
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: '#E55B2D',
              boxShadow: '0 8px 32px rgba(229,91,45,0.5), 0 0 0 5px rgba(255,255,255,0.12)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ position: 'absolute', opacity: 0.2 }}>
              <path d="M26 5C21 5 16 8 15 14C14 18 16 20 14 24C12 28 10 31 12 35C14 39 17 40 17 44C17 47 20 50 23 50C26 50 27 47 29 45C31 43 33 44 35 41C37 38 37 35 38 31C39 27 39 24 38 21C37 18 34 15 32 12C30 9 28 5 26 5Z" fill="white"/>
            </svg>
            <span style={{
              color: 'white',
              fontSize: '22px',
              fontWeight: '900',
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '3px',
              position: 'relative',
              zIndex: 1,
            }}>
              AMP
            </span>
          </div>
          <h1
            className="text-2xl font-bold text-white mb-0.5"
            style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em' }}
          >
            African Mining Partenair
          </h1>
          <p className="text-white font-semibold" style={{ fontFamily: 'var(--font-heading)', color: '#E55B2D' }}>
            SARL
          </p>
          <p className="text-white/60 text-sm mt-1" style={{ fontFamily: 'var(--font-caption)' }}>
            Plateforme de gestion opérationnelle
          </p>
        </div>

        {/* Login Card */}
        <div
          className="rounded-2xl p-7 shadow-2xl"
          style={{
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <h2
            className="text-xl font-bold mb-5"
            style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-heading)' }}
          >
            Connexion
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <Icon name="AlertCircle" size={16} color="#b91c1c" />
                {error}
              </div>
            )}

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-caption)' }}
              >
                Adresse email
              </label>
              <div className="relative">
                <Icon
                  name="Mail"
                  size={18}
                  color="var(--color-muted-foreground)"
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full py-2.5 pl-10 pr-3 border rounded-lg text-sm transition-colors"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-background)',
                    color: 'var(--color-foreground)',
                    outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = '#E55B2D'}
                  onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                  placeholder="exemple@amp-mines.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-caption)' }}
              >
                Mot de passe
              </label>
              <div className="relative">
                <Icon
                  name="Lock"
                  size={18}
                  color="var(--color-muted-foreground)"
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full py-2.5 pl-10 pr-3 border rounded-lg text-sm transition-colors"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-background)',
                    color: 'var(--color-foreground)',
                    outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = '#E55B2D'}
                  onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                  placeholder="Mot de passe"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-semibold text-sm text-white transition-all duration-200 mt-2"
              style={{
                background: loading ? '#c9742a' : '#E55B2D',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(229,91,45,0.4)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!loading) e.target.style.background = '#cf5127'; }}
              onMouseLeave={e => { if (!loading) e.target.style.background = '#E55B2D'; }}
            >
              {loading ? 'Connexion en cours…' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/50 text-xs mt-6" style={{ fontFamily: 'var(--font-caption)' }}>
          © 2026 African Mining Partenair SARL
        </p>
      </div>
    </div>
  );
}
