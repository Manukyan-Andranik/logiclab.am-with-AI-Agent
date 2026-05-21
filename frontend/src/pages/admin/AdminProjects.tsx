import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listAllProjects,
  updateProject,
  deleteProject,
  toggleProjectFeatured,
  toggleProjectPublished,
} from "@/api/projects";
import { Project, LocalizedText } from "@/api/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Button from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Pencil,
  Trash2,
  ExternalLink,
  Star,
  Eye,
  EyeOff,
  Globe,
  Code,
} from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { getMediaUrl } from "@/api/client";

const AdminProjects = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    title: LocalizedText;
    subtitle: LocalizedText;
    description: LocalizedText;
    image_urls: string[];
    links: { github?: string; web?: string; colab?: string };
    is_featured: boolean;
    is_published: boolean;
  }>({
    title: { en: "", ru: "", hy: "" },
    subtitle: { en: "", ru: "", hy: "" },
    description: { en: "", ru: "", hy: "" },
    image_urls: [],
    links: {},
    is_featured: false,
    is_published: false,
  });

  // Queries
  const { data: projects, isLoading } = useQuery({
    queryKey: ["admin-projects"],
    queryFn: () => listAllProjects({ skip: 0, limit: 100 }),
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
      toast({ title: "Success", description: "Project updated successfully." });
      setIsDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
      toast({ title: "Deleted", description: "Project removed." });
    },
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: toggleProjectFeatured,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-projects"] }),
  });

  const togglePublishedMutation = useMutation({
    mutationFn: toggleProjectPublished,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-projects"] }),
  });

  // Handlers
  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      subtitle: project.subtitle || { en: "", ru: "", hy: "" },
      description: project.description,
      image_urls: project.image_urls || [],
      links: project.links || {},
      is_featured: project.is_featured,
      is_published: project.is_published,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    updateMutation.mutate({
      id: editingProject.id,
      data: formData,
    });
  };

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-12 bg-secondary rounded-lg w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Student Projects</h1>
          <p className="text-muted-foreground">Approve and feature student work</p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects?.map((project) => (
              <TableRow key={project.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {project.image_urls?.[0] && (
                      <img
                        src={getMediaUrl(project.image_urls[0])}
                        alt=""
                        className="w-10 h-10 rounded object-cover border"
                      />
                    )}
                    <div>
                      <div className="font-medium">{project.title.en}</div>
                      <div className="flex gap-2 mt-1">
                        {project.links?.github && <FaGithub size={12} className="text-muted-foreground" />}
                        {project.links?.web && <Globe size={12} className="text-muted-foreground" />}
                        {project.links?.colab && <Code size={12} className="text-muted-foreground" />}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {project.student?.user?.first_name} {project.student?.user?.last_name}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {project.course?.title?.en}
                </TableCell>
                <TableCell>
                  <button onClick={() => togglePublishedMutation.mutate(project.id)}>
                    <Badge variant={project.is_published ? "default" : "secondary"} className="gap-1 cursor-pointer">
                      {project.is_published ? <Eye size={12} /> : <EyeOff size={12} />}
                      {project.is_published ? "Published" : "Draft"}
                    </Badge>
                  </button>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => toggleFeaturedMutation.mutate(project.id)}
                    className={`transition-colors ${project.is_featured ? "text-yellow-500" : "text-gray-300 hover:text-yellow-200"}`}
                  >
                    <Star size={20} fill={project.is_featured ? "currentColor" : "none"} />
                  </button>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(project)}>
                    <Pencil size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      if (confirm("Delete this project?")) deleteMutation.mutate(project.id);
                    }}
                  >
                    <Trash2 size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Edit Project: {editingProject?.title.en}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Multilingual Content */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Project Title (EN/RU/HY)</Label>
                  <Input
                    value={formData.title.en}
                    onChange={(e) => setFormData({ ...formData, title: { ...formData.title, en: e.target.value } })}
                    placeholder="English Title"
                  />
                  <Input
                    value={formData.title.ru}
                    onChange={(e) => setFormData({ ...formData, title: { ...formData.title, ru: e.target.value } })}
                    placeholder="Russian Title"
                  />
                  <Input
                    value={formData.title.hy}
                    onChange={(e) => setFormData({ ...formData, title: { ...formData.title, hy: e.target.value } })}
                    placeholder="Armenian Title"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Project Description (EN)</Label>
                  <Textarea
                    value={formData.description.en}
                    onChange={(e) => setFormData({ ...formData, description: { ...formData.description, en: e.target.value } })}
                    rows={4}
                  />
                </div>
              </div>

              {/* Right Column: Links & Media */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><FaGithub size={14} /> GitHub URL</Label>
                  <Input
                    value={formData.links.github || ""}
                    onChange={(e) => setFormData({ ...formData, links: { ...formData.links, github: e.target.value } })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Globe size={14} /> Live Demo URL</Label>
                  <Input
                    value={formData.links.web || ""}
                    onChange={(e) => setFormData({ ...formData, links: { ...formData.links, web: e.target.value } })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Code size={14} /> Google Colab URL</Label>
                  <Input
                    value={formData.links.colab || ""}
                    onChange={(e) => setFormData({ ...formData, links: { ...formData.links, colab: e.target.value } })}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="featured"
                      checked={formData.is_featured}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                    />
                    <Label htmlFor="featured">Featured</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="published"
                      checked={formData.is_published}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                    />
                    <Label htmlFor="published">Published</Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProjects;
