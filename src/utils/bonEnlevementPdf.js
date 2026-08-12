import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Génération du "Bon d'enlèvement" (PDF réel) pour une commande projet validée.
// Reprend la mise en forme du modèle papier AMP Center : en-tête, bloc "Doit :",
// tableau désignation/unité/quantité, total, cadre légal de bas de page.

const AMP_CENTER = {
  brand: 'AMP Center',
  city: 'Ouagadougou',
  footerLine1: 'SARL au capital de 5.000.000 fCFA - 04 BP 536 Ouagadougou 04',
  footerLine2: 'Secteur 53 (ex sect15) - Parcelle 25 - Section Q - Lot 24',
  footerLine3: 'Tél. : +226 25 34 06 80; E-mail: r.bationo@amp-bf.com',
  footerLine4: "RCCM: BF OUA 2021-B3819; IFU N°00155843K - Régime Simplifié d'Imposition",
};

function formatNumber(n) {
  return (parseFloat(n) || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

export function generateBonEnlevementPDF(order) {
  const items = order.items || [];
  const total = items.reduce((sum, it) => sum + (parseFloat(it.quantity_tons) || 0), 0);
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const clientName = order.project?.client || order.project?.name || '—';
  const objet = order.project?.name
    ? `Livraison projet ${order.project.name}`.toUpperCase()
    : 'ENLEVEMENT DE MATERIAUX';

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 18;
  let y = 20;

  // ── Logo + marque ────────────────────────────────────────────
  doc.setFillColor(229, 91, 45); // #E55B2D
  doc.roundedRect(marginX, y, 20, 20, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('AMP', marginX + 10, y + 12, { align: 'center' });

  doc.setTextColor(44, 85, 48); // #2C5530
  doc.setFontSize(10);
  doc.text(AMP_CENTER.brand, marginX, y + 26);

  // ── Date (haut droite) ───────────────────────────────────────
  doc.setTextColor(26, 26, 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`${AMP_CENTER.city}, le ${today}`, pageWidth - marginX, y + 6, { align: 'right' });

  y += 38;

  // ── Titre ─────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const title = `BON D'ENLEVEMENT N°${order.order_number || '—'}`;
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  const titleWidth = doc.getTextWidth(title);
  doc.setLineWidth(0.3);
  doc.line(pageWidth / 2 - titleWidth / 2, y + 1.5, pageWidth / 2 + titleWidth / 2, y + 1.5);

  y += 14;

  // ── Bloc "Doit :" ────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Doit :', marginX, y);
  doc.setLineWidth(0.2);
  const doitWidth = doc.getTextWidth('Doit :');
  doc.line(marginX, y + 1, marginX + doitWidth, y + 1);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.text(clientName, marginX, y);
  y += 5.5;
  if (order.delivery_site) {
    doc.text(order.delivery_site, marginX, y);
    y += 5.5;
  }

  y += 4;

  // ── Objet ─────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(`Objet : ${objet}`, marginX, y);

  y += 8;

  // ── Tableau ───────────────────────────────────────────────────
  const rows = items.length
    ? items.map((it, i) => [
        String(i + 1),
        [it.designation, it.dimension].filter(Boolean).join(' — ') || '—',
        'T',
        formatNumber(it.quantity_tons),
      ])
    : [['1', '—', 'T', '0']];

  rows.push(['', 'TOTAL', '', formatNumber(total)]);

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['Nos ref', 'DESIGNATION', 'UNITE', 'QUANTITE']],
    body: rows,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 10, textColor: [26, 26, 26], lineColor: [26, 26, 26], lineWidth: 0.2 },
    headStyles: { fillColor: [237, 237, 237], textColor: [26, 26, 26], fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 20 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'right', cellWidth: 30 },
    },
    didParseCell: (data) => {
      if (data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.lineWidth = { top: 0.6 };
      }
    },
  });

  let finalY = doc.lastAutoTable.finalY + 20;

  // ── Signature ─────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('COMPTABILITE', pageWidth - marginX, finalY, { align: 'right' });

  // ── Pied de page légal ───────────────────────────────────────
  const pageHeight = doc.internal.pageSize.getHeight();
  let footerY = pageHeight - 30;
  doc.setDrawColor(44, 85, 48);
  doc.setLineWidth(0.5);
  doc.line(marginX, footerY, pageWidth - marginX, footerY);
  footerY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 51, 51);
  [AMP_CENTER.footerLine1, AMP_CENTER.footerLine2, AMP_CENTER.footerLine3, AMP_CENTER.footerLine4].forEach((line) => {
    doc.text(line, pageWidth / 2, footerY, { align: 'center' });
    footerY += 4;
  });

  doc.save(`Bon_Enlevement_${order.order_number || 'AMP'}.pdf`);
}
