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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { TablesInsert } from "@/integrations/supabase/types";
import { Plus, Pencil, Wrench, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const STATUSES = ["Booked", "In Progress", "Completed", "Collected"] as const;

// Common vehicle makes in South Africa
const VEHICLE_MAKES = [
  "Toyota", "Volkswagen", "Ford", "Hyundai", "Nissan", "Kia", "Renault", "Suzuki",
  "Mahindra", "Isuzu", "Mazda", "Honda", "Mercedes-Benz", "BMW", "Audi", "Mitsubishi",
  "Chevrolet", "Opel", "Peugeot", "Fiat", "Land Rover", "Jeep", "Volvo", "Datsun",
  "Haval", "Chery", "GWM", "Tata", "Other",
] as const;

function splitVehicle(v: string): { make: string; model: string } {
  if (!v) return { make: "", model: "" };
  const trimmed = v.trim();
  const known = VEHICLE_MAKES.find((m) => m !== "Other" && trimmed.toLowerCase().startsWith(m.toLowerCase()));
  if (known) return { make: known, model: trimmed.slice(known.length).trim() };
  const [first, ...rest] = trimmed.split(" ");
  return { make: first ?? "", model: rest.join(" ") };
}

const emptyForm: TablesInsert<"bookings"> = {
  customer_name: "", vehicle: "", contact_number: "", registration: "", problem_description: "",
  date: new Date().toISOString().split("T")[0],
};

export default function BookingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TablesInsert<"bookings">>({ ...emptyForm });
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [monthIdx, setMonthIdx] = useState<number>(getCurrentMonthIndex());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [depositBooking, setDepositBooking] = useState<{ id: string; customer_name: string; vehicle: string } | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState<"Cash" | "Card" | "EFT">("Cash");
  const [deleteBooking, setDeleteBooking] = useState<{ id: string; customer_name: string } | null>(null);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { start, end } = useMemo(() => getMonthRange(getCurrentYear(), monthIdx), [monthIdx]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      if (b.date < start || b.date > end) return false;
      if (statusFilter !== "All" && b.status !== statusFilter) return false;
      if (q) {
        const hay = `${b.customer_name ?? ""} ${b.vehicle ?? ""} ${b.registration ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bookings, start, end, search, statusFilter]);

  const saveBooking = useMutation({
    mutationFn: async () => {
      const vehicle = `${make.trim()} ${model.trim()}`.trim();
      if (!vehicle) throw new Error("Vehicle make is required");
      const payload = { ...form, vehicle };
      if (editId) {
        const { error } = await supabase.from("bookings").update({
          customer_name: payload.customer_name, vehicle: payload.vehicle,
          contact_number: payload.contact_number || null, registration: payload.registration || null,
          problem_description: payload.problem_description || null, date: payload.date,
        }).eq("id", editId);
        if (error) throw error;
      } else {
        const { data: counter, error: cErr } = await supabase
          .from("ref_counters").select("value").eq("name", "booking").single();
        if (cErr) throw cErr;
        const next = (counter?.value ?? 0) + 1;
        const { error: uErr } = await supabase
          .from("ref_counters").update({ value: next }).eq("name", "booking");
        if (uErr) throw uErr;
        const booking_ref = `BK-${String(next).padStart(4, "0")}`;
        const { error } = await supabase.from("bookings").insert({ ...payload, booking_ref });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bookings"] }); closeDialog(); toast({ title: editId ? "Booking updated" : "Booking added" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });

  const createJobWithDeposit = useMutation({
    mutationFn: async () => {
      if (!depositBooking) throw new Error("No booking selected");
      const amount = Number(depositAmount);
      if (!amount || amount <= 0) throw new Error("Enter a valid deposit amount");

      const { data: job, error: jobErr } = await supabase
        .from("jobs")
        .insert({ booking_id: depositBooking.id, date: new Date().toISOString().split("T")[0], status: "Pending" })
        .select()
        .single();
      if (jobErr) throw jobErr;

      const { error: payErr } = await supabase.from("payments").insert({
        job_id: job.id,
        amount_paid: amount,
        payment_type: "Deposit",
        payment_method: depositMethod,
        date: new Date().toISOString().split("T")[0],
      });
      if (payErr) throw payErr;

      const { error: bkErr } = await supabase.from("bookings").update({ status: "In Progress" }).eq("id", depositBooking.id);
      if (bkErr) throw bkErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      toast({ title: "Job created & deposit recorded" });
      setDepositBooking(null); setDepositAmount(""); setDepositMethod("Cash");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: jobs, error: jErr } = await supabase.from("jobs").select("id").eq("booking_id", id);
      if (jErr) throw jErr;
      const jobIds = (jobs ?? []).map((j) => j.id);
      if (jobIds.length) {
        const { error: pErr } = await supabase.from("payments").delete().in("job_id", jobIds);
        if (pErr) throw pErr;
        const { error: liErr } = await supabase.from("job_line_items").delete().in("job_id", jobIds);
        if (liErr) throw liErr;
        const { error: jdErr } = await supabase.from("jobs").delete().in("id", jobIds);
        if (jdErr) throw jdErr;
      }
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      setDeleteBooking(null);
      toast({ title: "Booking deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const closeDialog = () => {
    setOpen(false); setEditId(null);
    setForm({ ...emptyForm, date: new Date().toISOString().split("T")[0] });
    setMake(""); setModel("");
  };
  const openEdit = (b: typeof bookings[0]) => {
    setEditId(b.id);
    setForm({ customer_name: b.customer_name, vehicle: b.vehicle, contact_number: b.contact_number ?? "", registration: b.registration ?? "", problem_description: b.problem_description ?? "", date: b.date });
    const { make: mk, model: md } = splitVehicle(b.vehicle);
    setMake(mk); setModel(md);
    setOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Bookings</h2>
        <div className="flex items-center gap-2">
          <MonthSelector value={monthIdx} onChange={setMonthIdx} />
          <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditId(null); setForm({ ...emptyForm, date: new Date().toISOString().split("T")[0] }); setMake(""); setModel(""); }}><Plus className="mr-2 h-4 w-4" />New Booking</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? "Edit Booking" : "New Booking"}</DialogTitle></DialogHeader>
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); saveBooking.mutate(); }}>
                <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                <div><Label>Customer Name *</Label><Input required value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
                <div><Label>Contact Number</Label><Input value={form.contact_number ?? ""} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Make *</Label>
                    <Select value={make} onValueChange={setMake}>
                      <SelectTrigger><SelectValue placeholder="Select make" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {VEHICLE_MAKES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Model</Label>
                    <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. Hilux 2.4" />
                  </div>
                </div>
                <div><Label>Registration</Label><Input value={form.registration ?? ""} onChange={(e) => setForm({ ...form, registration: e.target.value })} /></div>
                <div><Label>Problem Description</Label><Textarea value={form.problem_description ?? ""} onChange={(e) => setForm({ ...form, problem_description: e.target.value })} /></div>
                <Button type="submit" className="w-full" disabled={saveBooking.isPending}>{editId ? "Update Booking" : "Add Booking"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <Input
          placeholder="Search customer, vehicle, or registration..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground ml-auto">{filtered.length} booking{filtered.length !== 1 ? "s" : ""} found</p>
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Contact</TableHead>
                <TableHead>Vehicle</TableHead><TableHead>Reg</TableHead><TableHead>Problem</TableHead>
                <TableHead>Status</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono whitespace-nowrap">{b.booking_ref ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{b.date}</TableCell>
                  <TableCell>{b.customer_name}</TableCell><TableCell>{b.contact_number}</TableCell>
                  <TableCell>{b.vehicle}</TableCell><TableCell>{b.registration}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{b.problem_description}</TableCell>
                  <TableCell>
                    <Select value={b.status} onValueChange={(v) => updateStatus.mutate({ id: b.id, status: v })}>
                      <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(b)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" onClick={() => { setDepositBooking({ id: b.id, customer_name: b.customer_name, vehicle: b.vehicle }); setDepositAmount(""); setDepositMethod("Cash"); }} title="Create Job + Take Deposit">
                        <Wrench className="h-4 w-4 mr-1" />Job + Deposit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteBooking({ id: b.id, customer_name: b.customer_name })} title="Delete" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No bookings in this period</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!depositBooking} onOpenChange={(v) => { if (!v) setDepositBooking(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Job + Take Deposit</DialogTitle></DialogHeader>
          {depositBooking && (
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); createJobWithDeposit.mutate(); }}>
              <div className="text-sm text-muted-foreground">
                <div><span className="font-medium text-foreground">Customer:</span> {depositBooking.customer_name}</div>
                <div><span className="font-medium text-foreground">Vehicle:</span> {depositBooking.vehicle}</div>
              </div>
              <div>
                <Label>Deposit Amount *</Label>
                <Input type="number" step="0.01" min="0" required value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="0.00" autoFocus />
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select value={depositMethod} onValueChange={(v) => setDepositMethod(v as "Cash" | "Card" | "EFT")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="EFT">EFT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-muted-foreground">Type: <span className="font-medium">Deposit</span> · Booking will be set to <span className="font-medium">In Progress</span></div>
              <Button type="submit" className="w-full" disabled={createJobWithDeposit.isPending}>
                {createJobWithDeposit.isPending ? "Saving..." : "Create Job & Save Deposit"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteBooking} onOpenChange={(v) => { if (!v) setDeleteBooking(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the booking for <span className="font-medium">{deleteBooking?.customer_name}</span> along with any linked jobs and payments. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); if (deleteBooking) deleteBookingMutation.mutate(deleteBooking.id); }}
              disabled={deleteBookingMutation.isPending}
            >
              {deleteBookingMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
