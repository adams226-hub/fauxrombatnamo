import React, { useState, useEffect } from "react";
import AppLayout from "components/navigation/AppLayout";
import Icon from "components/AppIcon";
import Button from "components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { miningService } from "../../config/supabase";

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Quotidienne' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuelle' },
  { value: 'quarterly', label: 'Trimestrielle' },
  { value: 'semiannual', label: 'Semestrielle' },
  { value: 'annual', label: 'Annuelle' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Faible', color: 'text-green-600 bg-green-50' },
  { value: 'medium', label: 'Moyenne', color: 'text-yellow-600 bg-yellow-50' },
  { value: 'high', label: 'Haute', color: 'text-orange-600 bg-orange-50' },
  { value: 'critical', label: 'Critique', color: 'text-red-600 bg-red-50' },
];

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Planifiée', color: 'text-blue-600 bg-blue-50' },
  { value: 'in_progress', label: 'En cours', color: 'text-orange-600 bg-orange-50' },
  { value: 'completed', label: 'Terminée', color: 'text-green-600 bg-green-50' },
  { value: 'overdue', label: 'En retard', color: 'text-red-600 bg-red-50' },
];

function getPriorityBadge(priority) {
  const opt = PRIORITY_OPTIONS.find(p => p.value === priority);
  return opt ? opt : { label: priority, color: 'text-gray-600 bg-gray-50' };
}

function getStatusBadge(status, nextDueDate) {
  const today = new Date().toISOString().split('T')[0];
  if (status !== 'completed' && nextDueDate < today) {
    return { label: 'En retard', color: 'text-red-600 bg-red-50' };
  }
  const opt = STATUS_OPTIONS.find(s => s.value === status);
  return opt ? opt : { label: status, color: 'text-gray-600 bg-gray-50' };
}

function daysUntilDue(nextDueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextDueDate);
  due.setHours(0, 0, 0, 0);
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

export default function MaintenancePrevention() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  const [showModal, setShowModal] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEquipment, setFilterEquipment] = useState('');
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const emptyForm = {
    equipment_id: '',
    task_name: '',
    description: '',
    frequency: 'monthly',
    last_done_date: '',
    next_due_date: '',
    priority: 'medium',
    status: 'scheduled',
    assigned_to: '',
    estimated_duration: '',
    notes: '',
  };
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [plansRes, equipRes] = await Promise.all([
      miningService.getMaintenancePlans(),
      miningService.getEquipment(),
    ]);
    if (!plansRes.error) setPlans(plansRes.data || []);
    if (!equipRes.error) setEquipment(equipRes.data || []);
    setLoading(false);
  };

  const handleOpenAdd = () => {
    setEditPlan(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const handleOpenEdit = (plan) => {
    setEditPlan(plan);
    setFormData({
      equipment_id: plan.equipment_id || '',
      task_name: plan.task_name || '',
      description: plan.description || '',
      frequency: plan.frequency || 'monthly',
      last_done_date: plan.last_done_date || '',
      next_due_date: plan.next_due_date || '',
      priority: plan.priority || 'medium',
      status: plan.status || 'scheduled',
      assigned_to: plan.assigned_to || '',
      estimated_duration: plan.estimated_duration || '',
      notes: plan.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      ...formData,
      equipment_id: formData.equipment_id || null,
      estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : null,
    };

    let res;
    if (editPlan) {
      res = await miningService.updateMaintenancePlan(editPlan.id, payload);
    } else {
      res = await miningService.createMaintenancePlan(payload);
    }

    if (res.error) {
      setError("Erreur lors de l'enregistrement: " + res.error.message);
      return;
    }
    setSuccess(editPlan ? 'Plan mis à jour avec succès' : 'Plan créé avec succès');
    setShowModal(false);
    loadData();
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = async (id) => {
    const { error } = await miningService.deleteMaintenancePlan(id);
    if (error) {
      setError('Erreur lors de la suppression');
    } else {
      setSuccess('Plan supprimé');
      setPlans(plans.filter(p => p.id !== id));
      setTimeout(() => setSuccess(''), 3000);
    }
    setConfirmDeleteId(null);
  };

  const today = new Date().toISOString().split('T')[0];
  const overdueCount = plans.filter(p => p.status !== 'completed' && p.next_due_date < today).length;
  const upcomingCount = plans.filter(p => {
    const days = daysUntilDue(p.next_due_date);
    return p.status !== 'completed' && days >= 0 && days <= 7;
  }).length;
  const completedCount = plans.filter(p => p.status === 'completed').length;

  const filteredPlans = plans.filter(p => {
    const isOverdue = p.status !== 'completed' && p.next_due_date < today;
    const effectiveStatus = isOverdue ? 'overdue' : p.status;
    if (filterStatus !== 'all' && effectiveStatus !== filterStatus) return false;
    if (filterPriority !== 'all' && p.priority !== filterPriority) return false;
    if (filterEquipment && p.equipment_id !== filterEquipment) return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      const eqName = (p.equipment?.name || '').toLowerCase();
      return p.task_name.toLowerCase().includes(q) || eqName.includes(q);
    }
    return true;
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>
              Maintenance Préventive
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
              Planification et suivi des maintenances des équipements
            </p>
          </div>
          <Button variant="default" onClick={handleOpenAdd} className="flex items-center gap-2">
            <Icon name="Plus" size={16} />
            Nouveau Plan
          </Button>
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
                <Icon name="Calendar" size={20} color="#3B82F6" />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Total Plans</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>{plans.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl p-4 border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50">
                <Icon name="AlertTriangle" size={20} color="#EF4444" />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>En Retard</p>
                <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl p-4 border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-50">
                <Icon name="Clock" size={20} color="#F97316" />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Cette Semaine</p>
                <p className="text-2xl font-bold text-orange-600">{upcomingCount}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl p-4 border" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <Icon name="CheckCircle" size={20} color="#22C55E" />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Terminées</p>
                <p className="text-2xl font-bold text-green-600">{completedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-xl p-4 border flex flex-wrap gap-3 items-center" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          <div className="relative flex-1 min-w-[180px]">
            <Icon name="Search" size={16} color="var(--color-muted-foreground)" className="absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
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
            <option value="all">Tous les statuts</option>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
          >
            <option value="all">Toutes priorités</option>
            {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select
            value={filterEquipment}
            onChange={e => setFilterEquipment(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
          >
            <option value="">Tous les équipements</option>
            {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
          </select>
        </div>

        {/* Plans Table */}
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Icon name="ShieldAlert" size={40} color="var(--color-muted-foreground)" />
              <p style={{ color: 'var(--color-muted-foreground)' }}>Aucun plan de maintenance trouvé</p>
              <Button variant="outline" onClick={handleOpenAdd}>Créer un plan</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-muted)' }}>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Tâche</th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Équipement</th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Fréquence</th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Prochaine Date</th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Priorité</th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Statut</th>
                    <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlans.map((plan, idx) => {
                    const days = daysUntilDue(plan.next_due_date);
                    const isOverdue = plan.status !== 'completed' && plan.next_due_date < today;
                    const statusBadge = getStatusBadge(plan.status, plan.next_due_date);
                    const priorityBadge = getPriorityBadge(plan.priority);
                    const freqLabel = FREQUENCY_OPTIONS.find(f => f.value === plan.frequency)?.label || plan.frequency;

                    return (
                      <tr
                        key={plan.id}
                        style={{
                          borderBottom: idx < filteredPlans.length - 1 ? '1px solid var(--color-border)' : 'none',
                          background: isOverdue ? 'rgba(239,68,68,0.03)' : 'transparent'
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium" style={{ color: 'var(--color-foreground)' }}>{plan.task_name}</div>
                          {plan.description && (
                            <div className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--color-muted-foreground)' }}>{plan.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3" style={{ color: 'var(--color-foreground)' }}>
                          {plan.equipment?.name || <span style={{ color: 'var(--color-muted-foreground)' }}>—</span>}
                        </td>
                        <td className="px-4 py-3" style={{ color: 'var(--color-muted-foreground)' }}>{freqLabel}</td>
                        <td className="px-4 py-3">
                          <div style={{ color: isOverdue ? '#EF4444' : 'var(--color-foreground)' }}>
                            {plan.next_due_date || '—'}
                          </div>
                          {plan.next_due_date && plan.status !== 'completed' && (
                            <div className="text-xs mt-0.5" style={{ color: isOverdue ? '#EF4444' : days <= 7 ? '#F97316' : 'var(--color-muted-foreground)' }}>
                              {isOverdue ? `${Math.abs(days)}j de retard` : days === 0 ? "Aujourd'hui" : `Dans ${days}j`}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityBadge.color}`}>
                            {priorityBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(plan)}
                              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                              title="Modifier"
                            >
                              <Icon name="Pencil" size={14} color="var(--color-muted-foreground)" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(plan.id)}
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
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]" style={{ background: 'var(--color-card)' }}>
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--color-foreground)' }}>
                {editPlan ? 'Modifier le plan' : 'Nouveau plan de maintenance'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <Icon name="X" size={18} color="var(--color-muted-foreground)" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Tâche *</label>
                <input
                  type="text"
                  value={formData.task_name}
                  onChange={e => setFormData({ ...formData, task_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                  placeholder="Ex: Vidange moteur, Graissage..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Équipement</label>
                <select
                  value={formData.equipment_id}
                  onChange={e => setFormData({ ...formData, equipment_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                >
                  <option value="">— Sélectionner un équipement —</option>
                  {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name} {eq.serial_number ? `(${eq.serial_number})` : ''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Fréquence</label>
                  <select
                    value={formData.frequency}
                    onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                  >
                    {FREQUENCY_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Priorité</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                  >
                    {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Dernière réalisation</label>
                  <input
                    type="date"
                    value={formData.last_done_date}
                    onChange={e => setFormData({ ...formData, last_done_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Prochaine date *</label>
                  <input
                    type="date"
                    value={formData.next_due_date}
                    onChange={e => setFormData({ ...formData, next_due_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Statut</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                  >
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Durée estimée (min)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.estimated_duration}
                    onChange={e => setFormData({ ...formData, estimated_duration: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                    placeholder="Ex: 120"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Assigné à</label>
                <input
                  type="text"
                  value={formData.assigned_to}
                  onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                  placeholder="Nom du technicien"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Description / Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border rounded-lg resize-none"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}
                  placeholder="Instructions, observations..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="default" className="flex-1">
                  {editPlan ? 'Mettre à jour' : 'Créer le plan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--color-card)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-foreground)' }}>Confirmer la suppression</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--color-muted-foreground)' }}>
              Cette action est irréversible. Voulez-vous vraiment supprimer ce plan ?
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDeleteId(null)}>Annuler</Button>
              <Button variant="destructive" className="flex-1" onClick={() => handleDelete(confirmDeleteId)}>Supprimer</Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
