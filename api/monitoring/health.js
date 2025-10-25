// /api/monitoring/health.js
// Production health check endpoint
import { supabaseAdmin } from '../../lib/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {}
  };

  try {
    // Database connectivity check
    const dbStart = Date.now();
    const { error: dbError } = await supabaseAdmin
      .from('planner_subscriptions')
      .select('id')
      .limit(1);
    
    health.checks.database = {
      status: dbError ? 'unhealthy' : 'healthy',
      responseTime: Date.now() - dbStart,
      error: dbError?.message || null
    };

    // Environment variables check
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'STRIPE_SECRET_KEY',
      'RESEND_API_KEY'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    health.checks.environment = {
      status: missingEnvVars.length > 0 ? 'unhealthy' : 'healthy',
      missing: missingEnvVars
    };

    // Overall health status
    const allChecksHealthy = Object.values(health.checks).every(check => check.status === 'healthy');
    health.status = allChecksHealthy ? 'healthy' : 'unhealthy';

    // Response time
    health.responseTime = Date.now() - startTime;

    const statusCode = allChecksHealthy ? 200 : 503;
    return res.status(statusCode).json(health);

  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
    health.responseTime = Date.now() - startTime;
    
    return res.status(503).json(health);
  }
}
