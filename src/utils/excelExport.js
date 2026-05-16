import * as XLSX from 'xlsx';

const COMPANY  = 'Amp Mines et Carrieres SARL';
const PLATFORM = 'AMP Mining Platform';

const PERIOD_LABELS = {
  day:     "Aujourd'hui",
  week:    'Cette semaine',
  month:   'Ce mois',
  quarter: 'Ce trimestre',
};

const periodLabel = (range) => PERIOD_LABELS[range] || range;
const today       = ()      => new Date().toLocaleDateString('fr-FR');
const fileDate    = ()      => new Date().toISOString().split('T')[0];

const TYPE_MAP = {
  excavator: 'Pelle hydraulique',
  drill:     'Foreuse',
  truck:     'Camion benne',
  crusher:   'Concasseur',
  conveyor:  'Convoyeur',
  loader:    'Chargeuse',
  pump:      'Pompe',
  generator: 'Groupe électrogène',
};

const STATUS_MAP = {
  active:      'Actif',
  maintenance: 'Maintenance',
  offline:     'Hors service',
  retired:     'Retraité',
};

function makeSheet(rows, colWidths) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  if (colWidths) ws['!cols'] = colWidths.map(w => ({ wch: w }));
  return ws;
}

function downloadXLSX(wb, filename) {
  XLSX.writeFile(wb, filename);
}

// ── 1. PRODUCTION ──────────────────────────────────────────────────────────────
export function exportProductionReport(range = 'month') {
  const DIMS = ['Minerai','Forage','0/4','0/5','0/6','5/15','8/15','15/25','4/6','10/14','6/10','0/31,5'];
  const QTY  = [300, 150, 200, 180, 160, 140, 120, 100, 90, 80, 70, 60];
  const total = QTY.reduce((a, b) => a + b, 0);

  const infoSheet = makeSheet([
    [COMPANY],
    [PLATFORM],
    ['RAPPORT DE PRODUCTION'],
    [],
    ['Période',              periodLabel(range)],
    ['Date de génération',   today()],
    ['Jours opérationnels',  '22 / 23'],
    ['Taux de rendement',    '95.7 %'],
  ], [35, 25]);

  const prodSheet = makeSheet([
    ['PRODUCTION PAR DIMENSION'],
    [],
    ['Dimension', 'Quantité (tonnes)', 'Part (%)', 'Tendance'],
    ...DIMS.map((d, i) => [d, QTY[i], +((QTY[i] / total) * 100).toFixed(1), '']),
    [],
    ['TOTAL', total, 100, ''],
    [],
    ['INDICATEURS DE PERFORMANCE', '', '', ''],
    ['Productivité horaire moyenne', '71.6 t/h', '', ''],
    ['Consommation carburant',       '8 500 L',  '', ''],
    ['Coût par tonne',               '12.50 FCFA', '', ''],
    ['Taux de panne',                '1.8 %',    '', ''],
  ], [28, 22, 12, 15]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, infoSheet, 'Informations');
  XLSX.utils.book_append_sheet(wb, prodSheet, 'Production');
  downloadXLSX(wb, `AMP_Rapport_Production_${fileDate()}.xlsx`);
}

// ── 2. CARBURANT ───────────────────────────────────────────────────────────────
export function exportFuelReport(range = 'month', fuelTransactions = []) {
  const defaultData = [
    { date: '2026-03-01', equipment: 'Excavateur CAT 349', quantity: 450, unit_cost: 1.20, total_cost: 540  },
    { date: '2026-03-02', equipment: 'Foreuse DM45',        quantity: 380, unit_cost: 1.20, total_cost: 456  },
    { date: '2026-03-03', equipment: 'Camion 770G',          quantity: 520, unit_cost: 1.20, total_cost: 624  },
    { date: '2026-03-04', equipment: 'Concasseur C120',      quantity: 290, unit_cost: 1.20, total_cost: 348  },
    { date: '2026-03-05', equipment: 'Convoyeur CV-01',      quantity: 410, unit_cost: 1.20, total_cost: 492  },
  ];

  const data     = fuelTransactions.length ? fuelTransactions : defaultData;
  const totalQty = data.reduce((s, f) => s + (f.quantity || 0), 0);
  const totalCost= data.reduce((s, f) => s + (f.total_cost || f.cost || 0), 0);

  const infoSheet = makeSheet([
    [COMPANY],
    [PLATFORM],
    ['RAPPORT CARBURANT'],
    [],
    ['Période',            periodLabel(range)],
    ['Date de génération', today()],
    [],
    ['Total consommé',  `${totalQty} L`],
    ['Coût total',      `${totalCost.toLocaleString('fr-FR')} FCFA`],
    ['Coût moyen/litre', totalQty > 0 ? `${(totalCost / totalQty).toFixed(2)} FCFA` : '-'],
  ], [35, 25]);

  const detailSheet = makeSheet([
    ['CONSOMMATION PAR ÉQUIPEMENT'],
    [],
    ['Date', 'Équipement / Engin', 'Quantité (L)', 'Coût unitaire (FCFA)', 'Coût total (FCFA)'],
    ...data.map(f => [
      f.date || '',
      f.equipment || f.equipment_name || '',
      f.quantity  || 0,
      f.unit_cost || '',
      f.total_cost || f.cost || 0,
    ]),
    [],
    ['', 'TOTAL', totalQty, '', totalCost],
  ], [15, 32, 16, 22, 22]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, infoSheet,   'Synthèse');
  XLSX.utils.book_append_sheet(wb, detailSheet, 'Consommation');
  downloadXLSX(wb, `AMP_Rapport_Carburant_${fileDate()}.xlsx`);
}

// ── 3. FINANCIER ───────────────────────────────────────────────────────────────
export function exportFinancialReport(range = 'month', transactions = []) {
  const income   = transactions.filter(t => t.type === 'income');
  const expenses = transactions.filter(t => t.type === 'expense');

  const totalIncome   = income.reduce((s, t)   => s + (parseFloat(t.amount) || 0), 0);
  const totalExpenses = expenses.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
  const profit        = totalIncome - totalExpenses;
  const margin        = totalIncome > 0 ? ((profit / totalIncome) * 100).toFixed(1) : 0;

  const COL_HEADERS = ['Date', 'Catégorie', 'Description', 'Client / Fournisseur', 'Référence', 'Mode Paiement', 'Montant (FCFA)'];
  const COL_WIDTHS  = [14, 26, 42, 28, 18, 18, 18];

  const toRow = t => [
    t.date              || '',
    t.category          || '',
    t.description       || '',
    t.client_supplier   || '',
    t.reference         || '',
    t.payment_method    || '',
    parseFloat(t.amount) || 0,
  ];

  // Feuille unique avec tout le contenu
  const fullSheet = makeSheet([
    [COMPANY],
    [PLATFORM],
    ['RAPPORT FINANCIER'],
    [],
    ['Période',            periodLabel(range)],
    ['Date de génération', today()],
    ['Transactions',       `${transactions.length} au total (${income.length} revenus, ${expenses.length} dépenses)`],
    [],
    ['── SYNTHÈSE FINANCIÈRE ──────────────────────────'],
    ['Total Revenus',      '',  '',  '',  '',  '',  totalIncome],
    ['Total Dépenses',     '',  '',  '',  '',  '',  totalExpenses],
    ['Bénéfice Net',       '',  '',  '',  '',  '',  profit],
    ['Marge bénéficiaire', '',  '',  '',  '',  '',  `${margin} %`],
    [],
    ['── LISTE DES REVENUS (' + income.length + ') ──────────────────────────────────────────────'],
    COL_HEADERS,
    ...income.map(toRow),
    ['', '', '', '', '', 'TOTAL REVENUS', totalIncome],
    [],
    ['── LISTE DES DÉPENSES (' + expenses.length + ') ────────────────────────────────────────────'],
    COL_HEADERS,
    ...expenses.map(toRow),
    ['', '', '', '', '', 'TOTAL DÉPENSES', totalExpenses],
  ], COL_WIDTHS);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, fullSheet, 'Rapport Financier');
  downloadXLSX(wb, `AMP_Rapport_Financier_${fileDate()}.xlsx`);
}

// ── 4. ÉQUIPEMENT ──────────────────────────────────────────────────────────────
export function exportEquipmentReport(range = 'month', equipment = []) {
  const defaultData = [
    { name: 'CAT-001',  type: 'excavator', model: 'CAT 349',  status: 'active',      location: 'Carrière Nord',    operating_hours: 4523 },
    { name: 'DM-001',   type: 'drill',     model: 'DM45',     status: 'active',      location: 'Zone Forage',       operating_hours: 3102 },
    { name: 'CAM-001',  type: 'truck',     model: '770G',     status: 'maintenance', location: 'Atelier',           operating_hours: 6240 },
    { name: 'CON-001',  type: 'crusher',   model: 'C120',     status: 'active',      location: 'Station Criblage',  operating_hours: 2890 },
    { name: 'CONV-01',  type: 'conveyor',  model: 'CV-01',    status: 'active',      location: 'Station Criblage',  operating_hours: 5123 },
  ];

  const data            = equipment.length ? equipment : defaultData;
  const activeCount     = data.filter(e => e.status === 'active').length;
  const maintenCount    = data.filter(e => e.status === 'maintenance').length;
  const availability    = data.length > 0 ? ((activeCount / data.length) * 100).toFixed(1) : 0;
  const totalHours      = data.reduce((s, e) => s + (e.operating_hours || 0), 0);

  const synthSheet = makeSheet([
    [COMPANY],
    [PLATFORM],
    ['RAPPORT ÉQUIPEMENTS'],
    [],
    ['Période',               periodLabel(range)],
    ['Date de génération',    today()],
    [],
    ['SYNTHÈSE PARC', ''],
    ['Total équipements',     data.length],
    ['Équipements actifs',    activeCount],
    ['En maintenance',        maintenCount],
    ['Taux de disponibilité', `${availability} %`],
    ['Heures totales',        totalHours],
  ], [35, 25]);

  const listSheet = makeSheet([
    ['LISTE DES ÉQUIPEMENTS'],
    [],
    ['Code Engin', 'Type', 'Modèle', 'Statut', 'Localisation', 'Heures opérationnelles'],
    ...data.map(e => [
      e.name  || '',
      TYPE_MAP[e.type]    || e.type   || '',
      e.model || '',
      STATUS_MAP[e.status] || e.status || '',
      e.location       || '',
      e.operating_hours || 0,
    ]),
  ], [15, 22, 18, 15, 22, 24]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, synthSheet, 'Synthèse');
  XLSX.utils.book_append_sheet(wb, listSheet,  'Équipements');
  downloadXLSX(wb, `AMP_Rapport_Equipements_${fileDate()}.xlsx`);
}

// ── 5. HUILE ───────────────────────────────────────────────────────────────────
export function exportOilReport(range = 'month', oilTransactions = []) {
  const entries = oilTransactions.filter(t => t.transaction_type === 'in');
  const exits   = oilTransactions.filter(t => t.transaction_type === 'out');

  const totalEntryQty = entries.reduce((s, t) => s + (parseFloat(t.quantity) || 0), 0);
  const totalExitQty  = exits.reduce((s,  t) => s + (parseFloat(t.quantity) || 0), 0);
  const totalCost     = entries.reduce((s, t) => s + ((parseFloat(t.quantity) || 0) * (parseFloat(t.cost_per_unit) || 0)), 0);

  // Stock par type d'huile
  const OIL_TYPES = ['Huile Moteur','Huile Hydraulique','Huile Transmission','Huile Différentiel','Graisse','Autre'];
  const stockRows = OIL_TYPES.map(type => {
    const in_  = oilTransactions.filter(t => t.oil_type === type && t.transaction_type === 'in').reduce((s,t) => s + (parseFloat(t.quantity)||0), 0);
    const out_ = oilTransactions.filter(t => t.oil_type === type && t.transaction_type === 'out').reduce((s,t) => s + (parseFloat(t.quantity)||0), 0);
    return [type, in_, out_, Math.max(0, in_ - out_)];
  });

  const synthSheet = makeSheet([
    [COMPANY],
    [PLATFORM],
    ['RAPPORT GESTION HUILE'],
    [],
    ['Période',             periodLabel(range)],
    ['Date de génération',  today()],
    [],
    ['SYNTHÈSE', ''],
    ['Total Entrées',      `${totalEntryQty.toFixed(1)} L`],
    ['Total Sorties',      `${totalExitQty.toFixed(1)} L`],
    ['Coût Total Achats',  `${totalCost.toLocaleString('fr-FR')} FCFA`],
    [],
    ['STOCK PAR TYPE D\'HUILE', '', '', ''],
    ['Type d\'Huile', 'Entrées (L)', 'Sorties (L)', 'Stock Restant (L)'],
    ...stockRows,
  ], [30, 15, 15, 20]);

  const entrySheet = makeSheet([
    ['ENTRÉES HUILE (ACHATS / RÉCEPTIONS)'],
    [],
    ['Date', 'Type d\'Huile', 'Quantité (L)', 'Prix/L (FCFA)', 'Coût Total (FCFA)', 'Fournisseur', 'Notes'],
    ...entries.map(t => [
      t.transaction_date || '',
      t.oil_type || '',
      parseFloat(t.quantity) || 0,
      parseFloat(t.cost_per_unit) || '',
      ((parseFloat(t.quantity)||0) * (parseFloat(t.cost_per_unit)||0)).toFixed(2),
      t.supplier || '',
      t.notes || '',
    ]),
    [],
    ['', '', totalEntryQty.toFixed(1), '', totalCost.toFixed(2), 'TOTAL', ''],
  ], [15, 22, 14, 14, 18, 25, 30]);

  const exitSheet = makeSheet([
    ['SORTIES HUILE (VIDANGES / APPOINTS)'],
    [],
    ['Date', 'Type d\'Huile', 'Équipement', 'Quantité (L)', 'Motif', 'Opérateur', 'Notes'],
    ...exits.map(t => [
      t.transaction_date || '',
      t.oil_type || '',
      t.equipment?.name || '',
      parseFloat(t.quantity) || 0,
      t.reason || '',
      t.operator_name || '',
      t.notes || '',
    ]),
    [],
    ['', '', 'TOTAL SORTIES', totalExitQty.toFixed(1), '', '', ''],
  ], [15, 22, 28, 14, 22, 20, 30]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, synthSheet, 'Synthèse');
  XLSX.utils.book_append_sheet(wb, entrySheet, 'Entrées');
  XLSX.utils.book_append_sheet(wb, exitSheet,  'Sorties');
  downloadXLSX(wb, `AMP_Rapport_Huile_${fileDate()}.xlsx`);
}

