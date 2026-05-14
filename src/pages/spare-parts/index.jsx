import React, { useState, useEffect } from "react";
import AppLayout from "components/navigation/AppLayout";
import Icon from "components/AppIcon";
import Button from "components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { miningService } from "../../config/supabase";

const MOVEMENT_TYPES = [
  { value: 'in', label: 'Entrée', color: 'text-green-600 bg-green-50' },
  { value: 'out', label: 'Sortie', color: 'text-red-600 bg-red-50' },
  { value: 'adjustment', label: 'Ajustement', color: 'text-blue-600 bg-blue-50' },
];

const UNIT_OPTIONS = ['pièce', 'kg', 'litre', 'm', 'boîte', 'lot', 'unité'];

function getStockStatus(qty, minQty) {
  if (qty === 0) return { label: 'Rupture', color: 'text-red-600 bg-red-50' };
  if (qty <= minQty) return { label: 'Stock faible', color: 'text-orange-600 bg-orange-50' };
  return { label: 'Normal', color: 'text-green-600 bg-green-50' };
}

export default function SpareParts() {
  const { user } = useAuth();
  const [parts, setParts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('catalog');
  const [showPartModal, setShowPartModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [editPart, setEditPart] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const emptyPartForm = {
    name: '',
    reference: '',
    description: '',
    category: '',
    unit: 'pièce',
    quantity_in_stock: 0,
    minimum_stock: 1,
    unit_price: '',
    supplier: '',
    location: '',
    notes: '',
  };
  const [partForm, setPartForm] = useState(emptyPartForm);

  const emptyMovementForm = {
    part_id: '',
    movement_type: 'in',
    quantity: '',
    movement_date: new Date().toISOString().split('T')[0],
    reason: '',
    reference_doc: '',
    notes: '',
  };
  const [movementForm, setMovementForm] = useState(emptyMovementForm);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [partsRes, movRes] = await Promise.all([
      miningService.getSpareParts(),
      miningService.getSparePartMovements(),
    ]);
    if (!partsRes.error) setParts(partsRes.data || []);
    if (!movRes.error) setMovements(movRes.data || []);
    setLoading(false);
  };

  const handleOpenAddPart = () => {
    setEditPart(null);
    setPartForm(emptyPartForm);
    setError('');
    setShowPartModal(true);
  };

  const handleOpenEditPart = (part) => {
    setEditPart(part);
    setPartForm({
      name: part.name || '',
      reference: part.reference || '',
      description: part.description || '',
      category: part.category || '',
      unit: part.unit || 'pièce',
      quantity_in_stock: part.quantity_in_stock ?? 0,
      minimum_stock: part.minimum_stock ?? 1,
      unit_price: part.unit_price ?? '',
      supplier: part.supplier || '',
      location: part.location || '',
      notes: part.notes || '',
    });
    setError('');
    setShowPartModal(true);
  };

  const handleSubmitPart = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      ...partForm,
      quantity_in_stock: parseFloat(partForm.quantity_in_stock) || 0,
      minimum_stock: parseFloat(partForm.minimum_stock) || 0,
      unit_price: partForm.unit_price !== '' ? parseFloat(partForm.unit_price) : null,
    };

    let res;
    if (editPart) {
      res = await miningService.updateSparePart(editPart.id, payload);
    } else {
      res = await miningService.createSparePart(payload);
    }

    if (res.error) {
      setError("Erreur: " + res.error.message);
      return;
    }
    setSuccess(editPart ? 'Pièce mise à jour' : 'Pièce ajoutée au catalogue');
    setShowPartModal(false);
    loadData();
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDeletePart = async (id) => {
    const { error } = await miningService.deleteSparePart(id);
    if (error) {
      setError('Erreur lors de la suppression');
    } else {
      setSuccess('Pièce supprimée');
      setParts(parts.filter(p => p.id !== id));
      setTimeout(() => setSuccess(''), 3000);
    }
    setConfirmDeleteId(null);
  };

  const handleOpenMovement = (partId = '') => {
    setMovementForm({ ...emptyMovementForm, part_id: partId });
    setError('');
    setShowMovementModal(true);
  };

  const handleSubmitMovement = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      ...movementForm,
      quantity: parseFloat(movementForm.quantity),
    };
    const res = await miningService.addSparePartMovement(payload);
    if (res.error) {
      setError("Erreur: " + res.error.message);
      return;
    }
    setSuccess('Mouvement enregistré');
    setShowMovementModal(false);
    loadData();
    setTimeout(() => setSuccess(''), 3000);
  };

  const lowStockCount = parts.filter(p => p.quantity_in_stock <= p.minimum_stock && p.quantity_in_stock > 0).length;
  const outOfStockCount = parts.filter(p => p.quantity_in_stock === 0).length;
  const totalValue = parts.reduce((sum, p) => sum + (parseFloat(p.unit_price || 0) * parseFloat(p.quantity_in_stock || 0)), 0);

  const filteredParts = parts.filter(p => {
    if (filterStatus === 'low') return p.quantity_in_stock > 0 && p.quantity_in_stock <= p.minimum_stock;
    if (filterStatus === 'out') return p.quantity_in_stock === 0;
    if (filterStatus === 'ok') return p.quantity_in_stock > p.minimum_stock;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      return p.name.toLowerCase().includes(q) ||
        (p.reference || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.supplier || '').toLowerCase().includes(q);
    }
    return true;
  }).filter(p => {
    if (!filterSearch) return true;
    const q = filterSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) ||
      (p.reference || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.supplier || '').toLowerCase().includes(q);
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>
              Pièces de Rechange — Magasin
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
              Gestion du stock des pièces et consommables
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleOpenMovement()} className="flex items-center gap-2">
              <Icon name="ArrowLeftRight" size={16} />
              Mouvement
            </Button>
            <Button variant="default" onClick={handleOpenAddPart} className="flex items-center gap-2">
              <Icon name="Plus" size={16} />
              Ajouter Pièce
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
        )}
        {success && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-600 text-sm">{success}</div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl p-4 border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Icon name="Package" size={20} color="#3B82F6" />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Total Références</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>{parts.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl p-4 border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50">
                <Icon name="PackageX" size={20} color="#EF4444" />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Rupture de Stock</p>
                <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl p-4 border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-50">
                <Icon name="AlertCircle" size={20} color="#F97316" />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Stock Faible</p>
                <p className="text-2xl font-bold text-orange-600">{lowStockCount}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl p-4 border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <Icon name="DollarSign" size={20} color="#22C55E" />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Valeur Totale</p>
                <p className="text-lg font-bold text-green-600">
                  {totalValue > 0 ? totalValue.toLocaleString('fr-FR', { minimumFractionDigits: 0 }) + ' DA' : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'var(--color-border)' }}>
          {[
            { id: 'catalog', label: 'Catalogue', icon: 'Package' },
            { id: 'movements', label: 'Mouvements', icon: 'ArrowLeftRight' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderColor: activeTab === tab.id ? 'var(--color-accent)' : 'transparent',
                color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-muted-foreground)',
              }}
            >
              <Icon name={tab.icon} size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'catalog' && (
          <>
            {/* Filters */}
            <div className="rounded-xl p-4 border flex flex-wrap gap-3 items-center" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              <div className="relative flex-1 min-w-[180px]">
                <Icon name="Search" size={16} color="var(--color-muted-foreground)" className="absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Référence, nom, catégorie, fournisseur..."
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                />
              </div>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="text-sm border rounded-lg px-3 py-2"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
              >
                <option value="all">Tous les stocks</option>
                <option value="out">Rupture de stock</option>
                <option value="low">Stock faible</option>
                <option value="ok">Stock normal</option>
              </select>
            </div>

            {/* Parts Table */}
            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : filteredParts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Icon name="PackageOpen" size={40} color="var(--color-muted-foreground)" />
                  <p style={{ color: 'var(--color-muted-foreground)' }}>Aucune pièce trouvée</p>
                  <Button variant="outline" onClick={handleOpenAddPart}>Ajouter une pièce</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-muted)' }}>
                        <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Pièce</th>
                        <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Référence</th>
                        <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Catégorie</th>
                        <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Stock</th>
                        <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Min.</th>
                        <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Statut</th>
                        <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Prix Unit.</th>
                        <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredParts.map((part, idx) => {
                        const stockStatus = getStockStatus(part.quantity_in_stock, part.minimum_stock);
                        return (
                          <tr
                            key={part.id}
                            style={{
                              borderBottom: idx < filteredParts.length - 1 ? '1px solid var(--color-border)' : 'none',
                              background: part.quantity_in_stock === 0 ? 'rgba(239,68,68,0.03)' : 'transparent',
                            }}
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium" style={{ color: 'var(--color-foreground)' }}>{part.name}</div>
                              {part.supplier && (
                                <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>{part.supplier}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-foreground)' }}>
                              {part.reference || '—'}
                            </td>
                            <td className="px-4 py-3" style={{ color: 'var(--color-muted-foreground)' }}>
                              {part.category || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold" style={{ color: part.quantity_in_stock === 0 ? '#EF4444' : 'var(--color-foreground)' }}>
                                {part.quantity_in_stock}
                              </span>
                              <span className="text-xs ml-1" style={{ color: 'var(--color-muted-foreground)' }}>{part.unit}</span>
                            </td>
                            <td className="px-4 py-3" style={{ color: 'var(--color-muted-foreground)' }}>
                              {part.minimum_stock}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stockStatus.color}`}>
                                {stockStatus.label}
                              </span>
                            </td>
                            <td className="px-4 py-3" style={{ color: 'var(--color-foreground)' }}>
                              {part.unit_price ? `${parseFloat(part.unit_price).toLocaleString('fr-FR')} DA` : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenMovement(part.id)}
                                  className="p-1.5 rounded hover:bg-blue-50 transition-colors"
                                  title="Enregistrer un mouvement"
                                >
                                  <Icon name="ArrowLeftRight" size={14} color="#3B82F6" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditPart(part)}
                                  className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                                  title="Modifier"
                                >
                                  <Icon name="Pencil" size={14} color="var(--color-muted-foreground)" />
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(part.id)}
                                  className="p-1.5 rounded hover:bg-red-50 transition-colors"
                                  title="Supprimer"
                                >
                                  <Icon name="Trash2" size={14} color="#EF4444" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'movements' && (
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            ) : movements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Icon name="ArrowLeftRight" size={40} color="var(--color-muted-foreground)" />
                <p style={{ color: 'var(--color-muted-foreground)' }}>Aucun mouvement enregistré</p>
                <Button variant="outline" onClick={() => handleOpenMovement()}>Enregistrer un mouvement</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-muted)' }}>
                      <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Date</th>
                      <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Pièce</th>
                      <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Type</th>
                      <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Quantité</th>
                      <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Motif</th>
                      <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Réf. Doc.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((mov, idx) => {
                      const typeOpt = MOVEMENT_TYPES.find(t => t.value === mov.movement_type);
                      return (
                        <tr
                          key={mov.id}
                          style={{ borderBottom: idx < movements.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                        >
                          <td className="px-4 py-3" style={{ color: 'var(--color-foreground)' }}>{mov.movement_date}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium" style={{ color: 'var(--color-foreground)' }}>
                              {mov.spare_part?.name || '—'}
                            </div>
                            {mov.spare_part?.reference && (
                              <div className="text-xs font-mono" style={{ color: 'var(--color-muted-foreground)' }}>
                                {mov.spare_part.reference}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeOpt?.color || 'text-gray-600 bg-gray-50'}`}>
                              {typeOpt?.label || mov.movement_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold" style={{ color: mov.movement_type === 'out' ? '#EF4444' : '#22C55E' }}>
                            {mov.movement_type === 'out' ? '-' : '+'}{mov.quantity}
                          </td>
                          <td className="px-4 py-3" style={{ color: 'var(--color-muted-foreground)' }}>{mov.reason || '—'}</td>
                          <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                            {mov.reference_doc || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Part Add/Edit Modal */}
      {showPartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]" style={{ background: 'var(--color-card)' }}>
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--color-foreground)' }}>
                {editPart ? 'Modifier la pièce' : 'Ajouter une pièce'}
              </h2>
              <button onClick={() => setShowPartModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <Icon name="X" size={18} color="var(--color-muted-foreground)" />
              </button>
            </div>
            <form onSubmit={handleSubmitPart} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Désignation *</label>
                  <input
                    type="text"
                    value={partForm.name}
                    onChange={e => setPartForm({ ...partForm, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                    placeholder="Ex: Filtre à huile, Courroie trapézoïdale..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Référence</label>
                  <input
                    type="text"
                    value={partForm.reference}
                    onChange={e => setPartForm({ ...partForm, reference: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg font-mono"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                    placeholder="REF-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Catégorie</label>
                  <input
                    type="text"
                    value={partForm.category}
                    onChange={e => setPartForm({ ...partForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                    placeholder="Ex: Filtration, Transmission..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Stock actuel</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={partForm.quantity_in_stock}
                    onChange={e => setPartForm({ ...partForm, quantity_in_stock: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Stock minimum</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={partForm.minimum_stock}
                    onChange={e => setPartForm({ ...partForm, minimum_stock: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Unité</label>
                  <select
                    value={partForm.unit}
                    onChange={e => setPartForm({ ...partForm, unit: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                  >
                    {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Prix unitaire (DA)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={partForm.unit_price}
                    onChange={e => setPartForm({ ...partForm, unit_price: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Fournisseur</label>
                  <input
                    type="text"
                    value={partForm.supplier}
                    onChange={e => setPartForm({ ...partForm, supplier: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                    placeholder="Nom du fournisseur"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Emplacement</label>
                  <input
                    type="text"
                    value={partForm.location}
                    onChange={e => setPartForm({ ...partForm, location: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                    placeholder="Ex: Étagère A-3, Casier 12..."
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Notes</label>
                  <textarea
                    value={partForm.notes}
                    onChange={e => setPartForm({ ...partForm, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border rounded-lg resize-none"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                    placeholder="Informations complémentaires..."
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowPartModal(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="default" className="flex-1">
                  {editPart ? 'Mettre à jour' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movement Modal */}
      {showMovementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl shadow-2xl" style={{ background: 'var(--color-card)' }}>
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--color-foreground)' }}>
                Enregistrer un mouvement
              </h2>
              <button onClick={() => setShowMovementModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <Icon name="X" size={18} color="var(--color-muted-foreground)" />
              </button>
            </div>
            <form onSubmit={handleSubmitMovement} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Pièce *</label>
                <select
                  value={movementForm.part_id}
                  onChange={e => setMovementForm({ ...movementForm, part_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                >
                  <option value="">— Sélectionner une pièce —</option>
                  {parts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.reference ? ` (${p.reference})` : ''} — Stock: {p.quantity_in_stock} {p.unit}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Type *</label>
                  <select
                    value={movementForm.movement_type}
                    onChange={e => setMovementForm({ ...movementForm, movement_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                  >
                    {MOVEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Quantité *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={movementForm.quantity}
                    onChange={e => setMovementForm({ ...movementForm, quantity: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Date</label>
                <input
                  type="date"
                  value={movementForm.movement_date}
                  onChange={e => setMovementForm({ ...movementForm, movement_date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Motif</label>
                <input
                  type="text"
                  value={movementForm.reason}
                  onChange={e => setMovementForm({ ...movementForm, reason: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                  placeholder="Ex: Réparation engin, Commande fournisseur..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Référence document</label>
                <input
                  type="text"
                  value={movementForm.reference_doc}
                  onChange={e => setMovementForm({ ...movementForm, reference_doc: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg font-mono"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                  placeholder="BL-0001, BON-123..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowMovementModal(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="default" className="flex-1">
                  Enregistrer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--color-card)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-foreground)' }}>Confirmer la suppression</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--color-muted-foreground)' }}>
              Cette pièce sera supprimée définitivement du catalogue.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDeleteId(null)}>Annuler</Button>
              <Button variant="destructive" className="flex-1" onClick={() => handleDeletePart(confirmDeleteId)}>Supprimer</Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
