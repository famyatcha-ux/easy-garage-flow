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
import { generateInvoice } from "@/lib/generateInvoice";
import { Plus, FileText, Pencil, Wrench, DollarSign, TrendingUp } from "lucide-react";

const JOB_STATUSES = ["Pending", "In Progress", "Completed"] as const;

const emptyForm = { booking_id: "", date: new Date().toISOString().split("T")[0], labour_charge: 0, parts_cost: 0, markup_percentage: 0 };

export default function JobsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { isAdmin } = useRole();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [monthIdx, setMonthIdx] = useState<number>(getCurrentMonthIndex());

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => { const { data, error } = await supabase.from("bookings").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; },
  });

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => { const { data, error } = await supabase.from("jobs").select("*, bookings(customer_name, vehicle, registration)").order("created_at", { ascending: false }); if (error) throw error; return data; },
  });

  const { start, end } = useMemo(() => getMonthRange(getCurrentYear(), monthIdx), [monthIdx]);
  const filtered = useMemo(() => jobs.filter((j) => j.date >= start && j.date <= end), [jobs, start, end]);

  const saveJob = useMutation({
    mutationFn: async () => {
      const d: Record<string, unknown> = { booking_id: form.booking_id, date: form.date };
      if (isAdmin) { d.labour_charge = form.labour_charge; d.parts_cost = form.parts_cost; d.markup_percentage = form.markup_percentage; }
      if (editId) { const { error } = await supabase.from("jobs").update(d as any).eq("id", editId); if (error) throw error; }
      else { const { error } = await supabase.from("jobs").insert(d as any); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["jobs"] }); closeDialog(); toast({ title: editId ? "Job updated" : "Job created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => { const { error } = await supabase.from("jobs").update({ status } as any).eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });

  const calc = (j: { labour_charge: number; parts_cost: number; markup_percentage: number }) => {
    const partsSellingPrice = j.parts_cost * (1 + j.markup_percentage / 100);
    const totalValue = j.labour_charge + partsSellingPrice;
    const profit = totalValue - j.parts_cost;
    return { partsSellingPrice, totalValue, profit };
  };

  const fmt = (n: number) => `R ${n.toFixed(2)}`;
  const closeDialog = () => { setOpen(false); setEditId(null); setForm({ ...emptyForm, date: new Date().toISOString().split("T")[0] }); };
  const openEdit = (j: typeof jobs[0]) => { setEditId(j.id); setForm({ booking_id: j.booking_id, date: j.date, labour_charge: j.labour_charge, parts_cost: j.parts_cost, markup_percentage: j.markup_percentage }); setOpen(true); };

  const handleInvoice = (job: typeof jobs[0]) => {
    const booking = job.bookings as { customer_name: string; vehicle: string; registration: string | null } | null;
    const c = calc(job);
    generateInvoice({ customerName: booking?.customer_name ?? "Unknown", vehicle: booking?.vehicle ?? "Unknown", registration: booking?.registration ?? null, labourCharge: job.labour_charge, partsSellingPrice: c.partsSellingPrice, totalAmount: c.totalValue, date: job.date })
      .save(`invoice-${job.date}-${booking?.customer_name ?? "job"}.pdf`);
    toast({ title: "Invoice downloaded" });
  };

  const totalJobValue = filtered.reduce((s, j) => s + calc(j).totalValue, 0);
  const totalProfit = filtered.reduce((s, j) => s + calc(j).profit, 0);

  

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Jobs</h2>
        <div className="flex items-center gap-2">
          <MonthSelector value={monthIdx} onChange={setMonthIdx} />
          <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditId(null); setForm({ ...emptyForm, date: new Date().toISOString().split("T")[0] }); }}><Plus className="mr-2 h-4 w-4" />New Job</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? "Edit Job" : "New Job"}</DialogTitle></DialogHeader>
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); saveJob.mutate(); }}>
                <div><Label>Booking *</Label>
                  <Select value={form.booking_id} onValueChange={(v) => setForm({ ...form, booking_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select booking" /></SelectTrigger>
                    <SelectContent>{bookings.map((b) => <SelectItem key={b.id} value={b.id}>{b.customer_name} — {b.vehicle} ({b.registration})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                {isAdmin && <>
                  <div><Label>Labour Charge</Label><Input type="number" min={0} step={0.01} value={form.labour_charge} onChange={(e) => setForm({ ...form, labour_charge: +e.target.value })} /></div>
                  <div><Label>Parts Cost</Label><Input type="number" min={0} step={0.01} value={form.parts_cost} onChange={(e) => setForm({ ...form, parts_cost: +e.target.value })} /></div>
                  <div><Label>Markup %</Label><Input type="number" min={0} step={0.01} value={form.markup_percentage} onChange={(e) => setForm({ ...form, markup_percentage: +e.target.value })} /></div>
                  {form.booking_id && <div className="bg-muted p-3 rounded text-sm space-y-1">
                    <p>Parts Selling Price: <strong>{fmt(calc(form).partsSellingPrice)}</strong></p>
                    <p>Total Job Value: <strong>{fmt(calc(form).totalValue)}</strong></p>
                    <p>Profit: <strong>{fmt(calc(form).profit)}</strong></p>
                  </div>}
                </>}
                <Button type="submit" className="w-full" disabled={!form.booking_id || saveJob.isPending}>{editId ? "Update Job" : "Create Job"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Jobs</CardTitle><Wrench className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{filtered.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Job Value</CardTitle><DollarSign className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-2xl font-bold">{fmt(totalJobValue)}</div></CardContent></Card>
        {isAdmin && <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Profit</CardTitle><TrendingUp className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className={`text-2xl font-bold ${totalProfit >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(totalProfit)}</div></CardContent></Card>}
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Vehicle</TableHead><TableHead>Status</TableHead>
                {isAdmin && <TableHead className="text-right">Labour</TableHead>}
                {isAdmin && <TableHead className="text-right">Parts Cost</TableHead>}
                {isAdmin && <TableHead className="text-right">Markup %</TableHead>}
                {isAdmin && <TableHead className="text-right">Parts Selling</TableHead>}
                {isAdmin && <TableHead className="text-right">Total Value</TableHead>}
                {isAdmin && <TableHead className="text-right">Profit</TableHead>}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((j) => {
                const c = calc(j);
                const booking = j.bookings as { customer_name: string; vehicle: string; registration: string | null } | null;
                return (
                  <TableRow key={j.id}>
                    <TableCell className="whitespace-nowrap">{j.date}</TableCell>
                    <TableCell>{booking?.customer_name}</TableCell><TableCell>{booking?.vehicle}</TableCell>
                    <TableCell>
                      <Select value={(j as any).status ?? "Pending"} onValueChange={(v) => updateStatus.mutate({ id: j.id, status: v })}>
                        <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{JOB_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    {isAdmin && <TableCell className="text-right">{fmt(j.labour_charge)}</TableCell>}
                    {isAdmin && <TableCell className="text-right">{fmt(j.parts_cost)}</TableCell>}
                    {isAdmin && <TableCell className="text-right">{j.markup_percentage}%</TableCell>}
                    {isAdmin && <TableCell className="text-right">{fmt(c.partsSellingPrice)}</TableCell>}
                    {isAdmin && <TableCell className="text-right font-medium">{fmt(c.totalValue)}</TableCell>}
                    {isAdmin && <TableCell className="text-right font-medium">{fmt(c.profit)}</TableCell>}
                    <TableCell className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(j)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleInvoice(j)} title="Invoice"><FileText className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && <TableRow><TableCell colSpan={isAdmin ? 11 : 5} className="text-center text-muted-foreground py-8">No jobs in this period</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
