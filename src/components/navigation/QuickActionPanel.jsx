import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from 'components/AppIcon';

const ROLE_QUICK_ACTIONS = {
  admin: [
    { id: 'production-entry', label: 'Saisie Production', icon: 'Plus', path: '/production-management', color: 'var(--color-primary)' },
    { id: 'equipment-status', label: 'Statut Équipement', icon: 'Activity', path: '/equipment-management', color: '#3182CE' },
    { id: 'new-expense', label: 'Nouvelle Dépense', icon: 'Receipt', path: '/accounting', color: '#805AD5' },
    { id: 'maintenance', label: 'Maintenance', icon: 'ShieldAlert', path: '/maintenance-prevention', color: 'var(--color-accent)' },
  ],
  directeur: [
    { id: 'dashboard', label: 'Vue Exécutive', icon: 'TrendingUp', path: '/executive-dashboard', color: 'var(--color-accent)' },
    { id: 'production', label: 'Production', icon: 'BarChart3', path: '/production-management', color: '#3182CE' },
    { id: 'maintenance', label: 'Maintenance', icon: 'ShieldAlert', path: '/maintenance-prevention', color: '#E53E3E' },
  ],
  chef_de_site: [
    { id: 'equipment-status', label: 'Statut Équipement', icon: 'Wrench', path: '/equipment-management', color: '#3182CE' },
    { id: 'maintenance', label: 'Maintenance', icon: 'ShieldAlert', path: '/maintenance-prevention', color: '#E53E3E' },
    { id: 'spare-parts', label: 'Pièces de Rechange', icon: 'Package', path: '/spare-parts', color: '#805AD5' },
  ],
  comptable: [
    { id: 'new-expense', label: 'Nouvelle Dépense', icon: 'Receipt', path: '/accounting', color: '#805AD5' },
    { id: 'accounting', label: 'Comptabilité', icon: 'Calculator', path: '/accounting', color: 'var(--color-accent)' },
  ],
};

export default function QuickActionPanel({
  userRole = 'admin',
  isCollapsed = false,
  onClose,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const actions = ROLE_QUICK_ACTIONS?.[userRole] || ROLE_QUICK_ACTIONS?.admin;

  const handleAction = (path) => {
    navigate(path);
    setMobileOpen(false);
    if (onClose) onClose();
  };

  // Collapsed sidebar: show icon-only actions in tooltip
  if (isCollapsed) {
    return (
      <div
        className="border-t px-2 py-3 space-y-1"
        style={{ borderColor: 'var(--color-sidebar-border)' }}
      >
        {actions?.slice(0, 3)?.map((action) => (
          <button
            key={action?.id}
            onClick={() => handleAction(action?.path)}
            className="flex items-center justify-center w-full h-10 rounded-lg transition-all duration-[250ms] ease-out hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-95"
            title={action?.label}
            aria-label={action?.label}
          >
            <Icon name={action?.icon} size={16} color={action?.color} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Desktop sidebar panel */}
      <div
        className="hidden lg:block border-t"
        style={{ borderColor: 'var(--color-sidebar-border)' }}
      >
        <button
          onClick={() => setIsExpanded(prev => !prev)}
          className="flex items-center gap-2 w-full px-4 py-3 transition-all duration-[250ms] ease-out hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-expanded={isExpanded}
        >
          <div
            className="flex items-center justify-center w-6 h-6 rounded"
            style={{ background: 'rgba(214,158,46,0.2)' }}
          >
            <Icon name="Zap" size={13} color="var(--color-accent)" />
          </div>
          <span
            className="flex-1 text-left text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-sidebar-muted)', fontFamily: 'var(--font-caption)' }}
          >
            Actions Rapides
          </span>
          <Icon
            name={isExpanded ? 'ChevronUp' : 'ChevronDown'}
            size={14}
            color="var(--color-sidebar-muted)"
          />
        </button>

        {isExpanded && (
          <div className="px-3 pb-3 space-y-1.5">
            {actions?.map((action) => (
              <button
                key={action?.id}
                onClick={() => handleAction(action?.path)}
                className="quick-action-btn"
              >
                <div
                  className="flex items-center justify-center w-6 h-6 rounded flex-shrink-0"
                  style={{ background: `${action?.color}20` }}
                >
                  <Icon name={action?.icon} size={13} color={action?.color} />
                </div>
                <span style={{ fontFamily: 'var(--font-caption)', fontSize: '0.8125rem' }}>
                  {action?.label}
                </span>
                <Icon name="ArrowRight" size={12} color="var(--color-sidebar-muted)" className="ml-auto" />
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Mobile floating action button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-[150]">
        <button
          onClick={() => setMobileOpen(prev => !prev)}
          className="flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all duration-[250ms] ease-out active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          style={{ background: 'var(--color-primary)' }}
          aria-label="Actions rapides"
          aria-expanded={mobileOpen}
        >
          <Icon
            name={mobileOpen ? 'X' : 'Zap'}
            size={22}
            color="#FFFFFF"
            strokeWidth={2.5}
          />
        </button>

        {/* Mobile action overlay */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-[-1]"
              style={{ background: 'rgba(0,0,0,0.4)' }}
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute bottom-16 right-0 w-56 rounded-xl shadow-xl border overflow-hidden"
              style={{
                background: 'var(--color-card)',
                borderColor: 'var(--color-border)',
                boxShadow: 'var(--shadow-xl)',
              }}
            >
              <div
                className="px-4 py-2.5 border-b"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--color-muted-foreground)', fontFamily: 'var(--font-caption)' }}
                >
                  Actions Rapides
                </p>
              </div>
              <div className="py-1">
                {actions?.map((action) => (
                  <button
                    key={action?.id}
                    onClick={() => handleAction(action?.path)}
                    className="flex items-center gap-3 w-full px-4 py-3 transition-all duration-[250ms] ease-out hover:bg-muted focus-visible:outline-none focus-visible:bg-muted active:scale-[0.98]"
                  >
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
                      style={{ background: `${action?.color}15` }}
                    >
                      <Icon name={action?.icon} size={16} color={action?.color} />
                    </div>
                    <span
                      className="text-sm font-medium"
                      style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-caption)' }}
                    >
                      {action?.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}