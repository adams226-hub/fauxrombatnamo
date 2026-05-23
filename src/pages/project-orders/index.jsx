import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../components/navigation/AppLayout';
import Icon from '../../components/AppIcon';
import { miningService } from '../../config/supabase';
import { useSite } from '../../context/SiteContext';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

// ─── Constantes ───────────────────────────────────────────────
const DIMENSIONS = [
  'Granulat 0/4', 'Granulat 0/5', 'Granulat 0/6', 'Granulat 5/15',
  'Granulat 8/15', 'Granulat 15/25', 'Granulat 4/6', 'Granulat 10/14',
  'Granulat 6/10', 'Granulat 0/31,5', 'Forage', 'Autre',
];

const STATUS_CONFIG = {
  pending:   { label: 'En attente',  color: '#D97706', bg: 'rgba(217,119,6,0.12)',   icon: 'Clock' },
  approved:  { label: 'Validée',     color: '#16A34A', bg: 'rgba(22,163,74,0.12)',   icon: 'CheckCircle' },
  rejected:  { label: 'Refusée',     color: '#DC2626', bg: 'rgba(220,38,38,0.12)',   icon: 'XCircle' },
  delivered: { label: 'Livrée',      color: '#2563EB', bg: 'rgba(37,99,235,0.12)',   icon: 'PackageCheck' },
};

const TABS = [
  { id: 'orders',   label: 'Fiches de Commande', icon: 'ClipboardList' },
  { id: 'new',      label: 'Nouvelle Commande',  icon: 'Plus' },
  { id: 'projects', label: 'Projets',             icon: 'FolderOpen' },
  { id: 'reports',  label: 'Rapports / Export',   icon: 'BarChart2' },
];

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <Icon name={cfg.icon} size={11} />
      {cfg.label}
    </span>
  );
}

// ─── Composant principal ───────────────────────────────────────
export default function ProjectOrders() {
  const { effectiveSiteId } = useSite();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  // État nouvelle commande
  const [orderForm, setOrderForm] = useState({
    project_id: '',
    delivery_site: '',
    notes: '',
  });
  const [orderItems, setOrderItems] = useState([
    { designation: '', dimension: '', quantity_trips: '', quantity_tons: '', observation: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // État nouveau projet
  const [projectForm, setProjectForm] = useState({ name: '', code: '', client: '', chef_projet: '', description: '' });
  const [addingProject, setAddingProject] = useState(false);

  // État refus
  const [rejectModal, setRejectModal] = useState({ open: false, orderId: null, reason: '' });

  // État rapport
  const [reportFilters, setReportFilters] = useState({
    projectId: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);

  const isAdmin = ['admin', 'directeur'].includes(user?.role);

  // ─── Chargement ───────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const filters = { siteId: effectiveSiteId };
    if (statusFilter !== 'all') filters.status = statusFilter;
    if (projectFilter !== 'all') filters.projectId = projectFilter;

    const [ordersRes, projectsRes] = await Promise.all([
      miningService.getProjectOrders(filters),
      miningService.getProjects(effectiveSiteId),
    ]);
    setOrders(ordersRes.data || []);
    setProjects(projectsRes.data || []);
    setLoading(false);
  }, [effectiveSiteId, statusFilter, projectFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Actions ──────────────────────────────────────────────────
  const handleApprove = async (id) => {
    const { error } = await miningService.approveProjectOrder(id, true);
    if (error) { toast.error('Erreur lors de la validation'); return; }
    toast.success('Commande validée');
    loadData();
  };

  const handleReject = async () => {
    const { error } = await miningService.rejectProjectOrder(rejectModal.orderId, rejectModal.reason);
    if (error) { toast.error('Erreur lors du refus'); return; }
    toast.success('Commande refusée');
    setRejectModal({ open: false, orderId: null, reason: '' });
    loadData();
  };

  const handleMarkDelivered = async (id) => {
    const { error } = await miningService.markOrderDelivered(id);
    if (error) { toast.error('Erreur'); return; }
    toast.success('Commande marquée comme livrée');
    loadData();
  };

  // ─── Soumission commande ───────────────────────────────────────
  const addItem = () => setOrderItems(prev => [
    ...prev,
    { designation: '', dimension: '', quantity_trips: '', quantity_tons: '', observation: '' },
  ]);

  const removeItem = (i) => setOrderItems(prev => prev.filter((_, idx) => idx !== i));

  const updateItem = (i, field, value) => {
    setOrderItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!orderForm.project_id) { toast.error('Choisissez un projet'); return; }
    const validItems = orderItems.filter(it => it.designation || it.dimension);
    if (!validItems.length) { toast.error('Ajoutez au moins une ligne'); return; }

    setSubmitting(true);
    const { error } = await miningService.createProjectOrder(
      { ...orderForm, site_id: effectiveSiteId },
      validItems.map(it => ({
        ...it,
        quantity_trips: parseInt(it.quantity_trips) || 0,
        quantity_tons: parseFloat(it.quantity_tons) || 0,
      }))
    );
    setSubmitting(false);

    if (error) { toast.error('Erreur: ' + error.message); return; }
    toast.success('Fiche de commande créée — en attente de validation PDG');
    setOrderForm({ project_id: '', delivery_site: '', notes: '' });
    setOrderItems([{ designation: '', dimension: '', quantity_trips: '', quantity_tons: '', observation: '' }]);
    setActiveTab('orders');
    loadData();
  };

  // ─── Nouveau projet ────────────────────────────────────────────
  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!projectForm.name) { toast.error('Nom du projet requis'); return; }
    setAddingProject(true);
    const { error } = await miningService.createProject({ ...projectForm, site_id: effectiveSiteId, status: 'active' });
    setAddingProject(false);
    if (error) { toast.error('Erreur: ' + error.message); return; }
    toast.success('Projet créé');
    setProjectForm({ name: '', code: '', client: '', chef_projet: '', description: '' });
    loadData();
  };

  // ─── Rapport ──────────────────────────────────────────────────
  const loadReport = async () => {
    setReportLoading(true);
    const f = {
      siteId: effectiveSiteId,
      projectId: reportFilters.projectId !== 'all' ? reportFilters.projectId : undefined,
      dateFrom: reportFilters.dateFrom || undefined,
      dateTo: reportFilters.dateTo || undefined,
    };
    const { data, error } = await miningService.getOrdersReport(f);
    setReportLoading(false);
    if (error) { toast.error('Erreur rapport'); return; }
    setReportData(data || []);
  };

  const exportReport = () => {
    if (!reportData.length) { toast.error('Aucune donnée à exporter'); return; }

    // ── Helpers style OOXML ────────────────────────────────────
    const s = (bold, sz, rgb, bgRgb, halign = 'left') => ({
      font:      { bold, sz: sz || 10, color: { rgb: rgb || '1A1A1A' }, name: 'Calibri' },
      fill:      bgRgb ? { patternType: 'solid', fgColor: { rgb: bgRgb } } : { patternType: 'none' },
      alignment: { horizontal: halign, vertical: 'center', wrapText: false },
      border: {
        top:    { style: 'thin', color: { rgb: 'D0D0D0' } },
        bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
        left:   { style: 'thin', color: { rgb: 'D0D0D0' } },
        right:  { style: 'thin', color: { rgb: 'D0D0D0' } },
      },
    });

    const STATUS_STYLE = {
      pending:   s(true, 9, 'D97706', 'FEF3C7', 'center'),
      approved:  s(true, 9, '16A34A', 'DCFCE7', 'center'),
      rejected:  s(true, 9, 'DC2626', 'FEE2E2', 'center'),
      delivered: s(true, 9, '1D4ED8', 'DBEAFE', 'center'),
    };

    const wb  = XLSX.utils.book_new();
    const ws  = {};
    let r = 0; // ligne courante (0-indexed)

    const cell = (addr, v, style) => {
      ws[addr] = { v, t: typeof v === 'number' ? 'n' : 's', s: style };
    };

    const merge = (s1, e1, s2, e2) => {
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: s1, c: s2 }, e: { r: e1, c: e2 } });
    };

    const COL = 9; // colonnes A→I

    // ── Ligne 0 : Titre principal ──────────────────────────────
    const titleStyle = s(true, 16, 'FFFFFF', '1A3A1E', 'left');
    cell('A1', 'AMP — RAPPORT DE SORTIES PROJETS', titleStyle);
    for (let c = 1; c < COL; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      ws[addr] = { v: '', t: 's', s: titleStyle };
    }
    merge(0, 0, 0, COL - 1);

    // ── Ligne 1 : Sous-titre ───────────────────────────────────
    const subStyle = s(false, 10, 'FFFFFF', 'E55B2D', 'left');
    cell('A2', 'Amp Mines et Carrières SARL  —  AMP Mining Platform', subStyle);
    for (let c = 1; c < COL; c++) {
      const addr = XLSX.utils.encode_cell({ r: 1, c });
      ws[addr] = { v: '', t: 's', s: subStyle };
    }
    merge(1, 1, 0, COL - 1);
    r = 2;

    // ── Lignes 2-4 : Infos rapport ─────────────────────────────
    const infoLabel = s(true,  10, '6B7280', 'F5F5F5', 'right');
    const infoValue = s(false, 10, '1A1A1A', 'FFFFFF', 'left');
    const infoRows = [
      ['Projet',    reportFilters.projectId !== 'all' ? (projects.find(p => p.id === reportFilters.projectId)?.name || 'Tous') : 'Tous les projets'],
      ['Période',   `${reportFilters.dateFrom || '—'}  →  ${reportFilters.dateTo || '—'}`],
      ['Généré le', new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
    ];
    infoRows.forEach(([lbl, val]) => {
      cell(XLSX.utils.encode_cell({ r, c: 0 }), lbl, infoLabel);
      cell(XLSX.utils.encode_cell({ r, c: 1 }), lbl, infoLabel); // span B
      merge(r, r, 0, 1);
      cell(XLSX.utils.encode_cell({ r, c: 2 }), val, infoValue);
      for (let c = 3; c < COL; c++) {
        ws[XLSX.utils.encode_cell({ r, c })] = { v: '', t: 's', s: infoValue };
      }
      merge(r, r, 2, COL - 1);
      r++;
    });

    // ── Ligne 5 : En-têtes tableau ─────────────────────────────
    const HEADERS = ['N° Commande', 'Date Validation', 'Projet', 'Site Livraison', 'Désignation', 'Dimension', 'Voyages', 'Tonnes', 'Statut'];
    const headStyle = (ci) => ({
      font:      { bold: true, sz: 10, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
      fill:      { patternType: 'solid', fgColor: { rgb: '2C5530' } },
      alignment: { horizontal: ci >= 6 ? 'center' : 'left', vertical: 'center' },
      border: {
        top:    { style: 'medium', color: { rgb: '1A3A1E' } },
        bottom: { style: 'medium', color: { rgb: 'E55B2D' } },
        left:   { style: 'thin',   color: { rgb: '1A3A1E' } },
        right:  { style: 'thin',   color: { rgb: '1A3A1E' } },
      },
    });
    HEADERS.forEach((h, ci) => {
      ws[XLSX.utils.encode_cell({ r, c: ci })] = { v: h, t: 's', s: headStyle(ci) };
    });
    r++;

    // ── Lignes de données ──────────────────────────────────────
    let odd = true;
    reportData.forEach(order => {
      const items = order.items?.length ? order.items : [{ designation: '—', dimension: '—', quantity_trips: 0, quantity_tons: 0 }];
      const bg    = odd ? 'FFFFFF' : 'F7F7F7';
      odd = !odd;

      items.forEach((item, ii) => {
        const rowVals = [
          ii === 0 ? (order.order_number || '—') : '',
          ii === 0 && order.approved_at ? new Date(order.approved_at).toLocaleDateString('fr-FR') : '',
          ii === 0 ? (order.project?.name || '—') : '',
          ii === 0 ? (order.delivery_site || '—') : '',
          item.designation || '—',
          item.dimension   || '—',
          parseInt(item.quantity_trips) || 0,
          parseFloat(item.quantity_tons) || 0,
          ii === 0 ? (STATUS_CONFIG[order.status]?.label || '') : '',
        ];

        rowVals.forEach((v, ci) => {
          let style;
          if (ci === 0 && v)     style = s(true,  10, '2C5530', bg, 'left');
          else if (ci === 6)     style = s(true,  10, '2563EB', bg, 'center');
          else if (ci === 7)     style = s(true,  10, '7C3AED', bg, 'center');
          else if (ci === 8 && v) style = STATUS_STYLE[order.status] || STATUS_STYLE.approved;
          else                   style = s(false, 10, '1A1A1A', bg, ci >= 6 ? 'center' : 'left');

          const t = typeof v === 'number' ? 'n' : 's';
          const cellObj = { v, t, s: style };
          if (ci === 7 && typeof v === 'number') cellObj.z = '#,##0.00';
          ws[XLSX.utils.encode_cell({ r, c: ci })] = cellObj;
        });
        r++;
      });
    });

    // ── Ligne totaux ───────────────────────────────────────────
    r++; // ligne vide
    const allItems  = reportData.flatMap(o => o.items || []);
    const totTrips  = allItems.reduce((s, it) => s + (parseInt(it.quantity_trips) || 0), 0);
    const totTons   = allItems.reduce((s, it) => s + (parseFloat(it.quantity_tons) || 0), 0);
    const totLabel  = `TOTAUX  —  ${reportData.length} commande${reportData.length > 1 ? 's' : ''} validée${reportData.length > 1 ? 's' : ''}`;

    const totLbStyle = { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' }, name: 'Calibri' }, fill: { patternType: 'solid', fgColor: { rgb: '1A3A1E' } }, alignment: { horizontal: 'right', vertical: 'center' }, border: { top: { style: 'medium', color: { rgb: '2C5530' } }, bottom: { style: 'medium', color: { rgb: '2C5530' } }, left: { style: 'medium', color: { rgb: '2C5530' } }, right: { style: 'thin', color: { rgb: '2C5530' } } } };
    const totNumStyle = (rgb) => ({ font: { bold: true, sz: 13, color: { rgb }, name: 'Calibri' }, fill: { patternType: 'solid', fgColor: { rgb: 'E8F5E9' } }, alignment: { horizontal: 'center', vertical: 'center' }, border: { top: { style: 'medium', color: { rgb: '2C5530' } }, bottom: { style: 'medium', color: { rgb: '2C5530' } }, left: { style: 'thin', color: { rgb: '2C5530' } }, right: { style: 'medium', color: { rgb: '2C5530' } } } });

    for (let c = 0; c < 6; c++) ws[XLSX.utils.encode_cell({ r, c })] = { v: c === 0 ? totLabel : '', t: 's', s: totLbStyle };
    merge(r, r, 0, 5);
    ws[XLSX.utils.encode_cell({ r, c: 6 })] = { v: totTrips, t: 'n', s: totNumStyle('2563EB') };
    ws[XLSX.utils.encode_cell({ r, c: 7 })] = { v: parseFloat(totTons.toFixed(2)), t: 'n', z: '#,##0.00', s: totNumStyle('7C3AED') };
    ws[XLSX.utils.encode_cell({ r, c: 8 })] = { v: '', t: 's', s: totNumStyle('1A3A1E') };

    // ── Finalisation feuille ───────────────────────────────────
    ws['!ref']  = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r, c: COL - 1 } });
    ws['!cols'] = [16, 16, 24, 22, 22, 18, 10, 10, 14].map(w => ({ wch: w }));
    ws['!rows'] = [{ hpt: 30 }, { hpt: 18 }, { hpt: 16 }, { hpt: 16 }, { hpt: 16 }, { hpt: 20 }];
    ws['!freeze'] = { xSplit: 0, ySplit: 6 };

    XLSX.utils.book_append_sheet(wb, ws, 'Sorties Projets');
    XLSX.writeFile(wb, `AMP_Sorties_Projets_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // ─── Compteurs ────────────────────────────────────────────────
  const pendingCount = orders.filter(o => o.status === 'pending').length;

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-heading)' }}>
              Commandes Projets
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
              Fiches de commande — validation PDG — rapports de sorties
            </p>
          </div>
          {pendingCount > 0 && isAdmin && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(217,119,6,0.12)', color: '#D97706', border: '1.5px solid rgba(217,119,6,0.3)' }}>
              <Icon name="Clock" size={15} />
              {pendingCount} commande{pendingCount > 1 ? 's' : ''} en attente
            </div>
          )}
        </div>

        {/* Tabs — tous visibles pour tous les rôles */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--color-muted)' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold flex-1 justify-center transition-all duration-150',
                activeTab === tab.id
                  ? 'shadow-sm text-white'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
              style={activeTab === tab.id ? { background: 'var(--color-primary)' } : {}}
            >
              <Icon name={tab.icon} size={13} />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.id === 'orders' && pendingCount > 0 && (
                <span className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: '#D97706', color: '#fff' }}>{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB: FICHES DE COMMANDE ── */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Filtres */}
            <div className="flex flex-wrap gap-3">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm border"
                style={{ background: 'var(--color-card)', color: 'var(--color-foreground)', borderColor: 'var(--color-border)' }}
              >
                <option value="all">Tous les statuts</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm border"
                style={{ background: 'var(--color-card)', color: 'var(--color-foreground)', borderColor: 'var(--color-border)' }}
              >
                <option value="all">Tous les projets</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button
                onClick={() => setActiveTab('new')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white ml-auto"
                style={{ background: 'var(--color-primary)' }}
              >
                <Icon name="Plus" size={14} />
                Nouvelle Commande
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-primary)' }} />
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 rounded-2xl"
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <Icon name="ClipboardList" size={40} style={{ color: 'var(--color-muted-foreground)', opacity: 0.4 }} />
                <p className="mt-3 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Aucune commande</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    isAdmin={isAdmin}
                    onApprove={handleApprove}
                    onReject={(id) => setRejectModal({ open: true, orderId: id, reason: '' })}
                    onDeliver={handleMarkDelivered}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: NOUVELLE COMMANDE ── */}
        {activeTab === 'new' && (
          <form onSubmit={handleSubmitOrder} className="space-y-5">
            <div className="p-5 rounded-2xl space-y-4"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <h2 className="font-semibold text-sm" style={{ color: 'var(--color-foreground)' }}>
                Informations de la commande
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                    Projet / Chantier *
                  </label>
                  <select
                    value={orderForm.project_id}
                    onChange={e => setOrderForm(f => ({ ...f, project_id: e.target.value }))}
                    required
                    className="w-full px-3 py-2.5 rounded-lg border text-sm"
                    style={{ background: 'var(--color-background)', color: 'var(--color-foreground)', borderColor: 'var(--color-border)' }}
                  >
                    <option value="">— Choisir un projet —</option>
                    {projects.filter(p => p.status === 'active').map(p => (
                      <option key={p.id} value={p.id}>{p.name}{p.client ? ` (${p.client})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                    Site de livraison
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Centrale Béton, Chantier Route..."
                    value={orderForm.delivery_site}
                    onChange={e => setOrderForm(f => ({ ...f, delivery_site: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm"
                    style={{ background: 'var(--color-background)', color: 'var(--color-foreground)', borderColor: 'var(--color-border)' }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                  Observations générales
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes, instructions spéciales..."
                  value={orderForm.notes}
                  onChange={e => setOrderForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm resize-none"
                  style={{ background: 'var(--color-background)', color: 'var(--color-foreground)', borderColor: 'var(--color-border)' }}
                />
              </div>
            </div>

            {/* Lignes de commande */}
            <div className="p-5 rounded-2xl space-y-4"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm" style={{ color: 'var(--color-foreground)' }}>
                  Désignations commandées
                </h2>
                <button type="button" onClick={addItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: 'rgba(44,85,48,0.12)', color: '#2C5530' }}>
                  <Icon name="Plus" size={12} /> Ajouter une ligne
                </button>
              </div>

              <div className="space-y-3">
                {orderItems.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-3">
                      <input
                        type="text"
                        placeholder="Désignation"
                        value={item.designation}
                        onChange={e => updateItem(i, 'designation', e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg border text-xs"
                        style={{ background: 'var(--color-background)', color: 'var(--color-foreground)', borderColor: 'var(--color-border)' }}
                      />
                    </div>
                    <div className="col-span-3">
                      <select
                        value={item.dimension}
                        onChange={e => updateItem(i, 'dimension', e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg border text-xs"
                        style={{ background: 'var(--color-background)', color: 'var(--color-foreground)', borderColor: 'var(--color-border)' }}
                      >
                        <option value="">Dimension</option>
                        {DIMENSIONS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="Voyages"
                        min="0"
                        value={item.quantity_trips}
                        onChange={e => updateItem(i, 'quantity_trips', e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg border text-xs"
                        style={{ background: 'var(--color-background)', color: 'var(--color-foreground)', borderColor: 'var(--color-border)' }}
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="Tonnes"
                        min="0"
                        step="0.01"
                        value={item.quantity_tons}
                        onChange={e => updateItem(i, 'quantity_tons', e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg border text-xs"
                        style={{ background: 'var(--color-background)', color: 'var(--color-foreground)', borderColor: 'var(--color-border)' }}
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="text"
                        placeholder="Obs."
                        value={item.observation}
                        onChange={e => updateItem(i, 'observation', e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg border text-xs"
                        style={{ background: 'var(--color-background)', color: 'var(--color-foreground)', borderColor: 'var(--color-border)' }}
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-center pt-1">
                      {orderItems.length > 1 && (
                        <button type="button" onClick={() => removeItem(i)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-red-50">
                          <Icon name="Trash2" size={13} style={{ color: '#DC2626' }} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* En-têtes colonnes */}
              <div className="grid grid-cols-12 gap-2 text-[10px] font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
                <div className="col-span-3">Désignation</div>
                <div className="col-span-3">Dimension</div>
                <div className="col-span-2">Voyages</div>
                <div className="col-span-2">Tonnes</div>
                <div className="col-span-1">Obs.</div>
                <div className="col-span-1" />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity"
              style={{ background: 'var(--color-primary)', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Icon name="Send" size={15} />}
              {submitting ? 'Envoi en cours...' : 'Envoyer au PDG pour validation'}
            </button>
          </form>
        )}

        {/* ── TAB: PROJETS ── */}
        {activeTab === 'projects' && (
          <div className="space-y-5">
            {/* Formulaire nouveau projet */}
            <div className="p-5 rounded-2xl space-y-4"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <h2 className="font-semibold text-sm" style={{ color: 'var(--color-foreground)' }}>
                Ajouter un projet
              </h2>
              <form onSubmit={handleAddProject} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text" placeholder="Nom du projet *" required
                  value={projectForm.name}
                  onChange={e => setProjectForm(f => ({ ...f, name: e.target.value }))}
                  className="px-3 py-2.5 rounded-lg border text-sm"
                  style={{ background: 'var(--color-background)', color: 'var(--color-foreground)', borderColor: 'var(--color-border)' }}
                />
                <input
                  type="text" placeholder="Code projet (ex: PROJ-001)"
                  value={projectForm.code}
                  onChange={e => setProjectForm(f => ({ ...f, code: e.target.value }))}
                  className="px-3 py-2.5 rounded-lg border text-sm"
                  style={{ background: 'var(--color-background)', color: 'var(--color-foreground)', borderColor: 'var(--color-border)' }}
                />
                <input
                  type="text" placeholder="Client / Maître d'ouvrage"
                  value={projectForm.client}
                  onChange={e => setProjectForm(f => ({ ...f, client: e.target.value }))}
                  className="px-3 py-2.5 rounded-lg border text-sm"
                  style={{ background: 'var(--color-background)', color: 'var(--color-foreground)', borderColor: 'var(--color-border)' }}
                />
                <input
                  type="text" placeholder="Chef de projet"
                  value={projectForm.chef_projet}
                  onChange={e => setProjectForm(f => ({ ...f, chef_projet: e.target.value }))}
                  className="px-3 py-2.5 rounded-lg border text-sm"
                  style={{ background: 'var(--color-background)', color: 'var(--color-foreground)', borderColor: 'var(--color-border)' }}
                />
                <textarea
                  rows={2} placeholder="Description / localisation"
                  value={projectForm.description}
                  onChange={e => setProjectForm(f => ({ ...f, description: e.target.value }))}
                  className="px-3 py-2.5 rounded-lg border text-sm resize-none sm:col-span-2"
                  style={{ background: 'var(--color-background)', color: 'var(--color-foreground)', borderColor: 'var(--color-border)' }}
                />
                <button type="submit" disabled={addingProject}
                  className="sm:col-span-2 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                  style={{ background: 'var(--color-primary)' }}>
                  <Icon name="Plus" size={14} />
                  {addingProject ? 'Création...' : 'Créer le projet'}
                </button>
              </form>
            </div>

            {/* Liste projets */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--color-muted)' }}>
                    {['Nom', 'Code', 'Client', 'Chef de projet', 'Statut', 'Commandes'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projects.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Aucun projet</td></tr>
                  ) : projects.map((p, i) => (
                    <tr key={p.id} style={{ background: i % 2 === 0 ? 'var(--color-card)' : 'var(--color-background)', borderTop: '1px solid var(--color-border)' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-foreground)' }}>{p.name}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{p.code || '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{p.client || '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{p.chef_projet || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: p.status === 'active' ? 'rgba(22,163,74,0.12)' : 'rgba(107,114,128,0.12)', color: p.status === 'active' ? '#16A34A' : '#6B7280' }}>
                          {p.status === 'active' ? 'Actif' : p.status === 'completed' ? 'Terminé' : 'Suspendu'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                        {orders.filter(o => o.project_id === p.id).length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB: RAPPORTS ── */}
        {activeTab === 'reports' && (
          <div className="space-y-5">
            {/* Filtres rapport */}
            <div className="p-5 rounded-2xl space-y-4"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <h2 className="font-semibold text-sm" style={{ color: 'var(--color-foreground)' }}>
                Filtres du rapport
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>Projet</label>
                  <select
                    value={reportFilters.projectId}
                    onChange={e => setReportFilters(f => ({ ...f, projectId: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm"
                    style={{ background: 'var(--color-background)', color: 'var(--color-foreground)', borderColor: 'var(--color-border)' }}
                  >
                    <option value="all">Tous les projets</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>Date début</label>
                  <input
                    type="date"
                    value={reportFilters.dateFrom}
                    onChange={e => setReportFilters(f => ({ ...f, dateFrom: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm"
                    style={{ background: 'var(--color-background)', color: 'var(--color-foreground)', borderColor: 'var(--color-border)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>Date fin</label>
                  <input
                    type="date"
                    value={reportFilters.dateTo}
                    onChange={e => setReportFilters(f => ({ ...f, dateTo: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm"
                    style={{ background: 'var(--color-background)', color: 'var(--color-foreground)', borderColor: 'var(--color-border)' }}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={loadReport} disabled={reportLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'var(--color-primary)' }}>
                  <Icon name="Search" size={14} />
                  {reportLoading ? 'Chargement...' : 'Générer le rapport'}
                </button>
                {reportData.length > 0 && (
                  <button onClick={exportReport}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'rgba(22,163,74,0.12)', color: '#16A34A', border: '1.5px solid rgba(22,163,74,0.3)' }}>
                    <Icon name="Download" size={14} />
                    Télécharger Excel
                  </button>
                )}
              </div>
            </div>

            {/* Résultats rapport */}
            {reportData.length > 0 && (
              <>
                {/* KPIs rapport */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Commandes validées', value: reportData.length, icon: 'CheckCircle', color: '#16A34A' },
                    { label: 'Total voyages', value: reportData.flatMap(o => o.items || []).reduce((s, it) => s + (parseInt(it.quantity_trips) || 0), 0), icon: 'Truck', color: '#2563EB' },
                    { label: 'Total tonnes', value: reportData.flatMap(o => o.items || []).reduce((s, it) => s + (parseFloat(it.quantity_tons) || 0), 0).toFixed(1) + ' T', icon: 'Weight', color: '#7C3AED' },
                    { label: 'Projets concernés', value: new Set(reportData.map(o => o.project_id)).size, icon: 'FolderOpen', color: '#D97706' },
                  ].map(kpi => (
                    <div key={kpi.label} className="p-4 rounded-xl flex items-center gap-3"
                      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${kpi.color}18` }}>
                        <Icon name={kpi.icon} size={16} style={{ color: kpi.color }} />
                      </div>
                      <div>
                        <div className="text-lg font-bold" style={{ color: 'var(--color-foreground)' }}>{kpi.value}</div>
                        <div className="text-[11px]" style={{ color: 'var(--color-muted-foreground)' }}>{kpi.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tableau rapport */}
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: 'var(--color-muted)' }}>
                          {['N° Cmd', 'Date validation', 'Projet', 'Site livraison', 'Désignation', 'Dimension', 'Voyages', 'Tonnes', 'Statut'].map(h => (
                            <th key={h} className="px-3 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--color-muted-foreground)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.map((order, oi) =>
                          (order.items || [{ designation: '—', dimension: '—', quantity_trips: 0, quantity_tons: 0 }]).map((item, ii) => (
                            <tr key={`${oi}-${ii}`}
                              style={{ background: oi % 2 === 0 ? 'var(--color-card)' : 'var(--color-background)', borderTop: '1px solid var(--color-border)' }}>
                              <td className="px-3 py-2.5 text-xs font-mono" style={{ color: 'var(--color-muted-foreground)' }}>
                                {ii === 0 ? order.order_number || '—' : ''}
                              </td>
                              <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                                {ii === 0 && order.approved_at ? new Date(order.approved_at).toLocaleDateString('fr-FR') : ''}
                              </td>
                              <td className="px-3 py-2.5 text-xs font-medium" style={{ color: 'var(--color-foreground)' }}>
                                {ii === 0 ? order.project?.name || '—' : ''}
                              </td>
                              <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                                {ii === 0 ? order.delivery_site || '—' : ''}
                              </td>
                              <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-foreground)' }}>{item.designation || '—'}</td>
                              <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{item.dimension || '—'}</td>
                              <td className="px-3 py-2.5 text-xs font-semibold" style={{ color: '#2563EB' }}>{item.quantity_trips || 0}</td>
                              <td className="px-3 py-2.5 text-xs font-semibold" style={{ color: '#7C3AED' }}>{parseFloat(item.quantity_tons || 0).toFixed(1)} T</td>
                              <td className="px-3 py-2.5">{ii === 0 ? <StatusBadge status={order.status} /> : ''}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {reportData.length === 0 && !reportLoading && (
              <div className="flex flex-col items-center justify-center py-16 rounded-2xl"
                style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <Icon name="BarChart2" size={40} style={{ color: 'var(--color-muted-foreground)', opacity: 0.3 }} />
                <p className="mt-3 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  Choisissez un projet et une période, puis cliquez sur "Générer le rapport"
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL REFUS ── */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <h3 className="font-bold text-base" style={{ color: 'var(--color-foreground)' }}>
              Motif du refus
            </h3>
            <textarea
              rows={3}
              placeholder="Expliquez pourquoi la commande est refusée..."
              value={rejectModal.reason}
              onChange={e => setRejectModal(m => ({ ...m, reason: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg border text-sm resize-none"
              style={{ background: 'var(--color-background)', color: 'var(--color-foreground)', borderColor: 'var(--color-border)' }}
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal({ open: false, orderId: null, reason: '' })}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}>
                Annuler
              </button>
              <button onClick={handleReject}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: '#DC2626' }}>
                Refuser la commande
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

// ─── Carte commande ────────────────────────────────────────────
function OrderCard({ order, isAdmin, onApprove, onReject, onDeliver }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      {/* En-tête */}
      <div className="flex items-center gap-3 px-5 py-4">
        <button onClick={() => setExpanded(e => !e)} className="flex-1 flex items-center gap-3 text-left min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(44,85,48,0.1)' }}>
            <Icon name="ClipboardList" size={16} style={{ color: '#2C5530' }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm font-mono" style={{ color: 'var(--color-foreground)' }}>
                {order.order_number || '—'}
              </span>
              <StatusBadge status={order.status} />
            </div>
            <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: 'var(--color-muted-foreground)' }}>
              <span>{order.project?.name || '—'}</span>
              {order.delivery_site && <><span>·</span><span>{order.delivery_site}</span></>}
              <span>·</span>
              <span>{new Date(order.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
          <Icon name={expanded ? 'ChevronUp' : 'ChevronDown'} size={16} style={{ color: 'var(--color-muted-foreground)', flexShrink: 0 }} />
        </button>

        {/* Actions PDG */}
        {isAdmin && order.status === 'pending' && (
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => onApprove(order.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white"
              style={{ background: '#16A34A' }}>
              <Icon name="Check" size={12} /> Valider
            </button>
            <button onClick={() => onReject(order.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white"
              style={{ background: '#DC2626' }}>
              <Icon name="X" size={12} /> Refuser
            </button>
          </div>
        )}
        {isAdmin && order.status === 'approved' && (
          <button onClick={() => onDeliver(order.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold flex-shrink-0"
            style={{ background: 'rgba(37,99,235,0.12)', color: '#2563EB' }}>
            <Icon name="PackageCheck" size={12} /> Livré
          </button>
        )}
      </div>

      {/* Détail items */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--color-border)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--color-muted)' }}>
                {['Désignation', 'Dimension', 'Voyages', 'Tonnes', 'Observation'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td className="px-4 py-2.5" style={{ color: 'var(--color-foreground)' }}>{item.designation || '—'}</td>
                  <td className="px-4 py-2.5" style={{ color: 'var(--color-muted-foreground)' }}>{item.dimension || '—'}</td>
                  <td className="px-4 py-2.5 font-semibold" style={{ color: '#2563EB' }}>{item.quantity_trips || 0}</td>
                  <td className="px-4 py-2.5 font-semibold" style={{ color: '#7C3AED' }}>{parseFloat(item.quantity_tons || 0).toFixed(1)} T</td>
                  <td className="px-4 py-2.5" style={{ color: 'var(--color-muted-foreground)' }}>{item.observation || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {order.notes && (
            <div className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted-foreground)', borderTop: '1px solid var(--color-border)' }}>
              <span className="font-semibold">Note : </span>{order.notes}
            </div>
          )}
          {order.rejection_reason && (
            <div className="px-4 py-3 text-xs" style={{ background: 'rgba(220,38,38,0.06)', color: '#DC2626', borderTop: '1px solid var(--color-border)' }}>
              <span className="font-semibold">Motif refus : </span>{order.rejection_reason}
            </div>
          )}
          {order.approver && order.approved_at && (
            <div className="px-4 py-2 text-[11px]" style={{ color: 'var(--color-muted-foreground)', borderTop: '1px solid var(--color-border)' }}>
              {order.status === 'approved' ? 'Validé' : 'Traité'} par {order.approver?.full_name || order.approver?.email} le {new Date(order.approved_at).toLocaleDateString('fr-FR')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
