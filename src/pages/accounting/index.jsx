import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AppLayout from "components/navigation/AppLayout";
import Icon from "components/AppIcon";
import Button from "components/ui/Button";
import { miningService } from "../../config/supabase";
import { useAuth } from "../../context/AuthContext";
import { toastSuccess, toastError } from "../../utils/toast";
import { exportFinancialReport } from "../../utils/excelExport";

export default function Accounting() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewTransaction, setViewTransaction] = useState(null);
  const [editTransaction, setEditTransaction] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // ── Filtres ────────────────────────────────────────────────────────────────
  const [filterType,       setFilterType]       = useState('all');   // all | income | expense
  const [filterDateFrom,   setFilterDateFrom]   = useState('');
  const [filterDateTo,     setFilterDateTo]     = useState('');
  const [filterCategory,   setFilterCategory]   = useState('');
  const [filterSearch,     setFilterSearch]     = useState('');
  // ──────────────────────────────────────────────────────────────────────────

  const [newTransaction, setNewTransaction] = useState({
    date: '',
    type: 'income',
    category: '',
    description: '',
    amount: '',
    reference: '',
    client_supplier: '',
    payment_method: '',
    notes: ''
  });

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await miningService.getFinancialTransactions();
      if (error) throw error;
      // Normaliser les noms de colonnes (transaction_date → date, payment_status → status)
      const normalized = (data || []).map(t => ({
        ...t,
        date: t.transaction_date || t.date,
        status: t.payment_status || t.status || 'pending'
      }));
      setTransactions(normalized);
    } catch (err) {
      console.error('Erreur chargement transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Transactions filtrées (mémorisées) ────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterDateFrom && t.date < filterDateFrom) return false;
      if (filterDateTo   && t.date > filterDateTo)   return false;
      if (filterCategory && !t.category?.toLowerCase().includes(filterCategory.toLowerCase())) return false;
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        if (
          !t.description?.toLowerCase().includes(q) &&
          !t.category?.toLowerCase().includes(q) &&
          !t.client_supplier?.toLowerCase().includes(q) &&
          !t.reference?.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [transactions, filterType, filterDateFrom, filterDateTo, filterCategory, filterSearch]);

  const resetFilters = () => {
    setFilterType('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterCategory('');
    setFilterSearch('');
  };

  // ── KPIs calculés sur les transactions filtrées ────────────────────────────
  const totalIncome   = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const totalExpenses = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const netProfit     = totalIncome - totalExpenses;

  // Graphique circulaire — dépenses par catégorie (données filtrées)
  const expensesByCategory = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + (parseFloat(t.amount) || 0);
      return acc;
    }, {});

  const pieChartData = Object.entries(expensesByCategory).map(([category, amount], index) => ({
    name: category,
    value: Math.round(amount * 100) / 100,
    color: ['#2C5530', '#D69E2E', '#E53E3E', '#3182CE', '#805AD5'][index % 5]
  }));

  // Graphique évolution mensuelle (données filtrées)
  const lineChartData = useMemo(() => {
    const monthly = filteredTransactions.reduce((acc, t) => {
      if (!t.date) return acc;
      const d = new Date(t.date);
      const key  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const name = d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      if (!acc[key]) acc[key] = { key, month: name, revenus: 0, depenses: 0 };
      if (t.type === 'income')  acc[key].revenus  += parseFloat(t.amount) || 0;
      else                      acc[key].depenses += parseFloat(t.amount) || 0;
      return acc;
    }, {});
    return Object.values(monthly).sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredTransactions]);

  const handleAddTransaction = async () => {
    if (!newTransaction.date || !newTransaction.category || !newTransaction.description || !newTransaction.amount) {
      toastError('Veuillez remplir les champs obligatoires');
      return;
    }
    try {
      const { error } = await miningService.addFinancialTransaction({
        date: newTransaction.date,
        type: newTransaction.type,
        category: newTransaction.category,
        description: newTransaction.description,
        amount: newTransaction.amount,
        reference: newTransaction.reference,
        client_supplier: newTransaction.client_supplier,
        payment_method: newTransaction.payment_method,
        status: 'paid',
        notes: newTransaction.notes
      });

      if (error) throw error;

      await loadTransactions();
      setShowAddModal(false);
      setNewTransaction({ date: '', type: 'income', category: '', description: '', amount: '', reference: '', client_supplier: '', payment_method: '', notes: '' });
      toastSuccess(`Transaction enregistrée: ${newTransaction.type === 'income' ? '+' : '-'}${parseFloat(newTransaction.amount).toLocaleString('fr-FR')} FCFA`);
    } catch (error) {
      console.error("Erreur ajout transaction:", error);
      toastError(`Erreur: ${error.message}`);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!confirmDeleteId) return;
    try {
      const { error } = await miningService.deleteFinancialTransaction(confirmDeleteId);
      if (error) throw error;
      setConfirmDeleteId(null);
      await loadTransactions();
      toastSuccess('Transaction supprimée');
    } catch (error) {
      toastError('Erreur suppression: ' + error.message);
      setConfirmDeleteId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTransaction) return;
    try {
      const { error } = await miningService.updateFinancialTransaction(editTransaction.id, {
        transaction_date: editTransaction.date,
        type: editTransaction.type,
        category: editTransaction.category,
        description: editTransaction.description,
        amount: parseFloat(editTransaction.amount),
        reference: editTransaction.reference || null,
        client_supplier: editTransaction.client_supplier || null,
        payment_method: editTransaction.payment_method || null,
        notes: editTransaction.notes || null,
      });
      if (error) throw error;
      setEditTransaction(null);
      await loadTransactions();
      toastSuccess('Transaction modifiée');
    } catch (error) {
      toastError('Erreur modification: ' + error.message);
    }
  };

  const getTypeColor = (type) => {
    return type === 'income' ? 'var(--color-success)' : 'var(--color-error)';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'var(--color-success)';
      case 'pending': return 'var(--color-warning)';
      case 'overdue': return 'var(--color-error)';
      default: return 'var(--color-muted-foreground)';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid': return 'Payé';
      case 'pending': return 'En attente';
      case 'overdue': return 'En retard';
      default: return status;
    }
  };

  return (
    <AppLayout userRole={user?.role} userName={user?.full_name} userSite="Amp Mines et Carrieres Exploration & Mines">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-foreground)" }}>
            Comptabilité
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted-foreground)" }}>
            Gestion financière et suivi des transactions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" iconName="FileSpreadsheet" iconPosition="left"
            onClick={() => exportFinancialReport('month', filteredTransactions)}>
            Exporter Excel
          </Button>
          <Button variant="default" iconName="Plus" iconPosition="left"
            onClick={() => setShowAddModal(true)}>
            Ajouter Transaction
          </Button>
          <Button variant="outline" iconName="ArrowLeft" iconPosition="left"
            onClick={() => navigate("/")}>
            Retour
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(56,161,105,0.12)" }}>
              <Icon name="TrendingUp" size={20} color="var(--color-success)" />
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Revenus</p>
              <p className="text-xl font-bold" style={{ color: "var(--color-success)" }}>{totalIncome.toFixed(2)} FCFA</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(229,62,62,0.12)" }}>
              <Icon name="TrendingDown" size={20} color="var(--color-error)" />
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Dépenses</p>
              <p className="text-xl font-bold" style={{ color: "var(--color-error)" }}>{totalExpenses.toFixed(2)} FCFA</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(49,130,206,0.12)" }}>
              <Icon name="DollarSign" size={20} color="#3182CE" />
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Bénéfice Net</p>
              <p className="text-xl font-bold" style={{ color: netProfit >= 0 ? "#3182CE" : "var(--color-error)" }}>
                {netProfit.toFixed(2)} FCFA
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Barre de filtres ─────────────────────────────────────────────── */}
      <div className="rounded-xl border p-4 mb-4" style={{ background: "var(--color-card)" }}>
        <div className="flex flex-wrap gap-3 items-end">
          {/* Recherche libre */}
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Recherche</label>
            <div className="relative">
              <Icon name="Search" size={14} color="var(--color-muted-foreground)" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
                placeholder="Description, catégorie, client…"
                className="w-full pl-7 pr-3 py-2 rounded border text-sm"
                style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
              />
            </div>
          </div>

          {/* Type */}
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Type</label>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full p-2 rounded border text-sm"
              style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
            >
              <option value="all">Tous</option>
              <option value="income">Revenus</option>
              <option value="expense">Dépenses</option>
            </select>
          </div>

          {/* Catégorie */}
          <div className="min-w-[150px]">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Catégorie</label>
            <input
              type="text"
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              placeholder="ex: Carburant"
              className="w-full p-2 rounded border text-sm"
              style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
            />
          </div>

          {/* Date de */}
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Du</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
              className="w-full p-2 rounded border text-sm"
              style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
            />
          </div>

          {/* Date à */}
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Au</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)}
              className="w-full p-2 rounded border text-sm"
              style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
            />
          </div>

          {/* Reset */}
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-3 py-2 rounded border text-sm"
            style={{ borderColor: "var(--color-border)", color: "var(--color-muted-foreground)", background: "transparent" }}
            title="Réinitialiser les filtres"
          >
            <Icon name="X" size={13} />
            Réinitialiser
          </button>
        </div>

        {/* Résumé du filtre actif */}
        <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: "var(--color-muted-foreground)" }}>
          <span>{filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} affichée{filteredTransactions.length !== 1 ? 's' : ''}</span>
          {filteredTransactions.length !== transactions.length && (
            <span style={{ color: "var(--color-warning)" }}>
              (sur {transactions.length} au total)
            </span>
          )}
        </div>
      </div>

      <div className="rounded-xl border" style={{ background: "var(--color-card)" }}>
        <div className="p-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-foreground)" }}>
            Historique des Transactions
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Date</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Type</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Catégorie</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Description</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Montant</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Référence</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center" style={{ color: "var(--color-muted-foreground)" }}>
                    Chargement...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center" style={{ color: "var(--color-muted-foreground)" }}>
                    Aucune transaction trouvée
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center" style={{ color: "var(--color-muted-foreground)" }}>
                    Aucune transaction ne correspond aux filtres sélectionnés
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((item) => (
                  <tr key={item.id} className="border-b" style={{ borderColor: "var(--color-border)" }}>
                    <td className="p-4" style={{ color: "var(--color-foreground)" }}>{item.date}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium" 
                        style={{ 
                          background: `${getTypeColor(item.type)}15`,
                          color: getTypeColor(item.type)
                        }}>
                        {item.type === 'income' ? 'Revenu' : 'Dépense'}
                      </span>
                    </td>
                    <td className="p-4" style={{ color: "var(--color-foreground)" }}>{item.category}</td>
                    <td className="p-4" style={{ color: "var(--color-foreground)" }}>{item.description}</td>
                    <td className="p-4" style={{ color: getTypeColor(item.type), fontWeight: 'bold' }}>
                      {item.type === 'income' ? '+' : '-'}{item.amount.toFixed(2)}
                    </td>
                   
                    <td className="p-4" style={{ color: "var(--color-foreground)" }}>{item.reference}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setViewTransaction(item)} title="Voir" style={{ color: "var(--color-muted-foreground)", padding: "4px 6px", borderRadius: 6, background: "transparent", border: "none", cursor: "pointer" }}>
                          <Icon name="Eye" size={15} />
                        </button>
                        <button onClick={() => setEditTransaction({...item})} title="Modifier" style={{ color: "var(--color-primary)", padding: "4px 6px", borderRadius: 6, background: "transparent", border: "none", cursor: "pointer" }}>
                          <Icon name="Edit" size={15} />
                        </button>
                        <button onClick={() => setConfirmDeleteId(item.id)} title="Supprimer" style={{ color: "var(--color-error)", padding: "4px 6px", borderRadius: 6, background: "transparent", border: "none", cursor: "pointer" }}>
                          <Icon name="Trash2" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="rounded-xl border p-6" style={{ background: "var(--color-card)" }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>
            Répartition des Dépenses
          </h3>
          <div className="h-64">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} FCFA`, 'Montant']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center bg-muted/30 rounded-lg" style={{ color: "var(--color-muted-foreground)" }}>
                Aucune donnée disponible
              </div>
            )}
          </div>
        </div>
        <div className="rounded-xl border p-6" style={{ background: "var(--color-card)" }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>
            Évolution Mensuelle
          </h3>
          <div className="h-64">
            {lineChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}kFCFA`} />
                  <Tooltip formatter={(value) => [`${value.toLocaleString('fr-FR')} FCFA`, '']} />
                  <Legend />
                  <Line type="monotone" dataKey="revenus" stroke="#2C5530" strokeWidth={2} name="Revenus" />
                  <Line type="monotone" dataKey="depenses" stroke="#E53E3E" strokeWidth={2} name="Dépenses" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center bg-muted/30 rounded-lg" style={{ color: "var(--color-muted-foreground)" }}>
                Aucune donnée disponible
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Ajout Transaction */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl w-full max-w-md max-h-[90vh] flex flex-col" style={{ background: "var(--color-card)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
              <h3 className="text-base font-semibold" style={{ color: "var(--color-foreground)" }}>
                Nouvelle Transaction
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ color: "var(--color-muted-foreground)" }} className="hover:opacity-70">✕</button>
            </div>

            {/* Body scrollable */}
            <div className="overflow-y-auto px-5 py-4 space-y-3 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Date *</label>
                  <input type="date" value={newTransaction.date}
                    onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                    className="w-full p-2 rounded border text-sm"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Type *</label>
                  <select value={newTransaction.type}
                    onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value})}
                    className="w-full p-2 rounded border text-sm"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                  >
                    <option value="income">Revenu</option>
                    <option value="expense">Dépense</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Catégorie *</label>
                  <input type="text" value={newTransaction.category}
                    onChange={(e) => setNewTransaction({...newTransaction, category: e.target.value})}
                    className="w-full p-2 rounded border text-sm"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                    placeholder="ex: Ventes"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Montant (FCFA) *</label>
                  <input type="number" step="0.01" value={newTransaction.amount}
                    onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                    className="w-full p-2 rounded border text-sm"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Description *</label>
                <input type="text" value={newTransaction.description}
                  onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                  className="w-full p-2 rounded border text-sm"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                  placeholder="ex: Vente gravillons Client A"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Référence</label>
                  <input type="text" value={newTransaction.reference}
                    onChange={(e) => setNewTransaction({...newTransaction, reference: e.target.value})}
                    className="w-full p-2 rounded border text-sm"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                    placeholder="FACT-2026-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Client/Fournisseur</label>
                  <input type="text" value={newTransaction.client_supplier}
                    onChange={(e) => setNewTransaction({...newTransaction, client_supplier: e.target.value})}
                    className="w-full p-2 rounded border text-sm"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                    placeholder="Société ABC"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Moyen de paiement</label>
                <select value={newTransaction.payment_method}
                  onChange={(e) => setNewTransaction({...newTransaction, payment_method: e.target.value})}
                  className="w-full p-2 rounded border text-sm"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                >
                  <option value="">Sélectionner...</option>
                  <option value="virement">Virement bancaire</option>
                  <option value="cheque">Chèque</option>
                  <option value="espece">Espèces</option>
                  <option value="carte">Carte bancaire</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Notes</label>
                <textarea value={newTransaction.notes}
                  onChange={(e) => setNewTransaction({...newTransaction, notes: e.target.value})}
                  className="w-full p-2 rounded border text-sm resize-none"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                  rows="2"
                  placeholder="Notes optionnelles..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: "var(--color-border)" }}>
              <Button variant="default" onClick={handleAddTransaction} className="flex-1">
                Ajouter
              </Button>
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vue détail */}
      {viewTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl w-full max-w-sm" style={{ background: "var(--color-card)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
              <h3 className="text-base font-semibold" style={{ color: "var(--color-foreground)" }}>Détail Transaction</h3>
              <button onClick={() => setViewTransaction(null)} style={{ color: "var(--color-muted-foreground)", background: "none", border: "none", cursor: "pointer" }}>✕</button>
            </div>
            <div className="px-5 py-4 space-y-2 text-sm">
              {[
                ['Date', viewTransaction.date],
                ['Type', viewTransaction.type === 'income' ? 'Revenu' : 'Dépense'],
                ['Catégorie', viewTransaction.category],
                ['Description', viewTransaction.description],
                ['Montant', `${viewTransaction.type === 'income' ? '+' : '-'}${parseFloat(viewTransaction.amount).toLocaleString('fr-FR')} FCFA`],
                ['Référence', viewTransaction.reference || '—'],
                ['Client/Fourn.', viewTransaction.client_supplier || '—'],
                ['Paiement', viewTransaction.payment_method || '—'],
                ['Notes', viewTransaction.notes || '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span style={{ color: "var(--color-muted-foreground)" }}>{label}</span>
                  <span style={{ color: "var(--color-foreground)", fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t" style={{ borderColor: "var(--color-border)" }}>
              <Button variant="outline" onClick={() => setViewTransaction(null)} className="w-full">Fermer</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Édition */}
      {editTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl w-full max-w-md max-h-[90vh] flex flex-col" style={{ background: "var(--color-card)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
              <h3 className="text-base font-semibold" style={{ color: "var(--color-foreground)" }}>Modifier Transaction</h3>
              <button onClick={() => setEditTransaction(null)} style={{ color: "var(--color-muted-foreground)", background: "none", border: "none", cursor: "pointer" }}>✕</button>
            </div>
            <div className="overflow-y-auto px-5 py-4 space-y-3 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Date</label>
                  <input type="date" value={editTransaction.date} onChange={(e) => setEditTransaction({...editTransaction, date: e.target.value})} className="w-full p-2 rounded border text-sm" style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Type</label>
                  <select value={editTransaction.type} onChange={(e) => setEditTransaction({...editTransaction, type: e.target.value})} className="w-full p-2 rounded border text-sm" style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}>
                    <option value="income">Revenu</option>
                    <option value="expense">Dépense</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Catégorie</label>
                  <input type="text" value={editTransaction.category} onChange={(e) => setEditTransaction({...editTransaction, category: e.target.value})} className="w-full p-2 rounded border text-sm" style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Montant (FCFA)</label>
                  <input type="number" value={editTransaction.amount} onChange={(e) => setEditTransaction({...editTransaction, amount: e.target.value})} className="w-full p-2 rounded border text-sm" style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Description</label>
                <input type="text" value={editTransaction.description} onChange={(e) => setEditTransaction({...editTransaction, description: e.target.value})} className="w-full p-2 rounded border text-sm" style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Référence</label>
                  <input type="text" value={editTransaction.reference || ''} onChange={(e) => setEditTransaction({...editTransaction, reference: e.target.value})} className="w-full p-2 rounded border text-sm" style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-muted-foreground)" }}>Client/Fournisseur</label>
                  <input type="text" value={editTransaction.client_supplier || ''} onChange={(e) => setEditTransaction({...editTransaction, client_supplier: e.target.value})} className="w-full p-2 rounded border text-sm" style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: "var(--color-border)" }}>
              <Button variant="default" onClick={handleSaveEdit} className="flex-1">Enregistrer</Button>
              <Button variant="outline" onClick={() => setEditTransaction(null)} className="flex-1">Annuler</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation Suppression */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl w-full max-w-sm p-6" style={{ background: "var(--color-card)" }}>
            <h3 className="text-base font-semibold mb-2" style={{ color: "var(--color-foreground)" }}>Supprimer la transaction ?</h3>
            <p className="text-sm mb-6" style={{ color: "var(--color-muted-foreground)" }}>Cette action est irréversible.</p>
            <div className="flex gap-3">
              <Button variant="destructive" onClick={handleDeleteTransaction} className="flex-1">Supprimer</Button>
              <Button variant="outline" onClick={() => setConfirmDeleteId(null)} className="flex-1">Annuler</Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
