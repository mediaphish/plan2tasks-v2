// /api/activity/recent.js
// Get recent user activity for a planner
import { supabaseAdmin } from '../../lib/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plannerEmail } = req.query;

    if (!plannerEmail) {
      return res.status(400).json({ error: 'Missing plannerEmail' });
    }

    // Get recent activity from plan_tasks table
    const { data: activities, error } = await supabaseAdmin
      .from('plan_tasks')
      .select(`
        id,
        task_name,
        status,
        updated_at,
        plans!inner(
          user_email,
          planner_email
        )
      `)
      .eq('plans.planner_email', plannerEmail.toLowerCase())
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch recent activity' });
    }

    // Format the response
    const formattedActivities = activities.map(activity => {
      const timeAgo = getTimeAgo(activity.updated_at);
      const action = activity.status === 'completed' ? 'completed task' : 
                    activity.status === 'in_progress' ? 'started task' : 
                    'updated task';
      
      return {
        id: activity.id,
        user: activity.plans.user_email,
        action: action,
        task: activity.task_name,
        time: timeAgo,
        status: activity.status,
        updated_at: activity.updated_at
      };
    });

    return res.json({ ok: true, activities: formattedActivities });

  } catch (error) {
    console.error('Recent activity error:', error);
    return res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
}

function getTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  return `${diffInWeeks} weeks ago`;
}
