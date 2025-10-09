import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  TestTube,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Send,
  Database,
  Bug,
  FileWarning
} from "lucide-react";

interface ApiUsage {
  service_name: string;
  usage_count: number;
  usage_limit: number;
  usage_percent: string;
  status: string;
  remaining: number;
  details: any;
}

interface TestResult {
  test_name: string;
  test_category: string;
  status: string;
  details: any;
  error_message?: string;
  duration_ms: number;
  created_at: string;
}

export default function SystemTesting() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [apiUsage, setApiUsage] = useState<ApiUsage[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [emailStatus, setEmailStatus] = useState<string>("unknown");

  useEffect(() => {
    loadApiUsage();
    loadTestResults();
  }, []);

  const loadApiUsage = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-api-limits");
      if (error) throw error;
      setApiUsage(data.usage || []);
    } catch (error: any) {
      console.error("Failed to load API usage:", error);
    }
  };

  const loadTestResults = async () => {
    try {
      const { data, error } = await supabase
        .from("system_test_results")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setTestResults(data || []);
    } catch (error: any) {
      console.error("Failed to load test results:", error);
    }
  };

  const handleTestEmail = async (testType: string) => {
    const key = `email-${testType}`;
    setLoading({ ...loading, [key]: true });
    
    try {
      const { data, error } = await supabase.functions.invoke("test-email-send", {
        body: { testType, toEmail: "hello@alacartesaas.com" }
      });

      if (error) throw error;

      toast({
        title: "✅ Email Sent",
        description: `Test email (${testType}) sent to hello@alacartesaas.com`,
      });
      setEmailStatus("working");
    } catch (error: any) {
      toast({
        title: "❌ Email Failed",
        description: error.message,
        variant: "destructive",
      });
      setEmailStatus("error");
    } finally {
      setLoading({ ...loading, [key]: false });
    }
  };

  const handleRunTests = async () => {
    setLoading({ ...loading, "tests": true });
    
    try {
      const { data, error } = await supabase.functions.invoke("run-system-tests");
      
      if (error) throw error;

      toast({
        title: "✅ Tests Complete",
        description: `${data.summary.passed} passed, ${data.summary.failed} failed, ${data.summary.warnings} warnings`,
      });
      
      await loadTestResults();
    } catch (error: any) {
      toast({
        title: "❌ Tests Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading({ ...loading, "tests": false });
    }
  };

  const handleSendUsageAlert = async () => {
    setLoading({ ...loading, "alert": true });
    
    try {
      const { data, error } = await supabase.functions.invoke("send-usage-alert");
      
      if (error) throw error;

      toast({
        title: "✅ Alert Sent",
        description: `Usage alert sent (${data.alertsSent} services checked)`,
      });
    } catch (error: any) {
      toast({
        title: "❌ Alert Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading({ ...loading, "alert": false });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy": return "text-green-600";
      case "caution": return "text-yellow-600";
      case "warning": return "text-orange-600";
      case "critical": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pass": return <Badge className="bg-green-600">Pass</Badge>;
      case "fail": return <Badge variant="destructive">Fail</Badge>;
      case "warning": return <Badge className="bg-yellow-600">Warning</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Testing Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Run tests, monitor API usage, and verify system health
        </p>
      </div>

      {/* API Usage Monitoring */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                API Usage Monitoring
              </CardTitle>
              <CardDescription>Real-time usage tracking for external APIs</CardDescription>
            </div>
            <Button onClick={loadApiUsage} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {apiUsage.map((service) => (
            <div key={service.service_name} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium capitalize">
                  {service.service_name.replace('_', ' ')}
                </span>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(service.status)}>
                    {service.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {service.usage_count.toLocaleString()} / {service.usage_limit.toLocaleString()}
                  </span>
                </div>
              </div>
              <Progress value={parseFloat(service.usage_percent)} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{service.usage_percent}% used</span>
                <span>{service.remaining.toLocaleString()} remaining</span>
              </div>
            </div>
          ))}

          <Button 
            onClick={handleSendUsageAlert}
            disabled={loading.alert}
            variant="outline"
            className="w-full mt-4"
          >
            {loading.alert ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Usage Report Email
          </Button>
        </CardContent>
      </Card>

      {/* Email System Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email System Tests
          </CardTitle>
          <CardDescription>Test email delivery and templates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {emailStatus === "working" && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Email system is working correctly
                </AlertDescription>
              </Alert>
            )}
            {emailStatus === "error" && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  Email delivery failed - check DNS verification
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handleTestEmail("basic")}
                disabled={loading["email-basic"]}
                variant="outline"
              >
                {loading["email-basic"] ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Basic Test
              </Button>

              <Button
                onClick={() => handleTestEmail("payment_success")}
                disabled={loading["email-payment_success"]}
                variant="outline"
              >
                {loading["email-payment_success"] ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Payment Success
              </Button>

              <Button
                onClick={() => handleTestEmail("payment_failed")}
                disabled={loading["email-payment_failed"]}
                variant="outline"
              >
                {loading["email-payment_failed"] ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Payment Failed
              </Button>

              <Button
                onClick={() => handleTestEmail("usage_alert")}
                disabled={loading["email-usage_alert"]}
                variant="outline"
              >
                {loading["email-usage_alert"] ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4 mr-2" />
                )}
                Usage Alert
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automated System Tests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Automated System Tests
              </CardTitle>
              <CardDescription>Run comprehensive system health checks</CardDescription>
            </div>
            <Button 
              onClick={handleRunTests}
              disabled={loading.tests}
            >
              {loading.tests ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4 mr-2" />
              )}
              Run All Tests
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {testResults.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No test results yet. Click "Run All Tests" to start.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {testResults.map((result) => (
                <div 
                  key={result.test_name + result.created_at} 
                  className="flex items-start justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {result.status === 'pass' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      {result.status === 'fail' && <XCircle className="h-4 w-4 text-red-600" />}
                      {result.status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                      <span className="font-medium">{result.test_name}</span>
                    </div>
                    {result.error_message && (
                      <p className="text-sm text-muted-foreground">{result.error_message}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {result.test_category} • {result.duration_ms}ms • {new Date(result.created_at).toLocaleString()}
                    </p>
                  </div>
                  {getStatusBadge(result.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>Common testing and debugging tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <Button variant="outline" onClick={loadApiUsage}>
              <Database className="h-4 w-4 mr-2" />
              Check Database
            </Button>
            <Button variant="outline" onClick={loadTestResults}>
              <FileWarning className="h-4 w-4 mr-2" />
              View Logs
            </Button>
            <Button variant="outline" onClick={() => window.location.href = "/admin/system"}>
              <Shield className="h-4 w-4 mr-2" />
              System Health
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
