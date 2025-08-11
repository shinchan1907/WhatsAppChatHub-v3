import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText,
  Image,
  Video,
  File
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  content: string;
  variables: string[];
  mediaUrl?: string;
  mediaType?: string;
  status: string;
  rejectionReason?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TemplateManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    category: "general",
    language: "en",
    content: "",
    variables: [] as string[],
    mediaUrl: "",
    mediaType: ""
  });

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery<MessageTemplate[]>({
    queryKey: ["templates"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/v1/templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      return data.data || [];
    },
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      const response = await apiRequest("POST", "/api/v1/templates", templateData);
      if (!response.ok) throw new Error("Failed to create template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setShowCreateDialog(false);
      resetForm();
      toast({
        title: "Template created",
        description: "Template has been created and is pending approval",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/v1/templates/${id}`, data);
      if (!response.ok) throw new Error("Failed to update template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setShowEditDialog(false);
      setEditingTemplate(null);
      resetForm();
      toast({
        title: "Template updated",
        description: "Template has been updated and is pending approval",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/v1/templates/${id}`);
      if (!response.ok) throw new Error("Failed to delete template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({
        title: "Template deleted",
        description: "Template has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Approve template mutation
  const approveTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/v1/templates/${id}/approve`);
      if (!response.ok) throw new Error("Failed to approve template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({
        title: "Template approved",
        description: "Template has been approved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject template mutation
  const rejectTemplateMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await apiRequest("POST", `/api/v1/templates/${id}/reject`, { reason });
      if (!response.ok) throw new Error("Failed to reject template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({
        title: "Template rejected",
        description: "Template has been rejected",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      category: "general",
      language: "en",
      content: "",
      variables: [],
      mediaUrl: "",
      mediaType: ""
    });
  };

  const handleCreateTemplate = () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      toast({
        title: "Validation error",
        description: "Name and content are required",
        variant: "destructive",
      });
      return;
    }

    createTemplateMutation.mutate(formData);
  };

  const handleUpdateTemplate = () => {
    if (!editingTemplate) return;

    if (!formData.name.trim() || !formData.content.trim()) {
      toast({
        title: "Validation error",
        description: "Name and content are required",
        variant: "destructive",
      });
      return;
    }

    updateTemplateMutation.mutate({
      id: editingTemplate.id,
      data: formData
    });
  };

  const handleEditTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      language: template.language,
      content: template.content,
      variables: template.variables,
      mediaUrl: template.mediaUrl || "",
      mediaType: template.mediaType || ""
    });
    setShowEditDialog(true);
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const handleApproveTemplate = (id: string) => {
    approveTemplateMutation.mutate(id);
  };

  const handleRejectTemplate = (id: string) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (reason) {
      rejectTemplateMutation.mutate({ id, reason });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getMediaIcon = (mediaType?: string) => {
    if (!mediaType) return null;
    
    if (mediaType.startsWith('image/')) {
      return <Image className="w-4 h-4 text-blue-600" />;
    } else if (mediaType.startsWith('video/')) {
      return <Video className="w-4 h-4 text-purple-600" />;
    } else {
      return <File className="w-4 h-4 text-gray-600" />;
    }
  };

  const addVariable = () => {
    const variable = prompt("Enter variable name (e.g., customer_name):");
    if (variable && !formData.variables.includes(variable)) {
      setFormData(prev => ({
        ...prev,
        variables: [...prev.variables, variable]
      }));
    }
  };

  const removeVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v !== variable)
    }));
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Message Templates</h1>
            <p className="text-gray-600">Create and manage WhatsApp message templates</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Template</DialogTitle>
                <DialogDescription>
                  Create a new message template. Templates must be approved before they can be used.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Template Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter template name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="support">Support</SelectItem>
                        <SelectItem value="notification">Notification</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select value={formData.language} onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="mediaUrl">Media URL (Optional)</Label>
                    <Input
                      id="mediaUrl"
                      value={formData.mediaUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, mediaUrl: e.target.value }))}
                      placeholder="https://example.com/media.jpg"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="content">Template Content *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter your template message content..."
                    rows={4}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Use {"{{variable_name}}"} for dynamic content
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Template Variables</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addVariable}>
                      <Plus className="w-3 h-3 mr-1" />
                      Add Variable
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.variables.map((variable) => (
                      <div key={variable} className="flex items-center space-x-2">
                        <Badge variant="secondary">{variable}</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVariable(variable)}
                        >
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    {formData.variables.length === 0 && (
                      <p className="text-sm text-gray-500">No variables added</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateTemplate}
                    disabled={createTemplateMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{template.category}</Badge>
                      <Badge variant="outline">{template.language.toUpperCase()}</Badge>
                      {getMediaIcon(template.mediaType)}
                    </CardDescription>
                  </div>
                  {getStatusBadge(template.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-600 line-clamp-3">
                  {template.content}
                </div>
                
                {template.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.variables.map((variable) => (
                      <Badge key={variable} variant="secondary" className="text-xs">
                        {variable}
                      </Badge>
                    ))}
                  </div>
                )}

                {template.rejectionReason && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    <strong>Rejection Reason:</strong> {template.rejectionReason}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-xs text-gray-500">
                    {new Date(template.updatedAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center space-x-1">
                    {template.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApproveTemplate(template.id)}
                          disabled={approveTemplateMutation.isPending}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectTemplate(template.id)}
                          disabled={rejectTemplateMutation.isPending}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditTemplate(template)}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteTemplate(template.id)}
                      disabled={deleteTemplateMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {templates.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
            <p className="text-gray-600 mb-6">Create your first message template to get started</p>
            <Button onClick={() => setShowCreateDialog(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>
        )}

        {/* Edit Template Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
              <DialogDescription>
                Update your template. Changes will reset the approval status.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Template Name *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter template name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="notification">Notification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-language">Language</Label>
                  <Select value={formData.language} onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-mediaUrl">Media URL (Optional)</Label>
                  <Input
                    id="edit-mediaUrl"
                    value={formData.mediaUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, mediaUrl: e.target.value }))}
                    placeholder="https://example.com/media.jpg"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-content">Template Content *</Label>
                <Textarea
                  id="edit-content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter your template message content..."
                  rows={4}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Template Variables</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addVariable}>
                    <Plus className="w-3 h-3 mr-1" />
                    Add Variable
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.variables.map((variable) => (
                    <div key={variable} className="flex items-center space-x-2">
                      <Badge variant="secondary">{variable}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariable(variable)}
                      >
                        <XCircle className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateTemplate}
                  disabled={updateTemplateMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {updateTemplateMutation.isPending ? "Updating..." : "Update Template"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
