// api/ai/generate-plan.js
import { supabaseAdmin } from '../../lib/supabase-admin.js';

export const config = { runtime: 'nodejs' };

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
      userPrompt,
      userNotes,
      conversational,
      conversationHistory,
      suggestionsOnly
    } = req.body;

    // Validation
    if (!userEmail || !plannerEmail || !userPrompt) {
      return send(res, 400, { ok: false, error: 'Missing required fields' });
    }

    if (!userPrompt || !userPrompt.trim()) {
      return send(res, 400, { ok: false, error: 'User prompt is required' });
    }

    // Check if OpenAI API key is configured
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return send(res, 500, { ok: false, error: 'OpenAI API key not configured' });
    }

    // Handle different modes
    if (suggestionsOnly) {
      return await handleSuggestionsMode(req, res, openaiApiKey, userEmail, userPrompt, userNotes);
    }
    
    if (conversational) {
      return await handleConversationalMode(req, res, openaiApiKey, userEmail, userPrompt, userNotes, conversationHistory);
    }
    
    // Default: Generate complete plan
    return await handlePlanGenerationMode(req, res, openaiApiKey, userEmail, plannerEmail, planTitle, planDescription, startDate, timezone, userPrompt, userNotes);

  } catch (e) {
    console.error('AI generate plan error:', e);
    return send(res, 500, { ok: false, error: 'Server error' });
  }
}

async function handleSuggestionsMode(req, res, openaiApiKey, userEmail, userPrompt, userNotes) {
  const systemPrompt = `You are an AI assistant that provides smart suggestions for task improvement.

User: ${userEmail}
Current Task: ${userPrompt}
User Notes: ${userNotes || 'No specific notes available'}

Provide 3-5 specific, actionable suggestions to improve this task. Focus on:
- Better task structure
- More specific timing
- Additional context or preparation
- Best practices for this type of task

Return ONLY a JSON array of suggestion strings:
["Suggestion 1", "Suggestion 2", "Suggestion 3"]`;

  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!openaiResponse.ok) {
    return send(res, 500, { ok: false, error: 'AI suggestions failed' });
  }

  const aiData = await openaiResponse.json();
  const aiContent = aiData.choices?.[0]?.message?.content;

  try {
    const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
    const suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    
    return send(res, 200, {
      ok: true,
      suggestions: suggestions,
      message: `Generated ${suggestions.length} suggestions`
    });
  } catch (e) {
    console.error('Suggestions parsing error:', e);
    return send(res, 500, { ok: false, error: 'Failed to parse AI suggestions' });
  }
}

async function handleConversationalMode(req, res, openaiApiKey, userEmail, userPrompt, userNotes, conversationHistory) {
  const systemPrompt = `You are a helpful AI planning assistant having a conversation with a planner.

User being planned for: ${userEmail}
User Notes: ${userNotes || 'No specific notes available'}

You should:
- Be conversational and helpful
- Ask clarifying questions when needed
- Research and provide insights
- Build understanding of what the planner wants
- Eventually offer to generate a complete plan when ready

Previous conversation:
${conversationHistory ? conversationHistory.map(msg => `${msg.type}: ${msg.content}`).join('\n') : 'This is the start of the conversation.'}

Current message: ${userPrompt}

Respond naturally and helpfully. If the planner seems ready for a complete plan, offer to generate one.`;

  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.8,
      max_tokens: 1500
    })
  });

  if (!openaiResponse.ok) {
    return send(res, 500, { ok: false, error: 'AI conversation failed' });
  }

  const aiData = await openaiResponse.json();
  const aiContent = aiData.choices?.[0]?.message?.content;

  return send(res, 200, {
    ok: true,
    response: aiContent,
    message: 'AI response generated'
  });
}

async function handlePlanGenerationMode(req, res, openaiApiKey, userEmail, plannerEmail, planTitle, planDescription, startDate, timezone, userPrompt, userNotes) {
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
  
  // Add user prompt
  context.push(`User Request: ${userPrompt.trim()}`);

  // Create the AI prompt
  const systemPrompt = `You are a helpful AI assistant that creates structured task plans. 
  
Given the context provided, generate a list of tasks for this plan. Each task should have:
- A clear, actionable title
- A day offset (0 for start date, 1 for next day, etc.)
- An optional time (HH:MM format)
- An optional duration in minutes
- Optional notes

Return ONLY a JSON array of tasks in this exact format:
[
  {
    "title": "Task title here",
    "dayOffset": 0,
    "time": "09:00",
    "durationMins": 60,
    "notes": "Optional notes here"
  }
]

Context: ${context.join('\n')}

Generate 3-8 relevant tasks based on the user's request and context.`;

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
    return send(res, 500, { ok: false, error: 'AI generation failed' });
  }

  const aiData = await openaiResponse.json();
  const aiContent = aiData.choices?.[0]?.message?.content;

  if (!aiContent) {
    return send(res, 500, { ok: false, error: 'No AI response received' });
  }

  // Parse AI response
  let tasks;
  try {
    // Extract JSON from AI response (in case it includes extra text)
    const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in AI response');
    }
    
    tasks = JSON.parse(jsonMatch[0]);
    
    // Validate tasks structure
    if (!Array.isArray(tasks)) {
      throw new Error('AI response is not an array');
    }
    
    // Validate each task
    for (const task of tasks) {
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
    tasks: tasks,
    context: context,
    message: `Generated ${tasks.length} tasks successfully`
  });
}
