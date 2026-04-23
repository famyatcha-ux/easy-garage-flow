import { useState } from "react";
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
import { Plus, Pencil } from "lucide-react";

const STATUSES = ["Booked", "In Progress", "Completed", "Collected"] as const;

const emptyForm: TablesInsert<"bookings"> = {
  customer_name: "",
  vehicle: "",
  contact_number: "",
  registration: "",
  problem_description: "",
  date: new Date().toISOString().split("T")[0],
};

export default function BookingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TablesInsert<"bookings">>({ ...emptyForm });

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveBooking = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from("bookings").update({
          customer_name: form.customer_name,
          vehicle: form.vehicle,
          contact_number: form.contact_number || null,
          registration: form.registration || null,
          problem_description: form.problem_description || null,
          date: form.date,
        }).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bookings").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      closeDialog();
      toast({ title: editId ? "Booking updated" : "Booking added" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });

  const closeDialog = () => {
    setOpen(false);
    setEditId(null);
    setForm({ ...emptyForm, date: new Date().toISOString().split("T")[0] });
  };

  const openEdit = (b: typeof bookings[0]) => {
    setEditId(b.id);
    setForm({
      customer_name: b.customer_name,
      vehicle: b.vehicle,
      contact_number: b.contact_number ?? "",
      registration: b.registration ?? "",
      problem_description: b.problem_description ?? "",
      date: b.date,
    });
    setOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Bookings</h2>
        <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditId(null); setForm({ ...emptyForm, date: new Date().toISOString().split("T")[0] }); }}>
              <Plus className="mr-2 h-4 w-4" />New Booking
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Edit Booking" : "New Booking"}</DialogTitle></DialogHeader>
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); saveBooking.mutate(); }}>
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Customer Name *</Label><Input required value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div><Label>Contact Number</Label><Input value={form.contact_number ?? ""} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} /></div>
              <div><Label>Vehicle (Make/Model) *</Label><Input required value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} /></div>
              <div><Label>Registration</Label><Input value={form.registration ?? ""} onChange={(e) => setForm({ ...form, registration: e.target.value })} /></div>
              <div><Label>Problem Description</Label><Textarea value={form.problem_description ?? ""} onChange={(e) => setForm({ ...form, problem_description: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={saveBooking.isPending}>{editId ? "Update Booking" : "Add Booking"}</Button>
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
                <TableHead>Contact</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Reg</TableHead>
                <TableHead>Problem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="whitespace-nowrap">{b.date}</TableCell>
                  <TableCell>{b.customer_name}</TableCell>
                  <TableCell>{b.contact_number}</TableCell>
                  <TableCell>{b.vehicle}</TableCell>
                  <TableCell>{b.registration}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{b.problem_description}</TableCell>
                  <TableCell>
                    <Select value={b.status} onValueChange={(v) => updateStatus.mutate({ id: b.id, status: v })}>
                      <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {bookings.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No bookings yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
