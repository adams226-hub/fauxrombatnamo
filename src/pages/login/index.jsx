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
        // La redirection est gérée par RoleBasedRedirect dans Routes.jsx
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
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)" }}>
      <div className="w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="mx-auto mb-4"
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: 'white',
              fontSize: '32px',
              fontFamily: 'var(--font-heading)',
              backdropFilter: 'blur(10px)',
              border: '3px solid rgba(255, 255, 255, 0.3)'
            }}
          >
            RB
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">RomBat Platform</h1>
          <p className="text-white/80">Exploration & Mines</p>
        </div>

        {/* Formulaire de connexion */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--color-foreground)" }}>
            Connexion
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--color-foreground)" }}>
                Adresse email
              </label>
              <div className="relative">
                <Icon
                  name="Mail"
                  size={20}
                  color="var(--color-muted-foreground)"
                  className="absolute left-3 top-3"
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full p-3 pl-10 border rounded-lg"
                  style={{
                    borderColor: "var(--color-border)",
                    background: "var(--color-background)",
                    color: "var(--color-foreground)"
                  }}
                  placeholder="exemple@rombat.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--color-foreground)" }}>
                Mot de passe
              </label>
              <div className="relative">
                <Icon
                  name="Lock"
                  size={20}
                  color="var(--color-muted-foreground)"
                  className="absolute left-3 top-3"
                />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full p-3 pl-10 border rounded-lg"
                  style={{
                    borderColor: "var(--color-border)",
                    background: "var(--color-background)",
                    color: "var(--color-foreground)"
                  }}
                  placeholder="Entrez votre mot de passe"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="default"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>

        </div>

        <div className="text-center mt-6">
          <p className="text-white/80 text-sm">© 2026 RomBat Exploration & Mines</p>
        </div>
      </div>
    </div>
  );
}
