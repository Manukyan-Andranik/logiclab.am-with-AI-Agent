import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { login } from "@/api/auth";
import { useToast } from "@/hooks/use-toast";
// import { Button } from "@/components/ui/button";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Card  from "@/components/ui/Card";
import { Lock } from "lucide-react";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      if (data.role !== 'admin') {
        toast({ 
          title: "Access Denied", 
          description: "Only administrators can access this area.", 
          variant: "destructive" 
        });
        return;
      }
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('role', data.role);
      toast({ title: "Welcome", description: "Successfully logged in to admin panel." });
      navigate("/admin");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Login Failed", 
        description: error.message || "Invalid credentials.", 
        variant: "destructive" 
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-6">
      <Card className="w-full max-w-md shadow-xl border-none">
        {/* <CardHeader className="space-y-1 text-center"> */}
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={24} />
          </div>
          {/* <CardTitle className="text-2xl">Admin Login</CardTitle> */}
          {/* <CardDescription>Enter your credentials to access the dashboard</CardDescription> */}
        {/* </CardHeader> */}
        {/* <CardContent> */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@logiclab.am"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Logging in..." : "Login"}
            </Button>
          </form>
        {/* </CardContent> */}
      </Card>
    </div>
  );
};

export default AdminLogin;
