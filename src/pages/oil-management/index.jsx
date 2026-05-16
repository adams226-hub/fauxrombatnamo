import React, { useState, useEffect } from "react";
import AppLayout from "components/navigation/AppLayout";
import Icon from "components/AppIcon";
import Button from "components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { miningService } from "../../config/supabase";
import { exportOilReport } from "../../utils/excelExport";
import toast from "../../utils/toast";
import { default as hotToast } from "react-hot-toast";

const OIL_TYPES = [
  'Huile Moteur',
  'Huile Hydraulique',
  'Huile Transmission',
  'Huile Différentiel',
  'Graisse',
  'Autre',
];

const EXIT_REASONS = ['Vidange', 'Appoint', 'Panne', 'Autre'];

const inputStyle = {
  borderColor: "var(--color-border)",
  background: "var(--color-input)",
  color: "var(--color-foreground)",
};

const labelClass = "block text-sm font-semibold mb-1.5";
const inputClass = "w-full px-4 py-3 text-sm rounded-lg border transition-colors";

export default function OilManagement() {
  const { user } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [stockSummary, setStockSummary] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("entries");

  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const emptyForm = {
    transaction_type: "in",
    transaction_date: "",
    oil_type: "",
    oil_type_custom: "",
    quantity: "",
    unit: "L",
    cost_per_unit: "",
    supplier: "",
    equipment_id: "",
    reason: "",
    operator_name: "",
    notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [txRes, stockRes, eqRes] = await Promise.all([
        miningService.getOilTransactions(),
        miningService.getOilStockSummary(),
        miningService.getEquipment(),
      ]);
      if (txRes.error) toast.error(`Erreur: ${txRes.error.message}`);
      else setTransactions(txRes.data || []);
      if (!stockRes.error) setStockSummary(stockRes.data || []);
      if (!eqRes.error) setEquipment(eqRes.data || []);
    } catch {
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const entries = transactions.filter((t) => t.transaction_type === "in");
  const exits = transactions.filter((t) => t.transaction_type === "out");

  const totalEntriesL = entries.reduce((s, t) => s + parseFloat(t.quantity || 0), 0);
  const totalExitsL = exits.reduce((s, t) => s + parseFloat(t.quantity || 0), 0);
  const stockEstime = Math.max(0, totalEntriesL - totalExitsL);

  const stockByOilType = transactions.reduce((acc, t) => {
    const type = t.oil_type;
    if (!acc[type]) acc[type] = 0;
    if (t.transaction_type === 'in') acc[type] += parseFloat(t.quantity || 0);
    else acc[type] -= parseFloat(t.quantity || 0);
    return acc;
  }, {});
  Object.keys(stockByOilType).forEach(k => { stockByOilType[k] = Math.max(0, stockByOilType[k]); });

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddTransaction = async () => {
    if (!form.transaction_date || !form.oil_type || !form.quantity) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (form.oil_type === "Autre" && !form.oil_type_custom.trim()) {
      toast.error("Veuillez préciser le type d'huile");
      return;
    }
    if (form.transaction_type === "out") {
      const resolvedType = form.oil_type === "Autre" && form.oil_type_custom.trim()
        ? form.oil_type_custom.trim()
        : form.oil_type;
      const stockDisponible = stockByOilType[resolvedType] || 0;
      if (parseFloat(form.quantity) > stockDisponible) {
        toast.error(`Stock insuffisant pour "${resolvedType}" — disponible : ${stockDisponible.toFixed(1)} L, demandé : ${parseFloat(form.quantity).toFixed(1)} L`);
        return;
      }
    }
    const loadingId = hotToast.loading("Enregistrement...", { position: "top-right" });
    try {
      const resolvedOilType = form.oil_type === 'Autre' && form.oil_type_custom.trim()
        ? form.oil_type_custom.trim()
        : form.oil_type;
      const payload = {
        transaction_date: form.transaction_date,
        transaction_type: form.transaction_type,
        oil_type: resolvedOilType,
        quantity: parseFloat(form.quantity),
        unit: form.unit || "L",
        notes: form.notes || null,
      };
      if (form.transaction_type === "in") {
        payload.cost_per_unit = form.cost_per_unit ? parseFloat(form.cost_per_unit) : null;
        payload.supplier = form.supplier || null;
        payload.equipment_id = null;
        payload.reason = null;
        payload.operator_name = null;
      } else {
        payload.equipment_id = form.equipment_id || null;
        payload.reason = form.reason || null;
        payload.operator_name = form.operator_name || null;
        payload.cost_per_unit = null;
        payload.supplier = null;
      }
      const { error } = await miningService.addOilTransaction(payload);
      toast.dismiss(loadingId);
      if (error) {
        toast.error(`Erreur: ${error.message}`);
      } else {
        toast.success(
          form.transaction_type === "in"
            ? `Entrée enregistrée: ${form.quantity} L`
            : `Sortie enregistrée: ${form.quantity} L`
        );
        setShowAddModal(false);
        setForm(emptyForm);
        loadAll();
      }
    } catch {
      toast.dismiss(loadingId);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    const loadingId = hotToast.loading("Suppression...", { position: "top-right" });
    try {
      const { error } = await miningService.deleteOilTransaction(confirmDeleteId);
      toast.dismiss(loadingId);
      if (error) {
        toast.error(`Erreur: ${error.message}`);
      } else {
        toast.success("Transaction supprimée");
        setConfirmDeleteId(null);
        loadAll();
      }
    } catch {
      toast.dismiss(loadingId);
      toast.error("Erreur lors de la suppression");
    }
  };

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("fr-FR");
  };

  const getStockColor = (stock) => {
    if (stock <= 0) return { bg: "rgba(229,62,62,0.12)", color: "var(--color-error)" };
    if (stock < 20) return { bg: "rgba(236,153,75,0.12)", color: "var(--color-warning)" };
    return { bg: "rgba(56,161,105,0.12)", color: "var(--color-success)" };
  };

  const tabs = [
    { id: "entries", label: "Entrées" },
    { id: "exits", label: "Sorties" },
    { id: "stock", label: "Stock par Type" },
  ];

  return (
    <AppLayout
      userRole={user?.role}
      userName={user?.full_name}
      userSite="Amp Mines et Carrieres"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-foreground)" }}>
            Gestion Huile
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted-foreground)" }}>
            Suivi des entrées et sorties d'huile par équipement
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            iconName="Download"
            iconPosition="left"
            onClick={() => exportOilReport("month", transactions)}
          >
            Télécharger Rapport
          </Button>
          <Button
            variant="default"
            iconName="Plus"
            iconPosition="left"
            onClick={() => { setForm(emptyForm); setShowAddModal(true); }}
          >
            Nouvelle Transaction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(237,137,54,0.14)" }}>
              <Icon name="ArrowDownToLine" size={20} color="#DD6B20" />
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Total Entrées</p>
              <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                {totalEntriesL.toFixed(1)} L
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(49,130,206,0.12)" }}>
              <Icon name="ArrowUpFromLine" size={20} color="#3182CE" />
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Total Sorties</p>
              <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                {totalExitsL.toFixed(1)} L
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(56,161,105,0.12)" }}>
              <Icon name="Droplets" size={20} color="var(--color-success)" />
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Stock Estimé</p>
              <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                {stockEstime.toFixed(1)} L
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
        <div className="flex border-b" style={{ borderColor: "var(--color-border)" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-6 py-4 text-sm font-medium transition-colors"
              style={{
                color: activeTab === tab.id ? "var(--color-primary)" : "var(--color-muted-foreground)",
                borderBottom: activeTab === tab.id ? "2px solid var(--color-primary)" : "2px solid transparent",
                background: "transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "entries" && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                  {["Date", "Type Huile", "Quantité", "Prix/L (FCFA)", "Coût Total (FCFA)", "Fournisseur", "Notes", "Actions"].map((h) => (
                    <th key={h} className="text-left p-4 text-sm font-medium whitespace-nowrap" style={{ color: "var(--color-muted-foreground)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center" style={{ color: "var(--color-muted-foreground)" }}>
                      Chargement...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center" style={{ color: "var(--color-muted-foreground)" }}>
                      Aucune entrée enregistrée.
                    </td>
                  </tr>
                ) : (
                  entries.map((t) => (
                    <tr key={t.id} className="border-b transition-colors" style={{ borderColor: "var(--color-border)" }}>
                      <td className="p-4 text-sm whitespace-nowrap" style={{ color: "var(--color-foreground)" }}>
                        {formatDate(t.transaction_date)}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: "rgba(237,137,54,0.14)", color: "#DD6B20" }}>
                          {t.oil_type}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-sm" style={{ color: "var(--color-foreground)" }}>
                        {parseFloat(t.quantity || 0).toFixed(1)} L
                      </td>
                      <td className="p-4 text-sm" style={{ color: "var(--color-foreground)" }}>
                        {t.cost_per_unit ? parseFloat(t.cost_per_unit).toLocaleString("fr-FR") : "—"}
                      </td>
                      <td className="p-4 text-sm" style={{ color: "var(--color-foreground)" }}>
                        {t.cost_per_unit
                          ? (parseFloat(t.quantity || 0) * parseFloat(t.cost_per_unit)).toLocaleString("fr-FR")
                          : "—"}
                      </td>
                      <td className="p-4 text-sm" style={{ color: "var(--color-foreground)" }}>
                        {t.supplier || "—"}
                      </td>
                      <td className="p-4 text-sm max-w-[160px] truncate" style={{ color: "var(--color-muted-foreground)" }}>
                        {t.notes || "—"}
                      </td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          iconName="Trash2"
                          onClick={() => setConfirmDeleteId(t.id)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "exits" && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                  {["Date", "Type Huile", "Équipement", "Quantité", "Motif", "Opérateur", "Notes", "Actions"].map((h) => (
                    <th key={h} className="text-left p-4 text-sm font-medium whitespace-nowrap" style={{ color: "var(--color-muted-foreground)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center" style={{ color: "var(--color-muted-foreground)" }}>
                      Chargement...
                    </td>
                  </tr>
                ) : exits.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center" style={{ color: "var(--color-muted-foreground)" }}>
                      Aucune sortie enregistrée.
                    </td>
                  </tr>
                ) : (
                  exits.map((t) => (
                    <tr key={t.id} className="border-b transition-colors" style={{ borderColor: "var(--color-border)" }}>
                      <td className="p-4 text-sm whitespace-nowrap" style={{ color: "var(--color-foreground)" }}>
                        {formatDate(t.transaction_date)}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: "rgba(49,130,206,0.12)", color: "#3182CE" }}>
                          {t.oil_type}
                        </span>
                      </td>
                      <td className="p-4 text-sm" style={{ color: "var(--color-foreground)" }}>
                        {t.equipment?.name || "—"}
                      </td>
                      <td className="p-4 font-semibold text-sm" style={{ color: "var(--color-foreground)" }}>
                        {parseFloat(t.quantity || 0).toFixed(1)} L
                      </td>
                      <td className="p-4 text-sm" style={{ color: "var(--color-foreground)" }}>
                        {t.reason || "—"}
                      </td>
                      <td className="p-4 text-sm" style={{ color: "var(--color-foreground)" }}>
                        {t.operator_name || "—"}
                      </td>
                      <td className="p-4 text-sm max-w-[160px] truncate" style={{ color: "var(--color-muted-foreground)" }}>
                        {t.notes || "—"}
                      </td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          iconName="Trash2"
                          onClick={() => setConfirmDeleteId(t.id)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "stock" && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                  {["Type d'Huile", "Total Entrées (L)", "Total Sorties (L)", "Stock Restant (L)"].map((h) => (
                    <th key={h} className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center" style={{ color: "var(--color-muted-foreground)" }}>
                      Chargement...
                    </td>
                  </tr>
                ) : (
                  stockSummary.map((row) => {
                    const { bg, color } = getStockColor(row.stock);
                    return (
                      <tr key={row.oil_type} className="border-b" style={{ borderColor: "var(--color-border)" }}>
                        <td className="p-4 font-medium text-sm" style={{ color: "var(--color-foreground)" }}>
                          {row.oil_type}
                        </td>
                        <td className="p-4 text-sm" style={{ color: "var(--color-foreground)" }}>
                          {row.total_in.toFixed(1)}
                        </td>
                        <td className="p-4 text-sm" style={{ color: "var(--color-foreground)" }}>
                          {row.total_out.toFixed(1)}
                        </td>
                        <td className="p-4">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: bg, color }}>
                            {row.stock.toFixed(1)} L
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl w-full max-w-2xl flex flex-col" style={{ background: "var(--color-card)", maxHeight: "90vh" }}>
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "var(--color-border)" }}>
              <h3 className="text-lg font-semibold" style={{ color: "var(--color-foreground)" }}>
                Nouvelle Transaction Huile
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                <Icon name="X" size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-5" style={{ maxHeight: "calc(90vh - 130px)" }}>
              <div>
                <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                  Type de Transaction *
                </label>
                <div className="flex gap-3">
                  {[
                    { value: "in", label: "Entrée", icon: "ArrowDownToLine", color: "#DD6B20", bg: "rgba(237,137,54,0.14)" },
                    { value: "out", label: "Sortie", icon: "ArrowUpFromLine", color: "#3182CE", bg: "rgba(49,130,206,0.12)" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleFieldChange("transaction_type", opt.value)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-semibold transition-all"
                      style={{
                        borderColor: form.transaction_type === opt.value ? opt.color : "var(--color-border)",
                        background: form.transaction_type === opt.value ? opt.bg : "transparent",
                        color: form.transaction_type === opt.value ? opt.color : "var(--color-muted-foreground)",
                      }}
                    >
                      <Icon name={opt.icon} size={16} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    value={form.transaction_date}
                    onChange={(e) => handleFieldChange("transaction_date", e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                    Type d'Huile *
                  </label>
                  <select
                    value={form.oil_type}
                    onChange={(e) => handleFieldChange("oil_type", e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  >
                    <option value="">Sélectionner...</option>
                    {OIL_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {form.oil_type === "Autre" && (
                <div>
                  <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                    Préciser le type d'huile *
                  </label>
                  <input
                    type="text"
                    value={form.oil_type_custom}
                    onChange={(e) => handleFieldChange("oil_type_custom", e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                    placeholder="Ex: Huile boîte de vitesses, Huile direction assistée..."
                    autoFocus
                  />
                </div>
              )}

              <div>
                <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                  Quantité (L) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.quantity}
                  onChange={(e) => handleFieldChange("quantity", e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="0.0"
                />
              </div>

              {form.transaction_type === "in" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                        Prix/L (FCFA)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.cost_per_unit}
                        onChange={(e) => handleFieldChange("cost_per_unit", e.target.value)}
                        className={inputClass}
                        style={inputStyle}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                        Fournisseur
                      </label>
                      <input
                        type="text"
                        value={form.supplier}
                        onChange={(e) => handleFieldChange("supplier", e.target.value)}
                        className={inputClass}
                        style={inputStyle}
                        placeholder="Nom du fournisseur"
                      />
                    </div>
                  </div>
                  {form.quantity && form.cost_per_unit && (
                    <div className="px-4 py-3 rounded-lg" style={{ background: "rgba(237,137,54,0.10)", border: "1px solid rgba(237,137,54,0.4)" }}>
                      <p className="text-sm font-semibold" style={{ color: "#DD6B20" }}>
                        Coût Total:{" "}
                        {(parseFloat(form.quantity) * parseFloat(form.cost_per_unit)).toLocaleString("fr-FR")} FCFA
                      </p>
                    </div>
                  )}
                </>
              )}

              {form.transaction_type === "out" && (
                <>
                  <div>
                    <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                      Équipement
                    </label>
                    <select
                      value={form.equipment_id}
                      onChange={(e) => handleFieldChange("equipment_id", e.target.value)}
                      className={inputClass}
                      style={inputStyle}
                    >
                      <option value="">Sélectionner un équipement</option>
                      {equipment.map((eq) => (
                        <option key={eq.id} value={eq.id}>
                          {eq.name}{eq.serial_number ? ` (${eq.serial_number})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                        Motif
                      </label>
                      <select
                        value={form.reason}
                        onChange={(e) => handleFieldChange("reason", e.target.value)}
                        className={inputClass}
                        style={inputStyle}
                      >
                        <option value="">Sélectionner...</option>
                        {EXIT_REASONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                        Opérateur
                      </label>
                      <input
                        type="text"
                        value={form.operator_name}
                        onChange={(e) => handleFieldChange("operator_name", e.target.value)}
                        className={inputClass}
                        style={inputStyle}
                        placeholder="Nom de l'opérateur"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => handleFieldChange("notes", e.target.value)}
                  rows="3"
                  className={inputClass + " resize-vertical"}
                  style={inputStyle}
                  placeholder="Notes optionnelles..."
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-5 border-t" style={{ borderColor: "var(--color-border)" }}>
              <Button variant="default" onClick={handleAddTransaction} className="flex-1">
                Enregistrer
              </Button>
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl w-full max-w-sm" style={{ background: "var(--color-card)" }}>
            <div className="px-6 py-5 border-b" style={{ borderColor: "var(--color-border)" }}>
              <h3 className="text-lg font-semibold" style={{ color: "var(--color-foreground)" }}>
                Confirmer la suppression
              </h3>
            </div>
            <div className="p-6">
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
                Êtes-vous sûr de vouloir supprimer cette transaction ? Cette action est irréversible.
              </p>
            </div>
            <div className="flex gap-3 px-6 py-5 border-t" style={{ borderColor: "var(--color-border)" }}>
              <Button variant="danger" onClick={handleDelete} className="flex-1">
                Supprimer
              </Button>
              <Button variant="outline" onClick={() => setConfirmDeleteId(null)} className="flex-1">
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

