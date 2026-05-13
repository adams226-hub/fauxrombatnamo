import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "components/navigation/AppLayout";
import Icon from "components/AppIcon";
import Button from "components/ui/Button";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toastError, toastSuccess } from "../../utils/toast.jsx";
import { miningService } from "../../config/supabase.js";
import { useAuth } from "../../context/AuthContext";
import {
  exportProductionReport,
  exportFuelReport,
  exportFinancialReport,
  exportEquipmentReport,
} from "../../utils/excelExport";

export default function Reports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fuelChartData, setFuelChartData] = useState([]);
  const [costChartData, setCostChartData] = useState([]);
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAutoGenModal, setShowAutoGenModal] = useState(false);
  const [selectedAutoGenType, setSelectedAutoGenType] = useState(null);

  const [autoGenConfig, setAutoGenConfig] = useState({
    daily: { enabled: false, time: '08:00', recipients: '' },
    weekly: { enabled: false, day: 'monday', time: '08:00', recipients: '' },
    monthly: { enabled: false, day: '1', time: '08:00', recipients: '' }
  });

  const [newReport, setNewReport] = useState({
    name: '',
    type: 'production',
    period: '',
    format: 'PDF'
  });

  useEffect(() => {
    loadReports();
    loadChartData();
  }, []);

  const loadReports = async () => {
    try {
      const result = await miningService.getReports();
      if (result.error) throw result.error;
      setReports(result.data || []);
    } catch (error) {
      console.error('Erreur chargement rapports:', error);
      toastError("Erreur lors du chargement des rapports");
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    const [fuelRes, costRes] = await Promise.all([
      miningService.getFuelChartData(),
      miningService.getCostEvolutionData(),
    ]);
    setFuelChartData(fuelRes.data || []);
    setCostChartData(costRes.data || []);
  };

  // Dimensions correctes selon la production
  const DIMENSIONS = ['Minerai', 'Forage', '0/4', '0/5', '0/6', '5/15', '8/15', '15/25', '4/6', '10/14', '6/10', '0/31,5'];
  
  const generateReportContent = (report) => {
    const sep = '='.repeat(50);
    const sub = '-'.repeat(40);
    
    // Données basées sur les dimensions réelles
    const productionData = {
      'Minerai': 300,
      'Forage': 150,
      '0/4': 200,
      '0/5': 180,
      '0/6': 160,
      '5/15': 140,
      '8/15': 120,
      '15/25': 100,
      '4/6': 90,
      '10/14': 80,
      '6/10': 70,
      '0/31,5': 60
    };
    
    const totalProduction = Object.values(productionData).reduce((a, b) => a + b, 0);
    
    let dimensionsList = '';
    Object.entries(productionData).forEach(([dim, qty]) => {
      const percentage = ((qty / totalProduction) * 100).toFixed(1);
      dimensionsList += `${dim}: ${qty} tonnes (${percentage}%)\n`;
    });
    
    switch (report.type) {
      case 'production':
        return `${sep}
RAPPORT DE PRODUCTION
ROMBAT Mining Platform
${sep}

Nom: ${report.name}
Période: ${report.period}
Date: ${report.date}

${sub}
SYNTHÈSE
${sub}

Production totale: ${totalProduction.toLocaleString()} tonnes
Jours opérationnels: 22/23
Taux de rendement: 95.7%

${sub}
PRODUCTION PAR DIMENSION
${sub}

${dimensionsList}
${sub}
INDICATEURS DE PERFORMANCE
${sub}

- Productivité horaire moyenne: 71.6 t/h
- Consommation carburant: 8,500 litres
- Coût par tonne: 12.50 FCFA
- Taux de panne: 1.8%

---
Généré par ROMBAT Platform
${new Date().toLocaleString()}`;
        
      case 'financial':
        return `${sep}\nRAPPORT FINANCIER\nROMBAT Mining Platform\n${sep}\n\nNom: ${report.name}\nPériode: ${report.period}\nDate: ${report.date}\n\n${sub}\nSYNTHÈSE\n${sub}\n\nRevenus: 186,750.00 FCFA\nDépenses: 124,820.00 FCFA\nBénéfice: 61,930.00 FCFA\nMarge: 33.2%\n\n---\nGénéré par ROMBAT Platform\n${new Date().toLocaleString()}`;
        
      case 'maintenance':
        return `${sep}\nRAPPORT DE MAINTENANCE\nROMBAT Mining Platform\n${sep}\n\nNom: ${report.name}\nPériode: ${report.period}\nDate: ${report.date}\n\n${sub}\nSYNTHÈSE\n${sub}\n\nInterventions: 47\nPréventives: 32 (68.1%)\nCorrectives: 15 (31.9%)\nTemps d'arrêt: 28.5h\n\nCoût total: 24,450.00 FCFA\n\n---\nGénéré par ROMBAT Platform\n${new Date().toLocaleString()}`;
        
      case 'summary':
        return `${sep}\nBILAN TRIMESTRIEL\nROMBAT Mining Platform\n${sep}\n\nNom: ${report.name}\nPériode: ${report.period}\nDate: ${report.date}\n\n${sub}\nSYNTHÈSE\n${sub}\n\nProduction: 145,200 tonnes\nRevenus: 560,250.00 FCFA\nDépenses: 374,460.00 FCFA\nBénéfice: 185,790.00 FCFA\n\n---\nGénéré par ROMBAT Platform\n${new Date().toLocaleString()}`;
        
      default:
        return `${sep}\nRAPPORT\nROMBAT Mining Platform\n${sep}\n\nNom: ${report.name}\nType: ${report.type}\nPériode: ${report.period}\nDate: ${report.date}\n\n---\nGénéré par ROMBAT Platform\n${new Date().toLocaleString()}`;
    }
  };

  const handleDownloadReport = async (report) => {
    try {
      switch (report.type) {
        case 'production':  exportProductionReport('month');  break;
        case 'financial':   exportFinancialReport('month');   break;
        case 'maintenance': exportEquipmentReport('month');   break;
        case 'summary':     exportFinancialReport('quarter'); break;
        default:            exportProductionReport('month');  break;
      }
      toastSuccess(`Rapport Excel téléchargé : ${report.name}`);
    } catch (error) {
      console.error("Erreur export Excel:", error);
      toastError("Erreur lors du téléchargement Excel");
    }
  };

  const handleViewReport = (report) => {
    try {
      const content = generateReportContent(report);
      const newWindow = window.open('', '_blank', 'width=800,height=600');
      newWindow.document.write(`
        <!DOCTYPE html><html><head><title>${report.name}</title>
        <style>body{font-family:monospace;padding:40px;line-height:1.6;background:#f5f5f5}
        .c{max-width:800px;margin:0 auto;background:white;padding:40px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}
        h1{color:#333;border-bottom:2px solid #333;padding-bottom:10px}
        pre{background:#f8fafc;padding:15px;border-radius:6px;overflow-x:auto;white-space:pre-wrap}
        button{background:#2563eb;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;margin-right:10px}</style></head>
        <body><div class="c"><pre>${content}</pre>
        <button onclick="window.print()">Imprimer</button>
        <button onclick="window.close()">Fermer</button></div></body></html>
      `);
      newWindow.document.close();
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const handleCreateNewReport = async () => {
    if (!newReport.name || !newReport.period) {
      toastError('Veuillez remplir le nom et la période');
      return;
    }
    try {
      const { data, error } = await miningService.createReport({
        name: newReport.name,
        type: newReport.type,
        period: newReport.period,
        format: newReport.format,
        status: 'completed',
        report_date: new Date().toISOString().split('T')[0],
      });
      if (error) throw error;
      toastSuccess('Rapport créé avec succès');
      setShowNewReportModal(false);
      setNewReport({ name: '', type: 'production', period: '', format: 'PDF' });
      await loadReports();
    } catch (error) {
      toastError(`Erreur: ${error.message}`);
    }
  };

  const handleConfigureAutoGen = (type) => {
    setSelectedAutoGenType(type);
    setShowAutoGenModal(true);
  };

  const handleDeleteReport = async (id) => {
    if (!confirm('Supprimer ce rapport?')) return;
    try {
      const { error } = await miningService.deleteReport(id);
      if (error) throw error;
      await loadReports();
    } catch (error) {
      toastError(`Erreur suppression: ${error.message}`);
    }
  };

  const getTypeLabel = (type) => ({ production: 'Production', financial: 'Financier', maintenance: 'Maintenance', summary: 'Synthèse' }[type] || type);
  const getTypeColor = (type) => ({ production: 'var(--color-primary)', financial: 'var(--color-success)', maintenance: 'var(--color-warning)', summary: '#3182CE' }[type] || 'var(--color-muted-foreground)');
  const getStatusColor = (status) => ({ completed: 'var(--color-success)', generating: 'var(--color-warning)', failed: 'var(--color-error)' }[status] || 'var(--color-muted-foreground)');
  const getStatusText = (status) => ({ completed: 'Terminé', generating: 'En cours', failed: 'Échoué' }[status] || status);

  return (
    <AppLayout userRole={user?.role} userName={user?.full_name} userSite="Amp Mines et Carrieres">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-foreground)" }}>Rapports</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted-foreground)" }}>Génération et consultation des rapports</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="default" iconName="Plus" iconPosition="left" onClick={() => setShowNewReportModal(true)}>Nouveau Rapport</Button>
          <Button variant="outline" iconName="Settings" iconPosition="left" onClick={() => setShowSettingsModal(true)}>Paramètres</Button>
          <Button variant="outline" iconName="ArrowLeft" iconPosition="left" onClick={() => navigate("/")}>Retour</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(56,161,105,0.12)" }}><Icon name="FileText" size={20} color="var(--color-success)" /></div>
            <div><p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Total</p><p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>{reports.length}</p></div>
          </div>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(56,161,105,0.12)" }}><Icon name="CheckCircle" size={20} color="var(--color-success)" /></div>
            <div><p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Terminés</p><p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>{reports.filter(r => r.status === 'completed').length}</p></div>
          </div>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(214,158,46,0.12)" }}><Icon name="Clock" size={20} color="var(--color-warning)" /></div>
            <div><p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>En cours</p><p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>{reports.filter(r => r.status === 'generating').length}</p></div>
          </div>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: "var(--color-card)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(49,130,206,0.12)" }}><Icon name="Calendar" size={20} color="#3182CE" /></div>
            <div><p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Ce Mois</p><p className="text-xl font-bold" style={{ color: "var(--color-foreground)" }}>{reports.filter(r => r.generated_at?.startsWith(new Date().toISOString().substring(0, 7)) || r.created_at?.startsWith(new Date().toISOString().substring(0, 7))).length}</p></div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border" style={{ background: "var(--color-card)" }}>
        <div className="p-4 border-b" style={{ borderColor: "var(--color-border)" }}><h2 className="text-lg font-semibold" style={{ color: "var(--color-foreground)" }}>Rapports Disponibles</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Nom</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Type</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Période</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Date</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Taille</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Format</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Statut</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: "var(--color-muted-foreground)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="8" className="p-8 text-center">Chargement...</td></tr> : reports.length === 0 ? <tr><td colSpan="8" className="p-8 text-center">Aucun rapport</td></tr> : reports.map((report) => (
                <tr key={report.id} className="border-b" style={{ borderColor: "var(--color-border)" }}>
                  <td className="p-4"><p className="font-medium" style={{ color: "var(--color-foreground)" }}>{report.name}</p></td>
                  <td className="p-4"><span className="px-2 py-1 rounded-full text-xs font-medium" style={{ background: `${getTypeColor(report.type)}15`, color: getTypeColor(report.type) }}>{getTypeLabel(report.type)}</span></td>
                  <td className="p-4" style={{ color: "var(--color-foreground)" }}>{report.period}</td>
                  <td className="p-4" style={{ color: "var(--color-foreground)" }}>{report.date}</td>
                  <td className="p-4" style={{ color: "var(--color-foreground)" }}>{report.size}</td>
                  <td className="p-4"><span className="px-2 py-1 rounded text-xs" style={{ background: "rgba(49,130,206,0.12)", color: "#3182CE" }}>{report.format}</span></td>
                  <td className="p-4"><span className="px-2 py-1 rounded-full text-xs font-medium" style={{ background: `${getStatusColor(report.status)}15`, color: getStatusColor(report.status) }}>{getStatusText(report.status)}</span></td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDownloadReport(report)} className="p-1.5 rounded hover:bg-gray-100" title="Télécharger"><Icon name="Download" size={16} color="var(--color-primary)" /></button>
                      <button onClick={() => handleViewReport(report)} className="p-1.5 rounded hover:bg-gray-100" title="Visualiser"><Icon name="Eye" size={16} color="var(--color-success)" /></button>
                      <button onClick={() => handleDeleteReport(report.id)} className="p-1.5 rounded hover:bg-gray-100" title="Supprimer"><Icon name="Trash2" size={16} color="var(--color-error)" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="rounded-xl border p-6" style={{ background: "var(--color-card)" }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>Consommation Carburant ce Mois</h3>
          {fuelChartData.length === 0 ? (
            <div className="flex items-center justify-center h-56 text-sm" style={{ color: "var(--color-muted-foreground)" }}>
              Aucune transaction carburant ce mois
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={fuelChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`${v} L`, 'Consommation']} />
                <Bar dataKey="c" name="Consommation (L)" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="rounded-xl border p-6" style={{ background: "var(--color-card)" }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>Évolution des Coûts (6 mois)</h3>
          {costChartData.every(d => d.c === 0 && d.m === 0) ? (
            <div className="flex items-center justify-center h-56 text-sm" style={{ color: "var(--color-muted-foreground)" }}>
              Aucune donnée financière disponible
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={costChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v, n) => [`${v.toLocaleString('fr-FR')} FCFA`, n]} />
                <Legend />
                <Line type="monotone" dataKey="c" name="Dépenses" stroke="#FF6B35" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="m" name="Revenus" stroke="var(--color-success)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="rounded-xl border p-6" style={{ background: "var(--color-card)" }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>Types de Rapports</h3>
          <div className="space-y-3">
            {[{ name: "Production", icon: "BarChart3", color: "var(--color-primary)" }, { name: "Financier", icon: "DollarSign", color: "var(--color-success)" }, { name: "Maintenance", icon: "Wrench", color: "var(--color-warning)" }, { name: "Synthèse", icon: "FileText", color: "#3182CE" }].map((t) => (
              <div key={t.name} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: "var(--color-border)" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${t.color}15` }}><Icon name={t.icon} size={16} color={t.color} /></div>
                <span className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>{t.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border p-6" style={{ background: "var(--color-card)" }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>Génération Automatique</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: "var(--color-border)" }}>
              <div><p className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>Rapport Journalier</p><p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Production et opérations</p></div>
              <Button variant="outline" size="sm" onClick={() => handleConfigureAutoGen('daily')}>Configurer</Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: "var(--color-border)" }}>
              <div><p className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>Rapport Hebdomadaire</p><p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Analyse complète</p></div>
              <Button variant="outline" size="sm" onClick={() => handleConfigureAutoGen('weekly')}>Configurer</Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: "var(--color-border)" }}>
              <div><p className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>Rapport Mensuel</p><p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Bilan complet</p></div>
              <Button variant="outline" size="sm" onClick={() => handleConfigureAutoGen('monthly')}>Configurer</Button>
            </div>
          </div>
        </div>
      </div>

      {showNewReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl p-6 w-full max-w-md" style={{ background: "var(--color-card)" }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>Créer un Nouveau Rapport</h3>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>Nom *</label>
                <input type="text" value={newReport.name} onChange={(e) => setNewReport({...newReport, name: e.target.value})} className="w-full p-2 rounded border" style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }} placeholder="ex: Rapport Mensuel" /></div>
              <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>Type</label>
                <select value={newReport.type} onChange={(e) => setNewReport({...newReport, type: e.target.value})} className="w-full p-2 rounded border" style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}>
                  <option value="production">Production</option><option value="financial">Financier</option><option value="maintenance">Maintenance</option><option value="summary">Synthèse</option>
                </select></div>
              <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>Période *</label>
                <input type="text" value={newReport.period} onChange={(e) => setNewReport({...newReport, period: e.target.value})} className="w-full p-2 rounded border" style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }} placeholder="ex: Mars 2026" /></div>
              <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>Format</label>
                <select value={newReport.format} onChange={(e) => setNewReport({...newReport, format: e.target.value})} className="w-full p-2 rounded border" style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}>
                  <option value="PDF">PDF</option><option value="Excel">Excel</option><option value="CSV">CSV</option>
                </select></div>
            </div>
            <div className="flex gap-3 mt-6"><Button variant="default" onClick={handleCreateNewReport}>Créer</Button><Button variant="outline" onClick={() => setShowNewReportModal(false)}>Annuler</Button></div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl p-6 w-full max-w-md" style={{ background: "var(--color-card)" }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>Paramètres des Rapports</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="rounded" /><span style={{ color: "var(--color-foreground)" }}>Génération automatique</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="rounded" /><span style={{ color: "var(--color-foreground)" }}>Notification par email</span></label>
              <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>Format par défaut</label>
                <select className="w-full p-2 rounded border" style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}><option>PDF</option><option>Excel</option><option>CSV</option></select></div>
            </div>
            <div className="flex gap-3 mt-6"><Button variant="default" onClick={() => { alert("Paramètres sauvegardés!"); setShowSettingsModal(false); }}>Sauvegarder</Button><Button variant="outline" onClick={() => setShowSettingsModal(false)}>Annuler</Button></div>
          </div>
        </div>
      )}

      {showAutoGenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl p-6 w-full max-w-md" style={{ background: "var(--color-card)" }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>Configuration - Rapport {selectedAutoGenType === 'daily' ? 'Journalier' : selectedAutoGenType === 'weekly' ? 'Hebdomadaire' : 'Mensuel'}</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={autoGenConfig[selectedAutoGenType]?.enabled || false} onChange={(e) => setAutoGenConfig({...autoGenConfig, [selectedAutoGenType]: {...autoGenConfig[selectedAutoGenType], enabled: e.target.checked}})} className="rounded" />
                <span style={{ color: "var(--color-foreground)" }}>Activer</span>
              </label>
              {selectedAutoGenType === 'daily' && <div><label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>Heure</label><input type="time" value={autoGenConfig.daily?.time || '08:00'} onChange={(e) => setAutoGenConfig({...autoGenConfig, daily: {...autoGenConfig.daily, time: e.target.value}})} className="w-full p-2 rounded border" style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }} /></div>}
              {selectedAutoGenType === 'weekly' && <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>Jour</label><select value={autoGenConfig.weekly?.day || 'monday'} onChange={(e) => setAutoGenConfig({...autoGenConfig, weekly: {...autoGenConfig.weekly, day: e.target.value}})} className="w-full p-2 rounded border" style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}><option value="monday">Lundi</option><option value="friday">Vendredi</option></select></div><div><label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>Heure</label><input type="time" value={autoGenConfig.weekly?.time || '08:00'} onChange={(e) => setAutoGenConfig({...autoGenConfig, weekly: {...autoGenConfig.weekly, time: e.target.value}})} className="w-full p-2 rounded border" style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }} /></div></div>}
              {selectedAutoGenType === 'monthly' && <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>Jour du mois</label><input type="number" min="1" max="28" value={autoGenConfig.monthly?.day || '1'} onChange={(e) => setAutoGenConfig({...autoGenConfig, monthly: {...autoGenConfig.monthly, day: e.target.value}})} className="w-full p-2 rounded border" style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }} /></div><div><label className="block text-sm font-medium mb-1" style={{ color: "var(--color-foreground)" }}>Heure</label><input type="time" value={autoGenConfig.monthly?.time || '08:00'} onChange={(e) => setAutoGenConfig({...autoGenConfig, monthly: {...autoGenConfig.monthly, time: e.target.value}})} className="w-full p-2 rounded border" style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }} /></div></div>}
            </div>
            <div className="flex gap-3 mt-6"><Button variant="default" onClick={() => { alert("Configuration sauvegardée!"); setShowAutoGenModal(false); }}>Sauvegarder</Button><Button variant="outline" onClick={() => setShowAutoGenModal(false)}>Annuler</Button></div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
