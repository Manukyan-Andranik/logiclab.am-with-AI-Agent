import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRegistrations, updateRegistrationStatus, deleteRegistration } from "@/api/admin";
import { useLocalized } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import Button from "@/components/ui/Button";
import { CheckCircle, XCircle, Clock, Trash2, Mail, Phone, MessageSquare, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AdminRegistrations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const tx = useLocalized();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [registrationToDelete, setRegistrationToDelete] = useState<any>(null);

  const { data: registrations, isLoading } = useQuery({
    queryKey: ["admin-registrations"],
    queryFn: () => getRegistrations(),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateRegistrationStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-registrations"] });
      toast({ title: "Updated", description: "Registration status changed." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRegistration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-registrations"] });
      toast({ title: "Deleted", description: "Registration removed." });
      setIsDeleteDialogOpen(false);
    },
  });

  const handleDeleteClick = (registration: any) => {
    setRegistrationToDelete(registration);
    setIsDeleteDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="secondary" className="gap-1"><Clock size={12} /> Pending</Badge>;
      case "confirmed": return <Badge variant="default" className="bg-emerald-500 gap-1"><CheckCircle size={12} /> Confirmed</Badge>;
      case "rejected": return <Badge variant="destructive" className="gap-1"><XCircle size={12} /> Rejected</Badge>;
      case "completed": return <Badge variant="outline" className="border-emerald-500 text-emerald-500 gap-1"><CheckCircle size={12} /> Completed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-12 bg-secondary rounded-lg w-full" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Course Registrations</h1>
        <p className="text-muted-foreground">Manage incoming course applications.</p>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[1000px]">
          <thead className="bg-secondary/50 text-muted-foreground uppercase text-[11px] font-bold tracking-widest">
            <tr>
              <th className="px-6 py-5">Student</th>
              <th className="px-6 py-5">Contact</th>
              <th className="px-6 py-5">Course</th>
              <th className="px-6 py-5">Message</th>
              <th className="px-6 py-5">Status</th>
              <th className="px-6 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {registrations?.map((reg: any) => (
              <tr key={reg.id} className="group hover:bg-secondary/20 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-foreground">
                    {reg.student?.user?.first_name} {reg.student?.user?.last_name}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-tight">ID: {reg.student_id}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1 text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground"><Mail size={12} /> {reg.student?.user?.email}</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground"><Phone size={12} /> {reg.student?.user?.phone || 'N/A'}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-semibold text-primary">{tx(reg.course?.title)}</div>
                </td>
                <td className="px-6 py-4">
                  {reg.message ? (
                    <div className="flex items-start gap-2 max-w-[200px] group/msg">
                      <MessageSquare size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground line-clamp-2 italic">"{reg.message}"</p>
                    </div>
                  ) : <span className="text-xs italic text-muted-foreground/50">No message</span>}
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(reg.status)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {reg.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-[10px] uppercase font-bold border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white"
                          onClick={() => statusMutation.mutate({ id: reg.id, status: "confirmed" })}
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-[10px] uppercase font-bold border-destructive/20 text-destructive hover:bg-destructive hover:text-white"
                          onClick={() => statusMutation.mutate({ id: reg.id, status: "rejected" })}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteClick(reg)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Delete Registration Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md" aria-describedby={undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete Registration</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3 text-foreground">
            <AlertDialogDescription>
              Are you sure you want to delete the registration for <strong>{tx(registrationToDelete?.student?.user?.first_name)} {tx(registrationToDelete?.student?.user?.last_name)}</strong> in <strong>{tx(registrationToDelete?.course?.title)}</strong>?
            </AlertDialogDescription>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
              <p className="font-semibold mb-1">⚠️ This action cannot be undone.</p>
              <p className="text-xs">The registration record will be permanently deleted.</p>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="flex-1 bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate(registrationToDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminRegistrations;
