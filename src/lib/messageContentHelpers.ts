import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  content?: string;
  template_content?: string;
  template_name?: string;
  template_variables?: any;
  metadata?: any;
}

interface TemplateCache {
  [key: string]: string;
}

const templateCache: TemplateCache = {};

/**
 * Gets the displayed content for a message with intelligent fallback
 * Priority:
 * 1. content (if not a placeholder)
 * 2. template_content (if exists)
 * 3. Reconstruct from template_name + template_variables
 * 4. '[No content]' fallback
 */
export async function getDisplayedContent(message: Message): Promise<string> {
  // Check if content exists and is not a placeholder
  if (message.content && !message.content.startsWith('Template:')) {
    return message.content;
  }

  // Check if template_content exists and is not a placeholder
  if (message.template_content && !message.template_content.startsWith('Template:')) {
    return message.template_content;
  }

  // Try to reconstruct from template
  if (message.template_name) {
    try {
      const reconstructed = await reconstructTemplateContent(message);
      if (reconstructed) {
        // Fire-and-forget: repair the message row in background
        repairMessageContent(message.id, reconstructed).catch(console.error);
        return reconstructed;
      }
    } catch (error) {
      console.error('Error reconstructing template content:', error);
    }
  }

  // Final fallback
  return '[No content]';
}

/**
 * Reconstructs template content from message_templates table and applies variables
 */
async function reconstructTemplateContent(message: Message): Promise<string | null> {
  if (!message.template_name) return null;

  // Check cache first
  const cacheKey = message.template_name;
  let templateContent = templateCache[cacheKey];

  // Fetch from database if not cached
  if (!templateContent) {
    const { data: template, error } = await supabase
      .from('message_templates')
      .select('content')
      .eq('name', message.template_name)
      .maybeSingle();

    if (error || !template?.content) {
      console.warn(`Template ${message.template_name} not found`);
      return null;
    }

    templateContent = template.content;
    templateCache[cacheKey] = templateContent;
  }

  // Apply variables
  if (message.template_variables) {
    return applyTemplateVariables(templateContent, message.template_variables);
  }

  return templateContent;
}

/**
 * Applies variables to template content
 * Supports both array format ["a", "b"] and object format {1: "a", 2: "b"}
 */
function applyTemplateVariables(template: string, variables: any): string {
  let result = template;

  if (Array.isArray(variables)) {
    // Array format: ["value1", "value2"]
    variables.forEach((value, index) => {
      const placeholder = `{{${index + 1}}}`;
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });
  } else if (variables.variables && Array.isArray(variables.variables)) {
    // Nested array format: {variables: ["value1", "value2"]}
    variables.variables.forEach((value: string, index: number) => {
      const placeholder = `{{${index + 1}}}`;
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });
  } else if (typeof variables === 'object') {
    // Object format: {1: "value1", 2: "value2"}
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
    });
  }

  return result;
}

/**
 * Repairs message content in the database (fire-and-forget)
 */
async function repairMessageContent(messageId: string, repairedContent: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('messages')
      .update({
        content: repairedContent,
        template_content: repairedContent,
        metadata: { content_repaired: true }
      })
      .eq('id', messageId);

    if (error) {
      console.error('Error repairing message content:', error);
    } else {
      console.log(`Repaired content for message ${messageId}`);
    }
  } catch (error) {
    console.error('Error in repairMessageContent:', error);
  }
}

/**
 * Synchronous version for immediate display (without database fetch)
 * Use this when you already have the template content
 */
export function getDisplayedContentSync(message: Message): string {
  // Check if content exists and is not a placeholder
  if (message.content && !message.content.startsWith('Template:')) {
    return message.content;
  }

  // Check if template_content exists and is not a placeholder
  if (message.template_content && !message.template_content.startsWith('Template:')) {
    return message.template_content;
  }

  // Return placeholder - async reconstruction will happen separately
  return message.content || message.template_content || '[No content]';
}
