import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface InvoiceData {
  customerName: string;
  vehicle: string;
  registration: string | null;
  labourCharge: number;
  partsSellingPrice: number;
  totalAmount: number;
  date: string;
}

export function generateInvoice(data: InvoiceData) {
  const doc = new jsPDF();
  const fmt = (n: number) => `R ${n.toFixed(2)}`;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", 105, 25, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Workshop", 105, 33, { align: "center" });

  // Line
  doc.setDrawColor(200);
  doc.line(20, 38, 190, 38);

  // Customer details
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const y = 48;
  doc.text(`Date: ${data.date}`, 20, y);
  doc.text(`Customer: ${data.customerName}`, 20, y + 8);
  doc.text(`Vehicle: ${data.vehicle}`, 20, y + 16);
  if (data.registration) {
    doc.text(`Registration: ${data.registration}`, 20, y + 24);
  }

  // Table
  autoTable(doc, {
    startY: y + 34,
    head: [["Description", "Amount"]],
    body: [
      ["Labour Charge", fmt(data.labourCharge)],
      ["Parts", fmt(data.partsSellingPrice)],
    ],
    foot: [["Total", fmt(data.totalAmount)]],
    theme: "grid",
    headStyles: { fillColor: [60, 60, 60] },
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    styles: { fontSize: 10 },
  });

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Thank you for your business.", 105, pageHeight - 15, { align: "center" });

  return doc;
}
