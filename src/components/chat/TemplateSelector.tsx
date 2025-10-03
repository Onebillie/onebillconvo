import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Template } from "@/types"; // make sure Template has metadata?: Record<string, any>
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface TemplateSelectorProps {
  onSelect: (template: Template) => void;
}

export default function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .eq("platform", "whatsapp")
        .eq("is_active", true);

      if (error) {
        console.error("Error fetching templates:", error);
        setTemplates([]);
      } else {
        // ✅ Ensure metadata always exists
        const formatted = (data || []).map((t: any) => ({
          ...t,
          metadata: t.metadata ?? {}, // fallback for missing field
        }));
        setTemplates(formatted);
      }
      setLoading(false);
    };

    fetchTemplates();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="animate-spin h-6 w-6 text-gray-500" />
      </div>
    );
  }

  if (!templates.length) {
    return <p className="text-sm text-gray-500">No WhatsApp templates found.</p>;
  }

  return (
    <div className="space-y-4">
      {templates.map((template) => (
        <Card
          key={template.id}
          className="cursor-pointer hover:bg-gray-50 transition"
          onClick={() => onSelect(template)}
        >
          <CardContent className="p-3">
            <h4 className="font-medium text-gray-900">{template.name}</h4>
            <p className="text-sm text-gray-600">{template.content}</p>
            <div className="mt-2 flex justify-between text-xs text-gray-400">
              <span>Category: {template.category}</span>
              <span>Usage: {template.usage_count}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}