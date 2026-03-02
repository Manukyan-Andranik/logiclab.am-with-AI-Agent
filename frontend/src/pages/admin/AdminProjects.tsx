import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  toggleProjectPublished,
  toggleProjectFeatured,
  uploadProjectImage,
  ProjectCreate
} from "@/api/projects";
import { getCourses } from "@/api/courses";
import { getAdminStudents } from "@/api/admin";
import { Project } from "@/api/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import Button from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Image as ImageIcon,
  ExternalLink,
  Star,
  CheckCircle2,
  XCircle,
  Loader2,
  Github,
  Globe,
  Upload
} from "lucide-react";

const AdminProjects = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Form State
  const [formData, setFormData] = useState<ProjectCreate>({
    course_id: 0,
    student_id: 0,
    title: { en: "", ru: "", hy: "" },
    description: { en: "", ru: "", hy: "" },
    image_urls: [],
    links: { github: "", web: "" },
    is_featured: false,
    is_published: false
  });

  // Queries
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["admin-projects"],
    queryFn: () => getProjects({ is_admin: true })
  });

  const { data: courses } = useQuery({
    queryKey: ["courses-all"],
    queryFn: () => getCourses()
  });

  const { data: students } = useQuery({
    queryKey: ["admin-students"],
    queryFn: getAdminStudents
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
      toast({ title: "Success", description: "Project created successfully." });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
      toast({ title: "Success", description: "Project updated successfully." });
      handleCloseDialog();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
      toast({ title: "Success", description: "Project deleted." });
    }
  });

  const togglePublishedMutation = useMutation({
    mutationFn: toggleProjectPublished,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-projects"] })
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: toggleProjectFeatured,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-projects"] })
  });

  // Handlers
  const handleOpenDialog = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        course_id: project.course_id,
        student_id: project.student_id,
        title: project.title,
        description: project.description,
        image_urls: project.image_urls || [],
        links: project.links || { github: "", web: "" },
        is_featured: project.is_featured,
        is_published: project.is_published
      });
    } else {
      setEditingProject(null);
      setFormData({
        course_id: 0,
        student_id: 0,
        title: { en: "", ru: "", hy: "" },
        description: { en: "", ru: "", hy: "" },
        image_urls: [],
        links: { github: "", web: "" },
        is_featured: false,
        is_published: false
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProject(null);
  };

  // Update handleFileChange to support multiple files
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];

      // Upload all selected files sequentially
      for (let i = 0; i < files.length; i++) {
        const { url } = await uploadProjectImage(files[i]);
        uploadedUrls.push(url);
      }

      setFormData(prev => ({
        ...prev,
        image_urls: [...(prev.image_urls || []), ...uploadedUrls]
      }));

      toast({ title: "Images Uploaded", description: `${uploadedUrls.length} image(s) added to project gallery.` });
    } catch (error) {
      toast({ title: "Upload Failed", description: "Could not upload some images.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      // Clear the input so the same files can be selected again if needed
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      image_urls: prev.image_urls?.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (projectsLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-primary" size={48} /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Student Projects</h1>
          <p className="text-muted-foreground">Manage and showcase the best work from your students.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus size={18} /> Add Project
        </Button>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <th className="px-6 py-4">Project</th>
              <th className="px-6 py-4">Student</th>
              <th className="px-6 py-4">Course</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Featured</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects?.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center overflow-hidden border">
                      {project.image_urls?.[0] ? (
                        <img src={project.image_urls[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={20} className="text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold">{project.title.en}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{project.description.en}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4">
                  {project.student?.user?.first_name} {project.student?.user?.last_name}
                </TableCell>
                <TableCell className="px-6 py-4">
                  <Badge variant="outline">{project.course?.title?.en || "N/A"}</Badge>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <button
                    onClick={() => togglePublishedMutation.mutate(project.id)}
                    className="focus:outline-none"
                  >
                    {project.is_published ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20 gap-1">
                        <CheckCircle2 size={12} /> Published
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <XCircle size={12} /> Draft
                      </Badge>
                    )}
                  </button>
                </TableCell>
                <TableCell className="px-6 py-4 text-center">
                  <button
                    onClick={() => toggleFeaturedMutation.mutate(project.id)}
                    className={`p-2 rounded-full transition-colors ${project.is_featured ? 'text-amber-500 bg-amber-500/10' : 'text-muted-foreground hover:bg-secondary'}`}
                  >
                    <Star size={18} fill={project.is_featured ? "currentColor" : "none"} />
                  </button>
                </TableCell>
                <TableCell className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(project)}>
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this project?")) {
                          deleteMutation.mutate(project.id);
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit Project" : "Create New Project"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Course</Label>
                <Select
                  value={formData.course_id.toString()}
                  onValueChange={(val) => setFormData({ ...formData, course_id: parseInt(val) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses?.map(course => (
                      <SelectItem key={course.id} value={course.id.toString()}>{course.title.en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Student</Label>
                <Select
                  value={formData.student_id.toString()}
                  onValueChange={(val) => setFormData({ ...formData, student_id: parseInt(val) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students?.map((student: any) => (
                      <SelectItem key={student.id} value={student.id.toString()}>
                        {student.user.first_name} {student.user.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs defaultValue="en">
              <TabsList className="grid grid-cols-3 w-[300px]">
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="ru">Russian</TabsTrigger>
                <TabsTrigger value="hy">Armenian</TabsTrigger>
              </TabsList>

              {(['en', 'ru', 'hy'] as const).map(lang => (
                <TabsContent key={lang} value={lang} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Title ({lang.toUpperCase()})</Label>
                    <Input
                      value={formData.title[lang] || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        title: { ...formData.title, [lang]: e.target.value }
                      })}
                      placeholder={`Project title in ${lang}`}
                      required={lang === 'en'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description ({lang.toUpperCase()})</Label>
                    <Textarea
                      value={formData.description[lang] || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        description: { ...formData.description, [lang]: e.target.value }
                      })}
                      placeholder={`Project description in ${lang}`}
                      rows={4}
                      required={lang === 'en'}
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Github size={14} /> GitHub Repository</Label>
                <Input
                  value={formData.links?.github || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    links: { ...formData.links, github: e.target.value }
                  })}
                  placeholder="https://github.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Globe size={14} /> Live Demo URL</Label>
                <Input
                  value={formData.links?.web || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    links: { ...formData.links, web: e.target.value }
                  })}
                  placeholder="https://project-demo.com"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Project Images</Label>
              <div className="grid grid-cols-4 gap-4">
                {formData.image_urls?.map((url, index) => (
                  <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/50 transition-colors">
                  {isUploading ? (
                    <Loader2 className="animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload size={24} className="text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">Upload Image</span>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple   
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center gap-8 py-2 border-t pt-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="featured"
                  checked={formData.is_featured}
                  onCheckedChange={(val) => setFormData({ ...formData, is_featured: val })}
                />
                <Label htmlFor="featured">Featured Project</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="published"
                  checked={formData.is_published}
                  onCheckedChange={(val) => setFormData({ ...formData, is_published: val })}
                />
                <Label htmlFor="published">Published</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingProject ? "Update Project" : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProjects;
