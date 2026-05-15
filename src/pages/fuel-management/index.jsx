import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer,
} from "recharts";
import AppLayout from "../../components/navigation/AppLayout";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";
import { miningService } from "../../config/supabase";
import { useAuth } from "../../context/AuthContext";
import toast from "../../utils/toast";
import { default as hotToast } from "react-hot-toast";
import { exportFuelReport } from "../../utils/excelExport";

const inputStyle = {
  borderColor: "var(--color-border)",
  background: "var(--color-input)",
  color: "var(--color-foreground)",
};
const labelClass = "block text-sm font-semibold mb-1.5";
const inputClass = "w-full px-4 py-3 text-sm rounded-lg border transition-colors";

export default function FuelManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [consumption, setConsumption] = useState([]);
  const [fuelEntries, setFuelEntries] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("sorties");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);

  const emptyConsumption = {
    date: "",
    equipment_id: "",
    fuel_type: "gasoil",
    quantity: "",
    cost_per_liter: "",
    supplier: "",
    operator_name: "",
    notes: "",
  };

  const emptyEntry = {
    entry_date: "",
    fuel_type: "gasoil",
    quantity_liters: "",
    cost_per_liter: "",
    supplier: "",
    notes: "",
  };

  const [newEntry, setNewEntry] = useState(emptyConsumption);
  const [newFuelEntry, setNewFuelEntry] = useState(emptyEntry);

  const loadFuelData = async () => {
    setLoading(true);
    try {
      const { data, error } = await miningService.getFuelTransactions();
      if (error) {
        toast.error(`Erreur chargement: ${error.message}`);
      } else {
        const mappedData = (data || []).map((item) => ({
          ...item,
          date: item.transaction_date,
          equipment: item.equipment?.name || item.equipment_id,
          operator: item.operator_name || "N/A",
          site: item.site?.name || "N/A",
          cost: parseFloat(item.total_cost || item.quantity * item.cost_per_liter || 0).toFixed(2),
        }));
        setConsumption(mappedData);
      }
    } catch {
      toast.error("Erreur de chargement des données carburant");
    } finally {
      setLoading(false);
    }
  };

  const loadFuelEntries = async () => {
    setEntriesLoading(true);
    try {
      const { data, error } = await miningService.getFuelEntries();
      if (error) toast.error(`Erreur: ${error.message}`);
      else setFuelEntries(data || []);
    } catch {
      toast.error("Erreur de chargement des entrées carburant");
    } finally {
      setEntriesLoading(false);
    }
  };

  const loadEquipment = async () => {
    try {
      const { data, error } = await miningService.getEquipment();
      if (!error) setEquipment(data || []);
    } catch {
      setEquipment([]);
    }
  };

  useEffect(() => {
    loadFuelData();
    loadFuelEntries();
    loadEquipment();
  }, []);

  const totalConsumption = consumption.reduce((s, i) => s + parseFloat(i.quantity || 0), 0);
  const totalCost = consumption.reduce((s, i) => s + parseFloat(i.cost || 0), 0);

  const totalEntriesL = fuelEntries.reduce((s, e) => s + parseFloat(e.quantity_liters || 0), 0);
  const stockEstime = Math.max(0, totalEntriesL - totalConsumption);

  const consumptionByMachine = consumption.reduce((acc, item) => {
    const machine = item.equipment || "Inconnu";
    acc[machine] = (acc[machine] || 0) + parseFloat(item.quantity || 0);
    return acc;
  }, {});

  const consumptionChartData = Object.entries(consumptionByMachine).map(([machine, qty]) => ({
    machine: machine.length > 15 ? machine.substring(0, 15) + "..." : machine,
    consommation: Math.round(qty * 100) / 100,
  }));

  const costByDate = consumption.reduce((acc, item) => {
    const date = item.date ? new Date(item.date).toISOString().split("T")[0] : "Inconnue";
    acc[date] = (acc[date] || 0) + parseFloat(item.cost || 0);
    return acc;
  }, {});

  const costEvolutionData = Object.entries(costByDate)
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .map(([date, cout]) => ({
      date: new Date(date).toLocaleDateString("fr-FR"),
      coût: Math.round(cout * 100) / 100,
    }));

  const handleAddFuelEntry = async () => {
    if (!newEntry.date || !newEntry.equipment_id || !newEntry.quantity || !newEntry.cost_per_liter) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    const qty = parseFloat(newEntry.quantity);
    if (qty > stockEstime) {
      toast.error(`Stock insuffisant — stock actuel : ${stockEstime.toFixed(0)} L, quantité demandée : ${qty.toFixed(0)} L`);
      return;
    }
    const loadingId = hotToast.loading("Enregistrement...", { position: "top-right" });
    try {
      const { error } = await miningService.addFuelTransaction(newEntry);
      toast.dismiss(loadingId);
      if (error) {
        toast.error(`Erreur: ${error.message}`);
      } else {
        toast.success(`Consommation enregistrée: ${newEntry.quantity} L`);
        setShowAddModal(false);
        setNewEntry(emptyConsumption);
        loadFuelData();
        loadFuelEntries();
      }
    } catch {
      toast.dismiss(loadingId);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleAddEntry = async () => {
    if (!newFuelEntry.entry_date || !newFuelEntry.quantity_liters || !newFuelEntry.cost_per_liter) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    const loadingId = hotToast.loading("Enregistrement...", { position: "top-right" });
    try {
      const payload = {
        entry_date: newFuelEntry.entry_date,
        fuel_type: newFuelEntry.fuel_type,
        quantity_liters: parseFloat(newFuelEntry.quantity_liters),
        cost_per_liter: parseFloat(newFuelEntry.cost_per_liter),
        supplier: newFuelEntry.supplier || null,
        notes: newFuelEntry.notes || null,
      };
      const { error } = await miningService.addFuelEntry(payload);
      toast.dismiss(loadingId);
      if (error) {
        toast.error(`Erreur: ${error.message}`);
      } else {
        toast.success(`Entrée enregistrée: ${newFuelEntry.quantity_liters} L`);
        setShowEntryModal(false);
        setNewFuelEntry(emptyEntry);
        loadFuelEntries();
        loadFuelData();
      }
    } catch {
      toast.dismiss(loadingId);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("fr-FR");
  };

  const tabs = [
    { id: "sorties", label: "Sorties (Consommation)" },
    { id: "entrees", label: "Entrées (Approvisionnement)" },
    { id: "graphiques", label: "Graphiques" },
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
            Gestion du Carburant
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted-foreground)" }}>
            Suivi des entrées, consommations et coûts de carburant par machine
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            iconName="Download"
            iconPosition="left"
            onClick={() => exportFuelReport("month", consumption)}
          >
            Télécharger Rapport
          </Button>
          <Button
            variant="outline"
            iconName="Wrench"
            iconPosition="left"
            onClick={() => navigate("/equipment-management")}
          >
            Gérer Équipements
          </Button>
          <Button
            variant="default"
            iconName="Plus"
            iconPosition="left"
            onClick={() => setShowAddModal(true)}
          >
            Ajouter Consommation
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(229,62,62,0.12)" }}>
              <Icon name="Fuel" size={20} color="var(--color-error)" />
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Total Consommé</p>
              <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                {totalConsumption.toFixed(0)} L
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(229,62,62,0.12)" }}>
              <Icon name="Receipt" size={20} color="var(--color-error)" />
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Coût Total</p>
              <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                {totalCost.toLocaleString("fr-FR")} DA
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(56,161,105,0.12)" }}>
              <Icon name="TrendingUp" size={20} color="var(--color-success)" />
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Transactions</p>
              <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                {consumption.length}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(237,137,54,0.14)" }}>
              <Icon name="Droplets" size={20} color="#DD6B20" />
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Stock Estimé</p>
              <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                {stockEstime.toFixed(0)} L
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
              className="px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap"
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

        {activeTab === "sorties" && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                  {["Date", "Machine", "Opérateur", "Type", "Quantité (L)", "Coût (DA)", "Site", "Actions"].map((h) => (
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
                ) : consumption.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center" style={{ color: "var(--color-muted-foreground)" }}>
                      Aucune consommation enregistrée. Ajoutez la première !
                    </td>
                  </tr>
                ) : (
                  consumption.map((item) => (
                    <tr key={item.id} className="border-b" style={{ borderColor: "var(--color-border)" }}>
                      <td className="p-4 text-sm whitespace-nowrap" style={{ color: "var(--color-foreground)" }}>
                        {formatDate(item.date)}
                      </td>
                      <td className="p-4 font-medium text-sm" style={{ color: "var(--color-foreground)" }}>
                        {item.equipment}
                      </td>
                      <td className="p-4 text-sm" style={{ color: "var(--color-foreground)" }}>
                        {item.operator}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: "rgba(56,161,105,0.12)", color: "var(--color-success)", fontFamily: "monospace" }}>
                          {item.fuel_type}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-sm" style={{ color: "var(--color-foreground)" }}>
                        {item.quantity}
                      </td>
                      <td className="p-4 text-sm" style={{ color: "var(--color-foreground)" }}>
                        {item.cost}
                      </td>
                      <td className="p-4 text-sm" style={{ color: "var(--color-foreground)" }}>
                        {item.site}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" iconName="Edit" />
                          <Button variant="ghost" size="sm" iconName="Trash2" />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "entrees" && (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
                {fuelEntries.length} entrée{fuelEntries.length !== 1 ? "s" : ""} enregistrée{fuelEntries.length !== 1 ? "s" : ""}
              </p>
              <Button
                variant="default"
                iconName="Plus"
                iconPosition="left"
                size="sm"
                onClick={() => { setNewFuelEntry(emptyEntry); setShowEntryModal(true); }}
              >
                Ajouter Entrée
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                    {["Date", "Type Carburant", "Quantité (L)", "Prix/L (DA)", "Coût Total (DA)", "Fournisseur", "Notes"].map((h) => (
                      <th key={h} className="text-left p-4 text-sm font-medium whitespace-nowrap" style={{ color: "var(--color-muted-foreground)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entriesLoading ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center" style={{ color: "var(--color-muted-foreground)" }}>
                        Chargement...
                      </td>
                    </tr>
                  ) : fuelEntries.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center" style={{ color: "var(--color-muted-foreground)" }}>
                        Aucune entrée carburant enregistrée.
                      </td>
                    </tr>
                  ) : (
                    fuelEntries.map((e) => (
                      <tr key={e.id} className="border-b" style={{ borderColor: "var(--color-border)" }}>
                        <td className="p-4 text-sm whitespace-nowrap" style={{ color: "var(--color-foreground)" }}>
                          {formatDate(e.entry_date)}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: "rgba(237,137,54,0.14)", color: "#DD6B20", fontFamily: "monospace" }}>
                            {e.fuel_type}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-sm" style={{ color: "var(--color-foreground)" }}>
                          {parseFloat(e.quantity_liters || 0).toFixed(1)}
                        </td>
                        <td className="p-4 text-sm" style={{ color: "var(--color-foreground)" }}>
                          {e.cost_per_liter ? parseFloat(e.cost_per_liter).toLocaleString("fr-FR") : "—"}
                        </td>
                        <td className="p-4 text-sm" style={{ color: "var(--color-foreground)" }}>
                          {e.cost_per_liter
                            ? (parseFloat(e.quantity_liters || 0) * parseFloat(e.cost_per_liter)).toLocaleString("fr-FR")
                            : "—"}
                        </td>
                        <td className="p-4 text-sm" style={{ color: "var(--color-foreground)" }}>
                          {e.supplier || "—"}
                        </td>
                        <td className="p-4 text-sm max-w-[160px] truncate" style={{ color: "var(--color-muted-foreground)" }}>
                          {e.notes || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "graphiques" && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border p-6" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
                <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>
                  Consommation par Machine
                </h3>
                <div className="h-64">
                  {consumptionChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={consumptionChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis
                          dataKey="machine"
                          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip formatter={(value) => [`${value} L`, "Consommation"]} />
                        <Legend />
                        <Bar dataKey="consommation" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center rounded-lg" style={{ color: "var(--color-muted-foreground)", background: "rgba(0,0,0,0.03)" }}>
                      Aucune donnée disponible
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-xl border p-6" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
                <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>
                  Évolution Coûts
                </h3>
                <div className="h-64">
                  {costEvolutionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={costEvolutionData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip formatter={(value) => [`${value} DA`, "Coût"]} />
                        <Legend />
                        <Line type="monotone" dataKey="coût" stroke="var(--color-warning)" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center rounded-lg" style={{ color: "var(--color-muted-foreground)", background: "rgba(0,0,0,0.03)" }}>
                      Aucune donnée disponible
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl w-full max-w-2xl flex flex-col" style={{ background: "var(--color-card)", maxHeight: "90vh" }}>
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "var(--color-border)" }}>
              <h3 className="text-lg font-semibold" style={{ color: "var(--color-foreground)" }}>
                Ajouter Consommation Carburant
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                    Équipement *
                  </label>
                  <select
                    value={newEntry.equipment_id}
                    onChange={(e) => setNewEntry({ ...newEntry, equipment_id: e.target.value })}
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
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                  Type Carburant *
                </label>
                <select
                  value={newEntry.fuel_type}
                  onChange={(e) => setNewEntry({ ...newEntry, fuel_type: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                >
                  <option value="gasoil">Gasoil</option>
                  <option value="essence">Essence</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                    Quantité (L) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newEntry.quantity}
                    onChange={(e) => setNewEntry({ ...newEntry, quantity: e.target.value })}
                    className={inputClass}
                    style={inputStyle}
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                    Prix/L (DA) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newEntry.cost_per_liter}
                    onChange={(e) => setNewEntry({ ...newEntry, cost_per_liter: e.target.value })}
                    className={inputClass}
                    style={inputStyle}
                    placeholder="0.00"
                  />
                </div>
              </div>
              {newEntry.quantity && newEntry.cost_per_liter && (
                <div className="px-4 py-3 rounded-lg" style={{ background: "rgba(56,161,105,0.10)", border: "1px solid rgba(56,161,105,0.4)" }}>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-success)" }}>
                    Total:{" "}
                    {(parseFloat(newEntry.quantity) * parseFloat(newEntry.cost_per_liter)).toLocaleString("fr-FR")} DA
                  </p>
                </div>
              )}
              <div>
                <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                  Opérateur
                </label>
                <input
                  type="text"
                  value={newEntry.operator_name}
                  onChange={(e) => setNewEntry({ ...newEntry, operator_name: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="Nom de l'opérateur"
                />
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                  Fournisseur
                </label>
                <input
                  type="text"
                  value={newEntry.supplier}
                  onChange={(e) => setNewEntry({ ...newEntry, supplier: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="Fournisseur optionnel"
                />
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                  Notes
                </label>
                <textarea
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                  rows="3"
                  className={inputClass + " resize-vertical"}
                  style={inputStyle}
                  placeholder="Notes optionnelles..."
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-5 border-t" style={{ borderColor: "var(--color-border)" }}>
              <Button variant="default" onClick={handleAddFuelEntry} className="flex-1">
                Enregistrer
              </Button>
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}

      {showEntryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl w-full max-w-2xl flex flex-col" style={{ background: "var(--color-card)", maxHeight: "90vh" }}>
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "var(--color-border)" }}>
              <h3 className="text-lg font-semibold" style={{ color: "var(--color-foreground)" }}>
                Ajouter Entrée Carburant
              </h3>
              <button
                onClick={() => setShowEntryModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                <Icon name="X" size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-5" style={{ maxHeight: "calc(90vh - 130px)" }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    value={newFuelEntry.entry_date}
                    onChange={(e) => setNewFuelEntry({ ...newFuelEntry, entry_date: e.target.value })}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                    Type Carburant *
                  </label>
                  <select
                    value={newFuelEntry.fuel_type}
                    onChange={(e) => setNewFuelEntry({ ...newFuelEntry, fuel_type: e.target.value })}
                    className={inputClass}
                    style={inputStyle}
                  >
                    <option value="gasoil">Gasoil</option>
                    <option value="essence">Essence</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                    Quantité (L) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newFuelEntry.quantity_liters}
                    onChange={(e) => setNewFuelEntry({ ...newFuelEntry, quantity_liters: e.target.value })}
                    className={inputClass}
                    style={inputStyle}
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                    Prix/L (DA) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newFuelEntry.cost_per_liter}
                    onChange={(e) => setNewFuelEntry({ ...newFuelEntry, cost_per_liter: e.target.value })}
                    className={inputClass}
                    style={inputStyle}
                    placeholder="0.00"
                  />
                </div>
              </div>
              {newFuelEntry.quantity_liters && newFuelEntry.cost_per_liter && (
                <div className="px-4 py-3 rounded-lg" style={{ background: "rgba(237,137,54,0.10)", border: "1px solid rgba(237,137,54,0.4)" }}>
                  <p className="text-sm font-semibold" style={{ color: "#DD6B20" }}>
                    Total:{" "}
                    {(parseFloat(newFuelEntry.quantity_liters) * parseFloat(newFuelEntry.cost_per_liter)).toLocaleString("fr-FR")} DA
                  </p>
                </div>
              )}
              <div>
                <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                  Fournisseur
                </label>
                <input
                  type="text"
                  value={newFuelEntry.supplier}
                  onChange={(e) => setNewFuelEntry({ ...newFuelEntry, supplier: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="Nom du fournisseur"
                />
              </div>
              <div>
                <label className={labelClass} style={{ color: "var(--color-foreground)" }}>
                  Notes
                </label>
                <textarea
                  value={newFuelEntry.notes}
                  onChange={(e) => setNewFuelEntry({ ...newFuelEntry, notes: e.target.value })}
                  rows="3"
                  className={inputClass + " resize-vertical"}
                  style={inputStyle}
                  placeholder="Notes optionnelles..."
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-5 border-t" style={{ borderColor: "var(--color-border)" }}>
              <Button variant="default" onClick={handleAddEntry} className="flex-1">
                Enregistrer
              </Button>
              <Button variant="outline" onClick={() => setShowEntryModal(false)} className="flex-1">
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
