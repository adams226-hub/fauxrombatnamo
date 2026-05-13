import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "components/AppIcon";
import Button from "components/ui/Button";
import {
  exportProductionReport,
  exportFuelReport,
  exportFinancialReport,
  exportEquipmentReport,
} from "../../../utils/excelExport";

export default function ExportPanel() {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(null);
  const [dateRange, setDateRange] = useState("month");

  // Dimensions correctes
  const DIMENSIONS = ['Minerai', 'Forage', '0/4', '0/5', '0/6', '5/15', '8/15', '15/25', '4/6', '10/14', '6/10', '0/31,5'];

  // Générer le contenu du rapport de production
  const generateProductionReport = () => {
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
    
    const total = Object.values(productionData).reduce((a, b) => a + b, 0);
    let content = "RAPPORT DE PRODUCTION\n";
    content += "=".repeat(50) + "\n";
    content += `Période: ${dateRange === 'day' ? "Aujourd'hui" : dateRange === 'week' ? "Cette semaine" : dateRange === 'month' ? "Ce mois" : "Trimestre"}\n`;
    content += `Date: ${new Date().toLocaleDateString('fr-FR')}\n\n`;
    content += "PRODUCTION PAR DIMENSION\n";
    content += "-".repeat(50) + "\n";
    
    Object.entries(productionData).forEach(([dim, qty]) => {
      const pct = ((qty / total) * 100).toFixed(1);
      content += `${dim}: ${qty} tonnes (${pct}%)\n`;
    });
    
    content += `\nTotal: ${total} tonnes\n`;
    content += `\nGénéré par Amp Mines et Carrieres Platform\n${new Date().toLocaleString()}`;
    
    return content;
  };

  // Générer le contenu du rapport de carburant
  const generateFuelReport = () => {
    const fuelData = [
      { date: '2026-03-01', quantity: 450, cost: 540, equipment: 'Excavateur' },
      { date: '2026-03-02', quantity: 380, cost: 456, equipment: 'Percatrice' },
      { date: '2026-03-03', quantity: 520, cost: 624, equipment: 'Camion' },
      { date: '2026-03-04', quantity: 290, cost: 348, equipment: 'Concasseur' },
      { date: '2026-03-05', quantity: 410, cost: 492, equipment: 'Convoyeur' }
    ];
    
    const totalQty = fuelData.reduce((sum, f) => sum + f.quantity, 0);
    const totalCost = fuelData.reduce((sum, f) => sum + f.cost, 0);
    
    let content = "RAPPORT DE CARBURANT\n";
    content += "=".repeat(50) + "\n";
    content += `Période: ${dateRange === 'day' ? "Aujourd'hui" : dateRange === 'week' ? "Cette semaine" : dateRange === 'month' ? "Ce mois" : "Trimestre"}\n`;
    content += `Date: ${new Date().toLocaleDateString('fr-FR')}\n\n`;
    content += "CONSOMMATION PAR ÉQUIPEMENT\n";
    content += "-".repeat(50) + "\n";
    
    fuelData.forEach(f => {
      content += `${f.date} - ${f.equipment}: ${f.quantity}L (${f.cost}FCFA)\n`;
    });
    
    content += `\nTotal: ${totalQty}L - Coût: ${totalCost}FCFA\n`;
    content += `\nGénéré par Amp Mines et Carrieres Platform\n${new Date().toLocaleString()}`;
    
    return content;
  };

  // Générer le contenu du rapport financier
  const generateFinancialReport = () => {
    const income = [
      { category: 'Vente Minerai', amount: 45000 },
      { category: 'Vente Gravillons', amount: 12500 },
      { category: 'Services', amount: 3200 }
    ];
    
    const expenses = [
      { category: 'Salaires', amount: 8500 },
      { category: 'Carburant', amount: 2460 },
      { category: 'Maintenance', amount: 1800 },
      { category: 'Location', amount: 1200 }
    ];
    
    const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = totalIncome - totalExpenses;
    
    let content = "RAPPORT FINANCIER\n";
    content += "=".repeat(50) + "\n";
    content += `Période: ${dateRange === 'day' ? "Aujourd'hui" : dateRange === 'week' ? "Cette semaine" : dateRange === 'month' ? "Ce mois" : "Trimestre"}\n`;
    content += `Date: ${new Date().toLocaleDateString('fr-FR')}\n\n`;
    
    content += "REVENUS\n";
    content += "-".repeat(30) + "\n";
    income.forEach(i => {
      content += `${i.category}: ${i.amount.toFixed(2)}FCFA\n`;
    });
    content += `Total Revenus: ${totalIncome.toFixed(2)}FCFA\n\n`;
    
    content += "DÉPENSES\n";
    content += "-".repeat(30) + "\n";
    expenses.forEach(e => {
      content += `${e.category}: ${e.amount.toFixed(2)}FCFA\n`;
    });
    content += `Total Dépenses: ${totalExpenses.toFixed(2)}FCFA\n\n`;
    
    content += "RÉSULTAT\n";
    content += "-".repeat(30) + "\n";
    content += `Bénéfice Net: ${profit.toFixed(2)}FCFA\n`;
    content += `Marge: ${((profit / totalIncome) * 100).toFixed(1)}%\n`;
    content += `\nGénéré par Amp Mines et Carrieres Platform\n${new Date().toLocaleString()}`;
    
    return content;
  };

  // Générer le contenu du rapport équipement
  const generateEquipmentReport = () => {
    const equipment = [
      { name: 'Excavateur CAT 349', status: 'Actif', hours: 45, utilization: 85 },
      { name: 'Percatrice DM45', status: 'Actif', hours: 38, utilization: 72 },
      { name: 'Camion 770', status: 'Maintenance', hours: 0, utilization: 0 },
      { name: 'Concasseur C120', status: 'Actif', hours: 52, utilization: 98 },
      { name: 'Convoyeur CV-01', status: 'Actif', hours: 48, utilization: 91 }
    ];
    
    let content = "RAPPORT ÉQUIPEMENTS\n";
    content += "=".repeat(50) + "\n";
    content += `Période: ${dateRange === 'day' ? "Aujourd'hui" : dateRange === 'week' ? "Cette semaine" : dateRange === 'month' ? "Ce mois" : "Trimestre"}\n`;
    content += `Date: ${new Date().toLocaleDateString('fr-FR')}\n\n`;
    content += "STATUT DES ÉQUIPEMENTS\n";
    content += "-".repeat(50) + "\n";
    
    equipment.forEach(e => {
      content += `${e.name}\n`;
      content += `  Statut: ${e.status}\n`;
      content += `  Heures: ${e.hours}h - Utilisation: ${e.utilization}%\n\n`;
    });
    
    const activeCount = equipment.filter(e => e.status === 'Actif').length;
    content += `Équipements Actifs: ${activeCount}/${equipment.length}\n`;
    content += `\nGénéré par Amp Mines et Carrieres Platform\n${new Date().toLocaleString()}`;
    
    return content;
  };

  // Fonction pour télécharger un fichier
  const downloadFile = (content, filename, type = 'text/plain') => {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Fonction pour générer un PDF (HTML imprimable)
  const generatePDF = (title, contentHtml) => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { color: #1a5c1a; border-bottom: 2px solid #1a5c1a; padding-bottom: 10px; }
    h2 { color: #333; margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background-color: #1a5c1a; color: white; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .total { font-weight: bold; background-color: #e8f5e9; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  ${contentHtml}
  <div class="footer">
    Généré par Amp Mines et Carrieres Platform le ${new Date().toLocaleString('fr-FR')}
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
    return html;
  };

  // Fonction pour exporter en PDF
  const handleExportPDF = () => {
    setExporting("pdf");
    
    const productionData = [
      { dimension: 'Minerai', quantity: 300 },
      { dimension: 'Forage', quantity: 150 },
      { dimension: '0/4', quantity: 200 },
      { dimension: '0/5', quantity: 180 },
      { dimension: '0/6', quantity: 160 },
      { dimension: '5/15', quantity: 140 },
      { dimension: '8/15', quantity: 120 },
      { dimension: '15/25', quantity: 100 },
      { dimension: '4/6', quantity: 90 },
      { dimension: '10/14', quantity: 80 },
      { dimension: '6/10', quantity: 70 },
      { dimension: '0/31,5', quantity: 60 }
    ];
    const totalProduction = productionData.reduce((sum, p) => sum + p.quantity, 0);
    
    const periodLabel = dateRange === 'day' ? "Aujourd'hui" : dateRange === 'week' ? "Cette semaine" : dateRange === 'month' ? "Ce mois" : "Trimestre";
    
    const contentHtml = `
      <h1>ROMBAT Mining Platform - Rapport Général</h1>
      <p><strong>Période:</strong> ${periodLabel}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
      
      <h2>Production par Dimension</h2>
      <table>
        <tr><th>Dimension</th><th>Quantité (tonnes)</th><th>Pourcentage</th></tr>
        ${productionData.map(p => `<tr><td>${p.dimension}</td><td>${p.quantity}</td><td>${((p.quantity / totalProduction) * 100).toFixed(1)}%</td></tr>`).join('')}
        <tr class="total"><td>TOTAL</td><td>${totalProduction}</td><td>100%</td></tr>
      </table>
      
      <h2>Résumé Financier</h2>
      <table>
        <tr><th>Catégorie</th><th>Montant (FCFA)</th></tr>
        <tr><td>Revenus</td><td>60 700,00</td></tr>
        <tr><td>Dépenses</td><td>13 960,00</td></tr>
        <tr class="total"><td>Bénéfice Net</td><td>46 740,00</td></tr>
      </table>
      
      <h2>Statut</h2>
      <p><strong>Statut global:</strong> Opérationnel</p>
    `;
    
    const html = generatePDF('ROMBAT Rapport', contentHtml);
    downloadFile(html, `ROMBAT_Rapport_${dateRange}_${new Date().toISOString().split('T')[0]}.html`, 'text/html');
    
    setTimeout(() => setExporting(null), 1500);
  };

  // Export global Production — format Excel (.xlsx)
  const handleExportExcel = () => {
    setExporting("excel");
    exportProductionReport(dateRange);
    setTimeout(() => setExporting(null), 1200);
  };

  // Télécharger un rapport spécifique en Excel (.xlsx)
  const handleDownloadReport = (reportType) => {
    setExporting(reportType);
    switch (reportType) {
      case 'report-0': exportProductionReport(dateRange); break;
      case 'report-1': exportFuelReport(dateRange);       break;
      case 'report-2': exportFinancialReport(dateRange);  break;
      case 'report-3': exportEquipmentReport(dateRange);  break;
      default: break;
    }
    setTimeout(() => setExporting(null), 1200);
  };

  return (
    <div
      className="rounded-xl border p-4 md:p-5"
      style={{
        background: "var(--color-card)",
        borderColor: "var(--color-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon name="Download" size={18} color="var(--color-primary)" />
        <h3
          className="text-base font-semibold"
          style={{ color: "var(--color-foreground)", fontFamily: "var(--font-heading)" }}
        >
          Export & Rapports
        </h3>
      </div>
      {/* Period selector */}
      <div className="mb-4">
        <p
          className="text-xs font-medium mb-2"
          style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-caption)" }}
        >
          Période
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { key: "day", label: "Aujourd'hui" },
            { key: "week", label: "Cette semaine" },
            { key: "month", label: "Ce mois" },
            { key: "quarter", label: "Trimestre" },
          ]?.map((p) => (
            <button
              key={p?.key}
              onClick={() => setDateRange(p?.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border"
              style={{
                background: dateRange === p?.key ? "var(--color-primary)" : "transparent",
                color: dateRange === p?.key ? "#fff" : "var(--color-muted-foreground)",
                borderColor: dateRange === p?.key ? "var(--color-primary)" : "var(--color-border)",
                fontFamily: "var(--font-caption)",
              }}
            >
              {p?.label}
            </button>
          ))}
        </div>
      </div>
      {/* Export buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          variant="outline"
          iconName="FileText"
          iconPosition="left"
          loading={exporting === "pdf"}
          onClick={handleExportPDF}
          fullWidth
        >
          Exporter PDF
        </Button>
        <Button
          variant="success"
          iconName="FileSpreadsheet"
          iconPosition="left"
          loading={exporting === "excel"}
          onClick={handleExportExcel}
          fullWidth
        >
          Exporter Excel
        </Button>
      </div>
      {/* Report types */}
      <div className="mt-4 space-y-2">
        <p
          className="text-xs font-medium"
          style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-caption)" }}
        >
          Rapports disponibles
        </p>
        {[
          { icon: "BarChart3", label: "Rapport de Production", badge: "Nouveau" },
          { icon: "Fuel", label: "Rapport Carburant", badge: null },
          { icon: "Calculator", label: "Rapport Financier", badge: null },
          { icon: "Wrench", label: "Rapport Équipement", badge: null },
        ]?.map((r, i) => (
          <button
            key={i}
            onClick={() => handleDownloadReport(`report-${i}`)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border transition-all duration-200 hover:bg-muted/50"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Icon name={r?.icon} size={15} color="var(--color-primary)" />
            <span
              className="flex-1 text-left text-sm"
              style={{ color: "var(--color-foreground)", fontFamily: "var(--font-caption)" }}
            >
              {r?.label}
            </span>
            {r?.badge && (
              <span
                className="px-1.5 py-0.5 rounded text-xs font-semibold"
                style={{
                  background: "rgba(44,85,48,0.12)",
                  color: "var(--color-primary)",
                  fontFamily: "var(--font-caption)",
                }}
              >
                {r?.badge}
              </span>
            )}
            <Icon name="Download" size={13} color="var(--color-muted-foreground)" />
          </button>
        ))}
      </div>
    </div>
  );
}