// api/templates/suggest.js
export const config = { runtime: 'nodejs' };

import { supabaseAdmin } from '../../lib/supabase-admin.js';

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return send(res, 405, { ok: false, error: 'Method not allowed' });
    }

    const url = new URL(req.url, `https://${req.headers.host}`);
    const plannerEmail = url.searchParams.get('plannerEmail');
    const planTitle = url.searchParams.get('planTitle') || '';
    const planDescription = url.searchParams.get('planDescription') || '';
    const userNotes = url.searchParams.get('userNotes') || '';
    const limit = Math.min(5, Math.max(1, parseInt(url.searchParams.get('limit') || '3')));

    if (!plannerEmail || !plannerEmail.includes('@')) {
      return send(res, 400, { ok: false, error: 'Invalid plannerEmail' });
    }

    // Get all templates for this planner
    const { data: templates, error } = await supabaseAdmin
      .from('plan_templates')
      .select('id, name, description, tasks, created_at')
      .eq('planner_email', plannerEmail.toLowerCase().trim())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Template suggest error:', error);
      return send(res, 500, { ok: false, error: 'Failed to fetch templates' });
    }

    if (!templates || templates.length === 0) {
      return send(res, 200, { 
        ok: true, 
        suggestions: [],
        message: 'No templates available for suggestions'
      });
    }

    // Simple keyword-based matching for template suggestions
    const suggestions = templates
      .map(template => {
        let score = 0;
        const templateText = `${template.name} ${template.description}`.toLowerCase();
        const searchText = `${planTitle} ${planDescription} ${userNotes}`.toLowerCase();
        
        // Split search text into words
        const searchWords = searchText.split(/\s+/).filter(word => word.length > 2);
        
        // Count matching words
        searchWords.forEach(word => {
          if (templateText.includes(word)) {
            score += 1;
          }
        });
        
        // Boost score for exact title matches
        if (planTitle && template.name.toLowerCase().includes(planTitle.toLowerCase())) {
          score += 3;
        }
        
        // Boost score for description matches
        if (planDescription && template.description.toLowerCase().includes(planDescription.toLowerCase())) {
          score += 2;
        }
        
        return {
          ...template,
          score,
          title: template.name,
          itemsCount: Array.isArray(template.tasks) ? template.tasks.length : 0,
          isTemplate: true
        };
      })
      .filter(template => template.score > 0) // Only include templates with matches
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, limit); // Limit results

    return send(res, 200, { 
      ok: true, 
      suggestions,
      message: `Found ${suggestions.length} relevant template suggestions`
    });

  } catch (e) {
    console.error('Template suggest error:', e);
    return send(res, 500, { ok: false, error: 'Server error' });
  }
}