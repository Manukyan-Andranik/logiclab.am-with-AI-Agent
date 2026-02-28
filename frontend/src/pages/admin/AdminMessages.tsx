import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { Badge } from "@/components/ui/badge";

const AdminMessages = () => {
  const { data: messagesResponse, isLoading } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: () => apiClient<any>("/contact-messages/contact/"),
  });

  const messages = messagesResponse?.data || [];

  if (isLoading) return <div className="animate-pulse space-y-4 text-foreground"><div className="h-12 bg-secondary rounded-lg w-full" /></div>;

  return (
    <div className="space-y-8 text-foreground">
      <div>
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-muted-foreground">Recent messages from the contact form.</p>
      </div>

      <div className="bg-background rounded-xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/50 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="px-6 py-4">Sender</th>
              <th className="px-6 py-4">Message</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {messages.map((msg: any) => (
              <tr key={msg.id} className="hover:bg-secondary/20 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold">{msg.name}</div>
                  <div className="text-xs text-muted-foreground">{msg.email}</div>
                </td>
                <td className="px-6 py-4">
                  <p className="line-clamp-2 max-w-md">{msg.message}</p>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={msg.is_read ? "secondary" : "default"}>
                    {msg.is_read ? "Read" : "New"}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-muted-foreground">
                  {new Date(msg.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminMessages;
