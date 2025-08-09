import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Template } from "@shared/schema";

interface TemplateVariableDialogProps {
  template: Template | null;
  isOpen: boolean;
  onClose: () => void;
  onSend: (variables: Record<string, string>) => void;
  isSending: boolean;
}

export default function TemplateVariableDialog({ 
  template, 
  isOpen, 
  onClose, 
  onSend, 
  isSending 
}: TemplateVariableDialogProps) {
  const [variables, setVariables] = useState<Record<string, string>>({});

  const templateVariables = template?.variables && Array.isArray(template.variables) 
    ? template.variables as string[] 
    : [];

  const handleVariableChange = (variableName: string, value: string) => {
    setVariables(prev => ({
      ...prev,
      [variableName]: value
    }));
  };

  const handleSend = () => {
    onSend(variables);
    setVariables({}); // Reset variables
  };

  const handleClose = () => {
    setVariables({}); // Reset variables
    onClose();
  };

  if (!template) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]" data-testid="dialog-template-variables">
        <DialogHeader>
          <DialogTitle>Template Variables</DialogTitle>
          <DialogDescription>
            Please fill in the variables for the template "{template.name}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {templateVariables.map((variableName, index) => (
            <div key={index} className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={`var-${index}`} className="text-right">
                {variableName}
              </Label>
              <Input
                id={`var-${index}`}
                value={variables[variableName] || ""}
                onChange={(e) => handleVariableChange(variableName, e.target.value)}
                className="col-span-3"
                placeholder={`Enter ${variableName}...`}
                data-testid={`input-variable-${variableName}`}
              />
            </div>
          ))}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isSending}
            data-testid="button-cancel-template"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSend}
            disabled={isSending}
            data-testid="button-send-template"
          >
            {isSending ? "Sending..." : "Send Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}