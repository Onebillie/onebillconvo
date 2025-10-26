import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AuditLogEntry {
  userId?: string;
  businessId?: string;
  eventCategory: 'auth' | 'api' | 'admin' | 'sso' | 'embed' | 'data';
  eventType: string;
  eventAction: 'create' | 'read' | 'update' | 'delete' | 'access';
  severity: 'info' | 'warning' | 'error' | 'critical';
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  resourceType?: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
  success?: boolean;
  errorMessage?: string;
  requestId?: string;
  sessionId?: string;
}

export async function logAuditEvent(
  supabase: SupabaseClient,
  entry: AuditLogEntry
): Promise<void> {
  try {
    const { error } = await supabase
      .from('security_audit_logs')
      .insert({
        user_id: entry.userId,
        business_id: entry.businessId,
        event_category: entry.eventCategory,
        event_type: entry.eventType,
        event_action: entry.eventAction,
        severity: entry.severity,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
        device_fingerprint: entry.deviceFingerprint,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId,
        old_values: entry.oldValues,
        new_values: entry.newValues,
        metadata: entry.metadata,
        success: entry.success !== false,
        error_message: entry.errorMessage,
        request_id: entry.requestId,
        session_id: entry.sessionId,
      });

    if (error) {
      console.error('Failed to log audit event:', error);
    }
  } catch (err) {
    console.error('Error logging audit event:', err);
  }
}

export function extractRequestInfo(req: Request): {
  ipAddress: string;
  userAgent: string;
  requestId: string;
} {
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                    req.headers.get('x-real-ip') || 
                    'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  return { ipAddress, userAgent, requestId };
}

export async function logApiRequest(
  supabase: SupabaseClient,
  data: {
    businessId: string;
    apiKeyId?: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTimeMs: number;
    ipAddress: string;
    userAgent: string;
    requestHeaders?: any;
    requestBody?: any;
    responseBody?: any;
    errorMessage?: string;
    rateLimitHit?: boolean;
  }
): Promise<void> {
  try {
    // Sanitize sensitive data
    const sanitizedHeaders = data.requestHeaders ? { ...data.requestHeaders } : {};
    delete sanitizedHeaders.authorization;
    delete sanitizedHeaders.apikey;

    const sanitizedRequestBody = data.requestBody ? { ...data.requestBody } : {};
    delete sanitizedRequestBody.password;
    delete sanitizedRequestBody.token;

    const { error } = await supabase
      .from('comprehensive_api_logs')
      .insert({
        business_id: data.businessId,
        api_key_id: data.apiKeyId,
        endpoint: data.endpoint,
        method: data.method,
        status_code: data.statusCode,
        response_time_ms: data.responseTimeMs,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        request_headers: sanitizedHeaders,
        request_body: sanitizedRequestBody,
        response_body: data.responseBody,
        error_message: data.errorMessage,
        rate_limit_hit: data.rateLimitHit || false,
      });

    if (error) {
      console.error('Failed to log API request:', error);
    }
  } catch (err) {
    console.error('Error logging API request:', err);
  }
}

export async function createSecurityAlert(
  supabase: SupabaseClient,
  alert: {
    alertType: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    userId?: string;
    businessId?: string;
    title: string;
    description: string;
    metadata?: any;
  }
): Promise<void> {
  try {
    const { error } = await supabase
      .from('security_alerts')
      .insert({
        alert_type: alert.alertType,
        severity: alert.severity,
        user_id: alert.userId,
        business_id: alert.businessId,
        title: alert.title,
        description: alert.description,
        metadata: alert.metadata,
      });

    if (error) {
      console.error('Failed to create security alert:', error);
    }
  } catch (err) {
    console.error('Error creating security alert:', err);
  }
}
