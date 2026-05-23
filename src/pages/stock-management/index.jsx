import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSite } from "../../context/SiteContext";
import AppLayout from "components/navigation/AppLayout";
import Icon from "components/AppIcon";
import Button from "components/ui/Button";
import { toastError, toastSuccess } from "../../utils/toast.jsx";
import { miningService } from "../../config/supabase.js";

export default function StockManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { effectiveSiteId } = useSite();
  const [stockData, setStockData] = useState([]);
  const [entries, setEntries] = useState([]);
  const [exits, setExits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  
  // État pour les formulaires
  const [newEntry, setNewEntry] = useState({
    date: '',
    source: '',
    dimensions: [
      { size: 'Minerai', quantity: '' },
      { size: 'Forage', quantity: '' },
      { size: '0/4', quantity: '' },
      { size: '0/5', quantity: '' },
      { size: '0/6', quantity: '' },
      { size: '5/15', quantity: '' },
      { size: '8/15', quantity: '' },
      { size: '15/25', quantity: '' },
      { size: '4/6', quantity: '' },
      { size: '4/6 ENROBÉ', quantity: '' },
      { size: '10/14', quantity: '' },
      { size: '6/10', quantity: '' },
      { size: '0/31,5', quantity: '' }
    ]
  });
  
  const [newExit, setNewExit] = useState({
    date: '',
    destination: '',
    dimensions: [
      { size: 'Minerai', quantity: '' },
      { size: 'Forage', quantity: '' },
      { size: '0/4', quantity: '' },
      { size: '0/5', quantity: '' },
      { size: '0/6', quantity: '' },
      { size: '5/15', quantity: '' },
      { size: '8/15', quantity: '' },
      { size: '15/25', quantity: '' },
      { size: '4/6', quantity: '' },
      { size: '4/6 ENROBÉ', quantity: '' },
      { size: '10/14', quantity: '' },
      { size: '6/10', quantity: '' },
      { size: '0/31,5', quantity: '' }
    ]
  });

  useEffect(() => {
    loadStockData();
  }, [effectiveSiteId]);

  const loadStockData = async () => {
    try {
      const [entriesResult, exitsResult, stockSummaryResult] = await Promise.all([
        miningService.getStockEntries(effectiveSiteId),
        miningService.getStockExits(effectiveSiteId),
        miningService.getStockSummary(effectiveSiteId)
      ]);

      if (entriesResult.error) throw entriesResult.error;
      if (exitsResult.error) throw exitsResult.error;
      if (stockSummaryResult.error) throw stockSummaryResult.error;

      // Transformer les données pour correspondre au format attendu
      const transformedEntries = entriesResult.data.map(entry => ({
        id: entry.id,
        date: entry.date,
        source: entry.source,
        dimensions: entry.stock_entry_details || [],
        total: (entry.stock_entry_details || []).reduce((sum, detail) => sum + parseFloat(detail.quantity), 0)
      }));

      const transformedExits = exitsResult.data.map(exit => ({
        id: exit.id,
        date: exit.date,
        destination: exit.destination,
        dimensions: exit.stock_exit_details || [],
        total: (exit.stock_exit_details || []).reduce((sum, detail) => sum + parseFloat(detail.quantity), 0)
      }));

      setEntries(transformedEntries);
      setExits(transformedExits);
      setStockData(stockSummaryResult.data);
      
    } catch (error) {
      console.error('Erreur lors du chargement des données de stock:', error);
      toastError("Erreur lors du chargement des données de stock");
    } finally {
      setLoading(false);
    }
  };

  const calculateStock = (entriesData, exitsData) => {
    const dimensions = ['Minerai', 'Forage', '0/4', '0/5', '0/6', '5/15', '8/15', '15/25', '4/6', '4/6 ENROBÉ', '10/14', '6/10', '0/31,5'];
    const stockCalculations = [];

    dimensions.forEach(dim => {
      const totalEntries = entriesData.reduce((sum, entry) => {
        const dimEntry = entry.dimensions.find(d => d.size === dim);
        return sum + (dimEntry ? dimEntry.quantity : 0);
      }, 0);

      const totalExits = exitsData.reduce((sum, exit) => {
        const dimExit = exit.dimensions.find(d => d.size === dim);
        return sum + (dimExit ? dimExit.quantity : 0);
      }, 0);

      stockCalculations.push({
        dimension: dim,
        entries: totalEntries,
        exits: totalExits,
        available: totalEntries - totalExits
      });
    });

    setStockData(stockCalculations);
  };

  const handleAddEntry = async () => {
    try {
      // Validation
      if (!newEntry.date || !newEntry.source) {
        toastError('Veuillez remplir la date et la source');
        return;
      }

      const hasQuantities = newEntry.dimensions.some(dim => dim.quantity && parseFloat(dim.quantity) > 0);
      if (!hasQuantities) {
        toastError('Veuillez saisir au moins une quantité');
        return;
      }

      // Préparer les données pour l'API
      const entryData = {
        date: newEntry.date,
        source: newEntry.source,
        dimensions: newEntry.dimensions.filter(dim => dim.quantity && parseFloat(dim.quantity) > 0)
      };

      // Sauvegarder via l'API
      const result = await miningService.addStockEntry(entryData, effectiveSiteId);
      if (result.error) throw result.error;

      // Recharger les données
      await loadStockData();
      
      // Réinitialisation du formulaire
      setNewEntry({
        date: '',
        source: '',
        dimensions: [
          { size: 'Minerai', quantity: '' },
          { size: 'Forage', quantity: '' },
          { size: '0/4', quantity: '' },
          { size: '0/5', quantity: '' },
          { size: '0/6', quantity: '' },
          { size: '5/15', quantity: '' },
          { size: '8/15', quantity: '' },
          { size: '15/25', quantity: '' },
          { size: '4/6', quantity: '' },
          { size: '10/14', quantity: '' },
          { size: '6/10', quantity: '' },
          { size: '0/31,5', quantity: '' }
        ]
      });
      
      setShowEntryModal(false);
      toastSuccess(`Entrée de stock enregistrée avec succès`);
      
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'entrée:', error);
      toastError("Erreur lors de l'enregistrement de l'entrée");
    }
  };

  const handleAddExit = async () => {
    try {
      // Validation
      if (!newExit.date || !newExit.destination) {
        toastError('Veuillez remplir la date et la destination');
        return;
      }

      const hasQuantities = newExit.dimensions.some(dim => dim.quantity && parseFloat(dim.quantity) > 0);
      if (!hasQuantities) {
        toastError('Veuillez saisir au moins une quantité');
        return;
      }

      // Vérification du stock disponible
      for (const dim of newExit.dimensions) {
        if (dim.quantity && parseFloat(dim.quantity) > 0) {
          const stockDim = stockData.find(s => s.dimension === dim.size);
          if (stockDim && parseFloat(dim.quantity) > stockDim.available) {
            toastError(`Stock insuffisant pour la dimension ${dim.size}. Disponible: ${stockDim.available} tonnes`);
            return;
          }
        }
      }

      // Préparer les données pour l'API
      const exitData = {
        date: newExit.date,
        destination: newExit.destination,
        dimensions: newExit.dimensions.filter(dim => dim.quantity && parseFloat(dim.quantity) > 0)
      };

      // Sauvegarder via l'API
      const result = await miningService.addStockExit(exitData, effectiveSiteId);
      if (result.error) throw result.error;

      // Recharger les données
      await loadStockData();
      
      // Réinitialisation du formulaire
      setNewExit({
        date: '',
        destination: '',
        dimensions: [
          { size: 'Minerai', quantity: '' },
          { size: 'Forage', quantity: '' },
          { size: '0/4', quantity: '' },
          { size: '0/5', quantity: '' },
          { size: '0/6', quantity: '' },
          { size: '5/15', quantity: '' },
          { size: '8/15', quantity: '' },
          { size: '15/25', quantity: '' },
          { size: '4/6', quantity: '' },
          { size: '10/14', quantity: '' },
          { size: '6/10', quantity: '' },
          { size: '0/31,5', quantity: '' }
        ]
      });
      
      setShowExitModal(false);
      toastSuccess(`Sortie de stock enregistrée avec succès`);
      
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la sortie:', error);
      toastError("Erreur lors de l'enregistrement de la sortie");
    }
  };

  const totalStock = stockData.reduce((sum, item) => sum + item.available, 0);

  if (loading) {
    return (
      <AppLayout userRole={user?.role} userName={user?.full_name} userSite={user?.department || 'Amp Mines et Carrieres'}>
        <div className="flex items-center justify-center h-64">
          <p style={{ color: "var(--color-muted-foreground)" }}>Chargement...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout userRole={user?.role} userName={user?.full_name} userSite={user?.department || 'Amp Mines et Carrieres'}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-foreground)" }}>
            Gestion du Stock
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted-foreground)" }}>
            Suivi des entrées, sorties et stock disponible par dimension
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="default"
            iconName="Plus"
            iconPosition="left"
            onClick={() => setShowEntryModal(true)}
          >
            Entrée Stock
          </Button>
          <Button
            variant="default"
            iconName="Minus"
            iconPosition="left"
            onClick={() => setShowExitModal(true)}
          >
            Sortie Stock
          </Button>
          <Button
            variant="outline"
            iconName="ArrowLeft"
            iconPosition="left"
            onClick={() => navigate("/")}
          >
            Retour
          </Button>
        </div>
      </div>

      {/* Cartes de synthèse */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
              <Icon name="Package" size={20} color="#22c55e" />
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Stock Total</p>
              <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                {totalStock.toFixed(1)} t
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
              <Icon name="TrendingUp" size={20} color="#22c55e" />
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Total Entrées</p>
              <p className="text-xl font-bold" style={{ color: "var(--color-success)" }}>
                {stockData.reduce((sum, item) => sum + item.entries, 0).toFixed(1)} t
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(239,68,68,0.12)" }}>
              <Icon name="TrendingDown" size={20} color="#ef4444" />
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Total Sorties</p>
              <p className="text-xl font-bold" style={{ color: "var(--color-error)" }}>
                {stockData.reduce((sum, item) => sum + item.exits, 0).toFixed(1)} t
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(49,130,206,0.12)" }}>
              <Icon name="Activity" size={20} color="#3182CE" />
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Transactions</p>
              <p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>
                {entries.length + exits.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau du stock par dimension */}
      <div className="rounded-xl border" style={{ background: "var(--color-card)" }}>
        <div className="p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-foreground)" }}>
            Stock Disponible par Dimension
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
                        background: item.available > 50 ? "rgba(34,197,94,0.12)" : item.available > 10 ? "rgba(214,158,46,0.12)" : "rgba(239,68,68,0.12)",
                        color: item.available > 50 ? "var(--color-success)" : item.available > 10 ? "var(--color-warning)" : "var(--color-error)"
                      }}>
                      {item.available > 50 ? 'Bon' : item.available > 10 ? 'Faible' : 'Critique'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Entrée Stock */}
      {showEntryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: "var(--color-card)" }}>
            <h3 className="text-lg font-semibold mb-4 sticky top-0 pb-4 border-b" style={{ color: "var(--color-foreground)", borderColor: "var(--color-border)" }}>
              Entrée de Stock
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                    Source *
                  </label>
                  <input
                    type="text"
                    value={newEntry.source}
                    onChange={(e) => setNewEntry({...newEntry, source: e.target.value})}
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
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--color-foreground)" }}>
                  Quantités par dimension (tonnes)
                </label>
                <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-2">
                  {newEntry.dimensions.map((dim, index) => {
                    const stockDim = stockData.find(s => s.dimension === dim.size);
                    const available = stockDim ? stockDim.available : 0;
                    return (
                      <div key={index}>
                        <label className="block text-xs mb-0.5 font-medium" style={{ color: "var(--color-foreground)" }}>
                          {dim.size}
                        </label>
                        <p className="text-xs mb-1" style={{ color: "var(--color-muted-foreground)" }}>
                          Stock: <span style={{ fontWeight: 600, color: available > 0 ? "var(--color-success)" : "var(--color-muted-foreground)" }}>{available.toFixed(1)} t</span>
                        </p>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={dim.quantity}
                          onChange={(e) => {
                            const updatedDims = [...newEntry.dimensions];
                            updatedDims[index].quantity = e.target.value;
                            setNewEntry({...newEntry, dimensions: updatedDims});
                          }}
                          className="w-full p-2 rounded border"
                          style={{
                            borderColor: "var(--color-border)",
                            background: "var(--color-background)",
                            color: "var(--color-foreground)"
                          }}
                          placeholder="0.0"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end sticky bottom-0 bg-card pt-4 border-t" style={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-border)" }}>
              <Button
                variant="outline"
                onClick={() => setShowEntryModal(false)}
              >
                Annuler
              </Button>
              <Button
                variant="default"
                onClick={handleAddEntry}
              >
                Enregistrer l'Entrée
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
              <div className="grid grid-cols-2 gap-4">
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
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--color-foreground)" }}>
                  Quantités par dimension (tonnes)
                </label>
                <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-2">
                  {newExit.dimensions.map((dim, index) => {
                    const stockDim = stockData.find(s => s.dimension === dim.size);
                    const available = stockDim ? stockDim.available : 0;
                    const requested = parseFloat(dim.quantity) || 0;
                    const isOverstock = requested > available;
                    return (
                      <div key={index}>
                        <label className="block text-xs mb-1" style={{ color: isOverstock ? "var(--color-error)" : "var(--color-muted-foreground)", fontWeight: isOverstock ? 600 : 400 }}>
                          {dim.size} — Disponible: <span style={{ fontWeight: 700 }}>{available.toFixed(1)} t</span>
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
                  const stockDim = stockData.find(s => s.dimension === dim.size);
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
    </AppLayout>
  );
}
