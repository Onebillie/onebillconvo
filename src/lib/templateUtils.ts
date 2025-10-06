import { Customer } from "@/types/chat";

/**
 * Replaces template variables with contact data
 * Supports: {{contact.name}}, {{contact.phone}}, {{contact.email}}, {{contact.whatsapp_phone}}, {{contact.whatsapp_name}}, {{contact.address}}
 */
export function populateTemplateWithContactData(
  template: string,
  contact: Customer
): string {
  let result = template;
  
  // Replace {{name}} with first name (most common use case)
  const firstName = contact.first_name || contact.name?.split(' ')[0] || contact.name || '';
  result = result.replace(/\{\{name\}\}/gi, firstName);
  result = result.replace(/\{\{1\}\}/g, firstName); // WhatsApp variable format
  
  // Replace contact.name
  result = result.replace(/\{\{contact\.name\}\}/gi, contact.name || '');
  
  // Replace contact.first_name
  result = result.replace(/\{\{contact\.first_name\}\}/gi, firstName);
  
  // Replace contact.last_name
  const lastName = contact.last_name || contact.name?.split(' ').slice(1).join(' ') || '';
  result = result.replace(/\{\{contact\.last_name\}\}/gi, lastName);
  
  // Replace contact.phone
  result = result.replace(/\{\{contact\.phone\}\}/gi, contact.phone || '');
  
  // Replace contact.whatsapp_phone
  result = result.replace(/\{\{contact\.whatsapp_phone\}\}/gi, contact.whatsapp_phone || contact.phone || '');
  
  // Replace contact.whatsapp_name
  result = result.replace(/\{\{contact\.whatsapp_name\}\}/gi, contact.whatsapp_name || '');
  
  // Replace contact.email
  result = result.replace(/\{\{contact\.email\}\}/gi, contact.email || '');
  
  // Replace contact.address
  result = result.replace(/\{\{contact\.address\}\}/gi, contact.address || '');
  
  return result;
}

/**
 * Extracts all template variables from a string
 * Returns array of variable names like ['contact.name', 'contact.email']
 */
export function extractTemplateVariables(template: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = [];
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    matches.push(match[1].trim());
  }
  
  return matches;
}

/**
 * Checks if a template has any contact variables
 */
export function hasContactVariables(template: string): boolean {
  return /\{\{contact\.[^}]+\}\}/i.test(template);
}
