import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, User, Mail, Phone, Calendar, DollarSign, Building } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface RichContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  channel?: 'email' | 'sms' | 'whatsapp';
  showSubject?: boolean;
  subject?: string;
  onSubjectChange?: (value: string) => void;
}

const MERGE_TAGS = [
  { tag: '{{first_name}}', label: 'First Name', icon: User },
  { tag: '{{last_name}}', label: 'Last Name', icon: User },
  { tag: '{{full_name}}', label: 'Full Name', icon: User },
  { tag: '{{email}}', label: 'Email', icon: Mail },
  { tag: '{{phone}}', label: 'Phone', icon: Phone },
  { tag: '{{company}}', label: 'Company', icon: Building },
  { tag: '{{plan_name}}', label: 'Plan Name', icon: DollarSign },
  { tag: '{{invoice_total}}', label: 'Invoice Total', icon: DollarSign },
  { tag: '{{due_date}}', label: 'Due Date', icon: Calendar },
  { tag: '{{renewal_date}}', label: 'Renewal Date', icon: Calendar },
];

export function RichContentEditor({
  value,
  onChange,
  label = "Content",
  placeholder = "Write your message...",
  channel = 'email',
  showSubject = false,
  subject = '',
  onSubjectChange
}: RichContentEditorProps) {
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const insertMergeTag = (tag: string) => {
    const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + tag + value.substring(end);
      onChange(newValue);
      
      // Set cursor after inserted tag
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 0);
    } else {
      onChange(value + tag);
    }
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsGenerating(true);
    // TODO: Connect to Lovable AI
    setTimeout(() => {
      const generated = `Generated content based on: "${aiPrompt}"\n\nHi {{first_name}},\n\nThis is your personalized message...\n\nBest regards,\nThe Team`;
      onChange(generated);
      setIsGenerating(false);
      setAiPrompt('');
    }, 1500);
  };

  const charCount = value.length;
  const maxChars = channel === 'sms' ? 160 : channel === 'whatsapp' ? 4096 : null;

  return (
    <div className="space-y-4">
      {showSubject && (
        <div className="space-y-2">
          <Label htmlFor="subject">Subject Line</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => onSubjectChange?.(e.target.value)}
            placeholder="Enter subject line..."
          />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="content-editor">{label}</Label>
          {maxChars && (
            <span className={`text-sm ${charCount > maxChars ? 'text-destructive' : 'text-muted-foreground'}`}>
              {charCount} / {maxChars}
            </span>
          )}
        </div>

        {/* AI Content Generator */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Content Generator
            </CardTitle>
            <CardDescription className="text-xs">
              Describe what you want and AI will generate professional content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="E.g., 'Write a promotional email about our new summer sale'"
              onKeyDown={(e) => e.key === 'Enter' && generateWithAI()}
            />
            <Button 
              onClick={generateWithAI}
              disabled={!aiPrompt.trim() || isGenerating}
              className="w-full"
              size="sm"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate with AI'}
            </Button>
          </CardContent>
        </Card>

        {/* Merge Tags */}
        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground font-medium mr-2">Quick Insert:</span>
          {MERGE_TAGS.slice(0, 6).map(({ tag, label, icon: Icon }) => (
            <Popover key={tag}>
              <PopoverTrigger asChild>
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {label}
                </Badge>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => insertMergeTag(tag)}
                  className="w-full justify-start"
                >
                  Insert: <code className="ml-2 text-xs">{tag}</code>
                </Button>
              </PopoverContent>
            </Popover>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <Badge variant="secondary" className="cursor-pointer">
                + More
              </Badge>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="grid gap-1">
                {MERGE_TAGS.slice(6).map(({ tag, label, icon: Icon }) => (
                  <Button
                    key={tag}
                    variant="ghost"
                    size="sm"
                    onClick={() => insertMergeTag(tag)}
                    className="justify-start"
                  >
                    <Icon className="w-3 h-3 mr-2" />
                    {label}
                    <code className="ml-auto text-xs text-muted-foreground">{tag}</code>
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Content Editor */}
        <Textarea
          id="content-editor"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[300px] font-mono text-sm"
        />

        {/* Preview Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Preview</CardTitle>
            <CardDescription className="text-xs">
              How merge tags will appear to recipients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm whitespace-pre-wrap p-4 bg-muted/50 rounded-lg">
              {value
                .replace(/\{\{first_name\}\}/g, 'John')
                .replace(/\{\{last_name\}\}/g, 'Doe')
                .replace(/\{\{full_name\}\}/g, 'John Doe')
                .replace(/\{\{email\}\}/g, 'john@example.com')
                .replace(/\{\{phone\}\}/g, '+1 234 567 8900')
                .replace(/\{\{company\}\}/g, 'Acme Corp')
                .replace(/\{\{plan_name\}\}/g, 'Premium Plan')
                .replace(/\{\{invoice_total\}\}/g, '$299.00')
                .replace(/\{\{due_date\}\}/g, 'Dec 31, 2025')
                .replace(/\{\{renewal_date\}\}/g, 'Jan 15, 2026')
                || <span className="text-muted-foreground">Your preview will appear here...</span>
              }
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
