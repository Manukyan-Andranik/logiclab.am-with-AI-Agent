import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getStudentMe, updateStudentProfile } from "@/api/students";
import { changePassword } from "@/api/auth";
import { uploadFile, getMediaUrl } from "@/api/client";
import Loader from "@/components/ui/Loader";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Container from "@/components/layout/Container";
import Section from "@/components/layout/Section";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Lock, User } from "lucide-react";

const StudentSettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || role !== "student") {
      navigate("/login?role=student", { replace: true });
    }
  }, [navigate]);

  const { data: student, isLoading, error } = useQuery({
    queryKey: ["studentMe"],
    queryFn: getStudentMe,
    retry: 1,
  });

  const profileMutation = useMutation({
    mutationFn: updateStudentProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentMe"] });
      queryClient.invalidateQueries({ queryKey: ["studentDashboard"] });
      toast({ title: "Պահպանված է", description: "Պրոֆիլի նկարը թարմացվեց։" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Պահպանված է", description: "Գաղտնաբառը փոխվեց։" });
    },
  });

  const handlePickImage = () => fileInputRef.current?.click();

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Սխալ",
        description: "Ընտրեք նկարի ֆայլ",
      });
      return;
    }

    try {
      const res = await uploadFile(file);
      profileMutation.mutate({ profile_image: res.url });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Սխալ",
        description: "Չհաջողվեց վերբեռնել",
      });
    }
  };

  const handleRemoveImage = () => {
    profileMutation.mutate({ profile_image: null });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast({
        variant: "destructive",
        title: "Սխալ",
        description: "Գաղտնաբառը պետք է ≥ 8 նիշ",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Սխալ",
        description: "Գաղտնաբառերը չեն համընկնում",
      });
      return;
    }

    passwordMutation.mutate({
      current_password: currentPassword,
      new_password: newPassword,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader size={48} />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <p className="text-gray-400 mb-6">Չհաջողվեց բեռնել</p>
        <Button onClick={() => navigate("/student/dashboard")}>
          Dashboard
        </Button>
      </div>
    );
  }

  const avatarSrc = student.user.profile_image
    ? getMediaUrl(student.user.profile_image)
    : null;

  return (
    <div className="min-h-screen bg-black">
      {/* HEADER */}
      <Section className="pt-28 pb-10 bg-gradient-to-b from-gray-dark/40 to-transparent">
        <Container>
          <button
            onClick={() => navigate("/student/dashboard")}
            className="flex items-center gap-2 text-white/50 hover:text-primary text-xs font-black uppercase mb-6"
          >
            <ArrowLeft size={14} />
            Վերադառնալ
          </button>

          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-primary flex items-center justify-center">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={30} />
              )}
            </div>

            <div>
              <h1 className="text-3xl font-black text-white italic">
                Կարգավորումներ
              </h1>
              <p className="text-white/50 text-sm">
                {student.user.first_name} {student.user.last_name}
              </p>
            </div>
          </div>
        </Container>
      </Section>

      <Container className="pb-20 max-w-2xl space-y-8">
        {/* PROFILE IMAGE */}
        <motion.div className="glass-card p-6 rounded-3xl space-y-5">
          <div className="flex items-center gap-2 text-primary font-black text-sm">
            <Camera size={18} /> Պրոֆիլի նկար
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-3xl overflow-hidden border border-white/10">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/30">
                    <User size={40} />
                  </div>
                )}
              </div>

              <button
                onClick={handlePickImage}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition"
              >
                Փոխել
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleImageChange}
              />

              <Button
                onClick={handlePickImage}
                disabled={profileMutation.isPending}
                className="bg-primary text-black text-xs font-bold"
              >
                Փոխել
              </Button>

              {avatarSrc && (
                <Button
                  variant="outline"
                  onClick={handleRemoveImage}
                  className="text-xs"
                >
                  Հեռացնել
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* PASSWORD */}
        <motion.div className="glass-card p-6 rounded-3xl space-y-5">
          <div className="flex items-center gap-2 text-primary font-black text-sm">
            <Lock size={18} /> Գաղտնաբառ
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Ընթացիկ գաղտնաբառ"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />

            <Input
              type="password"
              placeholder="Նոր գաղտնաբառ"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <Input
              type="password"
              placeholder="Կրկնել գաղտնաբառը"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <Button
              type="submit"
              disabled={passwordMutation.isPending}
              className="w-full bg-primary text-black font-bold"
            >
              Պահպանել
            </Button>
          </form>
        </motion.div>
      </Container>
    </div>
  );
};

export default StudentSettingsPage;