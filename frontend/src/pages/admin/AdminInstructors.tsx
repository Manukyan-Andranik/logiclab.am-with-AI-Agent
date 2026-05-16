import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInstructors, deleteInstructor, createInstructor, updateInstructor } from "@/api/instructors";
import { uploadFile, getMediaUrl } from "@/api/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Button from "../../components/ui/Button";
import { Plus, Edit2, Trash2, Loader2, Upload, X, User } from "lucide-react";
import { FaLinkedin, FaGithub, FaGlobe } from "react-icons/fa";
import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Instructor } from "@/api/types";

const AdminInstructors = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    bio: "",
    skills: "",
    proficiency: "",
    is_active: true,
    profile_image: "",
    linkedin: "",
    github: "",
    website: "",
  });

  const { data: instructors, isLoading } = useQuery({
    queryKey: ["admin-instructors"],
    queryFn: getInstructors,
  });

  const saveMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      const payload = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        bio: data.bio,
        skills: data.skills.split(",").map(s => s.trim()).filter(s => s),
        proficiency: data.proficiency.split(",").map(s => s.trim()).filter(s => s),
        is_active: data.is_active,
        profile_image: data.profile_image,
        social_links: {
          linkedin: data.linkedin,
          github: data.github,
          website: data.website,
        },
        ...(data.password ? { password: data.password } : {}),
      };

      if (editingInstructor) {
        return updateInstructor(editingInstructor.id, payload as any);
      } else {
        if (!data.password) {
          throw new Error("Password is required for new instructors");
        }
        return createInstructor(payload as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-instructors"] });
      toast({ title: "Success", description: `Instructor ${editingInstructor ? "updated" : "created"} successfully.` });
      setIsOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save instructor",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteInstructor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-instructors"] });
      toast({ title: "Deleted", description: "Instructor has been removed." });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete instructor",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      bio: "",
      skills: "",
      proficiency: "",
      is_active: true,
      profile_image: "",
      linkedin: "",
      github: "",
      website: "",
    });
    setEditingInstructor(null);
  };

  const handleEdit = (instructor: Instructor) => {
    setEditingInstructor(instructor);
    setFormData({
      first_name: instructor.user.first_name || "",
      last_name: instructor.user.last_name || "",
      email: instructor.user.email || "",
      password: "",
      bio: instructor.bio || "",
      skills: instructor.skills?.join(", ") || "",
      proficiency: instructor.proficiency?.join(", ") || "",
      is_active: instructor.is_active,
      profile_image: instructor.user.profile_image || "",
      linkedin: instructor.user.social_links?.linkedin || "",
      github: instructor.user.social_links?.github || "",
      website: instructor.user.social_links?.website || "",
    });
    setIsOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadFile(file);
      setFormData(prev => ({
        ...prev,
        profile_image: result.url
      }));
      toast({ title: "Success", description: "Profile image uploaded successfully" });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLoading) return <div className="animate-pulse space-y-4 text-foreground"><div className="h-12 bg-secondary rounded-lg w-full" /></div>;

  return (
    <div className="space-y-8 text-foreground">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Instructors</h1>
          <p className="text-muted-foreground">Manage course instructors and their professional profiles.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/80 transition-all">
              <Plus size={18} />
              Add Instructor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-card text-card-foreground">
            <DialogHeader>
              <DialogTitle>{editingInstructor ? "Edit Instructor Profile" : "Create New Instructor"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input id="first_name" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} placeholder="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input id="last_name" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} placeholder="Doe" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="john.doe@logiclab.am" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{editingInstructor ? "New Password (optional)" : "Password"}</Label>
                  <Input id="password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Profile Picture</Label>
                <div className="flex items-center gap-6 p-4 border rounded-xl bg-secondary/20">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-primary/20 bg-background flex items-center justify-center">
                    {formData.profile_image ? (
                      <>
                        <img
                          src={getMediaUrl(formData.profile_image)}
                          alt="Profile Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, profile_image: "" }))}
                          className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <X size={20} className="text-white" />
                        </button>
                      </>
                    ) : (
                      <User size={32} className="text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-grow space-y-3">
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2 h-10 border-dashed"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      {formData.profile_image ? "Change Image" : "Upload Image"}
                    </Button>
                    <div className="space-y-1">
                      <Label htmlFor="image_url" className="text-[10px] text-muted-foreground uppercase tracking-wider">Or Image URL</Label>
                      <Input
                        id="image_url"
                        className="h-8 text-xs"
                        value={formData.profile_image}
                        onChange={e => setFormData({ ...formData, profile_image: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="skills">Expertise (comma separated)</Label>
                  <Input id="skills" value={formData.skills} onChange={e => setFormData({ ...formData, skills: e.target.value })} placeholder="Python, Machine Learning, Computer Vision" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proficiency">Tools & Frameworks</Label>
                  <Input id="proficiency" value={formData.proficiency} onChange={e => setFormData({ ...formData, proficiency: e.target.value })} placeholder="PyTorch, TensorFlow, OpenCV" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Professional Biography</Label>
                <Textarea id="bio" className="min-h-[120px] resize-none" value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} placeholder="Write a short professional bio..." />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-bold flex items-center gap-2">
                  Social & Professional Links
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border bg-secondary/10">
                  <div className="space-y-2">
                    <Label htmlFor="linkedin" className="text-xs flex items-center gap-2"><FaLinkedin size={14} className="text-primary" /> LinkedIn</Label>
                    <Input id="linkedin" className="h-9 text-xs" value={formData.linkedin} onChange={e => setFormData({ ...formData, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="github" className="text-xs flex items-center gap-2"><FaGithub size={14} className="text-primary" /> GitHub</Label>
                    <Input id="github" className="h-9 text-xs" value={formData.github} onChange={e => setFormData({ ...formData, github: e.target.value })} placeholder="https://github.com/..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-xs flex items-center gap-2"><FaGlobe size={14} className="text-primary" /> Website</Label>
                    <Input id="website" className="h-9 text-xs" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} placeholder="https://..." />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-secondary/20 p-3 rounded-lg w-fit">
                <Switch id="active" checked={formData.is_active} onCheckedChange={checked => setFormData({ ...formData, is_active: checked })} />
                <Label htmlFor="active" className="cursor-pointer">Active Profile</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending || isUploading}>
                {saveMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[700px]">
          <thead className="bg-secondary/50 text-muted-foreground uppercase text-[11px] font-bold tracking-widest">
            <tr>
              <th className="px-6 py-5">Instructor</th>
              <th className="px-6 py-5">Expertise</th>
              <th className="px-6 py-5">Socials</th>
              <th className="px-6 py-5">Status</th>
              <th className="px-6 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {instructors?.map((instructor) => (
              <tr key={instructor.id} className="group hover:bg-secondary/20 transition-all duration-200">
                <td className="px-6 py-4 flex items-center gap-4">
                  <Avatar className="h-10 w-10 border-2 border-primary/10 group-hover:border-primary transition-colors">
                    <AvatarImage src={getMediaUrl(instructor.user?.profile_image)} className="object-cover" />
                    <AvatarFallback className="bg-primary/5 text-primary font-bold">{instructor.user?.first_name?.[0]}{instructor.user?.last_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-bold text-foreground text-base leading-tight">{instructor.user?.first_name} {instructor.user?.last_name}</div>
                    <div className="text-xs text-muted-foreground">{instructor.user?.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1.5 max-w-[240px]">
                    {instructor.skills?.slice(0, 3).map((skill, index) => (
                      <Badge key={`${instructor.id}-${skill}-${index}`} variant="outline" className="text-[10px] font-bold bg-background/50">
                        {skill}
                      </Badge>
                    ))}
                    {instructor.skills && instructor.skills.length > 3 && (
                      <span className="text-[10px] text-muted-foreground ml-1">+{instructor.skills.length - 3} more</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2 text-muted-foreground">
                    {instructor.user?.social_links?.linkedin && (
                      <a href={instructor.user.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                        <FaLinkedin size={16} />
                      </a>
                    )}
                    {instructor.user?.social_links?.github && (
                      <a href={instructor.user.social_links.github} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                        <FaGithub size={16} />
                      </a>
                    )}
                    {instructor.user?.social_links?.website && (
                      <a href={instructor.user.social_links.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                        <FaGlobe size={16} />
                      </a>
                    )}
                    {(!instructor.user?.social_links || Object.keys(instructor.user.social_links).length === 0) && (
                      <span className="text-xs italic">None</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={instructor.is_active ? "default" : "secondary"} className={instructor.is_active ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : ""}>
                    {instructor.is_active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(instructor)}
                      className="h-9 w-9 flex items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-200 hover:bg-primary hover:text-primary-foreground active:scale-95 shadow-sm"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to remove ${instructor.user?.first_name}? This action cannot be undone.`)) {
                          deleteMutation.mutate(instructor.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="h-9 w-9 flex items-center justify-center rounded-xl bg-destructive/10 text-destructive transition-all duration-200 hover:bg-destructive hover:text-destructive-foreground active:scale-95 shadow-sm disabled:opacity-50"
                    >
                      {deleteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default AdminInstructors;