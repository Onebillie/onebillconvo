import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// Standardized error codes
export const ERROR_CODES = {
  // Authentication Errors
  IMAP_AUTH_FAILED: "IMAP_AUTH_FAILED",
  SMTP_AUTH_FAILED: "SMTP_AUTH_FAILED",
  APP_PASSWORD_REQUIRED: "APP_PASSWORD_REQUIRED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  
  // Connection Errors
  DNS_RESOLUTION_FAILED: "DNS_RESOLUTION_FAILED",
  TCP_CONNECTION_FAILED: "TCP_CONNECTION_FAILED",
  TLS_HANDSHAKE_FAILED: "TLS_HANDSHAKE_FAILED",
  CONNECTION_TIMEOUT: "CONNECTION_TIMEOUT",
  
  // Configuration Errors
  INVALID_HOSTNAME: "INVALID_HOSTNAME",
  INVALID_PORT: "INVALID_PORT",
  MISSING_CREDENTIALS: "MISSING_CREDENTIALS",
  CONFIG_INCOMPLETE: "CONFIG_INCOMPLETE",
  
  // Sync Errors
  MAILBOX_NOT_FOUND: "MAILBOX_NOT_FOUND",
  UID_VALIDITY_CHANGED: "UID_VALIDITY_CHANGED",
  DUPLICATE_MESSAGE: "DUPLICATE_MESSAGE",
  FETCH_FAILED: "FETCH_FAILED",
  
  // Send Errors
  NO_ACTIVE_ACCOUNT: "NO_ACTIVE_ACCOUNT",
  TEMPLATE_MISSING: "TEMPLATE_MISSING",
  CUSTOMER_NOT_FOUND: "CUSTOMER_NOT_FOUND",
  SMTP_SEND_FAILED: "SMTP_SEND_FAILED",
} as const;

export const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.IMAP_AUTH_FAILED]: "Authentication failed. Please verify your username and password. Some mail providers require an 'app password' instead of your regular password.",
  [ERROR_CODES.SMTP_AUTH_FAILED]: "SMTP authentication failed. Please check your SMTP credentials.",
  [ERROR_CODES.APP_PASSWORD_REQUIRED]: "This provider requires an app-specific password. Please generate one in your email provider's settings.",
  [ERROR_CODES.DNS_RESOLUTION_FAILED]: "Cannot resolve hostname. Please check the server address.",
  [ERROR_CODES.TCP_CONNECTION_FAILED]: "Cannot connect to server. Please check the hostname and port.",
  [ERROR_CODES.TLS_HANDSHAKE_FAILED]: "SSL/TLS connection failed. Please verify the port and SSL settings.",
  [ERROR_CODES.CONNECTION_TIMEOUT]: "Server did not respond in time. Please check your network connection.",
  [ERROR_CODES.INVALID_HOSTNAME]: "Invalid or empty hostname provided.",
  [ERROR_CODES.INVALID_PORT]: "Port number is out of valid range (1-65535).",
  [ERROR_CODES.MISSING_CREDENTIALS]: "Username or password is missing.",
  [ERROR_CODES.MAILBOX_NOT_FOUND]: "INBOX folder not found on server.",
  [ERROR_CODES.UID_VALIDITY_CHANGED]: "Mailbox structure changed. Full resync required.",
};

interface LogOptions {
  accountId: string;
  operationType: string;
  stepNumber: number;
  stepName: string;
  status: 'started' | 'in_progress' | 'success' | 'warning' | 'error';
  details?: any;
  errorCode?: string;
  errorMessage?: string;
  durationMs?: number;
}

export async function logEmailOperation(
  supabase: SupabaseClient,
  options: LogOptions
) {
  const {
    accountId,
    operationType,
    stepNumber,
    stepName,
    status,
    details = {},
    errorCode,
    errorMessage,
    durationMs,
  } = options;

  // Create structured log entry
  const logEntry = {
    email_account_id: accountId,
    operation_type: operationType,
    step_number: stepNumber,
    step_name: stepName,
    status,
    details,
    error_code: errorCode,
    error_message: errorMessage || (errorCode ? ERROR_MESSAGES[errorCode] : undefined),
    duration_ms: durationMs,
  };

  // Insert into database
  const { error } = await supabase
    .from('email_operation_logs')
    .insert(logEntry);

  if (error) {
    console.error('Failed to log email operation:', error);
  }

  // Also log to console with structured format
  const consoleLog = {
    timestamp: new Date().toISOString(),
    account_id: accountId,
    operation: operationType,
    step: `${stepNumber}: ${stepName}`,
    status,
    ...(errorCode && { error_code: errorCode }),
    ...(errorMessage && { error_message: errorMessage }),
    ...details,
  };

  if (status === 'error') {
    console.error(JSON.stringify(consoleLog, null, 2));
  } else if (status === 'warning') {
    console.warn(JSON.stringify(consoleLog, null, 2));
  } else {
    console.log(JSON.stringify(consoleLog, null, 2));
  }

  return logEntry;
}

// Helper to create a logger instance for a specific operation
export class OperationLogger {
  private supabase: SupabaseClient;
  private accountId: string;
  private operationType: string;
  private startTime: number;
  private currentStep: number = 0;

  constructor(supabaseUrl: string, supabaseKey: string, accountId: string, operationType: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.accountId = accountId;
    this.operationType = operationType;
    this.startTime = Date.now();
  }

  async logStep(
    stepName: string,
    status: 'started' | 'in_progress' | 'success' | 'warning' | 'error',
    details?: any,
    errorCode?: string,
    errorMessage?: string
  ) {
    this.currentStep++;
    const durationMs = Date.now() - this.startTime;

    return await logEmailOperation(this.supabase, {
      accountId: this.accountId,
      operationType: this.operationType,
      stepNumber: this.currentStep,
      stepName,
      status,
      details,
      errorCode,
      errorMessage,
      durationMs,
    });
  }

  async logSuccess(stepName: string, details?: any) {
    return await this.logStep(stepName, 'success', details);
  }

  async logError(stepName: string, errorCode: string, errorMessage?: string, details?: any) {
    return await this.logStep(stepName, 'error', details, errorCode, errorMessage);
  }

  async logWarning(stepName: string, details?: any) {
    return await this.logStep(stepName, 'warning', details);
  }

  getDurationMs(): number {
    return Date.now() - this.startTime;
  }
}
