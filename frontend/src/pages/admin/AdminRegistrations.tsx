import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRegistrations, updateRegistrationStatus } from "@/api/admin";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
import Button from "@/components/ui/Button";
import { Check, X, Clock, Eye } from "lucide-react";
import { getLocalizedContent } from "@/lib/localization";

const AdminRegistrations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: registrationsResponse, isLoading } = useQuery({
    queryKey: ["admin-registrations"],
    queryFn: () => getRegistrations(),
  });

  const registrations = registrationsResponse?.data || [];

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateRegistrationStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-registrations"] });
      toast({ title: "Success", description: "Registration status updated." });
    },
  });

  if (isLoading) return <div className="animate-pulse space-y-4 text-foreground"><div className="h-12 bg-secondary rounded-lg w-full" /><div className="h-12 bg-secondary rounded-lg w-full" /></div>;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Pending</Badge>;
      case "confirmed": return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Confirmed</Badge>;
      case "rejected": return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 text-foreground">
      <div>
        <h1 className="text-3xl font-bold">Registrations</h1>
        <p className="text-muted-foreground">Manage student course applications.</p>
      </div>

      <div className="bg-background rounded-xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/50 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="px-6 py-4">Student</th>
              <th className="px-6 py-4">Course</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {registrations.map((reg: any) => (
              <tr key={reg.id} className="hover:bg-secondary/20 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold">{reg.student?.user?.first_name} {reg.student?.user?.last_name}</div>
                  <div className="text-xs text-muted-foreground">{reg.student?.user?.email}</div>
                </td>
                <td className="px-6 py-4">{getLocalizedContent(reg.course?.title)}</td>
                <td className="px-6 py-4">{getStatusBadge(reg.status)}</td>
                <td className="px-6 py-4 text-muted-foreground">
                  {new Date(reg.registration_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {reg.status === "pending" && (
                      <>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 text-green-500 border-green-500/20 hover:bg-green-500/10"
                          onClick={() => mutation.mutate({ id: reg.id, status: "confirmed" })}
                        >
                          <Check size={14} />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 text-destructive border-destructive/20 hover:bg-destructive/10"
                          onClick={() => mutation.mutate({ id: reg.id, status: "rejected" })}
                        >
                          <X size={14} />
                        </Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <Eye size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminRegistrations;
