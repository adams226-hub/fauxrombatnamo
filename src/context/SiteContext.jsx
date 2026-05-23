import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

// IDs correspondant aux enregistrements réels dans la table sites de Supabase
export const SITES = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Didri',
    code: 'C1',
    color: '#2C5530',
    bgColor: 'rgba(44,85,48,0.12)',
    textColor: '#fff',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Koro',
    code: 'C2',
    color: '#3182CE',
    bgColor: 'rgba(49,130,206,0.12)',
    textColor: '#fff',
  },
];

// Rôles pouvant voir tous les sites (vue globale + switch de site)
const GLOBAL_ROLES = ['admin', 'directeur', 'comptable'];

const SiteContext = createContext(null);

export function SiteProvider({ children }) {
  const { user } = useAuth();
  const [selectedSite, setSelectedSiteState] = useState(null); // null = vue globale

  const canViewAllSites = GLOBAL_ROLES.includes(user?.role);
  const userSiteId = user?.site_id || null;

  // Réinitialiser quand l'utilisateur change
  useEffect(() => {
    if (!canViewAllSites && userSiteId) {
      setSelectedSiteState(userSiteId);
    } else if (canViewAllSites) {
      setSelectedSiteState(null); // Vue globale par défaut pour les rôles globaux
    }
  }, [user?.id, canViewAllSites, userSiteId]);

  const setSelectedSite = (siteId) => {
    if (canViewAllSites) {
      setSelectedSiteState(siteId);
    }
  };

  // site_id effectif à utiliser dans les requêtes
  // - Rôles globaux : le site choisi (null = tous)
  // - Rôles restreints : toujours leur site_id
  const effectiveSiteId = canViewAllSites ? selectedSite : userSiteId;

  const currentSite = SITES.find(s => s.id === effectiveSiteId) || null;
  const isGlobalView = effectiveSiteId === null;

  // Badge couleur pour un site_id donné (utilisé dans les tableaux)
  const getSiteBadge = (siteId) => {
    const site = SITES.find(s => s.id === siteId);
    return site || null;
  };

  // Libellé du site courant pour l'affichage
  const siteLabel = isGlobalView ? 'Vue Globale' : (currentSite?.name || 'Tous les sites');

  return (
    <SiteContext.Provider value={{
      sites: SITES,
      selectedSite,
      setSelectedSite,
      effectiveSiteId,
      currentSite,
      canViewAllSites,
      userSiteId,
      isGlobalView,
      getSiteBadge,
      siteLabel,
    }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite doit être utilisé dans un SiteProvider');
  return ctx;
}

export default SiteContext;
