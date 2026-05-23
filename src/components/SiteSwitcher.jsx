import React, { useState, useRef, useEffect } from 'react';
import { useSite, SITES } from '../context/SiteContext';
import Icon from './AppIcon';

export default function SiteSwitcher({ variant = 'header' }) {
  const { selectedSite, setSelectedSite, canViewAllSites, effectiveSiteId, currentSite, isGlobalView } = useSite();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!canViewAllSites) {
    // Utilisateurs restreints : affiche juste un badge de leur site
    if (!currentSite) return null;
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
        style={{ background: currentSite.bgColor, color: currentSite.color, border: `1.5px solid ${currentSite.color}30` }}
      >
        <span className="w-2 h-2 rounded-full" style={{ background: currentSite.color }} />
        {currentSite.name}
      </div>
    );
  }

  // Version inline pour le header (desktop)
  if (variant === 'header') {
    return (
      <div className="hidden md:flex items-center gap-1 rounded-xl p-1" style={{ background: 'var(--color-muted)' }}>
        {/* Vue globale */}
        <button
          onClick={() => setSelectedSite(null)}
          className={[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
            isGlobalView
              ? 'shadow-sm text-white'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
          ].join(' ')}
          style={isGlobalView ? { background: 'var(--color-primary)', color: '#fff' } : {}}
          title="Vue globale — toutes les carrières"
        >
          <Icon name="Globe2" size={13} />
          <span>Vue Globale</span>
        </button>

        {/* Chaque carrière */}
        {SITES.map(site => {
          const active = selectedSite === site.id;
          return (
            <button
              key={site.id}
              onClick={() => setSelectedSite(site.id)}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
                active
                  ? 'shadow-sm text-white'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
              ].join(' ')}
              style={active ? { background: site.color } : {}}
              title={`Filtrer par ${site.name}`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: active ? '#fff' : site.color }}
              />
              {site.name}
            </button>
          );
        })}
      </div>
    );
  }

  // Version dropdown pour mobile ou sidebar
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full"
        style={{
          background: 'var(--color-muted)',
          color: 'var(--color-foreground)',
          border: '1px solid var(--color-border)',
        }}
      >
        {isGlobalView ? (
          <>
            <Icon name="Globe2" size={15} style={{ color: 'var(--color-primary)' }} />
            <span className="flex-1 text-left">Vue Globale</span>
          </>
        ) : (
          <>
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: currentSite?.color }} />
            <span className="flex-1 text-left">{currentSite?.name}</span>
          </>
        )}
        <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={14} />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 w-full rounded-xl shadow-xl z-50 overflow-hidden"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <button
            className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium transition-colors ${isGlobalView ? 'bg-primary/10' : 'hover:bg-muted'}`}
            onClick={() => { setSelectedSite(null); setOpen(false); }}
            style={isGlobalView ? { color: 'var(--color-primary)' } : { color: 'var(--color-foreground)' }}
          >
            <Icon name="Globe2" size={14} />
            Vue Globale
            {isGlobalView && <Icon name="Check" size={12} className="ml-auto" />}
          </button>
          {SITES.map(site => {
            const active = selectedSite === site.id;
            return (
              <button
                key={site.id}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                onClick={() => { setSelectedSite(site.id); setOpen(false); }}
                style={{ color: active ? site.color : 'var(--color-foreground)' }}
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: site.color }} />
                {site.name}
                {active && <Icon name="Check" size={12} className="ml-auto" style={{ color: site.color }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Badge compact pour les tableaux de données
export function SiteBadge({ siteId, className = '' }) {
  const site = SITES.find(s => s.id === siteId);
  if (!site) return <span className={`text-xs text-muted-foreground ${className}`}>—</span>;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}
      style={{ background: site.bgColor, color: site.color, border: `1px solid ${site.color}40` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: site.color }} />
      {site.code}
    </span>
  );
}
