import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Edit, 
  Copy, 
  Zap,
  MessageCircle,
  Calendar,
  User,
  Mail,
  Phone,
  Settings,
  ArrowRight,
  Clock
} from "lucide-react";

interface AutomationFlow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  status: 'active' | 'inactive' | 'draft';
  lastExecuted?: string;
  executionCount: number;
  createdAt: string;
}

export default function Automation() {
  const [flows, setFlows] = useState<AutomationFlow[]>([
    {
      id: '1',
      name: 'Welcome Message Flow',
      description: 'Automatically sends welcome message to new contacts',
      trigger: 'new_contact',
      status: 'active',
      lastExecuted: '2024-01-15T10:30:00Z',
      executionCount: 45,
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      name: 'Follow-up Sequence',
      description: '3-day follow-up sequence for leads',
      trigger: 'lead_created',
      status: 'active',
      lastExecuted: '2024-01-14T15:45:00Z',
      executionCount: 23,
      createdAt: '2024-01-05T00:00:00Z'
    },
    {
      id: '3',
      name: 'Abandoned Cart Recovery',
      description: 'Recovers abandoned shopping carts',
      trigger: 'cart_abandoned',
      status: 'draft',
      executionCount: 0,
      createdAt: '2024-01-10T00:00:00Z'
    }
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFlow, setNewFlow] = useState({
    name: '',
    description: '',
    trigger: 'new_contact'
  });

  const handleCreateFlow = () => {
    if (newFlow.name && newFlow.description) {
      const flow: AutomationFlow = {
        id: Date.now().toString(),
        name: newFlow.name,
        description: newFlow.description,
        trigger: newFlow.trigger,
        status: 'draft',
        executionCount: 0,
        createdAt: new Date().toISOString()
      };
      setFlows([...flows, flow]);
      setNewFlow({ name: '', description: '', trigger: 'new_contact' });
      setShowCreateForm(false);
    }
  };

  const toggleFlowStatus = (id: string) => {
    setFlows(flows.map(flow => 
      flow.id === id 
        ? { ...flow, status: flow.status === 'active' ? 'inactive' : 'active' }
        : flow
    ));
  };

  const deleteFlow = (id: string) => {
    setFlows(flows.filter(flow => flow.id !== id));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTriggerIcon = (trigger: string) => {
    switch (trigger) {
      case 'new_contact': return <User className="w-4 h-4" />;
      case 'lead_created': return <Mail className="w-4 h-4" />;
      case 'cart_abandoned': return <ShoppingCart className="w-4 h-4" />;
      case 'message_received': return <MessageCircle className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Automation</h1>
            <p className="text-gray-600">Create and manage automated workflows for your business</p>
          </div>
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Flow
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Flows</p>
                  <p className="text-2xl font-bold text-gray-900">{flows.length}</p>
                </div>
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Flows</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {flows.filter(f => f.status === 'active').length}
                  </p>
                </div>
                <Play className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Executions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {flows.reduce((sum, f) => sum + f.executionCount, 0)}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Draft Flows</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {flows.filter(f => f.status === 'draft').length}
                  </p>
                </div>
                <Edit className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Flow Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Automation Flow</CardTitle>
              <CardDescription>Set up a new automated workflow</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="flowName">Flow Name</Label>
                <Input
                  id="flowName"
                  value={newFlow.name}
                  onChange={(e) => setNewFlow({ ...newFlow, name: e.target.value })}
                  placeholder="e.g., Welcome Message Flow"
                />
              </div>
              
              <div>
                <Label htmlFor="flowDescription">Description</Label>
                <Textarea
                  id="flowDescription"
                  value={newFlow.description}
                  onChange={(e) => setNewFlow({ ...newFlow, description: e.target.value })}
                  placeholder="Describe what this automation does..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="flowTrigger">Trigger</Label>
                <select
                  id="flowTrigger"
                  value={newFlow.trigger}
                  onChange={(e) => setNewFlow({ ...newFlow, trigger: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="new_contact">New Contact Added</option>
                  <option value="lead_created">Lead Created</option>
                  <option value="cart_abandoned">Cart Abandoned</option>
                  <option value="message_received">Message Received</option>
                  <option value="order_placed">Order Placed</option>
                  <option value="custom">Custom Event</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreateFlow} disabled={!newFlow.name || !newFlow.description}>
                  Create Flow
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Flows List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Your Automation Flows</h2>
          
          {flows.map((flow) => (
            <Card key={flow.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getTriggerIcon(flow.trigger)}
                      <h3 className="text-lg font-semibold text-gray-900">{flow.name}</h3>
                      <Badge className={getStatusColor(flow.status)}>
                        {flow.status}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 mb-3">{flow.description}</p>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Created {new Date(flow.createdAt).toLocaleDateString()}
                      </div>
                      {flow.lastExecuted && (
                        <div className="flex items-center gap-1">
                          <Play className="w-4 h-4" />
                          Last run {new Date(flow.lastExecuted).toLocaleDateString()}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Zap className="w-4 h-4" />
                        {flow.executionCount} executions
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleFlowStatus(flow.id)}
                    >
                      {flow.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {flow.status === 'active' ? 'Pause' : 'Activate'}
                    </Button>
                    
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                    
                    <Button variant="outline" size="sm">
                      <Copy className="w-4 h-4" />
                      Duplicate
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteFlow(flow.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common automation templates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto p-4 flex-col items-start">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold">Welcome Series</span>
                </div>
                <p className="text-sm text-gray-600 text-left">
                  Automatically welcome new contacts with a series of messages
                </p>
              </Button>
              
              <Button variant="outline" className="h-auto p-4 flex-col items-start">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <span className="font-semibold">Follow-up Reminders</span>
                </div>
                <p className="text-sm text-gray-600 text-left">
                  Send follow-up messages based on time intervals
                </p>
              </Button>
              
              <Button variant="outline" className="h-auto p-4 flex-col items-start">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold">Lead Nurturing</span>
                </div>
                <p className="text-sm text-gray-600 text-left">
                  Nurture leads through automated messaging sequences
                </p>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Missing icon component
const ShoppingCart = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
  </svg>
);
