import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInstructors, deleteInstructor, createInstructor, updateInstructor } from "@/api/instructors";
import { getLocalizedContent } from "@/lib/localization";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Button from "../../components/ui/Button";
import { Plus, Edit2, Trash2, User } from "lucide-react";
import { useState } from "react";
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
      return editingInstructor
        ? updateInstructor(editingInstructor.id, payload as any)
        : createInstructor(payload as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-instructors"] });
      toast({ title: "Success", description: `Instructor ${editingInstructor ? "updated" : "created"} successfully.` });
      setIsOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteInstructor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-instructors"] });
      toast({ title: "Deleted", description: "Instructor has been removed." });
    },
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

  if (isLoading) return <div className="animate-pulse space-y-4 text-[var(--black)]"><div className="h-12 bg-[var(--gray-dark)] rounded-lg w-full" /></div>;

  return (
    <div className="space-y-8 text-[var(--black)]">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-[var(--white)]">Instructors</h1>
          <p className="text-[var(--gray-light)]">Manage course instructors and their profiles.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[var(--primary-alt)] text-[var(--white)] hover:bg-[var(--primary-dark)]/90">
              <Plus size={18} />
              Add Instructor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-[var(--white)] text-[var(--black)]">
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

              {!editingInstructor && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="profile_image">Profile Image URL</Label>
                <Input id="profile_image" value={formData.profile_image} onChange={e => setFormData({ ...formData, profile_image: e.target.value })} />
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
              <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-[var(--white)] rounded-xl border border-[var(--gray-light)] overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--gray-light)] text-[var(--gray-dark)] uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="px-6 py-4">Instructor</th>
              <th className="px-6 py-4">Skills</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--gray-light)]">
            {instructors?.map((instructor) => (
              <tr key={instructor.id} className="hover:bg-[var(--gray-light)]/50 transition-colors">
                <td className="px-6 py-4 flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={instructor.user?.profile_image} />
                    <AvatarFallback>{instructor.user?.first_name?.[0] || instructor.user.first_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-[var(--black)]">{instructor.user?.first_name || instructor.user.first_name} {instructor.user?.last_name || instructor.user.last_name}</div>
                    <div className="text-xs text-[var(--gray-dark)] opacity-70">{instructor.user?.email || instructor.user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {instructor.skills?.map(skill => (
                      <Badge key={skill} variant="outline" className="text-[10px] py-0 border-[var(--gray-dark)] text-[var(--gray-dark)]">{skill}</Badge>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={instructor.is_active ? "default" : "secondary"} className={instructor.is_active ? "bg-[var(--success)] hover:bg-[var(--success)]" : "bg-[var(--gray-dark)] text-[var(--white)]"}>
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
                                  bg-[var(--teal)]/10
                                  text-[var(--teal)]
                                  transition-all duration-200
                                  hover:bg-[var(--teal)]
                                  hover:text-[var(--white)]
                                  active:scale-95
                                ">
                      <Edit2 size={14} />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => {
                        if (confirm("Are you sure?")) {
                          deleteMutation.mutate(instructor.id);
                        }
                      }}
                      className="
        h-8 w-8 flex items-center justify-center
        rounded-md
        bg-[var(--danger)]/10
        text-[var(--danger)]
        transition-all duration-200
        hover:bg-[var(--danger)]
        hover:text-[var(--white)]
        active:scale-95
      "
                    >
                      <Trash2 size={14} />
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
