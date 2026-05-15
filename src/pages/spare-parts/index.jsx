import React, { useState, useEffect } from "react";
import AppLayout from "components/navigation/AppLayout";
import Icon from "components/AppIcon";
import Button from "components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { miningService } from "../../config/supabase";

const MOVEMENT_TYPES = [
  { value: "in", label: "Entrée", color: "text-green-700 bg-green-100" },
  { value: "out", label: "Sortie", color: "text-red-700 bg-red-100" },
  { value: "adjustment", label: "Ajustement", color: "text-blue-700 bg-blue-100" },
];

const UNIT_OPTIONS = ["pièce", "kg", "litre", "m", "boîte", "lot", "unité"];

const inputClass = "w-full px-4 py-3 text-sm rounded-lg border";
const inputStyle = {
  borderColor: "var(--color-border)",
  background: "var(--color-background)",
  color: "var(--color-foreground)",
};
const labelClass = "block text-sm font-semibold mb-1.5";
const labelStyle = { color: "var(--color-foreground)" };

function getStockStatus(qty, minQty) {
  const q = parseFloat(qty) || 0;
  const m = parseFloat(minQty) || 0;
  if (q === 0) return { label: "Rupture", color: "text-red-700 bg-red-100" };
  if (q <= m) return { label: "Stock Faible", color: "text-orange-700 bg-orange-100" };
  return { label: "Normal", color: "text-green-700 bg-green-100" };
}

export default function SpareParts() {
  const { user } = useAuth();
  const [parts, setParts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("catalog");
  const [showPartModal, setShowPartModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [editPart, setEditPart] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [filterSearch, setFilterSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const emptyPartForm = {
    name: "",
    reference: "",
    category: "",
    unit: "pièce",
    quantity_in_stock: 0,
    minimum_stock: 1,
    unit_price: "",
    supplier: "",
    location: "",
    notes: "",
  };
  const [partForm, setPartForm] = useState(emptyPartForm);

  const emptyMovementForm = {
    part_id: "",
    movement_type: "in",
    quantity: "",
    movement_date: new Date().toISOString().split("T")[0],
    reason: "",
    reference_doc: "",
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
    setError("");
    setShowPartModal(true);
  };

  const handleOpenEditPart = (part) => {
    setEditPart(part);
    setPartForm({
      name: part.name || "",
      reference: part.reference || "",
      category: part.category || "",
      unit: part.unit || "pièce",
      quantity_in_stock: part.quantity_in_stock ?? 0,
      minimum_stock: part.minimum_stock ?? 1,
      unit_price: part.unit_price ?? "",
      supplier: part.supplier || "",
      location: part.location || "",
      notes: part.notes || "",
    });
    setError("");
    setShowPartModal(true);
  };

  const handleSubmitPart = async (e) => {
    e.preventDefault();
    setError("");
    const payload = {
      ...partForm,
      quantity_in_stock: parseFloat(partForm.quantity_in_stock) || 0,
      minimum_stock: parseFloat(partForm.minimum_stock) || 0,
      unit_price: partForm.unit_price !== "" ? parseFloat(partForm.unit_price) : null,
    };
    let res;
    if (editPart) {
      res = await miningService.updateSparePart(editPart.id, payload);
    } else {
      res = await miningService.createSparePart(payload);
    }
    if (res.error) {
      setError("Erreur : " + res.error.message);
      return;
    }
    setSuccess(editPart ? "Pièce mise à jour" : "Pièce ajoutée au catalogue");
    setShowPartModal(false);
    loadData();
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleDeletePart = async (id) => {
    const { error: err } = await miningService.deleteSparePart(id);
    if (err) {
      setError("Erreur lors de la suppression");
    } else {
      setSuccess("Pièce supprimée");
      setParts(parts.filter((p) => p.id !== id));
      setTimeout(() => setSuccess(""), 3000);
    }
    setConfirmDeleteId(null);
  };

  const handleOpenMovement = (partId = "") => {
    setMovementForm({ ...emptyMovementForm, part_id: partId });
    setError("");
    setShowMovementModal(true);
  };

  const handleSubmitMovement = async (e) => {
    e.preventDefault();
    setError("");
    const payload = {
      ...movementForm,
      quantity: parseFloat(movementForm.quantity),
    };
    const res = await miningService.addSparePartMovement(payload);
    if (res.error) {
      setError("Erreur : " + res.error.message);
      return;
    }
    setSuccess("Mouvement enregistré");
    setShowMovementModal(false);
    loadData();
    setTimeout(() => setSuccess(""), 3000);
  };

  const outOfStockCount = parts.filter((p) => (parseFloat(p.quantity_in_stock) || 0) === 0).length;
  const lowStockCount = parts.filter((p) => {
    const q = parseFloat(p.quantity_in_stock) || 0;
    const m = parseFloat(p.minimum_stock) || 0;
    return q > 0 && q <= m;
  }).length;
  const filteredParts = parts.filter((p) => {
    const q = filterSearch.toLowerCase();
    const matchesSearch =
      !filterSearch ||
      p.name.toLowerCase().includes(q) ||
      (p.reference || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q) ||
      (p.supplier || "").toLowerCase().includes(q);
    const qty = parseFloat(p.quantity_in_stock) || 0;
    const min = parseFloat(p.minimum_stock) || 0;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "rupture" && qty === 0) ||
      (filterStatus === "faible" && qty > 0 && qty <= min) ||
      (filterStatus === "normal" && qty > min);
    return matchesSearch && matchesStatus;
  });

  const closePartModal = () => setShowPartModal(false);
  const closeMovementModal = () => setShowMovementModal(false);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-foreground)" }}>
              Pièces de Rechange — Magasin
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--color-muted-foreground)" }}>
              Gestion du stock des pièces et consommables
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" onClick={() => handleOpenMovement()} className="flex items-center gap-2">
              <Icon name="ArrowLeftRight" size={16} />
              Mouvement de Stock
            </Button>
            <Button variant="default" onClick={handleOpenAddPart} className="flex items-center gap-2">
              <Icon name="Plus" size={16} />
              Ajouter Pièce
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}
        {success && (
          <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">{success}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            className="rounded-xl p-5 border"
            style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50 flex-shrink-0">
                <Icon name="Package" size={22} color="#3B82F6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>
                  Total Références
                </p>
                <p className="text-2xl font-bold mt-0.5" style={{ color: "var(--color-foreground)" }}>
                  {parts.length}
                </p>
              </div>
            </div>
          </div>
          <div
            className="rounded-xl p-5 border"
            style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-red-50 flex-shrink-0">
                <Icon name="PackageX" size={22} color="#EF4444" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>
                  Rupture de Stock
                </p>
                <p className="text-2xl font-bold mt-0.5 text-red-600">{outOfStockCount}</p>
              </div>
            </div>
          </div>
          <div
            className="rounded-xl p-5 border"
            style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-orange-50 flex-shrink-0">
                <Icon name="AlertCircle" size={22} color="#F97316" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium" style={{ color: "var(--color-muted-foreground)" }}>
                  Stock Faible
                </p>
                <p className="text-2xl font-bold mt-0.5 text-orange-600">{lowStockCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex border-b" style={{ borderColor: "var(--color-border)" }}>
          {[
            { id: "catalog", label: "Catalogue", icon: "Package" },
            { id: "movements", label: "Mouvements", icon: "ArrowLeftRight" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderColor: activeTab === tab.id ? "var(--color-accent)" : "transparent",
                color:
                  activeTab === tab.id ? "var(--color-accent)" : "var(--color-muted-foreground)",
              }}
            >
              <Icon name={tab.icon} size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "catalog" && (
          <>
            <div
              className="rounded-xl p-4 border flex flex-wrap gap-3 items-center"
              style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
            >
              <div className="relative flex-1 min-w-[220px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Icon name="Search" size={16} color="var(--color-muted-foreground)" />
                </span>
                <input
                  type="text"
                  placeholder="Référence, nom, catégorie, fournisseur…"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 text-sm rounded-lg border"
                  style={inputStyle}
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 text-sm rounded-lg border"
                style={inputStyle}
              >
                <option value="all">Tous les stocks</option>
                <option value="rupture">Rupture de stock</option>
                <option value="faible">Stock faible</option>
                <option value="normal">Stock normal</option>
              </select>
            </div>

            <div
              className="rounded-xl border overflow-hidden"
              style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
            >
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : filteredParts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Icon name="PackageOpen" size={44} color="var(--color-muted-foreground)" />
                  <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
                    Aucune pièce trouvée
                  </p>
                  <Button variant="outline" onClick={handleOpenAddPart}>
                    Ajouter une pièce
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        style={{
                          borderBottom: "1px solid var(--color-border)",
                          background: "var(--color-muted)",
                        }}
                      >
                        <th
                          className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          Pièce
                        </th>
                        <th
                          className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide whitespace-nowrap"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          Référence
                        </th>
                        <th
                          className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide whitespace-nowrap"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          Catégorie
                        </th>
                        <th
                          className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide whitespace-nowrap"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          Stock
                        </th>
                        <th
                          className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide whitespace-nowrap"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          Stock Min.
                        </th>
                        <th
                          className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide whitespace-nowrap"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          Statut
                        </th>
                        <th
                          className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide whitespace-nowrap"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          Prix Unit.
                        </th>
                        <th
                          className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredParts.map((part, idx) => {
                        const stockStatus = getStockStatus(part.quantity_in_stock, part.minimum_stock);
                        const isLast = idx === filteredParts.length - 1;
                        return (
                          <tr
                            key={part.id}
                            style={{
                              borderBottom: isLast ? "none" : "1px solid var(--color-border)",
                            }}
                          >
                            <td className="px-4 py-3.5 min-w-[180px]">
                              <div
                                className="font-medium leading-snug"
                                style={{ color: "var(--color-foreground)" }}
                              >
                                {part.name}
                              </div>
                              {part.supplier && (
                                <div
                                  className="text-xs mt-0.5"
                                  style={{ color: "var(--color-muted-foreground)" }}
                                >
                                  {part.supplier}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span
                                className="font-mono text-xs"
                                style={{ color: "var(--color-foreground)" }}
                              >
                                {part.reference || "—"}
                              </span>
                            </td>
                            <td
                              className="px-4 py-3.5 whitespace-nowrap text-sm"
                              style={{ color: "var(--color-muted-foreground)" }}
                            >
                              {part.category || "—"}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span
                                className="font-bold text-sm"
                                style={{
                                  color:
                                    (parseFloat(part.quantity_in_stock) || 0) === 0
                                      ? "#DC2626"
                                      : "var(--color-foreground)",
                                }}
                              >
                                {part.quantity_in_stock}
                              </span>
                              <span
                                className="text-xs ml-1"
                                style={{ color: "var(--color-muted-foreground)" }}
                              >
                                {part.unit}
                              </span>
                            </td>
                            <td
                              className="px-4 py-3.5 whitespace-nowrap text-sm"
                              style={{ color: "var(--color-muted-foreground)" }}
                            >
                              {part.minimum_stock}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span
                                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stockStatus.color}`}
                              >
                                {stockStatus.label}
                              </span>
                            </td>
                            <td
                              className="px-4 py-3.5 whitespace-nowrap text-sm"
                              style={{ color: "var(--color-foreground)" }}
                            >
                              {part.unit_price
                                ? `${parseFloat(part.unit_price).toLocaleString("fr-FR")} DA`
                                : "—"}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenMovement(part.id)}
                                  className="p-1.5 rounded-md hover:bg-blue-50 transition-colors"
                                  title="Enregistrer un mouvement"
                                >
                                  <Icon name="ArrowLeftRight" size={15} color="#3B82F6" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditPart(part)}
                                  className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                                  title="Modifier"
                                >
                                  <Icon name="Pencil" size={15} color="var(--color-muted-foreground)" />
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(part.id)}
                                  className="p-1.5 rounded-md hover:bg-red-50 transition-colors"
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
          </>
        )}

        {activeTab === "movements" && (
          <div
            className="rounded-xl border overflow-hidden"
            style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
          >
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            ) : movements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Icon name="ArrowLeftRight" size={44} color="var(--color-muted-foreground)" />
                <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
                  Aucun mouvement enregistré
                </p>
                <Button variant="outline" onClick={() => handleOpenMovement()}>
                  Enregistrer un mouvement
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid var(--color-border)",
                        background: "var(--color-muted)",
                      }}
                    >
                      {["Date", "Pièce", "Type", "Quantité", "Motif", "Réf. Doc."].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide whitespace-nowrap"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((mov, idx) => {
                      const typeOpt = MOVEMENT_TYPES.find((t) => t.value === mov.movement_type);
                      const isLast = idx === movements.length - 1;
                      const qtyColor =
                        mov.movement_type === "out"
                          ? "#DC2626"
                          : mov.movement_type === "in"
                          ? "#16A34A"
                          : "#2563EB";
                      const qtyPrefix =
                        mov.movement_type === "out" ? "−" : mov.movement_type === "in" ? "+" : "±";
                      return (
                        <tr
                          key={mov.id}
                          style={{
                            borderBottom: isLast ? "none" : "1px solid var(--color-border)",
                          }}
                        >
                          <td
                            className="px-4 py-3.5 whitespace-nowrap text-sm"
                            style={{ color: "var(--color-foreground)" }}
                          >
                            {mov.movement_date}
                          </td>
                          <td className="px-4 py-3.5 min-w-[160px]">
                            <div
                              className="font-medium leading-snug"
                              style={{ color: "var(--color-foreground)" }}
                            >
                              {mov.spare_part?.name || "—"}
                            </div>
                            {mov.spare_part?.reference && (
                              <div
                                className="text-xs font-mono mt-0.5"
                                style={{ color: "var(--color-muted-foreground)" }}
                              >
                                {mov.spare_part.reference}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                typeOpt?.color || "text-gray-700 bg-gray-100"
                              }`}
                            >
                              {typeOpt?.label || mov.movement_type}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="font-bold text-sm" style={{ color: qtyColor }}>
                              {qtyPrefix}
                              {mov.quantity}
                            </span>
                          </td>
                          <td
                            className="px-4 py-3.5 text-sm"
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            {mov.reason || "—"}
                          </td>
                          <td
                            className="px-4 py-3.5 whitespace-nowrap font-mono text-xs"
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            {mov.reference_doc || "—"}
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

      {showPartModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)" }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col"
            style={{ background: "var(--color-card)", maxHeight: "90vh" }}
          >
            <div
              className="flex items-center justify-between px-6 py-5 border-b flex-shrink-0"
              style={{ borderColor: "var(--color-border)" }}
            >
              <h2 className="text-lg font-bold" style={{ color: "var(--color-foreground)" }}>
                {editPart ? "Modifier la pièce" : "Ajouter une pièce au catalogue"}
              </h2>
              <button
                onClick={closePartModal}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Icon name="X" size={18} color="var(--color-muted-foreground)" />
              </button>
            </div>

            <form onSubmit={handleSubmitPart} className="flex flex-col min-h-0">
              <div
                className="overflow-y-auto p-6 space-y-5"
                style={{ maxHeight: "calc(90vh - 130px)" }}
              >
                {error && (
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelClass} style={labelStyle}>
                      Désignation <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={partForm.name}
                      onChange={(e) => setPartForm({ ...partForm, name: e.target.value })}
                      required
                      className={inputClass}
                      style={inputStyle}
                      placeholder="Ex : Filtre à huile moteur, Courroie trapézoïdale…"
                    />
                  </div>

                  <div>
                    <label className={labelClass} style={labelStyle}>
                      Référence
                    </label>
                    <input
                      type="text"
                      value={partForm.reference}
                      onChange={(e) => setPartForm({ ...partForm, reference: e.target.value })}
                      className={`${inputClass} font-mono`}
                      style={inputStyle}
                      placeholder="REF-001"
                    />
                  </div>

                  <div>
                    <label className={labelClass} style={labelStyle}>
                      Catégorie
                    </label>
                    <input
                      type="text"
                      value={partForm.category}
                      onChange={(e) => setPartForm({ ...partForm, category: e.target.value })}
                      className={inputClass}
                      style={inputStyle}
                      placeholder="Ex : Filtration, Transmission, Hydraulique…"
                    />
                  </div>

                  <div>
                    <label className={labelClass} style={labelStyle}>
                      Unité de mesure
                    </label>
                    <select
                      value={partForm.unit}
                      onChange={(e) => setPartForm({ ...partForm, unit: e.target.value })}
                      className={inputClass}
                      style={inputStyle}
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass} style={labelStyle}>
                      Prix unitaire (DA)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={partForm.unit_price}
                      onChange={(e) => setPartForm({ ...partForm, unit_price: e.target.value })}
                      className={inputClass}
                      style={inputStyle}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className={labelClass} style={labelStyle}>
                      Stock actuel
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={partForm.quantity_in_stock}
                      onChange={(e) =>
                        setPartForm({ ...partForm, quantity_in_stock: e.target.value })
                      }
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label className={labelClass} style={labelStyle}>
                      Stock minimum
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={partForm.minimum_stock}
                      onChange={(e) =>
                        setPartForm({ ...partForm, minimum_stock: e.target.value })
                      }
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label className={labelClass} style={labelStyle}>
                      Fournisseur
                    </label>
                    <input
                      type="text"
                      value={partForm.supplier}
                      onChange={(e) => setPartForm({ ...partForm, supplier: e.target.value })}
                      className={inputClass}
                      style={inputStyle}
                      placeholder="Nom du fournisseur"
                    />
                  </div>

                  <div>
                    <label className={labelClass} style={labelStyle}>
                      Emplacement magasin
                    </label>
                    <input
                      type="text"
                      value={partForm.location}
                      onChange={(e) => setPartForm({ ...partForm, location: e.target.value })}
                      className={inputClass}
                      style={inputStyle}
                      placeholder="Ex : Étagère A-3, Casier 12…"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass} style={labelStyle}>
                      Notes
                    </label>
                    <textarea
                      value={partForm.notes}
                      onChange={(e) => setPartForm({ ...partForm, notes: e.target.value })}
                      rows={3}
                      className={`${inputClass} resize-none`}
                      style={inputStyle}
                      placeholder="Informations complémentaires, conditions de stockage…"
                    />
                  </div>
                </div>
              </div>

              <div
                className="p-5 border-t flex gap-3 flex-shrink-0"
                style={{ borderColor: "var(--color-border)" }}
              >
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={closePartModal}
                >
                  Annuler
                </Button>
                <Button type="submit" variant="default" className="flex-1">
                  {editPart ? "Mettre à jour" : "Ajouter au catalogue"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMovementModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)" }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col"
            style={{ background: "var(--color-card)", maxHeight: "90vh" }}
          >
            <div
              className="flex items-center justify-between px-6 py-5 border-b flex-shrink-0"
              style={{ borderColor: "var(--color-border)" }}
            >
              <h2 className="text-lg font-bold" style={{ color: "var(--color-foreground)" }}>
                Enregistrer un mouvement de stock
              </h2>
              <button
                onClick={closeMovementModal}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Icon name="X" size={18} color="var(--color-muted-foreground)" />
              </button>
            </div>

            <form onSubmit={handleSubmitMovement} className="flex flex-col min-h-0">
              <div
                className="overflow-y-auto p-6 space-y-5"
                style={{ maxHeight: "calc(90vh - 130px)" }}
              >
                {error && (
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className={labelClass} style={labelStyle}>
                    Pièce <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={movementForm.part_id}
                    onChange={(e) =>
                      setMovementForm({ ...movementForm, part_id: e.target.value })
                    }
                    required
                    className={inputClass}
                    style={inputStyle}
                  >
                    <option value="">— Sélectionner une pièce —</option>
                    {parts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.reference ? ` (${p.reference})` : ""} — Stock actuel :{" "}
                        {p.quantity_in_stock} {p.unit}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass} style={labelStyle}>
                      Type de mouvement <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={movementForm.movement_type}
                      onChange={(e) =>
                        setMovementForm({ ...movementForm, movement_type: e.target.value })
                      }
                      className={inputClass}
                      style={inputStyle}
                    >
                      {MOVEMENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass} style={labelStyle}>
                      Quantité <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={movementForm.quantity}
                      onChange={(e) =>
                        setMovementForm({ ...movementForm, quantity: e.target.value })
                      }
                      required
                      className={inputClass}
                      style={inputStyle}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className={labelClass} style={labelStyle}>
                      Date du mouvement
                    </label>
                    <input
                      type="date"
                      value={movementForm.movement_date}
                      onChange={(e) =>
                        setMovementForm({ ...movementForm, movement_date: e.target.value })
                      }
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label className={labelClass} style={labelStyle}>
                      Référence document
                    </label>
                    <input
                      type="text"
                      value={movementForm.reference_doc}
                      onChange={(e) =>
                        setMovementForm({ ...movementForm, reference_doc: e.target.value })
                      }
                      className={`${inputClass} font-mono`}
                      style={inputStyle}
                      placeholder="BL-0001, BON-123…"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass} style={labelStyle}>
                      Motif / Observation
                    </label>
                    <input
                      type="text"
                      value={movementForm.reason}
                      onChange={(e) =>
                        setMovementForm({ ...movementForm, reason: e.target.value })
                      }
                      className={inputClass}
                      style={inputStyle}
                      placeholder="Ex : Réparation engin CAT D6, Commande fournisseur…"
                    />
                  </div>
                </div>
              </div>

              <div
                className="p-5 border-t flex gap-3 flex-shrink-0"
                style={{ borderColor: "var(--color-border)" }}
              >
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={closeMovementModal}
                >
                  Annuler
                </Button>
                <Button type="submit" variant="default" className="flex-1">
                  Enregistrer le mouvement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)" }}
        >
          <div
            className="w-full max-w-sm rounded-2xl shadow-2xl"
            style={{ background: "var(--color-card)" }}
          >
            <div
              className="px-6 py-5 border-b"
              style={{ borderColor: "var(--color-border)" }}
            >
              <h3 className="text-lg font-bold" style={{ color: "var(--color-foreground)" }}>
                Confirmer la suppression
              </h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
                Cette pièce sera supprimée définitivement du catalogue. Cette action est
                irréversible.
              </p>
            </div>
            <div
              className="p-5 border-t flex gap-3"
              style={{ borderColor: "var(--color-border)" }}
            >
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmDeleteId(null)}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleDeletePart(confirmDeleteId)}
              >
                Supprimer définitivement
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
