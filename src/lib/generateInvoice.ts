import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface InvoiceLineItem {
  description: string;
  amount: number;
}

export interface InvoiceData {
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessTagline?: string;
  invoiceNumber: string | number;
  date: string;
  customerName: string;
  contactNumber?: string | null;
  vehicle: string;
  registration?: string | null;
  lineItems: InvoiceLineItem[];
  partsSellingPrice: number;
  amountPaid: number;
}

const fmt = (n: number) => `R ${n.toFixed(2)}`;

export function generateInvoice(data: InvoiceData) {
  const doc = new jsPDF();
  const businessName = data.businessName || "Workshop";
  const totalLabour = data.lineItems.reduce((s, li) => s + (Number(li.amount) || 0), 0);
  const totalValue = totalLabour + data.partsSellingPrice;
  const balanceDue = totalValue - data.amountPaid;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(businessName, 20, 22);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90);
  let hy = 28;
  if (data.businessAddress) { doc.text(data.businessAddress, 20, hy); hy += 5; }
  if (data.businessPhone) { doc.text(`Tel: ${data.businessPhone}`, 20, hy); hy += 5; }
  if (data.businessTagline) {
    doc.setFont("helvetica", "italic");
    doc.text(data.businessTagline, 20, hy);
    doc.setFont("helvetica", "normal");
  }
  doc.setTextColor(0);

  doc.setFontSize(18);
  doc.setTextColor(100);
  doc.text("INVOICE", 190, 22, { align: "right" });
  doc.setTextColor(0);

  doc.setFontSize(10);
  doc.text(`Invoice #: ${String(data.invoiceNumber)}`, 190, 30, { align: "right" });
  doc.text(`Date: ${data.date}`, 190, 36, { align: "right" });

  doc.setDrawColor(200);
  doc.line(20, 48, 190, 48);

  // Customer details
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Bill To", 20, 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let y = 62;
  doc.text(data.customerName, 20, y);
  if (data.contactNumber) { y += 6; doc.text(`Contact: ${data.contactNumber}`, 20, y); }
  y += 6; doc.text(`Vehicle: ${data.vehicle}`, 20, y);
  if (data.registration) { y += 6; doc.text(`Registration: ${data.registration}`, 20, y); }

  // Work performed table
  const workRows = data.lineItems.length
    ? data.lineItems.map((li) => [li.description || "-", fmt(Number(li.amount) || 0)])
    : [["No work items", fmt(0)]];

  autoTable(doc, {
    startY: y + 10,
    head: [["Work Performed", "Amount"]],
    body: workRows,
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 10 },
    columnStyles: { 1: { halign: "right", cellWidth: 40 } },
  });

  // @ts-expect-error - autoTable adds lastAutoTable
  const afterWork = doc.lastAutoTable.finalY + 6;

  autoTable(doc, {
    startY: afterWork,
    body: [
      ["Total Labour", fmt(totalLabour)],
      ["Parts", fmt(data.partsSellingPrice)],
    ],
    theme: "plain",
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right", cellWidth: 40 } },
    margin: { left: 110 },
  });

  // @ts-expect-error - autoTable adds lastAutoTable
  const afterCharges = doc.lastAutoTable.finalY + 4;

  autoTable(doc, {
    startY: afterCharges,
    body: [
      ["Total Job Value", fmt(totalValue)],
      ["Less: Amount Paid", `- ${fmt(data.amountPaid)}`],
      ["Balance Due", fmt(balanceDue)],
    ],
    theme: "grid",
    styles: { fontSize: 11 },
    bodyStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 45 },
      1: { halign: "right", cellWidth: 35, fontStyle: "bold" },
    },
    margin: { left: 110 },
    didParseCell: (h) => {
      if (h.row.index === 2) {
        h.cell.styles.fillColor = [230, 230, 230];
        h.cell.styles.fontSize = 12;
      }
    },
  });

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(150);
  if (data.businessTagline) {
    doc.text(data.businessTagline, 105, pageHeight - 20, { align: "center" });
  }
  doc.text("Thank you for your business.", 105, pageHeight - 12, { align: "center" });

  return doc;
}
