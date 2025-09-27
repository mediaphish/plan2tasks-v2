// api/ai/suggest-deadlines.js
export const config = { runtime: 'nodejs' };

import { supabaseAdmin } from '../../lib/supabase-admin.js';

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return send(res, 405, { ok: false, error: 'Method not allowed' });
    }

    const { 
      userEmail, 
      plannerEmail, 
      planTitle, 
      planDescription, 
      startDate, 
      timezone, 
      userNotes,
      tasks
    } = req.body;

    // Validation
    if (!userEmail || !plannerEmail || !tasks || !Array.isArray(tasks)) {
      return send(res, 400, { ok: false, error: 'Missing required fields' });
    }

    // Check if OpenAI API key is configured
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return send(res, 500, { ok: false, error: 'OpenAI API key not configured' });
    }

    // Build context for AI
    const context = [];
  
    // Add user notes if available
    if (userNotes && userNotes.trim()) {
      context.push(`User Notes: ${userNotes.trim()}`);
    }
    
    // Add plan context
    context.push(`Plan Title: ${planTitle}`);
    if (planDescription && planDescription.trim()) {
      context.push(`Plan Description: ${planDescription.trim()}`);
    }
    context.push(`Start Date: ${startDate}`);
    context.push(`Timezone: ${timezone || 'America/Chicago'}`);
    
    // Add tasks context
    context.push(`Tasks to optimize: ${JSON.stringify(tasks)}`);

    // Create the AI prompt
    const systemPrompt = `You are an AI assistant that optimizes task deadlines and timing.

Given the context provided, analyze the tasks and suggest optimal deadlines and timing for each task. Consider:
- Task dependencies and logical order
- Realistic time estimates
- User's timezone and schedule
- Task complexity and effort required
- Best practices for task management

Return ONLY a JSON array of optimized tasks in this exact format:
[
  {
    "title": "Task title here",
    "dayOffset": 0,
    "time": "09:00",
    "durationMins": 60,
    "notes": "Optional notes here",
    "suggestedDeadline": "2024-01-15",
    "reasoning": "Why this deadline was suggested"
  }
]

Context: ${context.join('\n')}

Optimize the deadlines and timing for all tasks, providing reasoning for each suggestion.`;

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI API error:', errorData);
      return send(res, 500, { ok: false, error: 'AI deadline optimization failed' });
    }

    const aiData = await openaiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      return send(res, 500, { ok: false, error: 'No AI response received' });
    }

    // Parse AI response
    let optimizedTasks;
    try {
      // Extract JSON from AI response (in case it includes extra text)
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in AI response');
      }
      
      optimizedTasks = JSON.parse(jsonMatch[0]);
      
      // Validate tasks structure
      if (!Array.isArray(optimizedTasks)) {
        throw new Error('AI response is not an array');
      }
      
      // Validate each task
      for (const task of optimizedTasks) {
        if (!task.title || typeof task.title !== 'string') {
          throw new Error('Invalid task: missing or invalid title');
        }
        if (typeof task.dayOffset !== 'number') {
          task.dayOffset = 0;
        }
      }
      
    } catch (parseError) {
      console.error('AI response parsing error:', parseError);
      console.error('AI response content:', aiContent);
      return send(res, 500, { ok: false, error: 'Failed to parse AI response' });
    }

    return send(res, 200, {
      ok: true,
      optimizedTasks: optimizedTasks,
      context: context,
      message: `Optimized deadlines for ${optimizedTasks.length} tasks successfully`
    });

  } catch (e) {
    console.error('AI suggest deadlines error:', e);
    return send(res, 500, { ok: false, error: 'Server error' });
  }
}
