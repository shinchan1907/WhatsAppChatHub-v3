import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Shield, 
  Bell, 
  MessageCircle, 
  Cloud, 
  Download, 
  Upload,
  TestTube,
  Save,
  CheckCircle,
  XCircle,
  Settings as SettingsIcon,
  RefreshCw
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Types for better type safety
interface WhatsAppSettings {
  phoneNumber: string;
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  webhookVerifyToken: string;
  webhookUrl: string;
}

interface CDNSettings {
  provider: 'bunny' | 'cloudflare' | 'aws' | 'azure';
  apiKey: string;
  zoneName: string;
  pullZoneUrl: string;
  storageZone: string;
  region: 'de' | 'us' | 'uk' | 'sg' | 'au';
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  messageAlerts: boolean;
  deliveryReports: boolean;
  weeklyReports: boolean;
  monthlyReports: boolean;
}

interface SecuritySettings {
  twoFactorAuth: boolean;
  sessionTimeout: string;
  passwordExpiry: string;
  loginNotifications: boolean;
  suspiciousActivityAlerts: boolean;
}

// Status types for better state management
type TestStatus = 'idle' | 'testing' | 'success' | 'error';
type ConnectionStatus = 'disconnected' | 'connected' | 'error';
type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

// Constants for better maintainability
const CDN_PROVIDERS = [
  { value: 'bunny', label: 'Bunny CDN' },
  { value: 'cloudflare', label: 'Cloudflare' },
  { value: 'aws', label: 'AWS CloudFront' },
  { value: 'azure', label: 'Azure CDN' }
] as const;

const REGIONS = [
  { value: 'de', label: 'Germany (DE)' },
  { value: 'us', label: 'United States (US)' },
  { value: 'uk', label: 'United Kingdom (UK)' },
  { value: 'sg', label: 'Singapore (SG)' },
  { value: 'au', label: 'Australia (AU)' }
] as const;

export default function Settings() {
  const { user, logout } = useAuth();
  
  // State management with proper typing
  const [whatsappSettings, setWhatsappSettings] = useState<WhatsAppSettings>({
    phoneNumber: '',
    phoneNumberId: '',
    businessAccountId: '',
    accessToken: '',
    webhookVerifyToken: '',
    webhookUrl: ''
  });

  const [cdnSettings, setCdnSettings] = useState<CDNSettings>({
    provider: 'bunny',
    apiKey: '',
    zoneName: '',
    pullZoneUrl: '',
    storageZone: '',
    region: 'de'
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    messageAlerts: true,
    deliveryReports: true,
    weeklyReports: false,
    monthlyReports: true
  });

  const [security, setSecurity] = useState<SecuritySettings>({
    twoFactorAuth: false,
    sessionTimeout: '24',
    passwordExpiry: '90',
    loginNotifications: true,
    suspiciousActivityAlerts: true
  });

  // Status states
  const [whatsappTestStatus, setWhatsappTestStatus] = useState<TestStatus>('idle');
  const [cdnTestStatus, setCdnTestStatus] = useState<TestStatus>('idle');
  const [syncTemplatesStatus, setSyncTemplatesStatus] = useState<SyncStatus>('idle');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');

  // Temporary organization ID for testing - remove in production
  const [tempOrgId, setTempOrgId] = useState('0994772b-cd9e-4fe6-b31e-aad537c4c37e');

  // Memoized headers to prevent unnecessary re-renders
  const apiHeaders = useMemo(() => ({
    'x-organization-id': tempOrgId,
    'x-user-id': user?.id || 'test'
  }), [tempOrgId, user?.id]);

  // Optimized API request wrapper
  const makeApiRequest = useCallback(async (
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ) => {
    try {
      const response = await apiRequest(method, endpoint, data, apiHeaders);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error: any) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }, [apiHeaders]);

  // Load settings with error handling
  const loadSettings = useCallback(async () => {
    try {
      const [whatsappData, cdnData, notificationData, securityData] = await Promise.all([
        makeApiRequest('/api/v1/settings/whatsapp'),
        makeApiRequest('/api/v1/settings/cdn'),
        makeApiRequest('/api/v1/settings/notifications'),
        makeApiRequest('/api/v1/settings/security')
      ]);

      if (whatsappData.success && whatsappData.data) {
        setWhatsappSettings(prev => ({ ...prev, ...whatsappData.data }));
      }
      if (cdnData.success && cdnData.data) {
        setCdnSettings(prev => ({ ...prev, ...cdnData.data }));
      }
      if (notificationData.success && notificationData.data) {
        setNotifications(prev => ({ ...prev, ...notificationData.data }));
      }
      if (securityData.success && securityData.data) {
        setSecurity(prev => ({ ...prev, ...securityData.data }));
      }
    } catch (error: any) {
      console.error('Failed to load settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings. Please refresh the page.",
        variant: "destructive",
      });
    }
  }, [makeApiRequest]);

  // Check connection status
  const checkConnectionStatus = useCallback(async () => {
    try {
      const data = await makeApiRequest('/api/v1/settings/whatsapp');
      if (data.success && data.data && data.data.accessToken) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      setConnectionStatus('disconnected');
    }
  }, [makeApiRequest]);

  // Load settings and check connection on mount
  useEffect(() => {
    loadSettings();
    checkConnectionStatus();
  }, [loadSettings, checkConnectionStatus]);

  // WhatsApp settings save with validation
  const handleWhatsappSave = useCallback(async () => {
    try {
      // Validation
      const requiredFields = ['phoneNumber', 'phoneNumberId', 'businessAccountId', 'accessToken'];
      const missingFields = requiredFields.filter(field => !whatsappSettings[field as keyof WhatsAppSettings]);
      
      if (missingFields.length > 0) {
          toast({
          title: "Validation Error",
          description: `Please fill in: ${missingFields.join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      const data = await makeApiRequest('/api/v1/settings/whatsapp', 'POST', whatsappSettings);
      
        if (data.success) {
          toast({
          title: "Success",
          description: "WhatsApp settings saved successfully. You can now test the connection or sync templates.",
        });
        setConnectionStatus('connected');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save WhatsApp settings.",
        variant: "destructive",
      });
    }
  }, [whatsappSettings, makeApiRequest]);

  // Test WhatsApp API connection
  const testWhatsappApi = useCallback(async () => {
    setWhatsappTestStatus('testing');
    
    // Debug logging
    console.log('🔍 Frontend sending WhatsApp test with:');
    console.log('  Phone Number:', whatsappSettings.phoneNumber);
    console.log('  Phone Number ID:', whatsappSettings.phoneNumberId);
    console.log('  Business Account ID:', whatsappSettings.businessAccountId);
    console.log('  Access Token length:', whatsappSettings.accessToken?.length);
    console.log('  Access Token preview:', whatsappSettings.accessToken?.substring(0, 20) + '...');
    
    try {
      const data = await makeApiRequest('/api/v1/settings/whatsapp/test', 'POST', {
        phoneNumber: whatsappSettings.phoneNumber,
        phoneNumberId: whatsappSettings.phoneNumberId,
        businessAccountId: whatsappSettings.businessAccountId,
        accessToken: whatsappSettings.accessToken
      });

        if (data.success) {
        setWhatsappTestStatus('success');
        setConnectionStatus('connected');
          toast({
          title: "Success",
          description: "WhatsApp API connection test successful.",
          });
      }
    } catch (error: any) {
      setWhatsappTestStatus('error');
      
      // Check if this is an expected WhatsApp API error (invalid credentials)
      if (error.message && error.message.includes('400 Bad Request')) {
        setConnectionStatus('disconnected');
        toast({
          title: "Invalid Credentials",
          description: "The WhatsApp API credentials are invalid. Please check your Phone Number ID and Access Token.",
          variant: "destructive",
        });
      } else {
        setConnectionStatus('error');
        toast({
          title: "Connection Failed",
          description: error.message || "Failed to test WhatsApp API connection.",
          variant: "destructive",
        });
      }
    }
  }, [whatsappSettings, makeApiRequest]);

  // Sync templates from WhatsApp Business Manager
  const syncTemplates = useCallback(async () => {
    setSyncTemplatesStatus('syncing');
    try {
      const data = await makeApiRequest('/api/v1/templates/sync', 'POST', {
        phoneNumberId: whatsappSettings.phoneNumberId,
        businessAccountId: whatsappSettings.businessAccountId,
        accessToken: whatsappSettings.accessToken
      });

      if (data.success) {
        setSyncTemplatesStatus('success');
        toast({
          title: "Success",
          description: `Synced ${data.data?.count || 0} templates successfully.`,
        });
      }
    } catch (error: any) {
      setSyncTemplatesStatus('error');
      
      // Check if this is an expected WhatsApp API error (invalid credentials)
      if (error.message && error.message.includes('400 Bad Request')) {
        toast({
          title: "Invalid Credentials",
          description: "Cannot sync templates with invalid WhatsApp API credentials. Please check your settings first.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sync Failed",
          description: error.message || "Failed to sync templates.",
          variant: "destructive",
        });
      }
    }
  }, [whatsappSettings, makeApiRequest]);

  // Generate webhook URL
  const generateWebhookUrl = useCallback(() => {
    const webhookUrl = `http://localhost:3000/api/v1/webhooks/whatsapp`;
    setWhatsappSettings(prev => ({ ...prev, webhookUrl }));
  }, []);

  // Utility functions for status display
  const getStatusIcon = useCallback((status: TestStatus | SyncStatus) => {
    switch (status) {
      case 'testing':
      case 'syncing':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <TestTube className="w-4 h-4" />;
    }
  }, []);

  const getStatusText = useCallback((status: TestStatus | SyncStatus) => {
    switch (status) {
      case 'testing':
        return 'Testing...';
      case 'syncing':
        return 'Syncing...';
      case 'success':
        return 'Success';
      case 'error':
        return 'Failed';
      default:
        return 'Test Connection';
    }
  }, []);

  const getConnectionStatusBadge = useMemo(() => {
    const variants = {
      connected: 'default',
      error: 'destructive',
      disconnected: 'secondary'
    } as const;

    const icons = {
      connected: <CheckCircle className="w-3 h-3" />,
      error: <XCircle className="w-3 h-3" />,
      disconnected: <XCircle className="w-3 h-3" />
    };

    const labels = {
      connected: 'Connected',
      error: 'Connection Error',
      disconnected: 'Disconnected'
  };

  return (
      <Badge variant={variants[connectionStatus]} className="flex items-center gap-1">
        {icons[connectionStatus]}
        {labels[connectionStatus]}
      </Badge>
    );
  }, [connectionStatus]);

  // Render functions for better organization
  const renderDebugSection = () => (
    <Card className="mb-6 bg-yellow-50 border-yellow-200">
          <CardHeader>
        <CardTitle className="text-yellow-800">Debug Information (Remove in Production)</CardTitle>
        <CardDescription>Organization ID being used for testing</CardDescription>
          </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Label htmlFor="orgId">Organization ID:</Label>
                <Input
            id="orgId"
            value={tempOrgId}
            onChange={(e) => setTempOrgId(e.target.value)}
            className="font-mono text-sm"
            placeholder="Enter organization ID"
                />
              </div>
          </CardContent>
        </Card>
  );

  const renderWhatsAppSection = () => (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              WhatsApp Business API Configuration
            </CardTitle>
            <CardDescription>Configure your WhatsApp Business API credentials and webhook settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={whatsappSettings.phoneNumber}
                  onChange={(e) => setWhatsappSettings(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <Label htmlFor="phoneNumberId">Phone Number ID</Label>
                <Input
                  id="phoneNumberId"
                  value={whatsappSettings.phoneNumberId}
                  onChange={(e) => setWhatsappSettings(prev => ({ ...prev, phoneNumberId: e.target.value }))}
                  placeholder="Enter Phone Number ID"
                />
              </div>
              <div>
                <Label htmlFor="businessAccountId">Business Account ID</Label>
                <Input
                  id="businessAccountId"
                  value={whatsappSettings.businessAccountId}
                  onChange={(e) => setWhatsappSettings(prev => ({ ...prev, businessAccountId: e.target.value }))}
                  placeholder="Enter Business Account ID"
                />
              </div>
              <div>
                <Label htmlFor="accessToken">Access Token</Label>
                <Input
                  id="accessToken"
                  type="password"
                  value={whatsappSettings.accessToken}
                  onChange={(e) => setWhatsappSettings(prev => ({ ...prev, accessToken: e.target.value }))}
                  placeholder="Enter Access Token"
                />
              </div>
              <div>
                <Label htmlFor="webhookVerifyToken">Webhook Verify Token</Label>
                <Input
                  id="webhookVerifyToken"
                  value={whatsappSettings.webhookVerifyToken}
                  onChange={(e) => setWhatsappSettings(prev => ({ ...prev, webhookVerifyToken: e.target.value }))}
                  placeholder="Enter Webhook Verify Token"
                />
              </div>
              <div>
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="webhookUrl"
                    value={whatsappSettings.webhookUrl}
                    onChange={(e) => setWhatsappSettings(prev => ({ ...prev, webhookUrl: e.target.value }))}
                    placeholder="Webhook URL will be generated"
                    readOnly
                  />
                  <Button onClick={generateWebhookUrl} variant="outline">
                    Generate
                  </Button>
                </div>
              </div>
            </div>
            
        <div className="flex gap-3 flex-wrap">
              <Button onClick={handleWhatsappSave} className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
              <Button 
                onClick={testWhatsappApi} 
                variant="outline"
                disabled={whatsappTestStatus === 'testing'}
                className="flex items-center gap-2"
              >
            {getStatusIcon(whatsappTestStatus)}
            {getStatusText(whatsappTestStatus)}
              </Button>
              <Button 
            onClick={syncTemplates} 
                variant="outline"
            disabled={syncTemplatesStatus === 'syncing' || connectionStatus !== 'connected'}
                className="flex items-center gap-2"
              >
            {getStatusIcon(syncTemplatesStatus)}
            {syncTemplatesStatus === 'syncing' ? 'Syncing...' : 
             syncTemplatesStatus === 'success' ? 'Synced' : 
             syncTemplatesStatus === 'error' ? 'Failed' : 'Sync Templates'}
              </Button>
            </div>

        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-gray-600">Status:</span>
          {getConnectionStatusBadge}
                </div>
        
        {/* Help Information */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Getting Started with WhatsApp Business API
          </h4>
          <div className="text-sm text-blue-800 space-y-2">
            <p>To use WhatsApp Business API, you need:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>Phone Number ID:</strong> From your WhatsApp Business Manager</li>
              <li><strong>Business Account ID:</strong> Your Facebook Business Manager ID</li>
              <li><strong>Access Token:</strong> Generated from Facebook Developer Console</li>
              <li><strong>Webhook Verify Token:</strong> Custom token for webhook verification</li>
            </ul>
            <p className="mt-2 text-blue-700">
              <strong>Note:</strong> The "Test Connection" and "Sync Templates" buttons will show errors until you provide valid credentials.
            </p>
              </div>
            </div>
          </CardContent>
        </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <Button onClick={logout} variant="outline" className="text-red-600 hover:text-red-700">
            Logout
            </Button>
              </div>

        {/* Debug Section */}
        {renderDebugSection()}

        {/* WhatsApp Configuration */}
        {renderWhatsAppSection()}

        {/* Add other sections here as needed */}
      </div>
    </div>
  );
}