import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listAllDailyLife,
  createDailyLife,
  updateDailyLife,
  deleteDailyLife,
  toggleDailyLifePublished,
} from "@/api/daily-life";
import { uploadFile, getMediaUrl } from "@/api/client";
import { DailyLife, LocalizedText } from "@/api/types";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Upload,
  X
} from "lucide-react";

const AdminDailyLife = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<DailyLife | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<{
    title: LocalizedText;
    subtitle: LocalizedText;
    description: LocalizedText;
    image_urls: string[];
    video_url: string;
    is_published: boolean;
  }>({
    title: { en: "", ru: "", hy: "" },
    subtitle: { en: "", ru: "", hy: "" },
    description: { en: "", ru: "", hy: "" },
    image_urls: [],
    video_url: "",
    is_published: false
  });

  // Queries
  const { data: stories, isLoading: storiesLoading } = useQuery({
    queryKey: ["admin-daily-life"],
    queryFn: () => listAllDailyLife({ skip: 0, limit: 100 })
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createDailyLife,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-daily-life"] });
      toast({ title: "Success", description: "Daily Life story created successfully." });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create story",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateDailyLife(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-daily-life"] });
      toast({ title: "Success", description: "Story updated successfully." });
      handleCloseDialog();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDailyLife,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-daily-life"] });
      toast({ title: "Success", description: "Story deleted." });
    }
  });

  const togglePublishedMutation = useMutation({
    mutationFn: toggleDailyLifePublished,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-daily-life"] })
  });

  // Handlers
  const handleOpenDialog = (story?: DailyLife) => {
    if (story) {
      setEditingStory(story);
      setFormData({
        title: story.title,
        subtitle: story.subtitle || { en: "", ru: "", hy: "" },
        description: story.description,
        image_urls: story.image_urls || [],
        video_url: story.video_url || "",
        is_published: story.is_published
      });
    } else {
      setEditingStory(null);
      setFormData({
        title: { en: "", ru: "", hy: "" },
        subtitle: { en: "", ru: "", hy: "" },
        description: { en: "", ru: "", hy: "" },
        image_urls: [],
        video_url: "",
        is_published: false
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingStory(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadedUrls: string[] = [];
    const failures: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        const result = await uploadFile(f);
        uploadedUrls.push(result.url);
      } catch (err: unknown) {
        const label = f.name?.trim() || `Image ${i + 1}`;
        const msg = err instanceof Error ? err.message : String(err);
        failures.push(`${label}: ${msg}`);
      }
    }

    if (uploadedUrls.length > 0) {
      setFormData(prev => ({
        ...prev,
        image_urls: [...prev.image_urls, ...uploadedUrls]
      }));
    }

    if (failures.length === 0) {
      toast({
        title: "Success",
        description: `${uploadedUrls.length} image(s) uploaded successfully`
      });
    } else if (uploadedUrls.length > 0) {
      toast({
        title: "Partial upload",
        description: `${uploadedUrls.length} ok, ${failures.length} failed. ${failures.slice(0, 2).join("; ")}${failures.length > 2 ? "…" : ""}`,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Upload failed",
        description: failures.slice(0, 3).join("; ") || "Could not upload images",
        variant: "destructive"
      });
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.en || !formData.description.en) {
      toast({
        title: "Validation Error",
        description: "English title and description are required",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingStory) {
        await updateMutation.mutateAsync({
          id: editingStory.id,
          data: {
            title: formData.title,
            subtitle: formData.subtitle,
            description: formData.description,
            image_urls: formData.image_urls,
            video_url: formData.video_url,
            is_published: formData.is_published
          }
        });
      } else {
        await createMutation.mutateAsync({
          title: formData.title,
          subtitle: formData.subtitle,
          description: formData.description,
          image_urls: formData.image_urls,
          video_url: formData.video_url,
          is_published: formData.is_published
        });
      }
    } catch (error) {
      console.error("Submission error:", error);
    }
  };

  if (storiesLoading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-10 bg-secondary rounded w-1/4" />
        <div className="h-96 bg-secondary rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Daily Life Stories</h1>
          <p className="text-muted-foreground">Manage student success stories and daily life narratives</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus size={18} />
              Add Story
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingStory ? "Edit Daily Life Story" : "Create New Daily Life Story"}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Multilingual Title */}
              <div className="space-y-2">
                <Label>Story Title (Name) *</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    placeholder="EN Name"
                    value={formData.title.en}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      title: { ...prev.title, en: e.target.value }
                    }))}
                  />
                  <Input
                    placeholder="RU Name"
                    value={formData.title.ru}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      title: { ...prev.title, ru: e.target.value }
                    }))}
                  />
                  <Input
                    placeholder="HY Name"
                    value={formData.title.hy}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      title: { ...prev.title, hy: e.target.value }
                    }))}
                  />
                </div>
              </div>

              {/* Multilingual Subtitle */}
              <div className="space-y-2">
                <Label>Story Subtitle (Role/Title)</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    placeholder="EN Subtitle"
                    value={formData.subtitle.en}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      subtitle: { ...prev.subtitle, en: e.target.value }
                    }))}
                  />
                  <Input
                    placeholder="RU Subtitle"
                    value={formData.subtitle.ru}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      subtitle: { ...prev.subtitle, ru: e.target.value }
                    }))}
                  />
                  <Input
                    placeholder="HY Subtitle"
                    value={formData.subtitle.hy}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      subtitle: { ...prev.subtitle, hy: e.target.value }
                    }))}
                  />
                </div>
              </div>

              {/* Multilingual Description */}
              <div className="space-y-2">
                <Label>Story Description (Quote) *</Label>
                <div className="space-y-2">
                  <Textarea
                    placeholder="English description"
                    value={formData.description.en}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      description: { ...prev.description, en: e.target.value }
                    }))}
                    rows={3}
                  />
                  <Textarea
                    placeholder="Russian description"
                    value={formData.description.ru}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      description: { ...prev.description, ru: e.target.value }
                    }))}
                    rows={3}
                  />
                  <Textarea
                    placeholder="Armenian description"
                    value={formData.description.hy}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      description: { ...prev.description, hy: e.target.value }
                    }))}
                    rows={3}
                  />
                </div>
              </div>

              {/* Video URL */}
              <div className="space-y-2">
                <Label>Video URL (Optional)</Label>
                <Input
                  placeholder="https://youtube.com/... or video file URL"
                  value={formData.video_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                />
              </div>

              {/* Image Uploads */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Story Images</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Upload size={16} />
                      )}
                      Upload Image
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {formData.image_urls.map((url, index) => (
                    <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border">
                      <img
                        src={getMediaUrl(url)}
                        alt={`Story image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          image_urls: prev.image_urls.filter((_, i) => i !== index)
                        }))}
                        className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Or paste Image URL and press Enter"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                        e.preventDefault();
                        const url = (e.target as HTMLInputElement).value;
                        setFormData(prev => ({
                          ...prev,
                          image_urls: [...prev.image_urls, url]
                        }));
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </div>
              </div>

              {/* Publishing */}
              <div className="flex items-center space-x-3">
                <Switch
                  id="published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
                />
                <Label htmlFor="published" className="cursor-pointer">
                  {formData.is_published ? "Published" : "Draft"}
                </Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || isUploading}>
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <Loader2 size={18} className="animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    editingStory ? "Update Story" : "Create Story"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Subtitle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stories && stories.length > 0 ? (
              stories.map(story => (
                <TableRow key={story.id}>
                  <TableCell className="max-w-xs truncate">
                    {story.title?.en || "No title"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {story.subtitle?.en || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={story.is_published ? "default" : "secondary"}>
                      {story.is_published ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => togglePublishedMutation.mutate(story.id)}
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {story.is_published ? (
                        <Eye size={18} className="text-green-500" />
                      ) : (
                        <EyeOff size={18} className="text-gray-400" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDialog(story)}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this story?")) {
                          deleteMutation.mutate(story.id);
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No stories found. Create one to get started!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminDailyLife;
