import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Tableau de Bord',
    icon: 'LayoutDashboard',
    path: '/executive-dashboard',
    roles: ['admin', 'directeur'],
    badge: null,
  },
  {
    id: 'production',
    label: 'Production',
    icon: 'BarChart3',
    path: '/production-management',
    roles: ['admin', 'directeur', 'supervisor'],
    badge: null,
  },
  {
    id: 'equipment',
    label: 'Équipement',
    icon: 'Wrench',
    path: '/equipment-management',
    roles: ['admin', 'directeur', 'chef_de_site', 'equipement'],
    badge: null,
  },
  {
    id: 'fuel',
    label: 'Carburant',
    icon: 'Fuel',
    path: '/fuel-management',
    roles: ['admin', 'directeur'],
    badge: null,
  },
  {
    id: 'accounting',
    label: 'Comptabilité',
    icon: 'DollarSign',
    path: '/accounting',
    roles: ['admin', 'directeur', 'comptable', 'equipement'],
    badge: null,
  },
  {
    id: 'maintenance-prevention',
    label: 'Maintenance Préventive',
    icon: 'ShieldAlert',
    path: '/maintenance-prevention',
    roles: ['admin', 'directeur', 'chef_de_site', 'equipement'],
    badge: null,
  },
  {
    id: 'spare-parts',
    label: 'Pièces de Rechange',
    icon: 'Package',
    path: '/spare-parts',
    roles: ['admin', 'directeur', 'chef_de_site', 'equipement'],
    badge: null,
  },
  {
    id: 'oil-management',
    label: 'Gestion Huile',
    icon: 'Droplets',
    path: '/oil-management',
    roles: ['admin', 'directeur', 'chef_de_site', 'equipement'],
    badge: null,
  },
  {
    id: 'administration',
    label: 'Administration',
    icon: 'Settings',
    path: '/administration',
    roles: ['admin'],
    badge: null,
  },
];

const QUICK_ACTIONS = [
  {
    id: 'new-production',
    label: 'Saisie Production',
    icon: 'Plus',
    path: '/production-management',
    roles: ['admin'],
  },
  {
    id: 'equipment-status',
    label: 'Statut Équipement',
    icon: 'Activity',
    path: '/equipment-management',
    roles: ['admin', 'chef_de_site'],
  },
  {
    id: 'new-expense',
    label: 'Nouvelle Dépense',
    icon: 'Receipt',
    path: '/accounting',
    roles: ['admin', 'comptable', 'equipement'],
  },
];

export default function Sidebar({ isCollapsed = false, isOpen = false, onToggleCollapse, onClose, userRole = 'admin' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [quickActionsExpanded, setQuickActionsExpanded] = useState(false);

  const filteredNavItems = NAV_ITEMS?.filter(item => item?.roles?.includes(userRole));
  const filteredQuickActions = QUICK_ACTIONS?.filter(action => action?.roles?.includes(userRole));

  const isActive = (path) => location?.pathname === path;

  const handleNavClick = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  const handleQuickAction = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  const getBadgeClass = (type) => {
    if (type === 'critical') return 'nav-badge nav-badge-critical';
    if (type === 'warning') return 'nav-badge nav-badge-warning';
    return 'nav-badge nav-badge-info';
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground z-[99] lg:hidden"
          style={{ opacity: 0.5 }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={[
          'fixed top-0 left-0 h-full z-nav flex flex-col transition-all duration-[250ms] ease-out',
          'bg-sidebar overflow-hidden',
          isCollapsed ? 'w-16' : 'w-[240px]',
          // Mobile: slide in/out
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
          isCollapsed ? '' : '',
        ]?.join(' ')}
        aria-label="Navigation principale"
        role="navigation"
      >
        {/* Logo / Brand */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div 
              style={{ 
                width: '52px', 
                height: '52px', 
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 50%, #FFC947 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                color: 'white',
                fontSize: '20px',
                fontFamily: 'var(--font-heading)',
                boxShadow: '0 6px 16px rgba(255, 107, 53, 0.4)',
                border: '3px solid rgba(255, 255, 255, 0.15)',
                position: 'relative',
                overflow: 'hidden',
                transform: 'scale(1.1)'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '3px',
                left: '3px',
                right: '3px',
                bottom: '3px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.08) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{
                  fontSize: '22px',
                  fontWeight: '900',
                  textShadow: '0 3px 6px rgba(0, 0, 0, 0.3)',
                  letterSpacing: '2px',
                  lineHeight: '1'
                }}>
                  RB
                </span>
              </div>
            </div>
          </div>
          {!isCollapsed && (
            <div className="sidebar-brand-text flex flex-col min-w-0">
              <span
                className="text-white font-heading font-700 text-sm leading-tight truncate"
                style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}
              >
                Amp Mines et Carrieres
              </span>
              <span
                className="text-white/70 text-xs leading-tight truncate"
                style={{ fontFamily: 'var(--font-caption)' }}
              >
                Exploration & Mines
              </span>
            </div>
          )}

          {/* Collapse toggle - desktop only */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded ml-auto flex-shrink-0 transition-all duration-[250ms] ease-out hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={isCollapsed ? 'Développer la barre latérale' : 'Réduire la barre latérale'}
          >
            <Icon
              name={isCollapsed ? 'ChevronRight' : 'ChevronLeft'}
              size={16}
              color="var(--color-sidebar-muted)"
            />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1">
          {filteredNavItems?.map((item) => (
            <button
              key={item?.id}
              onClick={() => handleNavClick(item?.path)}
              className={`nav-item w-full ${isActive(item?.path) ? 'active' : ''}`}
              aria-current={isActive(item?.path) ? 'page' : undefined}
              title={isCollapsed ? item?.label : undefined}
            >
              <Icon
                name={item?.icon}
                size={18}
                color={isActive(item?.path) ? '#FFFFFF' : 'var(--color-sidebar-foreground)'}
                strokeWidth={isActive(item?.path) ? 2.5 : 2}
                className="flex-shrink-0"
              />
              {!isCollapsed && (
                <span className="nav-label flex-1 text-left" style={{ fontFamily: 'var(--font-caption)' }}>
                  {item?.label}
                </span>
              )}
              {item?.badge && item?.badge?.count > 0 && (
                <span className={`${getBadgeClass(item?.badge?.type)} nav-badge`}>
                  {item?.badge?.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Quick Actions Panel */}
        {!isCollapsed && filteredQuickActions?.length > 0 && (
          <div
            className="border-t px-3 py-3"
            style={{ borderColor: 'var(--color-sidebar-border)' }}
          >
            <button
              onClick={() => setQuickActionsExpanded(prev => !prev)}
              className="flex items-center gap-2 w-full px-2 py-2 rounded text-xs font-medium transition-all duration-[250ms] ease-out hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              style={{ color: 'var(--color-sidebar-muted)', fontFamily: 'var(--font-caption)' }}
              aria-expanded={quickActionsExpanded}
            >
              <Icon name="Zap" size={14} color="var(--color-accent)" />
              <span className="flex-1 text-left uppercase tracking-wider" style={{ fontSize: '0.7rem' }}>
                Actions Rapides
              </span>
              <Icon
                name={quickActionsExpanded ? 'ChevronUp' : 'ChevronDown'}
                size={14}
                color="var(--color-sidebar-muted)"
              />
            </button>

            {quickActionsExpanded && (
              <div className="mt-2 space-y-1">
                {filteredQuickActions?.map((action) => (
                  <button
                    key={action?.id}
                    onClick={() => handleQuickAction(action?.path)}
                    className="quick-action-btn"
                  >
                    <Icon name={action?.icon} size={14} color="var(--color-accent)" />
                    <span style={{ fontFamily: 'var(--font-caption)' }}>{action?.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collapsed quick actions hint */}
        {isCollapsed && (
          <div
            className="border-t px-3 py-3 flex justify-center"
            style={{ borderColor: 'var(--color-sidebar-border)' }}
          >
            <button
              className="flex items-center justify-center w-9 h-9 rounded transition-all duration-[250ms] ease-out hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              title="Actions Rapides"
              onClick={() => onToggleCollapse && onToggleCollapse()}
            >
              <Icon name="Zap" size={16} color="var(--color-accent)" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}