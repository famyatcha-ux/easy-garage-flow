import fsLogo from "@/assets/fs-motors-logo.png";
import { useState, useMemo } from "react";
import { MonthSelector } from "@/components/MonthSelector";
import { getMonthRange, getCurrentMonthIndex, getCurrentYear } from "@/lib/monthRange";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/contexts/RoleContext";
import { generateInvoice, type InvoiceLineItem } from "@/lib/generateInvoice";
import { Plus, FileText, Pencil, Wrench, DollarSign, TrendingUp, Trash2, Eye, Printer, Download, AlertTriangle, MessageCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const JOB_STATUSES = ["Pending", "In Progress", "Completed"] as const;
const BUSINESS = {
  name: "FS Motors Mechanical Services",
  address: "54 Sage Road, Durban",
  phone: "071 528 9328",
  tagline: "Driving Dreams, Delivering Excellence.",
};

type LineItemDraft = { id?: string; description: string; amount: number };

const emptyForm = { booking_id: "", date: new Date().toISOString().split("T")[0], parts_cost: 0, markup_percentage: 0 };

export default function JobsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { isAdmin } = useRole();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([{ description: "", amount: 0 }]);
  const [monthIdx, setMonthIdx] = useState<number>(getCurrentMonthIndex());
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [paymentJobId, setPaymentJobId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount_paid: 0, payment_method: "Cash", payment_type: "Final", date: new Date().toISOString().split("T")[0] });

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => { const { data, error } = await supabase.from("bookings").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; },
  });

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => { const { data, error } = await supabase.from("jobs").select("*, bookings(customer_name, contact_number, vehicle, registration)").order("created_at", { ascending: false }); if (error) throw error; return data; },
  });

  const { data: allLineItems = [] } = useQuery({
    queryKey: ["job_line_items"],
    queryFn: async () => { const { data, error } = await supabase.from("job_line_items").select("*").order("position", { ascending: true }); if (error) throw error; return data; },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => { const { data, error } = await supabase.from("payments").select("*"); if (error) throw error; return data; },
  });

  const { start, end } = useMemo(() => getMonthRange(getCurrentYear(), monthIdx), [monthIdx]);
  const filtered = useMemo(() => jobs.filter((j) => j.date >= start && j.date <= end), [jobs, start, end]);

  const lineItemsByJob = useMemo(() => {
    const m: Record<string, typeof allLineItems> = {};
    for (const li of allLineItems) { (m[li.job_id] ||= []).push(li); }
    return m;
  }, [allLineItems]);

  const paidByJob = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of payments) { m[p.job_id] = (m[p.job_id] || 0) + Number(p.amount_paid); }
    return m;
  }, [payments]);

  const labourFor = (jobId: string) =>
    (lineItemsByJob[jobId] || []).reduce((s, li) => s + Number(li.amount || 0), 0);

  const saveJob = useMutation({
    mutationFn: async () => {
      const labourTotal = lineItems.reduce((s, li) => s + (Number(li.amount) || 0), 0);
      const d: Record<string, unknown> = { booking_id: form.booking_id, date: form.date, labour_charge: labourTotal };
      if (isAdmin) { d.parts_cost = form.parts_cost; d.markup_percentage = form.markup_percentage; }

      let jobId = editId;
      if (editId) {
        const { error } = await supabase.from("jobs").update(d as any).eq("id", editId);
        if (error) throw error;
      } else {
        // Assign next invoice_ref (FS-0001 ...)
        const { data: counter, error: cErr } = await supabase.from("ref_counters").select("value").eq("name", "job").maybeSingle();
        if (cErr) throw cErr;
        const nextVal = (counter?.value ?? 0) + 1;
        const { error: uErr } = await supabase.from("ref_counters").update({ value: nextVal, updated_at: new Date().toISOString() }).eq("name", "job");
        if (uErr) throw uErr;
        d.invoice_ref = `FS-${String(nextVal).padStart(4, "0")}`;
        const { data: inserted, error } = await supabase.from("jobs").insert(d as any).select("id").single();
        if (error) throw error;
        jobId = inserted.id;
      }

      // Replace line items: simplest reliable approach
      if (jobId) {
        const { error: delErr } = await supabase.from("job_line_items").delete().eq("job_id", jobId);
        if (delErr) throw delErr;
        const rows = lineItems
          .filter((li) => (li.description.trim() || Number(li.amount) > 0))
          .map((li, idx) => ({ job_id: jobId!, description: li.description.trim() || "Item", amount: Number(li.amount) || 0, position: idx }));
        if (rows.length) {
          const { error: insErr } = await supabase.from("job_line_items").insert(rows);
          if (insErr) throw insErr;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["job_line_items"] });
      closeDialog();
      toast({ title: editId ? "Job updated" : "Job created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, bookingId }: { id: string; status: string; bookingId?: string | null }) => {
      const { error } = await supabase.from("jobs").update({ status } as any).eq("id", id);
      if (error) throw error;
      if (status === "Completed" && bookingId) {
        const { error: bErr } = await supabase.from("bookings").update({ status: "Completed" }).eq("id", bookingId);
        if (bErr) throw bErr;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      if (vars.status === "Completed" && vars.bookingId) {
        qc.invalidateQueries({ queryKey: ["bookings"] });
        toast({ title: "Job and booking marked as completed." });
      }
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const recordPayment = useMutation({
    mutationFn: async () => {
      if (!paymentJobId) return;
      const { error } = await supabase.from("payments").insert({
        job_id: paymentJobId,
        amount_paid: paymentForm.amount_paid,
        payment_method: paymentForm.payment_method,
        payment_type: paymentForm.payment_type,
        date: paymentForm.date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      setPaymentJobId(null);
      toast({ title: "Payment recorded" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openPaymentDialog = (job: any) => {
    const c = calc(job);
    const balance = Math.max(0, c.totalValue - (paidByJob[job.id] || 0));
    setPaymentForm({ amount_paid: balance, payment_method: "Cash", payment_type: "Final", date: new Date().toISOString().split("T")[0] });
    setPaymentJobId(job.id);
  };
  const calc = (j: { parts_cost: number; markup_percentage: number; id: string }) => {
    const labourCharge = labourFor(j.id);
    const partsSellingPrice = j.parts_cost * (1 + j.markup_percentage / 100);
    const totalValue = labourCharge + partsSellingPrice;
    const profit = totalValue - j.parts_cost;
    return { labourCharge, partsSellingPrice, totalValue, profit };
  };

  const fmt = (n: number) => `R ${n.toFixed(2)}`;
  const closeDialog = () => {
    setOpen(false); setEditId(null);
    setForm({ ...emptyForm, date: new Date().toISOString().split("T")[0] });
    setLineItems([{ description: "", amount: 0 }]);
  };
  const openEdit = (j: any) => {
    setEditId(j.id);
    setForm({ booking_id: j.booking_id, date: j.date, parts_cost: j.parts_cost, markup_percentage: j.markup_percentage });
    const existing = (lineItemsByJob[j.id] || []).map((li) => ({ id: li.id, description: li.description, amount: Number(li.amount) }));
    setLineItems(existing.length ? existing : [{ description: "", amount: 0 }]);
    setOpen(true);
  };

  const buildInvoiceData = (job: any) => {
    const booking = job.bookings as { customer_name: string; contact_number: string | null; vehicle: string; registration: string | null } | null;
    const items: InvoiceLineItem[] = (lineItemsByJob[job.id] || []).map((li) => ({ description: li.description, amount: Number(li.amount) }));
    const c = calc(job);
    return {
      businessName: BUSINESS.name,
      businessAddress: BUSINESS.address,
      businessPhone: BUSINESS.phone,
      businessTagline: BUSINESS.tagline,
      invoiceNumber: job.invoice_ref ?? job.invoice_number ?? job.id.slice(0, 8).toUpperCase(),
      date: job.date,
      customerName: booking?.customer_name ?? "Unknown",
      contactNumber: booking?.contact_number ?? null,
      vehicle: booking?.vehicle ?? "Unknown",
      registration: booking?.registration ?? null,
      lineItems: items,
      partsSellingPrice: c.partsSellingPrice,
      amountPaid: paidByJob[job.id] || 0,
    };
  };

  const handleDownload = (job: any) => {
    const booking = job.bookings as { customer_name: string } | null;
    generateInvoice(buildInvoiceData(job)).save(`invoice-${job.invoice_ref ?? job.invoice_number ?? job.date}-${booking?.customer_name ?? "job"}.pdf`);
    toast({ title: "Invoice downloaded" });
  };

  const handlePrint = (job: any) => {
    const doc = generateInvoice(buildInvoiceData(job));
    doc.autoPrint();
    const url = doc.output("bloburl");
    window.open(url.toString(), "_blank");
  };

  const handleWhatsApp = (job: any) => {
    const inv = buildInvoiceData(job);
    const totalLabour = inv.lineItems.reduce((s, li) => s + li.amount, 0);
    const totalValue = totalLabour + inv.partsSellingPrice;
    const balance = totalValue - inv.amountPaid;
    const raw = (inv.contactNumber || "").replace(/\D/g, "");
    const number = raw.startsWith("0") ? "27" + raw.slice(1) : raw;
    const message =
`*FS Motors Mechanical Services*
*Invoice: ${inv.invoiceNumber}*

Dear ${inv.customerName},
Thank you for your visit!

Vehicle: ${inv.vehicle}${inv.registration ? ` (${inv.registration})` : ""}

*Total: R${totalValue.toFixed(2)}*
Amount Paid: R${inv.amountPaid.toFixed(2)}
*Balance Due: R${balance.toFixed(2)}*

Contact us: 071 528 9328
Driving Dreams, Delivering Excellence.`;
    if (!number) {
      toast({ title: "No contact number", description: "Customer has no contact number on file.", variant: "destructive" });
      return;
    }
    const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const totalJobValue = filtered.reduce((s, j) => s + calc(j).totalValue, 0);
  const totalProfit = filtered.reduce((s, j) => s + calc(j).profit, 0);
  const totalReceived = useMemo(
    () => payments.filter((p) => p.date >= start && p.date <= end).reduce((s, p) => s + Number(p.amount_paid || 0), 0),
    [payments, start, end]
  );

  const previewJob = previewJobId ? jobs.find((j) => j.id === previewJobId) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Jobs</h2>
        <div className="flex items-center gap-2">
          <MonthSelector value={monthIdx} onChange={setMonthIdx} />
          <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditId(null); setForm({ ...emptyForm, date: new Date().toISOString().split("T")[0] }); setLineItems([{ description: "", amount: 0 }]); }}><Plus className="mr-2 h-4 w-4" />New Job</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editId ? "Edit Job" : "New Job"}</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveJob.mutate(); }}>
                <div><Label>Booking *</Label>
                  <Select value={form.booking_id} onValueChange={(v) => setForm({ ...form, booking_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select booking" /></SelectTrigger>
                    <SelectContent>{bookings.map((b) => <SelectItem key={b.id} value={b.id}>{b.customer_name} — {b.vehicle} ({b.registration})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>

                {/* Work Performed */}
                <div className="space-y-2 border rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">Work Performed</Label>
                    <Button type="button" size="sm" variant="outline" onClick={() => setLineItems([...lineItems, { description: "", amount: 0 }])}>
                      <Plus className="h-3 w-3 mr-1" /> Add Item
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {lineItems.map((li, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_120px_auto] gap-2 items-center">
                        <Input placeholder="Description (e.g. Replace brake pads)" value={li.description} onChange={(e) => { const next = [...lineItems]; next[idx] = { ...next[idx], description: e.target.value }; setLineItems(next); }} />
                        <Input type="number" min={0} step={0.01} placeholder="Amount" value={li.amount} onChange={(e) => { const next = [...lineItems]; next[idx] = { ...next[idx], amount: +e.target.value }; setLineItems(next); }} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => { const next = lineItems.filter((_, i) => i !== idx); setLineItems(next.length ? next : [{ description: "", amount: 0 }]); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end pt-2 border-t text-sm">
                    <span>Total Labour: <strong>{fmt(lineItems.reduce((s, li) => s + (Number(li.amount) || 0), 0))}</strong></span>
                  </div>
                </div>

                {/* Payment-aware warning when editing */}
                {editId && (() => {
                  const labour = lineItems.reduce((s, li) => s + (Number(li.amount) || 0), 0);
                  const partsSell = (form.parts_cost || 0) * (1 + (form.markup_percentage || 0) / 100);
                  const total = labour + partsSell;
                  const paid = paidByJob[editId] || 0;
                  if (paid > 0) {
                    return (
                      <div className="bg-muted/50 p-3 rounded text-sm space-y-1 border">
                        <p>Already Paid (deposits/payments): <strong>{fmt(paid)}</strong></p>
                        <p>New Job Total: <strong>{fmt(total)}</strong></p>
                        <p>New Balance Due: <strong className={total - paid < 0 ? "text-destructive" : ""}>{fmt(total - paid)}</strong></p>
                        {total > 0 && paid > total + 0.01 && (
                          <Alert variant="destructive" className="mt-2">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>Payments exceed job total. Please review.</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}

                {isAdmin && <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Parts Cost</Label><Input type="number" min={0} step={0.01} value={form.parts_cost} onChange={(e) => setForm({ ...form, parts_cost: +e.target.value })} /></div>
                    <div><Label>Markup %</Label><Input type="number" min={0} step={0.01} value={form.markup_percentage} onChange={(e) => setForm({ ...form, markup_percentage: +e.target.value })} /></div>
                  </div>
                  {form.booking_id && (() => {
                    const labour = lineItems.reduce((s, li) => s + (Number(li.amount) || 0), 0);
                    const partsSell = form.parts_cost * (1 + form.markup_percentage / 100);
                    const total = labour + partsSell;
                    const profit = total - form.parts_cost;
                    return (
                      <div className="bg-muted p-3 rounded text-sm space-y-1">
                        <p>Parts Selling Price: <strong>{fmt(partsSell)}</strong></p>
                        <p>Total Job Value: <strong>{fmt(total)}</strong></p>
                        <p>Profit: <strong>{fmt(profit)}</strong></p>
                      </div>
                    );
                  })()}
                </>}
                <Button type="submit" className="w-full" disabled={!form.booking_id || saveJob.isPending}>{editId ? "Update Job" : "Create Job"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Jobs</CardTitle><Wrench className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{filtered.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Job Value</CardTitle><DollarSign className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{fmt(totalJobValue)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Received</CardTitle><DollarSign className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{fmt(totalReceived)}</div></CardContent></Card>
        {isAdmin && <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Profit</CardTitle><TrendingUp className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className={`text-2xl font-bold ${totalProfit >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(totalProfit)}</div></CardContent></Card>}
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Inv #</TableHead>
                <TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Vehicle</TableHead><TableHead>Status</TableHead>
                <TableHead className="text-right">Labour</TableHead>
                {isAdmin && <TableHead className="text-right">Parts Cost</TableHead>}
                {isAdmin && <TableHead className="text-right">Markup %</TableHead>}
                {isAdmin && <TableHead className="text-right">Parts Selling</TableHead>}
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                {isAdmin && <TableHead className="text-right">Profit</TableHead>}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((j) => {
                const c = calc(j as any);
                const paid = paidByJob[j.id] || 0;
                const outstanding = c.totalValue - paid;
                const booking = (j as any).bookings as { customer_name: string; vehicle: string; registration: string | null } | null;
                return (
                  <TableRow key={j.id}>
                    <TableCell className="font-mono text-xs">{(j as any).invoice_ref ?? (j as any).invoice_number ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{j.date}</TableCell>
                    <TableCell>{booking?.customer_name}</TableCell><TableCell>{booking?.vehicle}</TableCell>
                    <TableCell>
                      <Select value={(j as any).status ?? "Pending"} onValueChange={(v) => updateStatus.mutate({ id: j.id, status: v })}>
                        <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{JOB_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">{fmt(c.labourCharge)}</TableCell>
                    {isAdmin && <TableCell className="text-right">{fmt(j.parts_cost)}</TableCell>}
                    {isAdmin && <TableCell className="text-right">{j.markup_percentage}%</TableCell>}
                    {isAdmin && <TableCell className="text-right">{fmt(c.partsSellingPrice)}</TableCell>}
                    <TableCell className="text-right font-medium">{fmt(c.totalValue)}</TableCell>
                    <TableCell className="text-right">{fmt(paid)}</TableCell>
                    <TableCell className={`text-right font-medium ${outstanding > 0.005 ? "text-destructive" : "text-green-600"}`}>{fmt(Math.max(0, outstanding))}</TableCell>
                    {isAdmin && <TableCell className="text-right font-medium">{fmt(c.profit)}</TableCell>}
                    <TableCell className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(j)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => openPaymentDialog(j)} title="Record Payment"><Plus className="h-4 w-4 text-green-600" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setPreviewJobId(j.id)} title="View Invoice"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDownload(j)} title="Download Invoice"><Download className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handlePrint(j)} title="Print Invoice"><Printer className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleWhatsApp(j)} title="Send via WhatsApp"><MessageCircle className="h-4 w-4 text-green-600" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && <TableRow><TableCell colSpan={isAdmin ? 14 : 9} className="text-center text-muted-foreground py-8">No jobs in this period</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Invoice preview dialog */}
      <Dialog open={!!previewJobId} onOpenChange={(v) => { if (!v) setPreviewJobId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Invoice Preview</DialogTitle></DialogHeader>
          {previewJob && (() => {
            const inv = buildInvoiceData(previewJob);
            const totalLabour = inv.lineItems.reduce((s, li) => s + li.amount, 0);
            const totalValue = totalLabour + inv.partsSellingPrice;
            const balance = totalValue - inv.amountPaid;
            return (
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-start border-b pb-3">
                  <div>
                    <img src={fsLogo} alt="FS Motors" className="h-16 w-auto mb-1" />
                    {inv.businessAddress && <div className="text-xs text-muted-foreground">{inv.businessAddress}</div>}
                    {inv.businessPhone && <div className="text-xs text-muted-foreground">Tel: {inv.businessPhone}</div>}
                    {inv.businessTagline && <div className="text-xs italic text-muted-foreground mt-1">{inv.businessTagline}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-muted-foreground">INVOICE</div>
                    <div>Invoice #: {inv.invoiceNumber}</div>
                    <div>Date: {inv.date}</div>
                  </div>
                </div>
                <div>
                  <div className="font-semibold mb-1">Bill To</div>
                  <div>{inv.customerName}</div>
                  {inv.contactNumber && <div>Contact: {inv.contactNumber}</div>}
                  <div>Vehicle: {inv.vehicle}</div>
                  {inv.registration && <div>Registration: {inv.registration}</div>}
                </div>
                <div>
                  <div className="font-semibold mb-1">Work Performed</div>
                  <table className="w-full border">
                    <tbody>
                      {inv.lineItems.length === 0 && <tr><td className="border p-2 text-muted-foreground">No items</td><td className="border p-2 text-right">{fmt(0)}</td></tr>}
                      {inv.lineItems.map((li, i) => (
                        <tr key={i}><td className="border p-2">{li.description}</td><td className="border p-2 text-right w-32">{fmt(li.amount)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end">
                  <div className="w-72 space-y-1">
                    <div className="flex justify-between"><span>Total Labour</span><span>{fmt(totalLabour)}</span></div>
                    <div className="flex justify-between"><span>Parts</span><span>{fmt(inv.partsSellingPrice)}</span></div>
                    <div className="border-t pt-2 mt-2 space-y-1">
                      <div className="flex justify-between"><span className="font-semibold">Total Job Value</span><span className="font-semibold">{fmt(totalValue)}</span></div>
                      <div className="flex justify-between text-muted-foreground"><span>Less: Amount Paid</span><span>- {fmt(inv.amountPaid)}</span></div>
                      <div className="flex justify-between bg-muted p-2 rounded font-bold text-base"><span>Balance Due</span><span>{fmt(balance)}</span></div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-3 border-t">
                  <Button variant="outline" onClick={() => handleWhatsApp(previewJob)} className="text-green-700 border-green-600 hover:bg-green-50"><MessageCircle className="h-4 w-4 mr-2" />WhatsApp</Button>
                  <Button variant="outline" onClick={() => handlePrint(previewJob)}><Printer className="h-4 w-4 mr-2" />Print</Button>
                  <Button onClick={() => handleDownload(previewJob)}><Download className="h-4 w-4 mr-2" />Download PDF</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Record Payment dialog */}
      <Dialog open={!!paymentJobId} onOpenChange={(v) => { if (!v) setPaymentJobId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          {paymentJobId && (() => {
            const job = jobs.find((j) => j.id === paymentJobId);
            if (!job) return null;
            const c = calc(job as any);
            const paid = paidByJob[paymentJobId] || 0;
            const balance = c.totalValue - paid;
            const booking = (job as any).bookings as { customer_name: string; vehicle: string } | null;
            return (
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); recordPayment.mutate(); }}>
                <div className="bg-muted p-3 rounded text-sm space-y-1">
                  <p>{booking?.customer_name} — {booking?.vehicle}</p>
                  <p>Job Total: <strong>{fmt(c.totalValue)}</strong></p>
                  <p>Already Paid: <strong>{fmt(paid)}</strong></p>
                  <p>Balance Due: <strong>{fmt(balance)}</strong></p>
                </div>
                <div><Label>Date</Label><Input type="date" value={paymentForm.date} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} /></div>
                <div><Label>Amount</Label><Input type="number" min={0} step={0.01} value={paymentForm.amount_paid} onChange={(e) => setPaymentForm({ ...paymentForm, amount_paid: +e.target.value })} /></div>
                <div><Label>Payment Method</Label>
                  <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="EFT">EFT</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Payment Type</Label>
                  <Select value={paymentForm.payment_type} onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Deposit">Deposit</SelectItem>
                      <SelectItem value="Partial">Partial</SelectItem>
                      <SelectItem value="Final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={recordPayment.isPending || paymentForm.amount_paid <= 0}>
                  {recordPayment.isPending ? "Recording..." : "Record Payment"}
                </Button>
              </form>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
