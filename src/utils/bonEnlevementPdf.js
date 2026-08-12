import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Génération du "Bon d'enlèvement" (PDF réel) pour une commande projet validée.
// Reprend la mise en forme du modèle papier AMP Center : logo + pied de page
// officiels (images), bloc "Doit :", tableau désignation/unité/quantité, total.

const AMP_CENTER = {
  city: 'Ouagadougou',
};

const LOGO_URL = '/assets/images/amp-center-logo.png';
const LOGO_RATIO = 246 / 448; // hauteur / largeur de l'image source
const FOOTER_URL = '/assets/images/amp-center-footer.png';
const FOOTER_RATIO = 109 / 644;

function formatNumber(n) {
  return (parseFloat(n) || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function generateBonEnlevementPDF(order) {
  const items = order.items || [];
  const total = items.reduce((sum, it) => sum + (parseFloat(it.quantity_tons) || 0), 0);
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const clientName = order.project?.client || order.project?.name || '—';
  const objet = order.project?.name
    ? `Livraison projet ${order.project.name}`.toUpperCase()
    : 'ENLEVEMENT DE MATERIAUX';

  const [logoImg, footerImg] = await Promise.all([loadImage(LOGO_URL), loadImage(FOOTER_URL)]);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 18;
  let y = 20;

  // ── Logo officiel AMP Center ───────────────────────────────────
  const logoWidth = 30;
  const logoHeight = logoWidth * LOGO_RATIO;
  doc.addImage(logoImg, 'PNG', marginX, y, logoWidth, logoHeight);

  // ── Date (haut droite) ───────────────────────────────────────
  doc.setTextColor(26, 26, 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`${AMP_CENTER.city}, le ${today}`, pageWidth - marginX, y + 6, { align: 'right' });

  y += logoHeight + 14;

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

  const project = order.project || {};
  const doitLines = [
    ...(project.client_address ? project.client_address.split('\n') : []),
    project.client_rccm ? `RCCM: ${project.client_rccm}` : null,
    project.client_ifu ? `IFU : ${project.client_ifu}` : null,
    project.client_phone ? `Téléphone: ${project.client_phone}` : null,
  ].filter(Boolean);

  if (!doitLines.length && order.delivery_site) {
    doitLines.push(order.delivery_site);
  }

  doitLines.forEach((line) => {
    doc.text(line, marginX, y);
    y += 5.5;
  });

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

  // ── Pied de page officiel AMP Center ───────────────────────────
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerWidth = pageWidth - marginX * 2;
  const footerHeight = footerWidth * FOOTER_RATIO;
  const footerY = pageHeight - footerHeight - 12;
  doc.addImage(footerImg, 'PNG', marginX, footerY, footerWidth, footerHeight);

  doc.save(`Bon_Enlevement_${order.order_number || 'AMP'}.pdf`);
}
