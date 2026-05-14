import React, { useState, useEffect } from "react";
import AppLayout from "components/navigation/AppLayout";
import Icon from "components/AppIcon";
import Button from "components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { miningService } from "../../config/supabase";

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Quotidienne" },
  { value: "weekly", label: "Hebdomadaire" },
  { value: "monthly", label: "Mensuelle" },
  { value: "quarterly", label: "Trimestrielle" },
  { value: "semiannual", label: "Semestrielle" },
  { value: "annual", label: "Annuelle" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Faible", color: "text-green-700 bg-green-100" },
  { value: "medium", label: "Moyenne", color: "text-yellow-700 bg-yellow-100" },
  { value: "high", label: "Haute", color: "text-orange-700 bg-orange-100" },
  { value: "critical", label: "Critique", color: "text-red-700 bg-red-100" },
];

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Planifiée", color: "text-blue-700 bg-blue-100" },
  { value: "in_progress", label: "En cours", color: "text-orange-700 bg-orange-100" },
  { value: "completed", label: "Terminée", color: "text-green-700 bg-green-100" },
];

const OVERDUE_STATUS = { label: "En retard", color: "text-red-700 bg-red-100" };

function getPriorityBadge(priority) {
  return PRIORITY_OPTIONS.find((p) => p.value === priority) || { label: priority, color: "text-gray-600 bg-gray-100" };
}

function getStatusBadge(status, nextDueDate) {
  const today = new Date().toISOString().split("T")[0];
  if (status !== "completed" && nextDueDate && nextDueDate < today) return OVERDUE_STATUS;
  return STATUS_OPTIONS.find((s) => s.value === status) || { label: status, color: "text-gray-600 bg-gray-100" };
}

function daysUntilDue(nextDueDate) {
  if (!nextDueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextDueDate);
  due.setHours(0, 0, 0, 0);
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

const inputStyle = {
  borderColor: "var(--color-border)",
  background: "var(--color-background)",
  color: "var(--color-foreground)",
};

const labelStyle = { color: "var(--color-foreground)" };

export default function MaintenancePrevention() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEquipment, setFilterEquipment] = useState("");
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  const emptyForm = {
    equipment_id: "",
    task_name: "",
    frequency: "monthly",
    last_done_date: "",
    next_due_date: "",
    priority: "medium",
    status: "scheduled",
    assigned_to: "",
    estimated_duration: "",
    notes: "",
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
    setFormError("");
    setShowModal(true);
  };

  const handleOpenEdit = (plan) => {
    setEditPlan(plan);
    setFormData({
      equipment_id: plan.equipment_id || "",
      task_name: plan.task_name || "",
      frequency: plan.frequency || "monthly",
      last_done_date: plan.last_done_date || "",
      next_due_date: plan.next_due_date || "",
      priority: plan.priority || "medium",
      status: plan.status || "scheduled",
      assigned_to: plan.assigned_to || "",
      estimated_duration: plan.estimated_duration != null ? String(plan.estimated_duration) : "",
      notes: plan.notes || "",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    const payload = {
      ...formData,
      equipment_id: formData.equipment_id || null,
      estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration, 10) : null,
    };
    let res;
    if (editPlan) {
      res = await miningService.updateMaintenancePlan(editPlan.id, payload);
    } else {
      res = await miningService.createMaintenancePlan(payload);
    }
    if (res.error) {
      setFormError("Erreur lors de l'enregistrement : " + res.error.message);
      return;
    }
    setSuccess(editPlan ? "Plan mis à jour avec succès" : "Plan créé avec succès");
    setShowModal(false);
    loadData();
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleDelete = async (id) => {
    const res = await miningService.deleteMaintenancePlan(id);
    if (res.error) {
      setError("Erreur lors de la suppression");
    } else {
      setSuccess("Plan supprimé");
      setPlans((prev) => prev.filter((p) => p.id !== id));
      setTimeout(() => setSuccess(""), 3000);
    }
    setConfirmDeleteId(null);
  };

  const today = new Date().toISOString().split("T")[0];

  const overdueCount = plans.filter((p) => p.status !== "completed" && p.next_due_date && p.next_due_date < today).length;
  const upcomingCount = plans.filter((p) => {
    const days = daysUntilDue(p.next_due_date);
    return p.status !== "completed" && days !== null && days >= 0 && days <= 7;
  }).length;
  const completedCount = plans.filter((p) => p.status === "completed").length;

  const filteredPlans = plans.filter((p) => {
    const isOverdue = p.status !== "completed" && p.next_due_date && p.next_due_date < today;
    const effectiveStatus = isOverdue ? "overdue" : p.status;
    if (filterStatus !== "all" && effectiveStatus !== filterStatus) return false;
    if (filterPriority !== "all" && p.priority !== filterPriority) return false;
    if (filterEquipment && p.equipment_id !== filterEquipment) return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      const eqName = (p.equipment?.name || "").toLowerCase();
      return (p.task_name || "").toLowerCase().includes(q) || eqName.includes(q);
    }
    return true;
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-6 min-h-screen" style={{ background: "var(--color-background)" }}>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-foreground)" }}>
              Maintenance Préventive
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--color-muted-foreground)" }}>
              Planification et suivi des maintenances des équipements miniers
            </p>
          </div>
          <Button variant="default" onClick={handleOpenAdd} className="flex items-center gap-2 shrink-0">
            <Icon name="Plus" size={16} />
            Nouveau Plan
          </Button>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}
        {success && (
          <div className="px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">{success}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl p-5 border flex items-center gap-4" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
            <div className="p-3 rounded-xl bg-blue-100 shrink-0">
              <Icon name="CalendarDays" size={22} color="#2563EB" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-muted-foreground)" }}>Total Plans</p>
              <p className="text-3xl font-bold leading-tight" style={{ color: "var(--color-foreground)" }}>{plans.length}</p>
            </div>
          </div>
          <div className="rounded-xl p-5 border flex items-center gap-4" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
            <div className="p-3 rounded-xl bg-red-100 shrink-0">
              <Icon name="AlertTriangle" size={22} color="#DC2626" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-muted-foreground)" }}>En Retard</p>
              <p className="text-3xl font-bold leading-tight text-red-600">{overdueCount}</p>
            </div>
          </div>
          <div className="rounded-xl p-5 border flex items-center gap-4" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
            <div className="p-3 rounded-xl bg-orange-100 shrink-0">
              <Icon name="Clock" size={22} color="#EA580C" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-muted-foreground)" }}>Cette Semaine</p>
              <p className="text-3xl font-bold leading-tight text-orange-600">{upcomingCount}</p>
            </div>
          </div>
          <div className="rounded-xl p-5 border flex items-center gap-4" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
            <div className="p-3 rounded-xl bg-green-100 shrink-0">
              <Icon name="CheckCircle2" size={22} color="#16A34A" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-muted-foreground)" }}>Terminées</p>
              <p className="text-3xl font-bold leading-tight text-green-600">{completedCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-4 border flex flex-wrap gap-3 items-center" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Icon name="Search" size={16} color="var(--color-muted-foreground)" />
            </span>
            <input
              type="text"
              placeholder="Rechercher une tâche ou équipement..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-9 pr-4 py-3 text-sm rounded-lg border"
              style={inputStyle}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 text-sm rounded-lg border min-w-[170px]"
            style={inputStyle}
          >
            <option value="all">Tous les statuts</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
            <option value="overdue">En retard</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-3 text-sm rounded-lg border min-w-[160px]"
            style={inputStyle}
          >
            <option value="all">Toutes priorités</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <select
            value={filterEquipment}
            onChange={(e) => setFilterEquipment(e.target.value)}
            className="px-4 py-3 text-sm rounded-lg border min-w-[180px]"
            style={inputStyle}
          >
            <option value="">Tous les équipements</option>
            {equipment.map((eq) => (
              <option key={eq.id} value={eq.id}>{eq.name}</option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="p-4 rounded-full bg-gray-100">
                <Icon name="ShieldAlert" size={36} color="var(--color-muted-foreground)" />
              </div>
              <div className="text-center">
                <p className="font-semibold" style={{ color: "var(--color-foreground)" }}>Aucun plan de maintenance trouvé</p>
                <p className="text-sm mt-1" style={{ color: "var(--color-muted-foreground)" }}>Créez votre premier plan pour commencer le suivi.</p>
              </div>
              <Button variant="outline" onClick={handleOpenAdd} className="flex items-center gap-2">
                <Icon name="Plus" size={15} />
                Créer un plan
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: "780px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-muted)" }}>
                    <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: "var(--color-muted-foreground)", minWidth: "220px" }}>Tâche</th>
                    <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: "var(--color-muted-foreground)", minWidth: "150px" }}>Équipement</th>
                    <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: "var(--color-muted-foreground)", minWidth: "120px" }}>Fréquence</th>
                    <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: "var(--color-muted-foreground)", minWidth: "150px" }}>Prochaine Date</th>
                    <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: "var(--color-muted-foreground)", minWidth: "100px" }}>Priorité</th>
                    <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: "var(--color-muted-foreground)", minWidth: "110px" }}>Statut</th>
                    <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: "var(--color-muted-foreground)", minWidth: "90px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlans.map((plan, idx) => {
                    const days = daysUntilDue(plan.next_due_date);
                    const isOverdue = plan.status !== "completed" && plan.next_due_date && plan.next_due_date < today;
                    const statusBadge = getStatusBadge(plan.status, plan.next_due_date);
                    const priorityBadge = getPriorityBadge(plan.priority);
                    const freqLabel = FREQUENCY_OPTIONS.find((f) => f.value === plan.frequency)?.label || plan.frequency;

                    return (
                      <tr
                        key={plan.id}
                        style={{
                          borderBottom: idx < filteredPlans.length - 1 ? "1px solid var(--color-border)" : "none",
                          background: isOverdue ? "rgba(239,68,68,0.04)" : "transparent",
                        }}
                      >
                        <td className="px-5 py-4">
                          <span className="font-semibold" style={{ color: "var(--color-foreground)" }}>{plan.task_name}</span>
                          {plan.notes && (
                            <span className="block text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{plan.notes}</span>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap" style={{ color: "var(--color-foreground)" }}>
                          {plan.equipment?.name || <span style={{ color: "var(--color-muted-foreground)" }}>—</span>}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap" style={{ color: "var(--color-muted-foreground)" }}>{freqLabel}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-medium" style={{ color: isOverdue ? "#DC2626" : "var(--color-foreground)" }}>
                            {plan.next_due_date || "—"}
                          </div>
                          {plan.next_due_date && plan.status !== "completed" && days !== null && (
                            <div className="text-xs mt-0.5 font-medium" style={{ color: isOverdue ? "#DC2626" : days <= 7 ? "#EA580C" : "var(--color-muted-foreground)" }}>
                              {isOverdue
                                ? `${Math.abs(days)}j de retard`
                                : days === 0
                                ? "Aujourd'hui"
                                : `Dans ${days}j`}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${priorityBadge.color}`}>
                            {priorityBadge.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(plan)}
                              className="p-2 rounded-lg transition-colors"
                              style={{ color: "var(--color-muted-foreground)" }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-muted)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                              title="Modifier"
                            >
                              <Icon name="Pencil" size={15} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(plan.id)}
                              className="p-2 rounded-lg transition-colors text-red-500"
                              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                              title="Supprimer"
                            >
                              <Icon name="Trash2" size={15} color="#EF4444" />
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }}>
          <div className="w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col p-0" style={{ background: "var(--color-card)", maxHeight: "90vh" }}>
            <div className="flex items-center justify-between px-6 py-5 border-b shrink-0" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100">
                  <Icon name="Wrench" size={18} color="#EA580C" />
                </div>
                <h2 className="text-lg font-bold" style={{ color: "var(--color-foreground)" }}>
                  {editPlan ? "Modifier le plan de maintenance" : "Nouveau plan de maintenance"}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-muted)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Icon name="X" size={18} color="var(--color-muted-foreground)" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto p-6 space-y-5" style={{ maxHeight: "calc(90vh - 130px)" }}>
                {formError && (
                  <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{formError}</div>
                )}

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={labelStyle}>
                    Nom de la tâche <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.task_name}
                    onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
                    required
                    className="w-full px-4 py-3 text-sm rounded-lg border"
                    style={inputStyle}
                    placeholder="Ex : Vidange moteur, Graissage paliers..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={labelStyle}>Équipement</label>
                  <select
                    value={formData.equipment_id}
                    onChange={(e) => setFormData({ ...formData, equipment_id: e.target.value })}
                    className="w-full px-4 py-3 text-sm rounded-lg border"
                    style={inputStyle}
                  >
                    <option value="">— Sélectionner un équipement —</option>
                    {equipment.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.name}{eq.serial_number ? ` (${eq.serial_number})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={labelStyle}>Fréquence</label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      className="w-full px-4 py-3 text-sm rounded-lg border"
                      style={inputStyle}
                    >
                      {FREQUENCY_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={labelStyle}>Priorité</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-4 py-3 text-sm rounded-lg border"
                      style={inputStyle}
                    >
                      {PRIORITY_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={labelStyle}>Dernière réalisation</label>
                    <input
                      type="date"
                      value={formData.last_done_date}
                      onChange={(e) => setFormData({ ...formData, last_done_date: e.target.value })}
                      className="w-full px-4 py-3 text-sm rounded-lg border"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={labelStyle}>
                      Prochaine date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.next_due_date}
                      onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
                      required
                      className="w-full px-4 py-3 text-sm rounded-lg border"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={labelStyle}>Statut</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-3 text-sm rounded-lg border"
                      style={inputStyle}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={labelStyle}>Durée estimée (minutes)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.estimated_duration}
                      onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                      className="w-full px-4 py-3 text-sm rounded-lg border"
                      style={inputStyle}
                      placeholder="Ex : 120"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={labelStyle}>Assigné à</label>
                  <input
                    type="text"
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    className="w-full px-4 py-3 text-sm rounded-lg border"
                    style={inputStyle}
                    placeholder="Nom du technicien responsable"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={labelStyle}>Notes / Instructions</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 text-sm rounded-lg border resize-none"
                    style={inputStyle}
                    placeholder="Instructions de sécurité, outils requis, observations..."
                  />
                </div>
              </div>

              <div className="px-6 py-5 border-t flex gap-3 shrink-0" style={{ borderColor: "var(--color-border)" }}>
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="default" className="flex-1">
                  {editPlan ? "Mettre à jour" : "Créer le plan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }}>
          <div className="w-full max-w-sm rounded-2xl shadow-2xl p-0" style={{ background: "var(--color-card)" }}>
            <div className="px-6 py-5 border-b" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <Icon name="Trash2" size={18} color="#DC2626" />
                </div>
                <h3 className="text-base font-bold" style={{ color: "var(--color-foreground)" }}>Confirmer la suppression</h3>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
                Cette action est irréversible. Le plan de maintenance sera définitivement supprimé.
              </p>
            </div>
            <div className="px-6 py-5 border-t flex gap-3" style={{ borderColor: "var(--color-border)" }}>
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDeleteId(null)}>
                Annuler
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => handleDelete(confirmDeleteId)}>
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
