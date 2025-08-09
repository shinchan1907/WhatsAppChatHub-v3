import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ConfigData {
  n8nWebhookUrl: string;
  n8nApiKey: string;
  whatsappBusinessApiUrl: string;
  whatsappAccessToken: string;
  whatsappPhoneNumberId: string;
  whatsappBusinessAccountId: string;
  enableLogging: boolean;
  webhookVerifyToken: string;
}

export default function Settings() {
  const [configData, setConfigData] = useState<ConfigData>({
    n8nWebhookUrl: "",
    n8nApiKey: "",
    whatsappBusinessApiUrl: "https://graph.facebook.com/v18.0",
    whatsappAccessToken: "",
    whatsappPhoneNumberId: "",
    whatsappBusinessAccountId: "",
    enableLogging: true,
    webhookVerifyToken: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentConfig, isLoading } = useQuery<ConfigData>({
    queryKey: ["/api/settings/config"],
  });

  const configMutation = useMutation({
    mutationFn: async (data: ConfigData) => {
      const response = await apiRequest("POST", "/api/settings/config", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/config"] });
      toast({
        title: "Configuration saved",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save configuration",
        description: error.message || "There was an error saving your settings.",
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (type: "n8n" | "whatsapp") => {
      const response = await apiRequest("POST", `/api/settings/test-connection`, { type });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Connection successful",
        description: data.message || "Connection test passed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection failed",
        description: error.message || "Connection test failed.",
        variant: "destructive",
      });
    },
  });

  // Initialize form data when config loads
  useState(() => {
    if (currentConfig) {
      setConfigData(currentConfig);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    configMutation.mutate(configData);
  };

  const handleInputChange = (field: keyof ConfigData, value: string | boolean) => {
    setConfigData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Settings & Configuration</h2>
        <p className="text-gray-600 mt-1">Configure your WhatsApp Business API and n8n integration</p>
      </div>

      <Tabs defaultValue="integration" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="integration">API Integration</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp Config</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit}>
          <TabsContent value="integration" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>n8n Integration</CardTitle>
                <CardDescription>
                  Configure your n8n instance for automation workflows
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="n8nWebhookUrl">n8n Webhook URL</Label>
                  <Input
                    id="n8nWebhookUrl"
                    type="url"
                    value={configData.n8nWebhookUrl}
                    onChange={(e) => handleInputChange("n8nWebhookUrl", e.target.value)}
                    placeholder="https://your-n8n-instance.com/webhook"
                    data-testid="input-n8n-webhook-url"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Your n8n webhook endpoint URL (e.g., AWS Lightsail instance)
                  </p>
                </div>

                <div>
                  <Label htmlFor="n8nApiKey">n8n API Key (Optional)</Label>
                  <Input
                    id="n8nApiKey"
                    type="password"
                    value={configData.n8nApiKey}
                    onChange={(e) => handleInputChange("n8nApiKey", e.target.value)}
                    placeholder="Your n8n API key for authentication"
                    data-testid="input-n8n-api-key"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => testConnectionMutation.mutate("n8n")}
                    disabled={testConnectionMutation.isPending || !configData.n8nWebhookUrl}
                    data-testid="button-test-n8n"
                  >
                    {testConnectionMutation.isPending ? "Testing..." : "Test n8n Connection"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>WhatsApp Business Cloud API</CardTitle>
                <CardDescription>
                  Configure your WhatsApp Business API credentials
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="whatsappBusinessApiUrl">WhatsApp API Base URL</Label>
                  <Input
                    id="whatsappBusinessApiUrl"
                    type="url"
                    value={configData.whatsappBusinessApiUrl}
                    onChange={(e) => handleInputChange("whatsappBusinessApiUrl", e.target.value)}
                    placeholder="https://graph.facebook.com/v18.0"
                    data-testid="input-whatsapp-api-url"
                  />
                </div>

                <div>
                  <Label htmlFor="whatsappAccessToken">Access Token</Label>
                  <Input
                    id="whatsappAccessToken"
                    type="password"
                    value={configData.whatsappAccessToken}
                    onChange={(e) => handleInputChange("whatsappAccessToken", e.target.value)}
                    placeholder="Your permanent WhatsApp access token"
                    data-testid="input-whatsapp-token"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="whatsappPhoneNumberId">Phone Number ID</Label>
                    <Input
                      id="whatsappPhoneNumberId"
                      value={configData.whatsappPhoneNumberId}
                      onChange={(e) => handleInputChange("whatsappPhoneNumberId", e.target.value)}
                      placeholder="1234567890123456"
                      data-testid="input-phone-number-id"
                    />
                  </div>
                  <div>
                    <Label htmlFor="whatsappBusinessAccountId">Business Account ID</Label>
                    <Input
                      id="whatsappBusinessAccountId"
                      value={configData.whatsappBusinessAccountId}
                      onChange={(e) => handleInputChange("whatsappBusinessAccountId", e.target.value)}
                      placeholder="1234567890123456"
                      data-testid="input-business-account-id"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => testConnectionMutation.mutate("whatsapp")}
                    disabled={testConnectionMutation.isPending || !configData.whatsappAccessToken}
                    data-testid="button-test-whatsapp"
                  >
                    {testConnectionMutation.isPending ? "Testing..." : "Test WhatsApp API"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>
                  Additional configuration options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="webhookVerifyToken">Webhook Verify Token</Label>
                  <Input
                    id="webhookVerifyToken"
                    value={configData.webhookVerifyToken}
                    onChange={(e) => handleInputChange("webhookVerifyToken", e.target.value)}
                    placeholder="Your webhook verification token"
                    data-testid="input-verify-token"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Used to verify incoming WhatsApp webhook requests
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enableLogging">Enable Debug Logging</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      Log API requests and responses for debugging
                    </p>
                  </div>
                  <Switch
                    id="enableLogging"
                    checked={configData.enableLogging}
                    onCheckedChange={(checked) => handleInputChange("enableLogging", checked)}
                    data-testid="switch-enable-logging"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <div className="flex justify-end space-x-2 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfigData(currentConfig || {
                n8nWebhookUrl: "",
                n8nApiKey: "",
                whatsappBusinessApiUrl: "https://graph.facebook.com/v18.0",
                whatsappAccessToken: "",
                whatsappPhoneNumberId: "",
                whatsappBusinessAccountId: "",
                enableLogging: true,
                webhookVerifyToken: "",
              })}
            >
              Reset
            </Button>
            <Button
              type="submit"
              className="whatsapp-green"
              disabled={configMutation.isPending}
              data-testid="button-save-config"
            >
              {configMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </form>
      </Tabs>
    </div>
  );
}