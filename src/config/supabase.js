import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variables d\'environnement Supabase manquantes. Vérifiez votre fichier .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client admin (service_role) — uniquement pour les opérations admin
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

// Helper : applique un filtre site_id si fourni
function bySite(query, siteId) {
  return siteId ? query.eq('site_id', siteId) : query;
}

// ============================================================
// MINING SERVICE - Toutes les opérations base de données
// Les contrôles d'accès sont gérés par les RLS Supabase.
// ============================================================

export const miningService = {

  // ============================================================
  // PROFILES / UTILISATEURS
  // ============================================================

  async getUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async getUserById(id) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return { data, error };
  },

  // Crée un compte auth Supabase + profil associé
  async createUser(email, password, profile) {
    // Nécessite supabaseAdmin (service_role). Si absent → erreur claire.
    if (!supabaseAdmin) {
      return { data: null, error: { message: 'Clé service_role manquante dans .env.local (VITE_SUPABASE_SERVICE_ROLE_KEY)' } };
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: profile.full_name,
        role: profile.role,
        username: profile.username,
      }
    });

    if (authError) return { data: null, error: authError };

    // Upsert du profil avec site_id
    const { data, error } = await supabase
      .from('profiles')
      .upsert([{
        id: authData.user.id,
        username: profile.username,
        full_name: profile.full_name,
        role: profile.role,
        department: profile.department || null,
        site_id: profile.site_id || null,
        is_active: true
      }])
      .select()
      .single();

    return { data, error };
  },

  // Met à jour le profil d'un utilisateur
  async updateUser(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  },

  // Supprime définitivement un utilisateur (auth + profil)
  async deleteUser(userId) {
    const client = supabaseAdmin || supabase;
    // Supprimer de auth.users (cascade sur profiles)
    const { error: authError } = await client.auth.admin.deleteUser(userId);
    if (authError) return { error: authError };
    // Supprimer aussi de public.users si présent (legacy table)
    await supabase.from('profiles').delete().eq('id', userId);
    return { error: null };
  },

  async getUserStats() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, is_active, role');

    if (error) return { data: null, error };

    return {
      data: {
        total_users: data.length,
        active_users: data.filter(u => u.is_active).length,
        inactive_users: data.filter(u => !u.is_active).length,
        admin_users: data.filter(u => u.role === 'admin').length,
        updated_at: new Date().toISOString()
      },
      error: null
    };
  },

  // ============================================================
  // ÉQUIPEMENTS
  // ============================================================

  async getEquipment(siteId = null) {
    const q = supabase.from('equipment').select('*').order('created_at', { ascending: false });
    const { data, error } = await bySite(q, siteId);
    return { data, error };
  },

  async createEquipment(equipment, siteId = null) {
    const payload = siteId ? { ...equipment, site_id: siteId } : equipment;
    const { data, error } = await supabase.from('equipment').insert([payload]).select().single();
    return { data, error };
  },

  async updateEquipment(id, updates) {
    const { data, error } = await supabase
      .from('equipment')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async deleteEquipment(id) {
    const { error } = await supabase
      .from('equipment')
      .delete()
      .eq('id', id);
    return { error };
  },

  async getMaintenance(equipmentId = null) {
    let query = supabase
      .from('maintenance')
      .select('*')
      .order('start_date', { ascending: false });

    if (equipmentId) {
      query = query.eq('equipment_id', equipmentId);
    }

    const { data, error } = await query;
    return { data, error };
  },

  async addMaintenance(maintenance) {
    const { data, error } = await supabase
      .from('maintenance')
      .insert([maintenance])
      .select()
      .single();
    return { data, error };
  },

  async getOperationLogs(equipmentId = null) {
    let query = supabase
      .from('equipment_operation_logs')
      .select('*, equipment:equipment_id (name, type)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    if (equipmentId) query = query.eq('equipment_id', equipmentId);
    const { data, error } = await query;
    return { data, error };
  },

  async addOperationLog(log) {
    const { data, error } = await supabase
      .from('equipment_operation_logs')
      .insert([log])
      .select()
      .single();
    return { data, error };
  },

  // ============================================================
  // PRODUCTION
  // ============================================================

  async getProductionData(siteId = null) {
    const q = supabase
      .from('production')
      .select('*, production_details(dimension, quantity)')
      .order('date', { ascending: false })
      .limit(200);
    const { data, error } = await bySite(q, siteId);
    return { data, error };
  },

  async addProductionData(production, siteId = null) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: productionResult, error: productionError } = await supabase
      .from('production')
      .insert([{
        date: production.date,
        site: production.site,
        site_id: siteId || production.site_id || null,
        shift: production.shift,
        operator: production.operator,
        notes: production.notes,
        total: production.total,
        created_by: user?.id || null
      }])
      .select()
      .single();

    if (productionError) return { data: null, error: productionError };

    const details = production.dimensions
      .filter(d => parseFloat(d.quantity) > 0)
      .map(d => ({
        production_id: productionResult.id,
        dimension: d.dimension,
        quantity: parseFloat(d.quantity)
      }));

    if (details.length > 0) {
      const { error: detailsError } = await supabase
        .from('production_details')
        .insert(details);
      if (detailsError) return { data: null, error: detailsError };
    }

    return { data: productionResult, error: null };
  },

  // Sorties de production (livraisons / ventes)
  async getProductionExits(siteId = null) {
    const q = supabase
      .from('production_exits')
      .select('*, production_exit_details(dimension, quantity)')
      .order('date', { ascending: false });
    const { data, error } = await bySite(q, siteId);
    return { data, error };
  },

  async addProductionExit(exit, siteId = null) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: exitResult, error: exitError } = await supabase
      .from('production_exits')
      .insert([{
        date: exit.date,
        destination: exit.destination,
        exit_type: exit.exit_type,
        client_name: exit.client_name,
        notes: exit.notes,
        total: exit.total,
        site_id: siteId || exit.site_id || null,
        created_by: user?.id || null
      }])
      .select()
      .single();

    if (exitError) return { data: null, error: exitError };

    const details = exit.dimensions
      .filter(d => parseFloat(d.quantity) > 0)
      .map(d => ({
        exit_id: exitResult.id,
        dimension: d.dimension,
        quantity: parseFloat(d.quantity)
      }));

    if (details.length > 0) {
      const { error: detailsError } = await supabase
        .from('production_exit_details')
        .insert(details);
      if (detailsError) return { data: null, error: detailsError };
    }

    return { data: exitResult, error: null };
  },

  // ============================================================
  // TRANSACTIONS FINANCIÈRES (Comptabilité)
  // ============================================================

  async getFinancialTransactions(siteId = null) {
    const q = supabase
      .from('financial_transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .limit(200);
    const { data, error } = await bySite(q, siteId);
    return { data, error };
  },

  async addFinancialTransaction(transaction, siteId = null) {
    const { data, error } = await supabase
      .from('financial_transactions')
      .insert([{
        transaction_date: transaction.date,
        type: transaction.type,
        category: transaction.category,
        description: transaction.description,
        amount: parseFloat(transaction.amount),
        reference: transaction.reference || null,
        client_supplier: transaction.client_supplier || null,
        payment_method: transaction.payment_method || null,
        payment_status: transaction.status || 'pending',
        notes: transaction.notes || null,
        site_id: siteId || transaction.site_id || null,
      }])
      .select()
      .single();
    return { data, error };
  },

  async updateFinancialTransaction(id, updates) {
    const { error } = await supabase
      .from('financial_transactions')
      .update(updates)
      .eq('id', id);
    return { error };
  },

  async deleteFinancialTransaction(id) {
    const { error } = await supabase
      .from('financial_transactions')
      .delete()
      .eq('id', id);
    return { error };
  },

  // ============================================================
  // CARBURANT
  // ============================================================

  async getFuelTransactions(siteId = null) {
    const q = supabase
      .from('fuel_transactions')
      .select('*, equipment:equipment_id(name, type)')
      .order('transaction_date', { ascending: false })
      .limit(200);
    const { data, error } = await bySite(q, siteId);
    return { data, error };
  },

  async addFuelTransaction(entry, siteId = null) {
    const { data, error } = await supabase
      .from('fuel_transactions')
      .insert([{
        transaction_date: entry.date,
        equipment_id: entry.equipment_id,
        fuel_type: entry.fuel_type,
        quantity: parseFloat(entry.quantity),
        cost_per_liter: parseFloat(entry.cost_per_liter),
        supplier: entry.supplier || null,
        notes: entry.notes || null,
        operator_name: entry.operator_name || null,
        site_id: siteId || entry.site_id || null,
      }])
      .select()
      .single();
    return { data, error };
  },

  async getEquipmentFuelSummary() {
    const { data, error } = await supabase
      .from('fuel_transactions')
      .select(`
        equipment_id,
        equipment:equipment_id (name),
        quantity,
        transaction_date
      `)
      .order('transaction_date', { ascending: false });
    return { data, error };
  },

  // ============================================================
  // GESTION DU STOCK
  // ============================================================

  async getStockEntries(siteId = null) {
    const q = supabase
      .from('stock_entries')
      .select('*, stock_entry_details(dimension, quantity)')
      .order('entry_date', { ascending: false });
    const { data, error } = await bySite(q, siteId);
    return { data, error };
  },

  async getStockExits(siteId = null) {
    const q = supabase
      .from('stock_exits')
      .select('*, stock_exit_details(dimension, quantity)')
      .order('exit_date', { ascending: false });
    const { data, error } = await bySite(q, siteId);
    return { data, error };
  },

  async addStockEntry(entry, siteId = null) {
    const { data: { user } } = await supabase.auth.getUser();
    const { dimensions, ...entryData } = entry;

    const { data: entryResult, error: entryError } = await supabase
      .from('stock_entries')
      .insert([{
        entry_date: entryData.date || entryData.entry_date,
        source: entryData.source,
        notes: entryData.notes || null,
        operator_id: user?.id || null,
        site_id: siteId || entryData.site_id || null,
      }])
      .select()
      .single();

    if (entryError) return { data: null, error: entryError };

    const details = dimensions
      .filter(d => parseFloat(d.quantity) > 0)
      .map(d => ({
        stock_entry_id: entryResult.id,
        dimension: d.size || d.dimension,
        quantity: parseFloat(d.quantity)
      }));

    if (details.length > 0) {
      const { error: detailsError } = await supabase
        .from('stock_entry_details')
        .insert(details);
      if (detailsError) return { data: null, error: detailsError };
    }

    return { data: entryResult, error: null };
  },

  async addStockExit(exit, siteId = null) {
    const { data: { user } } = await supabase.auth.getUser();
    const { dimensions, ...exitData } = exit;

    const { data: exitResult, error: exitError } = await supabase
      .from('stock_exits')
      .insert([{
        exit_date: exitData.date || exitData.exit_date,
        destination: exitData.destination,
        exit_type: exitData.exit_type || 'sale',
        client_name: exitData.client_name || null,
        notes: exitData.notes || null,
        operator_id: user?.id || null,
        site_id: siteId || exitData.site_id || null,
      }])
      .select()
      .single();

    if (exitError) return { data: null, error: exitError };

    const details = dimensions
      .filter(d => parseFloat(d.quantity) > 0)
      .map(d => ({
        stock_exit_id: exitResult.id,
        dimension: d.size || d.dimension,
        quantity: parseFloat(d.quantity)
      }));

    if (details.length > 0) {
      const { error: detailsError } = await supabase
        .from('stock_exit_details')
        .insert(details);
      if (detailsError) return { data: null, error: detailsError };
    }

    return { data: exitResult, error: null };
  },

  async getStockSummary(siteId = null) {
    // Pour filtrer par site sur les détails, on passe par la table parente
    const prodQ = siteId
      ? supabase.from('production_details').select('dimension, quantity, production:production_id!inner(site_id)').eq('production.site_id', siteId)
      : supabase.from('production_details').select('dimension, quantity');
    const seQ = siteId
      ? supabase.from('stock_entry_details').select('dimension, quantity, entry:stock_entry_id!inner(site_id)').eq('entry.site_id', siteId)
      : supabase.from('stock_entry_details').select('dimension, quantity');
    const peQ = siteId
      ? supabase.from('production_exit_details').select('dimension, quantity, exit:exit_id!inner(site_id)').eq('exit.site_id', siteId)
      : supabase.from('production_exit_details').select('dimension, quantity');
    const sxQ = siteId
      ? supabase.from('stock_exit_details').select('dimension, quantity, exit:stock_exit_id!inner(site_id)').eq('exit.site_id', siteId)
      : supabase.from('stock_exit_details').select('dimension, quantity');

    const [prodDetailsResult, stockEntriesResult, prodExitsResult, stockExitsResult] = await Promise.all([
      prodQ, seQ, peQ, sxQ
    ]);

    const DIMENSIONS = [
      'Nombre de Voyage Alimenté', 'Nombre de Trous Forés', '0/4', '0/5', '0/6',
      '5/15', '8/15', '15/25', '4/6', '4/6 ENROBÉ', '10/14', '6/10', '0/31,5'
    ];

    const allEntries = [
      ...(prodDetailsResult.data || []),
      ...(stockEntriesResult.data || [])
    ];
    const allExits = [
      ...(prodExitsResult.data || []),
      ...(stockExitsResult.data || [])
    ];

    const stockSummary = DIMENSIONS.map(dim => {
      const totalEntries = allEntries
        .filter(e => e.dimension === dim)
        .reduce((sum, e) => sum + parseFloat(e.quantity || 0), 0);
      const totalExits = allExits
        .filter(e => e.dimension === dim)
        .reduce((sum, e) => sum + parseFloat(e.quantity || 0), 0);
      return {
        dimension: dim,
        entries: totalEntries,
        exits: totalExits,
        available: Math.max(0, totalEntries - totalExits)
      };
    });

    return { data: stockSummary, error: null };
  },

  // ============================================================
  // DASHBOARD EXÉCUTIF
  // ============================================================

  async getDashboardStats(siteId = null) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    const dayOfWeek = now.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diffToMon);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

    // Construit chaque requête avec filtre site optionnel
    const prodMonthQ  = bySite(supabase.from('production').select('total, date').gte('date', startOfMonth), siteId);
    const prodWeekQ   = bySite(supabase.from('production').select('total, date').gte('date', weekStartStr).lte('date', today), siteId);
    const equipQ      = bySite(supabase.from('equipment').select('id, status, name, serial_number'), siteId);
    const fuelMonthQ  = bySite(supabase.from('fuel_transactions').select('quantity, cost_per_liter, total_cost').gte('transaction_date', startOfMonth), siteId);
    const fuelByEqQ   = bySite(supabase.from('fuel_transactions').select('equipment_id, quantity, total_cost, equipment:equipment_id(name, serial_number)').gte('transaction_date', startOfMonth), siteId);
    const finMonthQ   = bySite(supabase.from('financial_transactions').select('amount, type').gte('transaction_date', startOfMonth), siteId);
    const fin6MQ      = bySite(supabase.from('financial_transactions').select('amount, type, transaction_date').gte('transaction_date', sixMonthsAgoStr), siteId);
    const oilByEqQ    = bySite(supabase.from('oil_transactions').select('equipment_id, quantity, equipment:equipment_id(name)').eq('transaction_type', 'out').not('equipment_id', 'is', null), siteId);
    const consumQ     = bySite(supabase.from('consumable_movements').select('category, quantity, unit, movement_type'), siteId);

    // Voyages et trous — filtrés via production parent si siteId fourni
    const voyagesBase = supabase.from('production_details').select('quantity, production:production_id(date, site_id)').eq('dimension', 'Nombre de Voyage Alimenté');
    const trousBase   = supabase.from('production_details').select('quantity, production:production_id(site_id)').eq('dimension', 'Nombre de Trous Forés');

    const [
      productionMonthResult,
      productionWeekResult,
      equipmentResult,
      fuelMonthResult,
      fuelByEqResult,
      financialMonthResult,
      financialSixMonthResult,
      sitesResult,
      voyagesResult,
      trousResult,
      oilByEqResult,
      consumableResult,
    ] = await Promise.all([
      prodMonthQ, prodWeekQ, equipQ, fuelMonthQ, fuelByEqQ,
      finMonthQ, fin6MQ,
      supabase.from('sites').select('id, name, location, is_active').order('name'),
      voyagesBase, trousBase, oilByEqQ, consumQ,
    ]);

    const productionsMonth = productionMonthResult.data || [];
    const productionsWeek = productionWeekResult.data || [];
    const equipment = equipmentResult.data || [];
    const fuelMonth = fuelMonthResult.data || [];
    const fuelByEq = fuelByEqResult.data || [];
    const financialMonth = financialMonthResult.data || [];
    const financialSixMonth = financialSixMonthResult.data || [];
    const sites = sitesResult.data || [];

    // ── KPI aggregates ────────────────────────────────────────
    const totalProductionMonth = productionsMonth.reduce((s, p) => s + parseFloat(p.total || 0), 0);
    const todayStr = today;
    const todayProduction = productionsMonth.filter(p => p.date === todayStr).reduce((s, p) => s + parseFloat(p.total || 0), 0);
    const activeEquipment = equipment.filter(e => e.status === 'active').length;
    const totalRevenue = financialMonth.filter(f => f.type === 'income').reduce((s, f) => s + parseFloat(f.amount), 0);
    const totalExpenses = financialMonth.filter(f => f.type === 'expense').reduce((s, f) => s + parseFloat(f.amount), 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitability = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const costPerTon = totalProductionMonth > 0 ? totalExpenses / totalProductionMonth : 0;

    // ── Fuel by equipment (chart) ─────────────────────────────
    const fuelByEqMap = {};
    fuelByEq.forEach(f => {
      const label = f.equipment?.name || 'N/A';
      if (!fuelByEqMap[label]) fuelByEqMap[label] = { engin: label, consommation: 0, cout: 0 };
      fuelByEqMap[label].consommation += parseFloat(f.quantity || 0);
      fuelByEqMap[label].cout += parseFloat(f.total_cost || 0);
    });
    const fuelChartData = Object.values(fuelByEqMap).sort((a, b) => b.consommation - a.consommation).slice(0, 6);

    // ── Voyages alimentés aujourd'hui ────────────────────────────
    const voyagesData = (voyagesResult.data || []).filter(v =>
      (!siteId || v.production?.site_id === siteId)
    );
    const voyages_aujourd_hui = voyagesData
      .filter(v => v.production?.date === todayStr)
      .reduce((s, v) => s + parseFloat(v.quantity || 0), 0);

    // ── Trous forés cumulatifs ───────────────────────────────────
    const trousData = (trousResult.data || []).filter(v =>
      (!siteId || v.production?.site_id === siteId)
    );
    const trous_fores_total = trousData.reduce((s, v) => s + parseFloat(v.quantity || 0), 0);

    // ── Huile par équipement ─────────────────────────────────────
    const oilByEqData = oilByEqResult.data || [];
    const oilByEqMap = {};
    oilByEqData.forEach(o => {
      const label = o.equipment?.name || 'N/A';
      if (!oilByEqMap[label]) oilByEqMap[label] = { engin: label, consommation: 0 };
      oilByEqMap[label].consommation += parseFloat(o.quantity || 0);
    });
    const oilChartData = Object.values(oilByEqMap)
      .sort((a, b) => b.consommation - a.consommation)
      .slice(0, 8);

    // ── Stock consommables par catégorie ─────────────────────────
    const consumableData = consumableResult.data || [];
    const consumableStockMap = {};
    consumableData.forEach(c => {
      const cat = c.category || 'Autre';
      if (!consumableStockMap[cat]) consumableStockMap[cat] = { category: cat, stock: 0, unit: c.unit || '' };
      const qty = parseFloat(c.quantity || 0);
      consumableStockMap[cat].stock += c.movement_type === 'in' ? qty : -qty;
    });
    const consumable_stock_data = Object.values(consumableStockMap)
      .map(c => ({ ...c, stock: Math.max(0, c.stock) }))
      .sort((a, b) => a.category.localeCompare(b.category));
    const total_consumable_stock = consumable_stock_data.reduce((s, c) => s + c.stock, 0);

    // ── Monthly profitability (6 months) ─────────────────────
    const monthMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'short' });
      monthMap[key] = { mois: label.charAt(0).toUpperCase() + label.slice(1), revenus: 0, depenses: 0, benefice: 0 };
    }
    financialSixMonth.forEach(t => {
      const key = t.transaction_date.substring(0, 7);
      if (!monthMap[key]) return;
      if (t.type === 'income') monthMap[key].revenus += parseFloat(t.amount);
      else monthMap[key].depenses += parseFloat(t.amount);
    });
    Object.values(monthMap).forEach(m => { m.benefice = m.revenus - m.depenses; });
    const monthlyProfitData = Object.values(monthMap);

    // ── Production by day (current week) ─────────────────────
    const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const weekDayMap = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const key = d.toISOString().split('T')[0];
      weekDayMap[key] = { jour: DAY_LABELS[d.getDay()], production: 0, objectif: 1500 };
    }
    productionsWeek.forEach(p => {
      if (weekDayMap[p.date]) weekDayMap[p.date].production += parseFloat(p.total || 0);
    });
    const productionWeekData = Object.values(weekDayMap);

    // ── Production by week (current month) ───────────────────
    const weeklyMap = {};
    productionsMonth.forEach(p => {
      const d = new Date(p.date);
      const weekNum = Math.ceil(d.getDate() / 7);
      const key = `S${weekNum}`;
      if (!weeklyMap[key]) weeklyMap[key] = { jour: key, production: 0, objectif: 10500 };
      weeklyMap[key].production += parseFloat(p.total || 0);
    });
    const productionMonthData = Object.values(weeklyMap).sort((a, b) => a.jour.localeCompare(b.jour));

    // ── Sites status ─────────────────────────────────────────
    const sitesData = sites.map(s => ({
      id: s.id,
      name: s.name,
      location: s.location,
      status: s.is_active ? 'Opérationnel' : 'Arrêté',
      is_active: s.is_active,
    }));

    return {
      data: {
        // KPIs
        total_production: todayProduction,
        total_production_month: totalProductionMonth,
        equipment_count: equipment.length,
        active_equipment: activeEquipment,
        equipment_availability: equipment.length > 0 ? (activeEquipment / equipment.length) * 100 : 0,
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        net_profit: netProfit,
        profitability,
        cost_per_ton: costPerTon,
        // Charts
        fuel_chart_data: fuelChartData,
        monthly_profit_data: monthlyProfitData,
        production_week_data: productionWeekData,
        production_month_data: productionMonthData,
        // Tables
        sites: sitesData,
        voyages_aujourd_hui,
        trous_fores_total,
        oil_chart_data: oilChartData,
        consumable_stock_data,
        total_consumable_stock,
      },
      error: null
    };
  },

  // ============================================================
  // OBJECTIFS
  // ============================================================

  async getObjectives(site = 'all') {
    const { data, error } = await supabase
      .from('objectives')
      .select('*')
      .eq('active', true)
      .or(`site.eq.${site},site.eq.all`);
    return { data, error };
  },

  async upsertObjective(objective) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('objectives')
      .upsert([{ ...objective, created_by: user?.id }], {
        onConflict: 'dimension,site,period_type'
      })
      .select()
      .single();
    return { data, error };
  },

  // ============================================================
  // RAPPORTS
  // ============================================================

  async getReports() {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async createReport(report) {
    const { data, error } = await supabase
      .from('reports')
      .insert([{ ...report }])
      .select()
      .single();
    return { data, error };
  },

  async deleteReport(id) {
    const { error } = await supabase.from('reports').delete().eq('id', id);
    return { error };
  },

  async getFuelChartData() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('fuel_transactions')
      .select('quantity, equipment:equipment_id(name)')
      .gte('transaction_date', startOfMonth);
    if (error) return { data: [], error };
    const map = {};
    (data || []).forEach(f => {
      const name = f.equipment?.name || 'Inconnu';
      const short = name.length > 12 ? name.substring(0, 12) + '…' : name;
      map[short] = (map[short] || 0) + parseFloat(f.quantity || 0);
    });
    return { data: Object.entries(map).map(([name, c]) => ({ name, c: Math.round(c) })), error: null };
  },

  async getCostEvolutionData() {
    const now = new Date();
    const sixAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('amount, type, transaction_date')
      .gte('transaction_date', sixAgo);
    if (error) return { data: [], error };
    const months = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'short' });
      months[key] = { mois: label.charAt(0).toUpperCase() + label.slice(1), c: 0, m: 0 };
    }
    (data || []).forEach(t => {
      const key = t.transaction_date.substring(0, 7);
      if (!months[key]) return;
      if (t.type === 'expense') months[key].c += parseFloat(t.amount);
      else months[key].m += parseFloat(t.amount);
    });
    return { data: Object.values(months), error: null };
  },

  // ============================================================
  // MAINTENANCE PRÉVENTIVE
  // ============================================================

  async getMaintenancePlans() {
    const { data, error } = await supabase
      .from('maintenance_plans')
      .select('*, equipment:equipment_id(name, type, serial_number)')
      .order('next_due_date', { ascending: true });
    return { data, error };
  },

  async createMaintenancePlan(plan) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('maintenance_plans')
      .insert([{ ...plan, created_by: user?.id || null }])
      .select('*, equipment:equipment_id(name, type, serial_number)')
      .single();
    return { data, error };
  },

  async updateMaintenancePlan(id, updates) {
    const { data, error } = await supabase
      .from('maintenance_plans')
      .update(updates)
      .eq('id', id)
      .select('*, equipment:equipment_id(name, type, serial_number)')
      .single();
    return { data, error };
  },

  async deleteMaintenancePlan(id) {
    const { error } = await supabase.from('maintenance_plans').delete().eq('id', id);
    return { error };
  },

  // ============================================================
  // PIÈCES DE RECHANGE
  // ============================================================

  async getSpareParts() {
    const { data, error } = await supabase
      .from('spare_parts')
      .select('*')
      .order('name', { ascending: true });
    return { data, error };
  },

  async createSparePart(part) {
    const { data, error } = await supabase
      .from('spare_parts')
      .insert([part])
      .select()
      .single();
    return { data, error };
  },

  async updateSparePart(id, updates) {
    const { data, error } = await supabase
      .from('spare_parts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async deleteSparePart(id) {
    const { error } = await supabase.from('spare_parts').delete().eq('id', id);
    return { error };
  },

  async getSparePartMovements(partId = null) {
    let query = supabase
      .from('spare_parts_movements')
      .select('*')
      .order('movement_date', { ascending: false });
    if (partId) query = query.eq('spare_part_id', partId);
    const { data, error } = await query;
    return { data, error };
  },

  async addSparePartMovement(movement) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('spare_parts_movements')
      .insert([{ ...movement, created_by: user?.id || null }])
      .select('*')
      .single();
    return { data, error };
  },

  // ============================================================
  // CONSOMMABLES
  // ============================================================

  async getConsumableMovements(siteId = null) {
    const q = supabase.from('consumable_movements').select('*').order('movement_date', { ascending: false });
    const { data, error } = await bySite(q, siteId);
    return { data, error };
  },

  async addConsumableMovement(movement, siteId = null) {
    const { data: authData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('consumable_movements')
      .insert([{
        ...movement,
        site_id: siteId || movement.site_id || null,
        operator_name: movement.operator_name || authData?.user?.email || null,
      }])
      .select('*')
      .single();
    return { data, error };
  },

  // ============================================================
  // GESTION HUILE
  // ============================================================

  async getOilTransactions(siteId = null) {
    const q = supabase
      .from('oil_transactions')
      .select('*, equipment:equipment_id(name, type, serial_number)')
      .order('transaction_date', { ascending: false });
    const { data, error } = await bySite(q, siteId);
    return { data, error };
  },

  async addOilTransaction(transaction, siteId = null) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('oil_transactions')
      .insert([{ ...transaction, site_id: siteId || transaction.site_id || null, created_by: user?.id || null }])
      .select('*, equipment:equipment_id(name, type, serial_number)')
      .single();
    return { data, error };
  },

  async deleteOilTransaction(id) {
    const { error } = await supabase.from('oil_transactions').delete().eq('id', id);
    return { error };
  },

  async getOilStockSummary(siteId = null) {
    const q = supabase.from('oil_transactions').select('oil_type, transaction_type, quantity');
    const { data, error } = await bySite(q, siteId);
    if (error) return { data: null, error };
    const OIL_TYPES = ['Huile Moteur', 'Huile Hydraulique', 'Huile Transmission', 'Huile Différentiel', 'Graisse', 'Autre'];
    const summary = OIL_TYPES.map(type => {
      const rows = (data || []).filter(r => r.oil_type === type);
      const totalIn  = rows.filter(r => r.transaction_type === 'in').reduce((s, r) => s + parseFloat(r.quantity || 0), 0);
      const totalOut = rows.filter(r => r.transaction_type === 'out').reduce((s, r) => s + parseFloat(r.quantity || 0), 0);
      return { oil_type: type, total_in: totalIn, total_out: totalOut, stock: Math.max(0, totalIn - totalOut) };
    });
    return { data: summary, error: null };
  },

  // ── Carburant: entrées et sorties ────────────────────────────
  async getFuelEntries() {
    const { data, error } = await supabase
      .from('fuel_entries')
      .select('*')
      .order('entry_date', { ascending: false });
    return { data, error };
  },

  async addFuelEntry(entry) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('fuel_entries')
      .insert([{ ...entry, created_by: user?.id || null }])
      .select()
      .single();
    return { data, error };
  },

  // ============================================================
  // PROJETS (CHANTIERS)
  // ============================================================

  async getProjects(siteId = null) {
    const q = supabase.from('projects').select('*').order('created_at', { ascending: false });
    const { data, error } = await bySite(q, siteId);
    return { data, error };
  },

  async createProject(project) {
    const { data: authData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('projects')
      .insert([{ ...project, created_by: authData?.user?.id || null }])
      .select()
      .single();
    return { data, error };
  },

  async updateProject(id, updates) {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  // ============================================================
  // FICHES DE COMMANDE
  // ============================================================

  async getProjectOrders(filters = {}) {
    let q = supabase
      .from('project_orders')
      .select(`
        *,
        project:project_id(id, name, code, client, client_address, client_rccm, client_ifu, client_phone),
        items:project_order_items(*),
        creator:created_by(id, full_name, email),
        approver:approved_by(id, full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (filters.siteId) q = q.eq('site_id', filters.siteId);
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.projectId) q = q.eq('project_id', filters.projectId);
    if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
    if (filters.dateTo) q = q.lte('created_at', filters.dateTo + 'T23:59:59');

    const { data, error } = await q;
    return { data, error };
  },

  async createProjectOrder(order, items) {
    const { data: authData } = await supabase.auth.getUser();
    const { data: orderData, error: orderError } = await supabase
      .from('project_orders')
      .insert([{ ...order, created_by: authData?.user?.id || null }])
      .select()
      .single();
    if (orderError) return { data: null, error: orderError };

    if (items && items.length > 0) {
      const { error: itemsError } = await supabase
        .from('project_order_items')
        .insert(items.map(it => ({ ...it, order_id: orderData.id })));
      if (itemsError) return { data: orderData, error: itemsError };
    }
    return { data: orderData, error: null };
  },

  async approveProjectOrder(id, approved) {
    const { data: authData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('project_orders')
      .update({
        status: approved ? 'approved' : 'rejected',
        approved_by: authData?.user?.id || null,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async rejectProjectOrder(id, reason) {
    const { data: authData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('project_orders')
      .update({
        status: 'rejected',
        rejection_reason: reason || null,
        approved_by: authData?.user?.id || null,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async markOrderDelivered(id) {
    const { data, error } = await supabase
      .from('project_orders')
      .update({ status: 'delivered' })
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async getOrdersReport(filters = {}) {
    let q = supabase
      .from('project_orders')
      .select(`
        *,
        project:project_id(id, name, code, client),
        items:project_order_items(*)
      `)
      .in('status', ['approved', 'delivered'])
      .order('created_at', { ascending: false });

    if (filters.siteId) q = q.eq('site_id', filters.siteId);
    if (filters.projectId) q = q.eq('project_id', filters.projectId);
    if (filters.dateFrom) q = q.gte('approved_at', filters.dateFrom);
    if (filters.dateTo) q = q.lte('approved_at', filters.dateTo + 'T23:59:59');

    const { data, error } = await q;
    return { data, error };
  },
};
