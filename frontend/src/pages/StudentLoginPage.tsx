import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { studentLogin } from "@/api/auth";
import { useToast } from "@/hooks/use-toast";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Card from "@/components/ui/Card";
import { User } from "lucide-react";

const StudentLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: studentLogin,
    onSuccess: (data) => {
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('role', data.role);
      toast({ title: "Welcome back!", description: "Successfully logged in to your dashboard." });
      navigate("/student/dashboard");
    },
    onError: (error: any) => {
      toast({ 
        title: "Login Failed", 
        description: error.message || "Invalid email or password.", 
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
      <Card className="w-full max-w-md shadow-xl border-none p-8">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
          <User size={32} />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Student Login</h1>
          <p className="text-muted-foreground mt-2">Access your course materials and progress</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-11 text-base font-medium mt-2"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Logging in..." : "Login to Dashboard"}
          </Button>
        </form>
        
        <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
          <p>Don't have an account? Contact your administrator.</p>
        </div>
      </Card>
    </div>
  );
};

export default StudentLoginPage;
