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
import { Plus } from "lucide-react";

export default function JobsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    booking_id: "",
    date: new Date().toISOString().split("T")[0],
    labour_charge: 0,
    parts_cost: 0,
    markup_percentage: 0,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, bookings(customer_name, vehicle, registration)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addJob = useMutation({
    mutationFn: async (j: typeof form) => {
      const { error } = await supabase.from("jobs").insert({
        booking_id: j.booking_id,
        date: j.date,
        labour_charge: j.labour_charge,
        parts_cost: j.parts_cost,
        markup_percentage: j.markup_percentage,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      setOpen(false);
      setForm({ booking_id: "", date: new Date().toISOString().split("T")[0], labour_charge: 0, parts_cost: 0, markup_percentage: 0 });
      toast({ title: "Job created" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const calc = (j: { labour_charge: number; parts_cost: number; markup_percentage: number }) => {
    const partsSellingPrice = j.parts_cost * (1 + j.markup_percentage / 100);
    const totalValue = j.labour_charge + partsSellingPrice;
    const profit = totalValue - j.parts_cost;
    return { partsSellingPrice, totalValue, profit };
  };

  const fmt = (n: number) => `R ${n.toFixed(2)}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Jobs</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Job</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Job</DialogTitle></DialogHeader>
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); addJob.mutate(form); }}>
              <div>
                <Label>Booking *</Label>
                <Select value={form.booking_id} onValueChange={(v) => setForm({ ...form, booking_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select booking" /></SelectTrigger>
                  <SelectContent>
                    {bookings.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.customer_name} — {b.vehicle} ({b.registration})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Labour Charge</Label><Input type="number" min={0} step={0.01} value={form.labour_charge} onChange={(e) => setForm({ ...form, labour_charge: +e.target.value })} /></div>
              <div><Label>Parts Cost</Label><Input type="number" min={0} step={0.01} value={form.parts_cost} onChange={(e) => setForm({ ...form, parts_cost: +e.target.value })} /></div>
              <div><Label>Markup %</Label><Input type="number" min={0} step={0.01} value={form.markup_percentage} onChange={(e) => setForm({ ...form, markup_percentage: +e.target.value })} /></div>
              {form.booking_id && (
                <div className="bg-muted p-3 rounded text-sm space-y-1">
                  <p>Parts Selling Price: <strong>{fmt(calc(form).partsSellingPrice)}</strong></p>
                  <p>Total Job Value: <strong>{fmt(calc(form).totalValue)}</strong></p>
                  <p>Profit: <strong>{fmt(calc(form).profit)}</strong></p>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={!form.booking_id || addJob.isPending}>Create Job</Button>
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
                <TableHead className="text-right">Labour</TableHead>
                <TableHead className="text-right">Parts Cost</TableHead>
                <TableHead className="text-right">Markup %</TableHead>
                <TableHead className="text-right">Parts Selling</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((j) => {
                const c = calc(j);
                const booking = j.bookings as { customer_name: string; vehicle: string; registration: string } | null;
                return (
                  <TableRow key={j.id}>
                    <TableCell className="whitespace-nowrap">{j.date}</TableCell>
                    <TableCell>{booking?.customer_name}</TableCell>
                    <TableCell>{booking?.vehicle}</TableCell>
                    <TableCell className="text-right">{fmt(j.labour_charge)}</TableCell>
                    <TableCell className="text-right">{fmt(j.parts_cost)}</TableCell>
                    <TableCell className="text-right">{j.markup_percentage}%</TableCell>
                    <TableCell className="text-right">{fmt(c.partsSellingPrice)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(c.totalValue)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(c.profit)}</TableCell>
                  </TableRow>
                );
              })}
              {jobs.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No jobs yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
