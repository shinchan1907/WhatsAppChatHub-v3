import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Contact } from "@shared/schema";

export default function ContactManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    group: "customer",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/contacts", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Contact created",
        description: "Your contact has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create contact",
        description: error.message || "There was an error creating your contact.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/contacts/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setEditingContact(null);
      resetForm();
      toast({
        title: "Contact updated",
        description: "Your contact has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update contact",
        description: error.message || "There was an error updating your contact.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Contact deleted",
        description: "Your contact has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete contact",
        description: error.message || "There was an error deleting your contact.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      group: "customer",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingContact) {
      updateMutation.mutate({ id: editingContact.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || "",
      group: contact.group || "customer",
    });
    setIsCreateDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingContact(null);
    resetForm();
  };

  // Filter contacts based on search and group
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.phone.includes(searchTerm);
    const matchesGroup = filterGroup === "all" || (contact.group || "customer") === filterGroup;
    return matchesSearch && matchesGroup;
  });

  const getGroupColor = (group: string) => {
    const colors: Record<string, string> = {
      customer: "bg-blue-100 text-blue-800",
      prospect: "bg-yellow-100 text-yellow-800",
      vip: "bg-purple-100 text-purple-800",
      lead: "bg-green-100 text-green-800",
    };
    return colors[group] || "bg-gray-100 text-gray-800";
  };

  const getUniqueGroups = () => {
    const groups = [...new Set(contacts.map(c => c.group || "customer"))];
    return groups;
  };

  const formatLastContact = (date: Date | null) => {
    if (!date) return "Never";
    
    const now = new Date();
    const contactDate = new Date(date);
    const diffMs = now.getTime() - contactDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) {
      return "Just now";
    } else if (diffHours < 24) {
      return "Today";
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)} days ago`;
    } else {
      return contactDate.toLocaleDateString();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Contacts</h2>
          <p className="text-gray-600 mt-1">Manage your WhatsApp business contacts</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="text-gray-600">
            <i className="fas fa-upload mr-2" />
            Import CSV
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="whatsapp-green" data-testid="button-new-contact">
                <i className="fas fa-plus mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingContact ? "Edit Contact" : "Add New Contact"}</DialogTitle>
                <DialogDescription>
                  {editingContact ? "Update contact information below." : "Enter the contact details below."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter contact name"
                    required
                    data-testid="input-contact-name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1234567890"
                    required
                    data-testid="input-contact-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                    data-testid="input-contact-email"
                  />
                </div>
                <div>
                  <Label htmlFor="group">Group</Label>
                  <Select value={formData.group} onValueChange={(value) => setFormData(prev => ({ ...prev, group: value }))}>
                    <SelectTrigger data-testid="select-contact-group">
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                    data-testid="button-cancel-contact"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="whatsapp-green"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-contact"
                  >
                    {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : (editingContact ? "Update" : "Add")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-contacts"
              />
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger className="w-48" data-testid="select-filter-group">
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {getUniqueGroups().map((group) => (
                  <SelectItem key={group} value={group}>
                    {group.charAt(0).toUpperCase() + group.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contacts List */}
      <Card>
        <CardContent className="p-0">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-address-book text-6xl text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-500 mb-2">
                {contacts.length === 0 ? "No contacts yet" : "No contacts match your search"}
              </h3>
              <p className="text-gray-400 mb-4">
                {contacts.length === 0 ? "Add your first contact to get started" : "Try adjusting your search or filters"}
              </p>
              {contacts.length === 0 && (
                <Button className="whatsapp-green" onClick={() => setIsCreateDialogOpen(true)}>
                  <i className="fas fa-plus mr-2" />
                  Add Contact
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                  data-testid={`contact-row-${contact.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <img
                        src={contact.profileImageUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&w=48&h=48&fit=crop&crop=face"}
                        alt={contact.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="font-medium text-gray-900">{contact.name}</h3>
                        <p className="text-sm text-gray-600">{contact.phone}</p>
                        {contact.email && (
                          <p className="text-sm text-gray-500">{contact.email}</p>
                        )}
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getGroupColor(contact.group)}>
                            {contact.group}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            Last contact: {formatLastContact(contact.lastContact)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        className="whatsapp-green"
                        size="sm"
                        data-testid={`button-message-contact-${contact.id}`}
                      >
                        Message
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(contact)}
                        data-testid={`button-edit-contact-${contact.id}`}
                      >
                        <i className="fas fa-edit text-gray-400 hover:text-gray-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(contact.id)}
                        data-testid={`button-delete-contact-${contact.id}`}
                      >
                        <i className="fas fa-trash text-gray-400 hover:text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
