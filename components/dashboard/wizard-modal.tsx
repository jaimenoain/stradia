'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import Editor from '@monaco-editor/react'

export interface TaskConfigInput {
  name: string
  label: string
  type: 'text' | 'textarea' | 'number'
  placeholder?: string
  required?: boolean
  defaultValue?: string
}

export interface TaskConfig {
  inputs?: TaskConfigInput[]
}

interface WizardModalProps {
  isOpen: boolean
  onClose: () => void
  taskConfig: TaskConfig
  taskType: 'B' | 'C'
  onComplete: (data: { inputs: Record<string, any>; generatedCode: string }) => void
}

export function WizardModal({
  isOpen,
  onClose,
  taskConfig,
  taskType,
  onComplete,
}: WizardModalProps) {
  const [step, setStep] = React.useState<1 | 2 | 3>(1)
  const [formData, setFormData] = React.useState<Record<string, any>>({})
  const [generatedCode, setGeneratedCode] = React.useState('')
  const [isGenerating, setIsGenerating] = React.useState(false)

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setStep(1)
      setFormData({})
      setGeneratedCode('')
      setIsGenerating(false)
    }
  }, [isOpen])

  const handleInputChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startGeneration()
  }

  const startGeneration = () => {
    setStep(2)
    setIsGenerating(true)
    // Simulate API call
    setTimeout(() => {
      setIsGenerating(false)
      const mockCode = `// Generated code for ${taskType === 'B' ? 'Generative' : 'Executive'} task
// Inputs: ${JSON.stringify(formData, null, 2)}

/**
 * Validates the input parameters.
 */
function validate() {
  console.log("Validating inputs...");
  return true;
}

/**
 * Executes the main logic.
 */
async function execute() {
  console.log("Executing task logic...");
  // TODO: Implement actual logic here
  return "Success";
}

execute();
`
      setGeneratedCode(mockCode)
      setStep(3)
    }, 2000)
  }

  const handleRegenerate = () => {
    startGeneration()
  }

  const handleApprove = () => {
    onComplete({ inputs: formData, generatedCode })
    onClose()
  }

  // If no inputs are configured, we can skip step 1 or just show a "Generate" button.
  // The current logic shows a form. If empty, it just shows "No configuration needed" and a Generate button.

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && 'Configure Task'}
            {step === 2 && 'Generating Solution'}
            {step === 3 && 'Review & Approve'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Please provide the necessary inputs for this task.'}
            {step === 2 && 'Stradia AI is drafting your solution...'}
            {step === 3 && 'Review the generated code before proceeding.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {step === 1 && (
            <form id="wizard-form" onSubmit={handleInputSubmit} className="space-y-4 px-1">
              {taskConfig.inputs && taskConfig.inputs.length > 0 ? (
                taskConfig.inputs.map((input) => (
                  <div key={input.name} className="grid w-full items-center gap-1.5">
                    <Label htmlFor={input.name}>
                      {input.label}
                      {input.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {input.type === 'textarea' ? (
                      <Textarea
                        id={input.name}
                        placeholder={input.placeholder}
                        required={input.required}
                        value={formData[input.name] || input.defaultValue || ''}
                        onChange={(e) => handleInputChange(input.name, e.target.value)}
                        className="min-h-[100px]"
                      />
                    ) : (
                      <Input
                        id={input.name}
                        type={input.type === 'number' ? 'number' : 'text'}
                        placeholder={input.placeholder}
                        required={input.required}
                        value={formData[input.name] || input.defaultValue || ''}
                        onChange={(e) => handleInputChange(input.name, e.target.value)}
                      />
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                   <p className="text-muted-foreground">No specific configuration is required for this task.</p>
                   <p className="text-sm text-muted-foreground mt-2">Click "Generate" to proceed.</p>
                </div>
              )}
            </form>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center justify-center h-full py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium text-muted-foreground">Stradia AI is drafting...</p>
            </div>
          )}

          {step === 3 && (
            <div className="border rounded-md overflow-hidden h-full min-h-[400px]">
              <Editor
                height="100%"
                defaultLanguage="javascript"
                value={generatedCode}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  padding: { top: 16, bottom: 16 },
                }}
              />
            </div>
          )}
        </div>

        <DialogFooter className="mt-auto pt-2 border-t">
          {step === 1 && (
            <div className="flex w-full justify-end gap-2">
                 <Button variant="outline" onClick={onClose} type="button">
                    Cancel
                 </Button>
                 <Button type="submit" form="wizard-form">
                    Generate
                 </Button>
            </div>
          )}
          {step === 3 && (
            <div className="flex w-full justify-between sm:justify-end gap-2">
              <Button variant="secondary" onClick={handleRegenerate}>
                Regenerate
              </Button>
              <Button onClick={handleApprove}>
                {taskType === 'B' ? 'Approve & Save' : 'Approve & Execute'}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
