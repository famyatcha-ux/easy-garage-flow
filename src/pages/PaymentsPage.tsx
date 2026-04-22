import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/contexts/RoleContext";
import { Plus } from "lucide-react";

export default function PaymentsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { isAdmin } = useRole();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    job_id: "",
    date: new Date().toISOString().split("T")[0],
    amount_paid: 0,
    payment_method: "Cash",
    payment_type: "Final",
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*, bookings(customer_name, vehicle)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, jobs(labour_charge, parts_cost, markup_percentage, bookings(customer_name, vehicle))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addPayment = useMutation({
    mutationFn: async (p: typeof form) => {
      const { error } = await supabase.from("payments").insert({
        job_id: p.job_id,
        date: p.date,
        amount_paid: p.amount_paid,
        payment_method: p.payment_method,
        payment_type: p.payment_type,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      setOpen(false);
      setForm({ job_id: "", date: new Date().toISOString().split("T")[0], amount_paid: 0, payment_method: "Cash", payment_type: "Final" });
      toast({ title: "Payment recorded" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const fmt = (n: number) => `R ${n.toFixed(2)}`;

  const paymentsByJob = payments.reduce<Record<string, number>>((acc, p) => {
    acc[p.job_id] = (acc[p.job_id] || 0) + p.amount_paid;
    return acc;
  }, {});

  const getJobTotal = (j: { labour_charge: number; parts_cost: number; markup_percentage: number }) => {
    return j.labour_charge + j.parts_cost * (1 + j.markup_percentage / 100);
  };

  const selectedJob = jobs.find((j) => j.id === form.job_id);
  const selectedJobTotal = selectedJob ? getJobTotal(selectedJob) : 0;
  const selectedJobPaid = paymentsByJob[form.job_id] || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Payments</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Record Payment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); addPayment.mutate(form); }}>
              <div>
                <Label>Job *</Label>
                <Select value={form.job_id} onValueChange={(v) => setForm({ ...form, job_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select job" /></SelectTrigger>
                  <SelectContent>
                    {jobs.map((j) => {
                      const b = j.bookings as { customer_name: string; vehicle: string } | null;
                      return (
                        <SelectItem key={j.id} value={j.id}>
                          {b?.customer_name} — {b?.vehicle}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              {selectedJob && (
                <div className="bg-muted p-3 rounded text-sm space-y-1">
                  <p>Job Total: <strong>{fmt(selectedJobTotal)}</strong></p>
                  <p>Already Paid: <strong>{fmt(selectedJobPaid)}</strong></p>
                  <p>Outstanding: <strong>{fmt(selectedJobTotal - selectedJobPaid)}</strong></p>
                </div>
              )}
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Amount</Label><Input type="number" min={0} step={0.01} value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: +e.target.value })} /></div>
              <div>
                <Label>Method</Label>
                <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="EFT">EFT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.payment_type} onValueChange={(v) => setForm({ ...form, payment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Deposit">Deposit</SelectItem>
                    <SelectItem value="Final">Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={!form.job_id || addPayment.isPending}>Record Payment</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead className="text-right">Job Total</TableHead>
                <TableHead className="text-right">Amount Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => {
                const job = p.jobs as { labour_charge: number; parts_cost: number; markup_percentage: number; bookings: { customer_name: string; vehicle: string } | null } | null;
                const jobTotal = job ? getJobTotal(job) : 0;
                const totalPaidForJob = paymentsByJob[p.job_id] || 0;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap">{p.date}</TableCell>
                    <TableCell>{job?.bookings?.customer_name}</TableCell>
                    <TableCell>{job?.bookings?.vehicle}</TableCell>
                    <TableCell className="text-right">{fmt(jobTotal)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(p.amount_paid)}</TableCell>
                    <TableCell className="text-right">{fmt(jobTotal - totalPaidForJob)}</TableCell>
                    <TableCell>{p.payment_method}</TableCell>
                    <TableCell>{p.payment_type}</TableCell>
                  </TableRow>
                );
              })}
              {payments.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No payments yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
