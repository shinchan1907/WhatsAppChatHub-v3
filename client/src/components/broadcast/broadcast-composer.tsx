import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Template, Contact, Broadcast } from "@shared/schema";

export default function BroadcastComposer() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [scheduledFor, setScheduledFor] = useState<string>("");
  const [isScheduled, setIsScheduled] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: broadcasts = [] } = useQuery<Broadcast[]>({
    queryKey: ["/api/broadcasts"],
  });

  const broadcastMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/broadcasts", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/broadcasts"] });
      resetForm();
      toast({
        title: "Broadcast sent",
        description: "Your broadcast has been queued for delivery.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send broadcast",
        description: error.message || "There was an error sending your broadcast.",
        variant: "destructive",
      });
    },
  });

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const templateVariables = (selectedTemplate?.variables && Array.isArray(selectedTemplate.variables)) ? selectedTemplate.variables : [];

  const resetForm = () => {
    setSelectedTemplateId("");
    setSelectedContacts(new Set());
    setVariables({});
    setScheduledFor("");
    setIsScheduled(false);
  };

  const handleContactToggle = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedContacts.size === contacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(contacts.map(c => c.id)));
    }
  };

  const handleVariableChange = (variable: string, value: string) => {
    setVariables(prev => ({ ...prev, [variable]: value }));
  };

  const renderPreview = () => {
    if (!selectedTemplate) return "";
    
    let preview = selectedTemplate.content;
    Object.entries(variables).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`);
    });
    
    return preview;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTemplateId) {
      toast({
        title: "Template required",
        description: "Please select a template for your broadcast.",
        variant: "destructive",
      });
      return;
    }

    if (selectedContacts.size === 0) {
      toast({
        title: "Recipients required",
        description: "Please select at least one recipient for your broadcast.",
        variant: "destructive",
      });
      return;
    }

    // Check if all required variables are filled
    const missingVariables = templateVariables.filter(variable => !variables[variable]?.trim());
    if (missingVariables.length > 0) {
      toast({
        title: "Missing variables",
        description: `Please fill in all template variables: ${missingVariables.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const broadcastData = {
      templateId: selectedTemplateId,
      recipients: Array.from(selectedContacts),
      variables,
      scheduledFor: isScheduled && scheduledFor ? new Date(scheduledFor) : null,
    };

    broadcastMutation.mutate(broadcastData);
  };

  const formatBroadcastTime = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Bulk Broadcast</h2>
        <p className="text-gray-600 mt-1">Send template messages to multiple contacts</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Broadcast Composer */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Compose Broadcast</CardTitle>
              <CardDescription>Select a template, choose recipients, and send your message</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Template Selection */}
                <div>
                  <Label htmlFor="template">Select Template</Label>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger data-testid="select-broadcast-template">
                      <SelectValue placeholder="Choose a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({template.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Template Variables */}
                {templateVariables.length > 0 && (
                  <div>
                    <Label>Template Variables</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      {templateVariables.map((variable) => (
                        <div key={variable}>
                          <Input
                            placeholder={`{{${variable}}}`}
                            value={variables[variable] || ""}
                            onChange={(e) => handleVariableChange(variable, e.target.value)}
                            data-testid={`input-variable-${variable}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recipients */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Recipients</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      data-testid="button-select-all-contacts"
                    >
                      {selectedContacts.size === contacts.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                  
                  <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {contacts.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No contacts available</p>
                    ) : (
                      <div className="space-y-3">
                        {contacts.map((contact) => (
                          <div key={contact.id} className="flex items-center space-x-3">
                            <Checkbox
                              id={`contact-${contact.id}`}
                              checked={selectedContacts.has(contact.id)}
                              onCheckedChange={() => handleContactToggle(contact.id)}
                              data-testid={`checkbox-contact-${contact.id}`}
                            />
                            <img
                              src={contact.profileImageUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&w=32&h=32&fit=crop&crop=face"}
                              alt={contact.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{contact.name}</div>
                              <div className="text-sm text-gray-500">{contact.phone}</div>
                            </div>
                            <Badge variant="outline">{contact.group}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-600">
                    {selectedContacts.size} contacts selected
                  </div>
                </div>

                {/* Schedule Options */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="schedule"
                      checked={isScheduled}
                      onCheckedChange={setIsScheduled}
                      data-testid="checkbox-schedule-broadcast"
                    />
                    <Label htmlFor="schedule">Schedule for later</Label>
                  </div>
                  
                  {isScheduled && (
                    <Input
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      data-testid="input-schedule-time"
                    />
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    type="submit"
                    className="whatsapp-green"
                    disabled={broadcastMutation.isPending}
                    data-testid="button-send-broadcast"
                  >
                    {broadcastMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane mr-2" />
                        {isScheduled ? "Schedule Broadcast" : "Send Broadcast"}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Preview and History */}
        <div className="space-y-6">
          {/* Message Preview */}
          {selectedTemplate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Message Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="message-bubble-sent rounded-lg p-3 max-w-full">
                    <p className="text-gray-800 whitespace-pre-wrap break-words">
                      {renderPreview()}
                    </p>
                    <span className="text-xs text-gray-500 mt-1 block">Preview</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Broadcast History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Broadcasts</CardTitle>
            </CardHeader>
            <CardContent>
              {broadcasts.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No broadcasts yet</p>
              ) : (
                <div className="space-y-3">
                  {broadcasts.slice(0, 5).map((broadcast) => {
                    const template = templates.find(t => t.id === broadcast.templateId);
                    return (
                      <div
                        key={broadcast.id}
                        className="p-3 border rounded-lg"
                        data-testid={`broadcast-history-${broadcast.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {template?.name || "Unknown Template"}
                            </h4>
                            <div className="text-sm text-gray-600">
                              {Array.isArray(broadcast.recipients) ? broadcast.recipients.length : 0} recipients •{" "}
                              {formatBroadcastTime(broadcast.createdAt || new Date())}
                            </div>
                          </div>
                          <Badge variant={broadcast.status === "completed" ? "default" : "secondary"}>
                            {broadcast.status}
                          </Badge>
                        </div>
                        
                        {broadcast.status === "completed" && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="text-green-600">
                              {broadcast.deliveredCount || 0} delivered
                            </span>
                            {(broadcast.failedCount || 0) > 0 && (
                              <span className="text-red-600 ml-2">
                                {broadcast.failedCount} failed
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
