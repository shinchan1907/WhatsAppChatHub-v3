import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ConfigData {
  whatsappAccessToken: string;
  whatsappPhoneNumberId: string;
  whatsappBusinessAccountId: string;
  whatsappWebhookVerifyToken: string;
  n8nWebhookUrl: string;
  n8nApiKey: string;
  n8nEnabled: boolean;
  usePersistentDb: boolean;
  dbHost: string;
  dbPort: string;
  dbName: string;
  dbUsername: string;
  dbPassword: string;
  enableLogging: boolean;
  webhookSecret: string;
  isConfigured: boolean;
}

export default function Settings() {
  const [configData, setConfigData] = useState<ConfigData>({
    whatsappAccessToken: "",
    whatsappPhoneNumberId: "",
    whatsappBusinessAccountId: "",
    whatsappWebhookVerifyToken: "",
    n8nWebhookUrl: "",
    n8nApiKey: "",
    n8nEnabled: false,
    usePersistentDb: false,
    dbHost: "",
    dbPort: "",
    dbName: "",
    dbUsername: "",
    dbPassword: "",
    enableLogging: true,
    webhookSecret: "",
    isConfigured: false,
  });

  const [connectionStatus, setConnectionStatus] = useState<{
    whatsapp: "unknown" | "testing" | "success" | "failed";
    n8n: "unknown" | "testing" | "success" | "failed";
  }>({ whatsapp: "unknown", n8n: "unknown" });

  const [showTokens, setShowTokens] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentConfig, isLoading } = useQuery<ConfigData>({
    queryKey: ["/api/settings/config"],
  });

  // Update form data when config loads
  useEffect(() => {
    if (currentConfig) {
      setConfigData(currentConfig);
    }
  }, [currentConfig]);

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
      setConnectionStatus(prev => ({ ...prev, [type]: "testing" }));
      const response = await apiRequest("POST", `/api/settings/test-connection`, { type });
      return { type, result: await response.json() };
    },
    onSuccess: ({ type, result }) => {
      setConnectionStatus(prev => ({ ...prev, [type]: "success" }));
      toast({
        title: "Connection successful",
        description: result.message || "Connection test passed.",
      });
    },
    onError: (error: Error, variables) => {
      const type = (variables as any)?.type || "unknown";
      setConnectionStatus(prev => ({ ...prev, [type]: "failed" }));
      toast({
        title: "Connection failed",
        description: error.message || "Connection test failed.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    configMutation.mutate(configData);
  };

  const handleInputChange = (field: keyof ConfigData, value: string | boolean) => {
    setConfigData(prev => ({ ...prev, [field]: value }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="default" className="bg-green-500">Connected</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "testing":
        return <Badge variant="secondary">Testing...</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings & Configuration</h1>
        <p className="text-gray-600 mt-2">Configure your WhatsApp Business integration for production use</p>
        
        {configData.isConfigured && (
          <Alert className="mt-4 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              ✓ Your WhatsApp Business API is configured and ready to use. Messages can be sent directly through the application.
            </AlertDescription>
          </Alert>
        )}

        {configData.whatsappPhoneNumberId && !configData.whatsappAccessToken && (
          <Alert className="mt-4 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              ⚠️ Missing WhatsApp Access Token! You have Phone Number ID configured but messages cannot be sent without the Access Token. Please add it in the WhatsApp Business tab.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Tabs defaultValue="whatsapp" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="whatsapp">WhatsApp Business</TabsTrigger>
          <TabsTrigger value="n8n">n8n Integration</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit}>
          <TabsContent value="whatsapp" className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>WhatsApp Business Cloud API</CardTitle>
                    <CardDescription>
                      Configure your WhatsApp Business Account to send messages directly
                    </CardDescription>
                  </div>
                  {getStatusBadge(connectionStatus.whatsapp)}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Quick Setup Guide:</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Create a Facebook App with WhatsApp Business product</li>
                    <li>Get your Access Token from the Facebook App dashboard</li>
                    <li>Find your Phone Number ID in WhatsApp Business Account</li>
                    <li>Configure webhook verification token</li>
                    <li>Test the connection below</li>
                  </ol>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="whatsappAccessToken">Access Token *</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="whatsappAccessToken"
                        type={showTokens ? "text" : "password"}
                        value={configData.whatsappAccessToken || ""}
                        onChange={(e) => handleInputChange("whatsappAccessToken", e.target.value)}
                        placeholder="EAAxxxxxxxx..."
                        data-testid="input-access-token"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowTokens(!showTokens)}
                        data-testid="button-toggle-tokens"
                      >
                        <i className={`fas ${showTokens ? "fa-eye-slash" : "fa-eye"}`} />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">From your Facebook App dashboard</p>
                  </div>

                  <div>
                    <Label htmlFor="whatsappPhoneNumberId">Phone Number ID *</Label>
                    <Input
                      id="whatsappPhoneNumberId"
                      value={configData.whatsappPhoneNumberId || ""}
                      onChange={(e) => handleInputChange("whatsappPhoneNumberId", e.target.value)}
                      placeholder="123456789012345"
                      data-testid="input-phone-number-id"
                    />
                    <p className="text-xs text-gray-500 mt-1">From WhatsApp Business Account</p>
                  </div>

                  <div>
                    <Label htmlFor="whatsappBusinessAccountId">Business Account ID</Label>
                    <Input
                      id="whatsappBusinessAccountId"
                      value={configData.whatsappBusinessAccountId || ""}
                      onChange={(e) => handleInputChange("whatsappBusinessAccountId", e.target.value)}
                      placeholder="123456789012345"
                      data-testid="input-business-account-id"
                    />
                    <p className="text-xs text-gray-500 mt-1">Optional: For account management</p>
                  </div>

                  <div>
                    <Label htmlFor="whatsappWebhookVerifyToken">Webhook Verify Token</Label>
                    <Input
                      id="whatsappWebhookVerifyToken"
                      value={configData.whatsappWebhookVerifyToken || ""}
                      onChange={(e) => handleInputChange("whatsappWebhookVerifyToken", e.target.value)}
                      placeholder="my_secure_token_123"
                      data-testid="input-webhook-verify-token"
                    />
                    <p className="text-xs text-gray-500 mt-1">Custom token for webhook security</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Status: {connectionStatus.whatsapp === "success" ? "✓ Connected" : 
                            connectionStatus.whatsapp === "failed" ? "✗ Failed" : "Not tested"}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => testConnectionMutation.mutate("whatsapp")}
                    disabled={testConnectionMutation.isPending || !configData.whatsappAccessToken || !configData.whatsappPhoneNumberId}
                    data-testid="button-test-whatsapp"
                  >
                    {testConnectionMutation.isPending ? "Testing..." : "Test Connection"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="n8n" className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>n8n Integration (Optional)</CardTitle>
                    <CardDescription>
                      Connect with n8n for advanced automation workflows
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={configData.n8nEnabled}
                      onCheckedChange={(checked) => handleInputChange("n8nEnabled", checked)}
                      data-testid="switch-n8n-enabled"
                    />
                    {getStatusBadge(connectionStatus.n8n)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">n8n Features:</h4>
                  <ul className="text-sm text-purple-800 space-y-1 list-disc list-inside">
                    <li>Advanced workflow automation</li>
                    <li>Multi-step marketing campaigns</li>
                    <li>External system integrations</li>
                    <li>Conditional message routing</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="n8nWebhookUrl">n8n Webhook URL</Label>
                    <Input
                      id="n8nWebhookUrl"
                      value={configData.n8nWebhookUrl || ""}
                      onChange={(e) => handleInputChange("n8nWebhookUrl", e.target.value)}
                      placeholder="https://your-n8n-instance.com/webhook/whatsapp"
                      data-testid="input-n8n-webhook-url"
                      disabled={!configData.n8nEnabled}
                    />
                    <p className="text-xs text-gray-500 mt-1">Your n8n webhook endpoint URL</p>
                  </div>

                  <div>
                    <Label htmlFor="n8nApiKey">n8n API Key (Optional)</Label>
                    <Input
                      id="n8nApiKey"
                      type={showTokens ? "text" : "password"}
                      value={configData.n8nApiKey || ""}
                      onChange={(e) => handleInputChange("n8nApiKey", e.target.value)}
                      placeholder="n8n_api_key_xxx"
                      data-testid="input-n8n-api-key"
                      disabled={!configData.n8nEnabled}
                    />
                    <p className="text-xs text-gray-500 mt-1">For advanced n8n API operations</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Status: {connectionStatus.n8n === "success" ? "✓ Connected" : 
                            connectionStatus.n8n === "failed" ? "✗ Failed" : "Not tested"}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => testConnectionMutation.mutate("n8n")}
                    disabled={testConnectionMutation.isPending || !configData.n8nEnabled || !configData.n8nWebhookUrl}
                    data-testid="button-test-n8n"
                  >
                    {testConnectionMutation.isPending ? "Testing..." : "Test Connection"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Webhook Configuration</CardTitle>
                <CardDescription>
                  Webhook endpoints for receiving WhatsApp messages and status updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Setup Instructions:</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Go to Facebook Developer Console → Your App → WhatsApp → Configuration</li>
                    <li>Add the webhook URL below to "Callback URL"</li>
                    <li>Use the webhook secret as "Verify Token"</li>
                    <li>Subscribe to "messages" webhook field</li>
                    <li>Click "Verify and Save" to complete setup</li>
                  </ol>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Webhook URL (Copy this to Facebook Developer Console)</Label>
                    <div className="flex space-x-2">
                      <Input
                        value={typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/whatsapp` : ''}
                        readOnly
                        className="bg-gray-50 font-mono text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const url = `${window.location.origin}/api/webhooks/whatsapp`;
                          navigator.clipboard.writeText(url);
                        }}
                        data-testid="button-copy-webhook-url"
                      >
                        📋
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Webhook Secret (Use as Verify Token)</Label>
                    <div className="flex space-x-2">
                      <Input
                        value={configData.webhookSecret || "webhook_verify_token_123"}
                        readOnly
                        className="bg-gray-50 font-mono text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(configData.webhookSecret || "webhook_verify_token_123");
                        }}
                        data-testid="button-copy-webhook-secret"
                      >
                        📋
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Copy this exact value to the "Verify Token" field in Facebook Developer Console</p>
                  </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-lg">
                  <h4 className="font-medium text-amber-900 mb-2">Important Notes:</h4>
                  <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                    <li>Your webhook URL must be publicly accessible (not localhost)</li>
                    <li>Use HTTPS in production (required by WhatsApp)</li>
                    <li>Webhook secret must match exactly between here and Facebook console</li>
                    <li>After setup, send a test message to your WhatsApp Business number</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Database Configuration</CardTitle>
                <CardDescription>
                  Configure database storage for persistent data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="usePersistentDb">Use PostgreSQL Database</Label>
                    <p className="text-sm text-gray-500">Enable persistent storage instead of in-memory storage</p>
                  </div>
                  <Switch
                    id="usePersistentDb"
                    checked={configData.usePersistentDb || false}
                    onCheckedChange={(checked) => handleInputChange("usePersistentDb", checked)}
                    data-testid="switch-persistent-db"
                  />
                </div>

                {configData.usePersistentDb && (
                  <div className="space-y-4 border-l-4 border-blue-200 pl-4 bg-blue-50 p-4 rounded">
                    <h4 className="font-medium text-blue-900">Database Connection Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="dbHost">Host</Label>
                        <Input
                          id="dbHost"
                          value={configData.dbHost || ""}
                          onChange={(e) => handleInputChange("dbHost", e.target.value)}
                          placeholder="localhost or IP address"
                          data-testid="input-db-host"
                        />
                      </div>
                      <div>
                        <Label htmlFor="dbPort">Port</Label>
                        <Input
                          id="dbPort"
                          type="number"
                          value={configData.dbPort || ""}
                          onChange={(e) => handleInputChange("dbPort", e.target.value)}
                          placeholder="5432"
                          data-testid="input-db-port"
                        />
                      </div>
                      <div>
                        <Label htmlFor="dbName">Database Name</Label>
                        <Input
                          id="dbName"
                          value={configData.dbName || ""}
                          onChange={(e) => handleInputChange("dbName", e.target.value)}
                          placeholder="whatsapp_business"
                          data-testid="input-db-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="dbUsername">Username</Label>
                        <Input
                          id="dbUsername"
                          value={configData.dbUsername || ""}
                          onChange={(e) => handleInputChange("dbUsername", e.target.value)}
                          placeholder="postgres"
                          data-testid="input-db-username"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="dbPassword">Password</Label>
                        <Input
                          id="dbPassword"
                          type="password"
                          value={configData.dbPassword || ""}
                          onChange={(e) => handleInputChange("dbPassword", e.target.value)}
                          placeholder="Enter database password"
                          data-testid="input-db-password"
                        />
                      </div>
                    </div>
                    <div className="bg-amber-50 p-3 rounded border border-amber-200">
                      <p className="text-xs text-amber-800">
                        <strong>Note:</strong> Enabling PostgreSQL will persist all chat conversations, contacts, and settings. 
                        Data will be preserved between sessions and server restarts.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
                <CardDescription>
                  General system settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enableLogging">Enable Logging</Label>
                    <p className="text-sm text-gray-500">Log webhook events and API calls for debugging</p>
                  </div>
                  <Switch
                    id="enableLogging"
                    checked={configData.enableLogging}
                    onCheckedChange={(checked) => handleInputChange("enableLogging", checked)}
                    data-testid="switch-enable-logging"
                  />
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">System Status</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span>WhatsApp API:</span>
                      <span className={configData.isConfigured ? "text-green-600" : "text-red-600"}>
                        {configData.isConfigured ? "Configured" : "Not Configured"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>n8n Integration:</span>
                      <span className={configData.n8nEnabled ? "text-blue-600" : "text-gray-500"}>
                        {configData.n8nEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <div className="flex justify-end space-x-4 pt-6">
            <Button
              type="submit"
              disabled={configMutation.isPending}
              data-testid="button-save-config"
              className="px-8"
            >
              {configMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </form>
      </Tabs>
    </div>
  );
}