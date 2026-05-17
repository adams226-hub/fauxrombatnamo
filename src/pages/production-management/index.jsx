import React, { useState, useEffect } from "react";
import { toastError, toastSuccess } from "../../utils/toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { miningService } from "../../config/supabase";
import AppLayout from "../../components/navigation/AppLayout";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";

export default function ProductionManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [productionData, setProductionData] = useState([]);
  const [exitData, setExitData] = useState([]); // Nouveau: suivi des sorties
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [filterProdDateFrom, setFilterProdDateFrom] = useState('');
  const [filterProdDateTo, setFilterProdDateTo] = useState('');
  const [filterProdOperator, setFilterProdOperator] = useState('');
  const [filterProdSite, setFilterProdSite] = useState('');
  const [activeTab, setActiveTab] = useState('production');
  const [consumableMovements, setConsumableMovements] = useState([]);
  const [showConsumableModal, setShowConsumableModal] = useState(false);
  const emptyConsumableForm = {
    movement_date: new Date().toISOString().split('T')[0],
    movement_type: 'in',
    category: '',
    quantity: '',
    unit: 'unité',
    notes: '',
    operator_name: '',
  };
  const [consumableForm, setConsumableForm] = useState(emptyConsumableForm);
  // Liste cohérente des dimensions
  const DIMENSIONS_LIST = [
    'Nombre de Voyage Alimenté', 'Nombre de Trous Forés', '0/4', '0/5', '0/6', '5/15', '8/15', '15/25', '4/6', '4/6 Enrobé', '10/14', '6/10', '0/31,5'
  ];

  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    site: 'Site Principal',
    shift: 'Jour',
    operator: '',
    notes: '',
    dimensions: DIMENSIONS_LIST.map(dim => ({ dimension: dim, quantity: 0 }))
  });

  const [newExit, setNewExit] = useState({
    date: '',
    destination: '',
    exit_type: 'sale',
    dimensions: DIMENSIONS_LIST.map(dim => ({ dimension: dim, quantity: '' })),
    client_name: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const computeProductionTotal = (entry) => {
    if (entry?.total && !isNaN(parseFloat(entry.total))) {
      return parseFloat(entry.total);
    }
    if (Array.isArray(entry?.dimensions)) {
      return entry.dimensions.reduce((sum, dim) => sum + (parseFloat(dim?.quantity) || 0), 0);
    }
    return 0;
  };

  const normalizeProductionData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map(entry => ({
      ...entry,
      // Supabase retourne production_details, on le mappe vers dimensions
      dimensions: entry.production_details || entry.dimensions || [],
      total: computeProductionTotal(entry),
    }));
  };

  const normalizeExitData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map(exit => ({
      ...exit,
      // Supabase retourne production_exit_details, on le mappe vers dimensions
      dimensions: exit.production_exit_details || exit.dimensions || [],
    }));
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const [productionResult, exitsResult, stockResult, consumableResult] = await Promise.all([
        miningService.getProductionData(),
        miningService.getProductionExits(),
        miningService.getStockSummary(),
        miningService.getConsumableMovements(),
      ]);

      if (productionResult.error) throw productionResult.error;
      if (exitsResult.error) throw exitsResult.error;

      setProductionData(normalizeProductionData(productionResult.data || []));
      setExitData(normalizeExitData(exitsResult.data || []));
      setStockData(stockResult.data || []);
      setConsumableMovements(consumableResult.data || []);

    } catch (err) {
      console.error('Erreur chargement production:', err);
      toastError('Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  };



  const handleAddProduction = async () => {
    try {
      if (!newEntry.date || !newEntry.site || !newEntry.operator) {
        toastError('Veuillez remplir les champs obligatoires');
        return;
      }

      const hasQuantities = newEntry.dimensions.some(dim => dim.quantity && parseFloat(dim.quantity) > 0);
      if (!hasQuantities) {
        toastError('Veuillez saisir au moins une quantité');
        return;
      }

      const total = newEntry.dimensions.reduce((sum, dim) => 
        sum + (parseFloat(dim.quantity) || 0), 0
      );

      const entryToSave = {
        date: newEntry.date,
        site: newEntry.site,
        shift: newEntry.shift,
        operator: newEntry.operator,
        dimensions: newEntry.dimensions.map(dim => ({
          dimension: dim.dimension,
          quantity: parseFloat(dim.quantity) || 0
        })),
        total: total,
        notes: newEntry.notes
      };

      const result = await miningService.addProductionData(entryToSave);
      if (result.error) throw result.error;

      toastSuccess(`Production enregistrée: ${total} tonnes`);
      await loadData();

      setNewEntry({
        date: new Date().toISOString().split('T')[0],
        site: 'Site Principal',
        shift: 'Jour',
        operator: '',
        notes: '',
        dimensions: DIMENSIONS_LIST.map(dim => ({ dimension: dim, quantity: 0 }))
      });

      setShowAddModal(false);
      
    } catch (error) {
      console.error("Erreur ajout production:", error);
      toastError("Erreur lors de l'enregistrement de la production");
    }
  };

  const handleAddExit = async () => {
    try {
      if (!newExit.date || !newExit.destination) {
        toastError('Veuillez remplir les champs obligatoires');
        return;
      }

      const hasQuantities = newExit.dimensions.some(dim => dim.quantity && parseFloat(dim.quantity) > 0);
      if (!hasQuantities) {
        toastError('Veuillez saisir au moins une quantité');
        return;
      }

      // Vérification stricte du stock disponible par dimension
      for (const dim of newExit.dimensions) {
        const qty = parseFloat(dim.quantity);
        if (qty > 0) {
          const stockDim = stockData.find(s => s.dimension === dim.dimension);
          const available = stockDim ? stockDim.available : 0;
          if (qty > available) {
            toastError(`Stock insuffisant pour "${dim.dimension}". Disponible: ${available.toFixed(1)} t — Demandé: ${qty.toFixed(1)} t`);
            return;
          }
        }
      }

      const total = newExit.dimensions.reduce((sum, dim) => 
        sum + (parseFloat(dim.quantity) || 0), 0
      );

      // Créer l'entrée de sortie
      const exitToSave = {
        date: newExit.date,
        destination: newExit.destination,
        exit_type: newExit.exit_type,
        dimensions: newExit.dimensions.map(dim => ({
          dimension: dim.dimension,
          quantity: parseFloat(dim.quantity) || 0
        })),
        client_name: newExit.client_name,
        notes: newExit.notes,
        total: total
      };

      const result = await miningService.addProductionExit(exitToSave);
      if (result.error) throw result.error;

      toastSuccess(`Sortie enregistrée: ${total} tonnes`);
      await loadData();

      setNewExit({
        date: '',
        destination: '',
        exit_type: 'sale',
        dimensions: DIMENSIONS_LIST.map(dim => ({ dimension: dim, quantity: '' })),
        client_name: '',
        notes: ''
      });

      setShowExitModal(false);

    } catch (error) {
      console.error("Erreur ajout sortie:", error);
      toastError("Erreur lors de l'enregistrement de la sortie");
    }
  };

  const handleAddConsumableMovement = async () => {
    if (!consumableForm.category.trim() || !consumableForm.quantity || !consumableForm.movement_date) {
      toastError('Veuillez remplir : catégorie, quantité et date');
      return;
    }
    const qty = parseFloat(consumableForm.quantity);
    if (consumableForm.movement_type === 'out') {
      const currentStock = consumableMovements
        .filter(m => m.category === consumableForm.category.trim())
        .reduce((s, m) => s + (m.movement_type === 'in' ? parseFloat(m.quantity) : -parseFloat(m.quantity)), 0);
      if (qty > Math.max(0, currentStock)) {
        toastError(`Stock insuffisant pour "${consumableForm.category}" — disponible : ${Math.max(0, currentStock).toFixed(1)}, demandé : ${qty.toFixed(1)}`);
        return;
      }
    }
    const result = await miningService.addConsumableMovement({
      ...consumableForm,
      category: consumableForm.category.trim(),
      quantity: qty,
    });
    if (result.error) { toastError("Erreur lors de l'enregistrement"); return; }
    toastSuccess('Mouvement consommable enregistré');
    setConsumableForm(emptyConsumableForm);
    setShowConsumableModal(false);
    loadData();
  };

  const filteredProductionData = productionData.filter(p => {
    if (filterProdDateFrom && p.date < filterProdDateFrom) return false;
    if (filterProdDateTo && p.date > filterProdDateTo) return false;
    if (filterProdOperator && !p.operator?.toLowerCase().includes(filterProdOperator.toLowerCase())) return false;
    if (filterProdSite && !p.site?.toLowerCase().includes(filterProdSite.toLowerCase())) return false;
    return true;
  });

  const totalProduction = productionData.reduce((sum, item) => sum + (parseFloat(item?.total) || 0), 0);
  const totalStock = stockData.reduce((sum, item) => sum + (parseFloat(item?.available) || 0), 0);

  if (loading) {
    return (
      <AppLayout userRole={user?.role} userName={user?.full_name} userSite="Amp Mines et Carrieres">
        <div className="flex items-center justify-center h-64">
          <p style={{ color: "var(--color-muted-foreground)" }}>Chargement...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout userRole={user?.role} userName={user?.full_name} userSite="Amp Mines et Carrieres">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-foreground)" }}>
            Gestion de Production
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted-foreground)" }}>
            Saisie de production et suivi du stock par dimension
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {activeTab === 'production' && (
            <>
              <Button variant="default" iconName="Plus" iconPosition="left" onClick={() => setShowAddModal(true)}>
                Saisie Production
              </Button>
              <Button variant="outline" iconName="Package" iconPosition="left" onClick={() => setShowExitModal(true)}>
                Sortie Stock
              </Button>
            </>
          )}
          {activeTab === 'consommables' && (
            <Button variant="default" iconName="Plus" iconPosition="left" onClick={() => setShowConsumableModal(true)}>
              Nouveau Mouvement
            </Button>
          )}
          <Button variant="outline" iconName="ArrowLeft" iconPosition="left" onClick={() => navigate("/")}>
            Retour
          </Button>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex border-b mb-6" style={{ borderColor: "var(--color-border)" }}>
        {[
          { id: 'production', label: 'Production & Stock', icon: 'Mountain' },
          { id: 'consommables', label: 'Consommables', icon: 'Boxes' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors"
            style={{
              borderColor: activeTab === tab.id ? 'var(--color-primary)' : 'transparent',
              color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
            }}
          >
            <Icon name={tab.icon} size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'production' && (<>
      {/* Cartes de synthèse */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
              <Icon name="TrendingUp" size={20} color="#22c55e" />
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Production Totale</p>
              <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                {totalProduction.toFixed(1)} t
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
              <Icon name="Package" size={20} color="#22c55e" />
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Stock Disponible</p>
              <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                {totalStock.toFixed(1)} t
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(49,130,206,0.12)" }}>
              <Icon name="Calendar" size={20} color="#3182CE" />
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Saisies Aujourd'hui</p>
              <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                {productionData.filter(p => p.date === new Date().toISOString().split('T')[0]).length}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(214,158,46,0.12)" }}>
              <Icon name="Activity" size={20} color="var(--color-warning)" />
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Moyenne/Saisie</p>
              <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                {productionData.length > 0 ? (totalProduction / productionData.length).toFixed(1) : 0} t
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau du stock par dimension */}
      <div className="rounded-xl border" style={{ background: "var(--color-card)" }}>
        <div className="p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-foreground)" }}>
            Stock par Dimension
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Dimension</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Entrées Cumulées</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Sorties Cumulées</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Stock Disponible</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {stockData.map((item, index) => (
                <tr key={index} className="border-b" style={{ borderColor: "var(--color-border)" }}>
                  <td className="p-4">
                    <span className="font-medium" style={{ color: "var(--color-foreground)" }}>
                      {item.dimension}
                    </span>
                  </td>
                  <td className="p-4" style={{ color: "var(--color-success)", fontWeight: 'bold' }}>
                    +{item.entries.toFixed(1)} t
                  </td>
                  <td className="p-4" style={{ color: "var(--color-error)", fontWeight: 'bold' }}>
                    -{item.exits.toFixed(1)} t
                  </td>
                  <td className="p-4" style={{ color: "var(--color-foreground)", fontWeight: 'bold' }}>
                    {item.available.toFixed(1)} t
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium" 
                      style={{ 
                        background: item.available > 100 ? "rgba(34,197,94,0.12)" : item.available > 50 ? "rgba(214,158,46,0.12)" : "rgba(239,68,68,0.12)",
                        color: item.available > 100 ? "var(--color-success)" : item.available > 50 ? "var(--color-warning)" : "var(--color-error)"
                      }}>
                      {item.available > 100 ? 'Bon' : item.available > 50 ? 'Faible' : 'Critique'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filtres historique productions */}
      <div className="rounded-xl border mt-6 p-4" style={{ background: "var(--color-card)" }}>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-2">
            <Icon name="Filter" size={16} color="var(--color-muted-foreground)" />
            <span className="text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Filtres</span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Du</label>
            <input type="date" value={filterProdDateFrom} onChange={e => setFilterProdDateFrom(e.target.value)}
              className="p-2 rounded border text-sm"
              style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Au</label>
            <input type="date" value={filterProdDateTo} onChange={e => setFilterProdDateTo(e.target.value)}
              className="p-2 rounded border text-sm"
              style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }} />
          </div>
          <div className="flex flex-col gap-1" style={{ minWidth: '160px' }}>
            <label className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Opérateur</label>
            <input type="text" value={filterProdOperator} onChange={e => setFilterProdOperator(e.target.value)}
              placeholder="Nom opérateur..."
              className="p-2 rounded border text-sm"
              style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }} />
          </div>
          <div className="flex flex-col gap-1" style={{ minWidth: '160px' }}>
            <label className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Site</label>
            <input type="text" value={filterProdSite} onChange={e => setFilterProdSite(e.target.value)}
              placeholder="Nom du site..."
              className="p-2 rounded border text-sm"
              style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }} />
          </div>
          <button onClick={() => { setFilterProdDateFrom(''); setFilterProdDateTo(''); setFilterProdOperator(''); setFilterProdSite(''); }}
            className="px-3 py-2 rounded border text-sm transition-colors hover:bg-muted"
            style={{ borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }}>
            Réinitialiser
          </button>
          <span className="text-xs self-end pb-2" style={{ color: "var(--color-muted-foreground)" }}>
            {filteredProductionData.length} saisie{filteredProductionData.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Historique des productions */}
      <div className="rounded-xl border mt-2" style={{ background: "var(--color-card)" }}>
        <div className="p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-foreground)" }}>
            Historique des Productions
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Date</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Site</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Opérateur</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Total</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Détails</th>
              </tr>
            </thead>
            <tbody>
              {filteredProductionData.map((item) => (
                <tr key={item.id} className="border-b" style={{ borderColor: "var(--color-border)" }}>
                  <td className="p-4" style={{ color: "var(--color-foreground)" }}>{item.date}</td>
                  <td className="p-4" style={{ color: "var(--color-foreground)" }}>{item.site}</td>
                  <td className="p-4" style={{ color: "var(--color-foreground)" }}>{item.operator}</td>
                  <td className="p-4" style={{ color: "var(--color-foreground)", fontWeight: 'bold' }}>
                    {item.total.toFixed(1)} t
                  </td>
                  <td className="p-4">
                    <div className="text-xs">
                      {item.dimensions.map(dim => (
                        <div key={dim.dimension} style={{ color: "var(--color-muted-foreground)" }}>
                          {dim.dimension}: {dim.quantity}t
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      </>)}

      {/* ── Onglet Consommables ───────────────────────────────── */}
      {activeTab === 'consommables' && (() => {
        // Calcul stock par catégorie
        const stockMap = {};
        consumableMovements.forEach(m => {
          const cat = m.category || 'Autre';
          if (!stockMap[cat]) stockMap[cat] = { category: cat, stock: 0, unit: m.unit || '' };
          stockMap[cat].stock += m.movement_type === 'in' ? parseFloat(m.quantity) : -parseFloat(m.quantity);
        });
        const stockByCat = Object.values(stockMap).map(c => ({ ...c, stock: Math.max(0, c.stock) })).sort((a, b) => a.category.localeCompare(b.category));
        const categories = [...new Set(consumableMovements.map(m => m.category).filter(Boolean))].sort();

        return (
          <div className="space-y-6">
            {/* KPIs stock */}
            {stockByCat.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stockByCat.map(item => (
                  <div key={item.category} className="p-4 rounded-xl border" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: item.stock > 0 ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)" }}>
                        <Icon name="Boxes" size={20} color={item.stock > 0 ? "#22c55e" : "#ef4444"} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: "var(--color-muted-foreground)" }}>{item.category}</p>
                        <p className="text-xl font-bold" style={{ color: item.stock > 0 ? "var(--color-foreground)" : "var(--color-error)" }}>
                          {item.stock.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
                          <span className="text-sm font-normal ml-1" style={{ color: "var(--color-muted-foreground)" }}>{item.unit}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Historique mouvements */}
            <div className="rounded-xl border" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
                <h2 className="text-lg font-semibold" style={{ color: "var(--color-foreground)" }}>Historique des Mouvements</h2>
                <span className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>{consumableMovements.length} mouvement{consumableMovements.length !== 1 ? 's' : ''}</span>
              </div>
              {consumableMovements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Icon name="Boxes" size={40} color="var(--color-muted-foreground)" />
                  <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Aucun mouvement enregistré</p>
                  <Button variant="outline" onClick={() => setShowConsumableModal(true)}>Enregistrer un mouvement</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: "var(--color-muted)", borderBottom: "1px solid var(--color-border)" }}>
                        {["Date", "Type", "Catégorie", "Quantité", "Unité", "Opérateur", "Notes"].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: "var(--color-muted-foreground)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {consumableMovements.map((mov, idx) => (
                        <tr key={mov.id} style={{ borderBottom: idx < consumableMovements.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                          <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--color-foreground)" }}>{mov.movement_date}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${mov.movement_type === 'in' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                              {mov.movement_type === 'in' ? 'Entrée' : 'Sortie'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium" style={{ color: "var(--color-foreground)" }}>{mov.category}</td>
                          <td className="px-4 py-3 font-bold" style={{ color: mov.movement_type === 'in' ? '#16a34a' : '#dc2626' }}>
                            {mov.movement_type === 'in' ? '+' : '−'}{parseFloat(mov.quantity).toLocaleString('fr-FR')}
                          </td>
                          <td className="px-4 py-3" style={{ color: "var(--color-muted-foreground)" }}>{mov.unit || '—'}</td>
                          <td className="px-4 py-3" style={{ color: "var(--color-muted-foreground)" }}>{mov.operator_name || '—'}</td>
                          <td className="px-4 py-3" style={{ color: "var(--color-muted-foreground)" }}>{mov.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Modal Saisie Production */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: "var(--color-card)" }}>
            <h3 className="text-lg font-semibold mb-4 sticky top-0 pb-4 border-b" style={{ color: "var(--color-foreground)", borderColor: "var(--color-border)" }}>
              Saisie de Production
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({...newEntry, date: e.target.value})}
                    className="w-full p-2 rounded border"
                    style={{ 
                      borderColor: "var(--color-border)",
                      background: "var(--color-background)",
                      color: "var(--color-foreground)"
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Site *
                  </label>
                  <input
                    type="text"
                    value={newEntry.site}
                    onChange={(e) => setNewEntry({...newEntry, site: e.target.value})}
                    className="w-full p-2 rounded border"
                    style={{ 
                      borderColor: "var(--color-border)",
                      background: "var(--color-background)",
                      color: "var(--color-foreground)"
                    }}
                    placeholder="ex: Carrière Nord"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Poste
                  </label>
                  <select
                    value={newEntry.shift}
                    onChange={(e) => setNewEntry({...newEntry, shift: e.target.value})}
                    className="w-full p-2 rounded border"
                    style={{ 
                      borderColor: "var(--color-border)",
                      background: "var(--color-background)",
                      color: "var(--color-foreground)"
                    }}
                  >
                    <option value="jour">Jour</option>
                    <option value="nuit">Nuit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Opérateur *
                  </label>
                  <input
                    type="text"
                    value={newEntry.operator}
                    onChange={(e) => setNewEntry({...newEntry, operator: e.target.value})}
                    className="w-full p-2 rounded border"
                    style={{ 
                      borderColor: "var(--color-border)",
                      background: "var(--color-background)",
                      color: "var(--color-foreground)"
                    }}
                    placeholder="ex: Jean Dupont"
                  />
                </div>
              </div>
              
              {/* Minerai et Forage — champs principaux au-dessus */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-lg" style={{ background: "var(--color-muted)" }}>
                {['Nombre de Voyage Alimenté', 'Nombre de Trous Forés'].map(dimName => {
                  const index = newEntry.dimensions.findIndex(d => d.dimension === dimName);
                  const dim = newEntry.dimensions[index];
                  const stockDim = stockData.find(s => s.dimension === dimName);
                  const available = stockDim ? stockDim.available : 0;
                  return (
                    <div key={dimName}>
                      <label className="block text-sm font-semibold mb-0.5" style={{ color: "var(--color-foreground)" }}>{dimName}</label>
                      <p className="text-xs mb-1" style={{ color: "var(--color-muted-foreground)" }}>
                        Nombre: <span style={{ fontWeight: 600, color: available > 0 ? "var(--color-success)" : "var(--color-muted-foreground)" }}>{available.toFixed(1)} t</span>
                      </p>
                      <input
                        type="number" step="0.1" min="0"
                        value={dim?.quantity ?? 0}
                        onChange={(e) => {
                          const updatedDims = [...newEntry.dimensions];
                          updatedDims[index].quantity = e.target.value;
                          setNewEntry({...newEntry, dimensions: updatedDims});
                        }}
                        className="w-full p-2 rounded border font-bold"
                        style={{ borderColor: "var(--color-primary)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                        placeholder="0.0"
                      />
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--color-foreground)" }}>
                  Production par dimension (tonnes)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-64 overflow-y-auto pr-2">
                  {newEntry.dimensions.filter(dim => dim.dimension !== 'Nombre de Voyage Alimenté' && dim.dimension !== 'Nombre de Trous Forés').map((dim, _) => {
                    const index = newEntry.dimensions.findIndex(d => d.dimension === dim.dimension);
                    const stockDim = stockData.find(s => s.dimension === dim.dimension);
                    const available = stockDim ? stockDim.available : 0;
                    return (
                      <div key={dim.dimension}>
                        <label className="block text-xs mb-0.5 font-medium" style={{ color: "var(--color-foreground)" }}>
                          {dim.dimension}
                        </label>
                        <p className="text-xs mb-1" style={{ color: "var(--color-muted-foreground)" }}>
                          Stock: <span style={{ fontWeight: 600, color: available > 0 ? "var(--color-success)" : "var(--color-muted-foreground)" }}>{available.toFixed(1)} t</span>
                        </p>
                        <input
                          type="number" step="0.1" min="0"
                          value={dim.quantity}
                          onChange={(e) => {
                            const updatedDims = [...newEntry.dimensions];
                            updatedDims[index].quantity = e.target.value;
                            setNewEntry({...newEntry, dimensions: updatedDims});
                          }}
                          className="w-full p-2 rounded border"
                          style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                          placeholder="0.0"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                  Notes
                </label>
                <textarea
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
                  className="w-full p-2 rounded border"
                  style={{ 
                    borderColor: "var(--color-border)",
                    background: "var(--color-background)",
                    color: "var(--color-foreground)"
                  }}
                  rows="3"
                  placeholder="Notes optionnelles..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end sticky bottom-0 bg-card pt-4 border-t" style={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)" }}>
              <Button
                variant="outline"
                onClick={() => setShowAddModal(false)}
              >
                Annuler
              </Button>
              <Button
                variant="default"
                onClick={handleAddProduction}
              >
                Enregistrer la Production
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sortie Stock */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: "var(--color-card)" }}>
            <h3 className="text-lg font-semibold mb-4 sticky top-0 pb-4 border-b" style={{ color: "var(--color-foreground)", borderColor: "var(--color-border)" }}>
              Sortie de Stock
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    value={newExit.date}
                    onChange={(e) => setNewExit({...newExit, date: e.target.value})}
                    className="w-full p-2 rounded border"
                    style={{ 
                      borderColor: "var(--color-border)",
                      background: "var(--color-background)",
                      color: "var(--color-foreground)"
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Destination *
                  </label>
                  <input
                    type="text"
                    value={newExit.destination}
                    onChange={(e) => setNewExit({...newExit, destination: e.target.value})}
                    className="w-full p-2 rounded border"
                    style={{ 
                      borderColor: "var(--color-border)",
                      background: "var(--color-background)",
                      color: "var(--color-foreground)"
                    }}
                    placeholder="ex: Client A"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Type de sortie
                  </label>
                  <select
                    value={newExit.exit_type}
                    onChange={(e) => setNewExit({...newExit, exit_type: e.target.value})}
                    className="w-full p-2 rounded border"
                    style={{ 
                      borderColor: "var(--color-border)",
                      background: "var(--color-background)",
                      color: "var(--color-foreground)"
                    }}
                  >
                    <option value="sale">Vente</option>
                    <option value="transfer">Transfert</option>
                    <option value="loss">Perte</option>
                    <option value="sample">Échantillon</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                    Client
                  </label>
                  <input
                    type="text"
                    value={newExit.client_name}
                    onChange={(e) => setNewExit({...newExit, client_name: e.target.value})}
                    className="w-full p-2 rounded border"
                    style={{ 
                      borderColor: "var(--color-border)",
                      background: "var(--color-background)",
                      color: "var(--color-foreground)"
                    }}
                    placeholder="ex: Société ABC"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--color-foreground)" }}>
                  Quantités par dimension (tonnes)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-2">
                  {newExit.dimensions.map((dim, index) => {
                    const stockDim = stockData.find(s => s.dimension === dim.dimension);
                    const available = stockDim ? stockDim.available : 0;
                    const requested = parseFloat(dim.quantity) || 0;
                    const isOverstock = requested > available;
                    return (
                      <div key={index}>
                        <label className="block text-xs mb-1" style={{ color: isOverstock ? "var(--color-error)" : "var(--color-muted-foreground)", fontWeight: isOverstock ? 600 : 400 }}>
                          {dim.dimension} — Disponible: <span style={{ fontWeight: 700 }}>{available.toFixed(1)} t</span>
                          {isOverstock && <span style={{ color: "var(--color-error)" }}> ⚠ Dépassement</span>}
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max={available}
                          value={dim.quantity}
                          onChange={(e) => {
                            const updatedDims = [...newExit.dimensions];
                            updatedDims[index].quantity = e.target.value;
                            setNewExit({...newExit, dimensions: updatedDims});
                          }}
                          className="w-full p-2 rounded border"
                          style={{
                            borderColor: isOverstock ? "var(--color-error)" : "var(--color-border)",
                            background: isOverstock ? "rgba(229,62,62,0.06)" : "var(--color-background)",
                            color: "var(--color-foreground)"
                          }}
                          placeholder="0.0"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>
                  Notes
                </label>
                <textarea
                  value={newExit.notes}
                  onChange={(e) => setNewExit({...newExit, notes: e.target.value})}
                  className="w-full p-2 rounded border"
                  style={{ 
                    borderColor: "var(--color-border)",
                    background: "var(--color-background)",
                    color: "var(--color-foreground)"
                  }}
                  rows="3"
                  placeholder="Notes optionnelles..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end sticky bottom-0 bg-card pt-4 border-t" style={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)" }}>
              <Button
                variant="outline"
                onClick={() => setShowExitModal(false)}
              >
                Annuler
              </Button>
              <Button
                variant="default"
                onClick={handleAddExit}
                disabled={newExit.dimensions.some(dim => {
                  const stockDim = stockData.find(s => s.dimension === dim.dimension);
                  const available = stockDim ? stockDim.available : 0;
                  return (parseFloat(dim.quantity) || 0) > available;
                })}
              >
                Enregistrer la Sortie
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mouvement Consommable */}
      {showConsumableModal && (() => {
        const categories = [...new Set(consumableMovements.map(m => m.category).filter(Boolean))].sort();
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: "var(--color-card)" }}>
              <h3 className="text-lg font-semibold mb-4 pb-4 border-b" style={{ color: "var(--color-foreground)", borderColor: "var(--color-border)" }}>
                Nouveau Mouvement Consommable
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>Date *</label>
                    <input
                      type="date"
                      value={consumableForm.movement_date}
                      onChange={e => setConsumableForm({ ...consumableForm, movement_date: e.target.value })}
                      className="w-full p-2 rounded border text-sm"
                      style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>Type *</label>
                    <select
                      value={consumableForm.movement_type}
                      onChange={e => setConsumableForm({ ...consumableForm, movement_type: e.target.value })}
                      className="w-full p-2 rounded border text-sm"
                      style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                    >
                      <option value="in">Entrée (approvisionnement)</option>
                      <option value="out">Sortie (utilisation)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>Catégorie *</label>
                  <input
                    type="text"
                    list="consumable-categories"
                    value={consumableForm.category}
                    onChange={e => setConsumableForm({ ...consumableForm, category: e.target.value })}
                    className="w-full p-2 rounded border text-sm"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                    placeholder="ex: Explosifs, Lubrifiants, Câbles…"
                  />
                  <datalist id="consumable-categories">
                    {categories.map(cat => <option key={cat} value={cat} />)}
                  </datalist>
                  {consumableForm.movement_type === 'out' && consumableForm.category.trim() && (() => {
                    const currentStock = consumableMovements
                      .filter(m => m.category === consumableForm.category.trim())
                      .reduce((s, m) => s + (m.movement_type === 'in' ? parseFloat(m.quantity) : -parseFloat(m.quantity)), 0);
                    return (
                      <p className="text-xs mt-1" style={{ color: Math.max(0, currentStock) > 0 ? "var(--color-success)" : "var(--color-error)" }}>
                        Stock disponible : {Math.max(0, currentStock).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} {consumableForm.unit}
                      </p>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>Quantité *</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={consumableForm.quantity}
                      onChange={e => setConsumableForm({ ...consumableForm, quantity: e.target.value })}
                      className="w-full p-2 rounded border text-sm"
                      style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>Unité</label>
                    <input
                      type="text"
                      value={consumableForm.unit}
                      onChange={e => setConsumableForm({ ...consumableForm, unit: e.target.value })}
                      className="w-full p-2 rounded border text-sm"
                      style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                      placeholder="unité, kg, L, m…"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>Opérateur</label>
                  <input
                    type="text"
                    value={consumableForm.operator_name}
                    onChange={e => setConsumableForm({ ...consumableForm, operator_name: e.target.value })}
                    className="w-full p-2 rounded border text-sm"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                    placeholder="Nom de l'opérateur"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>Notes</label>
                  <textarea
                    value={consumableForm.notes}
                    onChange={e => setConsumableForm({ ...consumableForm, notes: e.target.value })}
                    className="w-full p-2 rounded border text-sm"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                    rows="2"
                    placeholder="Notes optionnelles…"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6 justify-end pt-4 border-t" style={{ borderColor: "var(--color-border)" }}>
                <Button variant="outline" onClick={() => { setShowConsumableModal(false); setConsumableForm(emptyConsumableForm); }}>
                  Annuler
                </Button>
                <Button variant="default" onClick={handleAddConsumableMovement}>
                  {consumableForm.movement_type === 'in' ? 'Enregistrer l\'Entrée' : 'Enregistrer la Sortie'}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

    </AppLayout>
  );
}
