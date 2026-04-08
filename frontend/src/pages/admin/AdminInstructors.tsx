import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInstructors, deleteInstructor, createInstructor, updateInstructor } from "@/api/instructors";
import { uploadFile, getMediaUrl } from "@/api/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Button from "../../components/ui/Button";
import { Plus, Edit2, Trash2, Loader2, Upload, X } from "lucide-react";
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
          <h1 className="text-3xl font-bold">Instructors</h1>
          <p className="text-muted-foreground">Manage course instructors and their profiles.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/80">
              <Plus size={18} />
              Add Instructor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card text-card-foreground">
            <DialogHeader>
              <DialogTitle>{editingInstructor ? "Edit Instructor" : "Add New Instructor"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input id="first_name" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input id="last_name" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{editingInstructor ? "New Password (optional)" : "Password"}</Label>
                <Input id="password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label>Profile Image</Label>
                <div className="flex items-center gap-4">
                  {formData.profile_image && (
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border">
                      <img 
                        src={getMediaUrl(formData.profile_image)} 
                        alt="Profile Preview" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, profile_image: "" }))}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      >
                        <X size={16} className="text-white" />
                      </button>
                    </div>
                  )}
                  <div className="flex-grow">
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
                      className="w-full gap-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Upload size={16} />
                      )}
                      Upload Profile Image
                    </Button>
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Or paste URL: 
                  <Input 
                    className="h-7 text-[10px] mt-1" 
                    value={formData.profile_image} 
                    onChange={e => setFormData({ ...formData, profile_image: e.target.value })} 
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="skills">Skills (comma separated)</Label>
                  <Input id="skills" value={formData.skills} onChange={e => setFormData({ ...formData, skills: e.target.value })} placeholder="Python, ML, AI" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proficiency">Proficiency (comma separated)</Label>
                  <Input id="proficiency" value={formData.proficiency} onChange={e => setFormData({ ...formData, proficiency: e.target.value })} placeholder="TensorFlow, PyTorch" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" className="min-h-[100px]" value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} />
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="active" checked={formData.is_active} onCheckedChange={checked => setFormData({ ...formData, is_active: checked })} />
                <Label htmlFor="active">Is Active</Label>
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

      <div className="bg-background rounded-xl border border-border overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/50 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="px-6 py-4">Instructor</th>
              <th className="px-6 py-4">Skills</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {instructors?.map((instructor) => (
              <tr key={instructor.id} className="hover:bg-secondary/20 transition-colors">
                <td className="px-6 py-4 flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getMediaUrl(instructor.user?.profile_image)} />
                    <AvatarFallback>{instructor.user?.first_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-foreground">{instructor.user?.first_name} {instructor.user?.last_name}</div>
                    <div className="text-xs text-muted-foreground">{instructor.user?.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {instructor.skills?.map(skill => (
                      <Badge key={skill} variant="outline" className="text-[10px] py-0 border-border text-muted-foreground">{skill}</Badge>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={instructor.is_active ? "default" : "secondary"}>
                    {instructor.is_active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">

                    {/* Edit Button */}
                    <button
                      onClick={() => handleEdit(instructor)}
                      className=" h-8 w-8 flex items-center justify-center
                                  rounded-md
                                  bg-teal/10
                                  text-[var(--teal)]
                                  transition-all duration-200
                                  hover:bg-teal
                                  hover:text-white
                                  active:scale-95
                                ">
                      <Edit2 size={14} />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => {
                        if (confirm("Are you sure? This will permanently delete the instructor account and profile.")) {
                          deleteMutation.mutate(instructor.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="
        h-8 w-8 flex items-center justify-center
        rounded-md
        bg-danger/10
        text-[var(--danger)]
        transition-all duration-200
        hover:bg-danger
        hover:text-white
        active:scale-95
        disabled:opacity-50
      "
                    >
                      {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>

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

export default AdminInstructors;
