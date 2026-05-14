import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from 'components/AppIcon';

const ROUTE_MAP = {
  '/executive-dashboard':    { label: 'Tableau de Bord',       parent: null, icon: 'LayoutDashboard' },
  '/production-management':  { label: 'Production',            parent: null, icon: 'BarChart3' },
  '/equipment-management':   { label: 'Équipement',            parent: null, icon: 'Wrench' },
  '/fuel-management':        { label: 'Carburant',             parent: null, icon: 'Fuel' },
  '/oil-management':         { label: 'Huile',                 parent: null, icon: 'Droplets' },
  '/accounting':             { label: 'Comptabilité',          parent: null, icon: 'Calculator' },
  '/maintenance-prevention': { label: 'Maintenance Préventive',parent: null, icon: 'ShieldAlert' },
  '/spare-parts':            { label: 'Pièces de Rechange',    parent: null, icon: 'Package' },
  '/administration':         { label: 'Administration',        parent: null, icon: 'Settings' },
  '/user-authentication':    { label: 'Authentification',      parent: null, icon: 'Lock' },
};

export default function NavigationBreadcrumb({ className = '' }) {
  const location = useLocation();
  const navigate = useNavigate();

  const currentRoute = ROUTE_MAP?.[location?.pathname];

  if (!currentRoute) return null;

  const buildCrumbs = () => {
    const crumbs = [];
    crumbs?.push({ label: 'Accueil', path: '/executive-dashboard', icon: 'Home' });

    if (currentRoute?.parent) {
      const parentRoute = ROUTE_MAP?.[currentRoute?.parent];
      if (parentRoute) {
        crumbs?.push({ label: parentRoute?.label, path: currentRoute?.parent, icon: parentRoute?.icon });
      }
    }

    if (location?.pathname !== '/executive-dashboard') {
      crumbs?.push({ label: currentRoute?.label, path: location?.pathname, icon: currentRoute?.icon, current: true });
    } else {
      crumbs[0].current = true;
    }

    return crumbs;
  };

  const crumbs = buildCrumbs();

  return (
    <nav
      aria-label="Fil d'Ariane"
      className={`flex items-center ${className}`}
    >
      {/* Mobile: show only current page */}
      <div className="flex items-center gap-1.5 sm:hidden">
        <Icon name={currentRoute?.icon} size={14} color="var(--color-muted-foreground)" />
        <span
          className="text-sm font-medium"
          style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-caption)' }}
        >
          {currentRoute?.label}
        </span>
      </div>
      {/* Desktop: full breadcrumb */}
      <ol className="hidden sm:flex items-center gap-1" role="list">
        {crumbs?.map((crumb, index) => (
          <li key={crumb?.path} className="flex items-center gap-1">
            {index > 0 && (
              <Icon
                name="ChevronRight"
                size={14}
                color="var(--color-muted-foreground)"
                className="flex-shrink-0"
              />
            )}
            {crumb?.current ? (
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded"
                style={{ background: 'var(--color-muted)' }}
                aria-current="page"
              >
                <Icon name={crumb?.icon} size={13} color="var(--color-primary)" />
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-caption)' }}
                >
                  {crumb?.label}
                </span>
              </div>
            ) : (
              <button
                onClick={() => navigate(crumb?.path)}
                className="flex items-center gap-1.5 px-2 py-1 rounded transition-all duration-[250ms] ease-out hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon name={crumb?.icon} size={13} color="var(--color-muted-foreground)" />
                <span
                  className="text-sm hover:underline"
                  style={{ color: 'var(--color-muted-foreground)', fontFamily: 'var(--font-caption)' }}
                >
                  {crumb?.label}
                </span>
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}