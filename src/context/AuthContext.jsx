import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext(null);

// Permissions par rôle : quelles routes chaque rôle peut accéder
const ROLE_PERMISSIONS = {
  admin:        ['/', '/executive-dashboard', '/production-management', '/equipment-management', '/fuel-management', '/oil-management', '/accounting', '/administration', '/stock-management', '/data-explorer', '/maintenance-prevention', '/spare-parts'],
  directeur:    ['/', '/executive-dashboard', '/production-management', '/equipment-management', '/fuel-management', '/oil-management', '/accounting', '/stock-management', '/data-explorer', '/maintenance-prevention', '/spare-parts'],
  chef_de_site: ['/', '/equipment-management', '/oil-management', '/data-explorer', '/maintenance-prevention', '/spare-parts'],
  comptable:    ['/', '/accounting', '/data-explorer'],
  equipement:   ['/', '/equipment-management', '/oil-management', '/accounting', '/data-explorer', '/maintenance-prevention', '/spare-parts'],
  supervisor:   ['/', '/production-management', '/stock-management', '/data-explorer'],
  operator:     ['/', '/production-management', '/stock-management']
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Récupérer la session existante au démarrage
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (authUser) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) throw error;

      setUser({
        id: authUser.id,
        email: authUser.email,
        username: profile?.username || authUser.email.split('@')[0],
        full_name: profile?.full_name || authUser.email,
        role: profile?.role || 'operator',
        department: profile?.department || null,
        is_active: profile?.is_active ?? true
      });
    } catch (err) {
      console.error('Erreur chargement profil:', err);
      // En cas d'erreur, utiliser les métadonnées de l'utilisateur auth
      setUser({
        id: authUser.id,
        email: authUser.email,
        username: authUser.user_metadata?.username || authUser.email.split('@')[0],
        full_name: authUser.user_metadata?.full_name || authUser.email,
        role: authUser.user_metadata?.role || 'operator',
        department: null,
        is_active: true
      });
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Message d'erreur en français
        if (error.message.includes('Invalid login credentials')) {
          return { success: false, error: 'Email ou mot de passe incorrect' };
        }
        if (error.message.includes('Email not confirmed')) {
          return { success: false, error: 'Veuillez confirmer votre email avant de vous connecter' };
        }
        return { success: false, error: error.message };
      }
      // Le profil sera chargé via onAuthStateChange
      return { success: true };
    } catch (err) {
      if (err?.message?.toLowerCase().includes('fetch')) {
        return { success: false, error: 'Impossible de contacter le serveur. Vérifiez votre connexion internet.' };
      }
      return { success: false, error: 'Erreur de connexion. Veuillez réessayer.' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const hasAccess = (path) => {
    if (!user) return false;
    const allowedPaths = ROLE_PERMISSIONS[user.role] || [];
    // Vérifier si le chemin exact ou un préfixe est autorisé
    return allowedPaths.some(p => path === p || (p !== '/' && path.startsWith(p)));
  };

  const getDefaultRoute = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'admin':
      case 'directeur':
        return '/executive-dashboard';
      case 'chef_de_site':
        return '/equipment-management';
      case 'comptable':
      case 'equipement':
        return '/accounting';
      case 'supervisor':
      case 'operator':
        return '/production-management';
      default:
        return '/executive-dashboard';
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      hasAccess,
      getDefaultRoute,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return context;
}

export default AuthContext;
