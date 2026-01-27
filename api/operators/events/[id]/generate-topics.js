/**
 * Generate Topic Insights
 * 
 * POST /api/operators/events/[id]/generate-topics
 * 
 * Generates 4-5 AI-powered topic insights for an event based on attendee profiles.
 * Only SA, CO, or Accountant can generate topics. Requires RSVP to be closed.
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { canManageTopics } from '../../../../lib/operators/permissions.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { email } = req.body;

    if (!id) {
      return res.status(400).json({ ok: false, error: 'Event ID required' });
    }
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }

    // Check permissions - only SA, CO, or Accountant can generate topics
    const canGenerate = await canManageTopics(email);
    if (!canGenerate) {
      return res.status(403).json({ ok: false, error: 'Only Super Admins, Chief Operators, or Accountants can generate topics' });
    }

    // Get event
    const { data: event, error: eventError } = await supabaseAdmin
      .from('operators_events')
      .select('id, title, state, rsvp_closed')
      .eq('id', id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }

    // Check state - must be LIVE
    if (event.state !== 'LIVE') {
      return res.status(400).json({ ok: false, error: `Event must be LIVE to generate topics. Current state: ${event.state}` });
    }

    // Check if RSVP is closed
    if (!event.rsvp_closed) {
      return res.status(400).json({ ok: false, error: 'RSVP must be closed before generating topics' });
    }

    // Check if topics already exist
    const { data: existingTopics } = await supabaseAdmin
      .from('operators_event_topics')
      .select('id')
      .eq('event_id', id)
      .limit(1);

    if (existingTopics && existingTopics.length > 0) {
      return res.status(400).json({ ok: false, error: 'Topics have already been generated for this event' });
    }

    // Get confirmed attendees
    const { data: rsvps } = await supabaseAdmin
      .from('operators_rsvps')
      .select('user_email')
      .eq('event_id', id)
      .eq('status', 'confirmed');

    if (!rsvps || rsvps.length === 0) {
      return res.status(400).json({ ok: false, error: 'No confirmed attendees found. Cannot generate topics without attendees.' });
    }

    // Get attendee profiles
    const attendeeEmails = rsvps.map(r => r.user_email);
    const { data: attendees } = await supabaseAdmin
      .from('operators_users')
      .select('email, role_title, industry, bio')
      .in('email', attendeeEmails);

    // Get active topics from AO Topic Library
    const { data: topicLibrary } = await supabaseAdmin
      .from('operators_topics')
      .select('title, description, category, tags')
      .eq('is_active', true)
      .order('category', { ascending: true });

    // Build room profile
    const roomProfile = {
      eventTitle: event.title,
      attendeeCount: attendees?.length || 0,
      attendees: (attendees || []).map(a => ({
        role: a.role_title || 'Not specified',
        industry: a.industry || 'Not specified',
        bio: a.bio || ''
      }))
    };

    // Check if OpenAI API key is configured
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ ok: false, error: 'OpenAI API key not configured' });
    }

    // Build prompt for OpenAI
    const prompt = buildTopicGenerationPrompt(roomProfile, topicLibrary || []);

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing leadership event rooms and generating relevant discussion topics that benefit multiple attendees. You match attendee profiles to topic libraries and create insightful, actionable topics.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('[GENERATE_TOPICS] OpenAI API error:', errorData);
      return res.status(500).json({ ok: false, error: 'Failed to generate topics from AI service' });
    }

    const aiData = await openaiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      return res.status(500).json({ ok: false, error: 'Invalid response from AI service' });
    }

    // Parse AI response (expecting JSON array of topics)
    let topics;
    try {
      // Try to extract JSON from response (might have markdown code blocks)
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || aiContent.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiContent;
      topics = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[GENERATE_TOPICS] Failed to parse AI response:', parseError);
      return res.status(500).json({ ok: false, error: 'Failed to parse AI response. Please try again.' });
    }

    // Validate topics structure
    if (!Array.isArray(topics) || topics.length < 4 || topics.length > 5) {
      return res.status(500).json({ ok: false, error: `AI generated ${topics.length} topics. Expected 4-5 topics.` });
    }

    // Store topics in database
    const topicsToInsert = topics.map((topic, index) => ({
      event_id: id,
      rank: index + 1,
      topic_title: topic.topic_title || topic.title || `Topic ${index + 1}`,
      topic_summary: topic.topic_summary || topic.summary || '',
      why_this_fits_this_room: topic.why_this_fits_this_room || topic.why_this_fits || '',
      starter_prompts: Array.isArray(topic.starter_prompts) ? topic.starter_prompts : (topic.prompts || [])
    }));

    const { data: insertedTopics, error: insertError } = await supabaseAdmin
      .from('operators_event_topics')
      .insert(topicsToInsert)
      .select();

    if (insertError) {
      console.error('[GENERATE_TOPICS] Database error inserting topics:', insertError);
      return res.status(500).json({ ok: false, error: 'Failed to save topics to database' });
    }

    return res.status(200).json({ ok: true, topics: insertedTopics });
  } catch (error) {
    console.error('[GENERATE_TOPICS] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}

/**
 * Build prompt for OpenAI topic generation
 */
function buildTopicGenerationPrompt(roomProfile, topicLibrary) {
  let prompt = `You are analyzing a leadership event room for "${roomProfile.eventTitle}".

Attendee Profiles (${roomProfile.attendeeCount} confirmed attendees):
`;

  roomProfile.attendees.forEach((attendee, index) => {
    prompt += `\n${index + 1}. Role: ${attendee.role}, Industry: ${attendee.industry}`;
    if (attendee.bio) {
      prompt += `\n   Bio: ${attendee.bio.substring(0, 200)}${attendee.bio.length > 200 ? '...' : ''}`;
    }
  });

  if (topicLibrary.length > 0) {
    prompt += `\n\nAO Topic Library (${topicLibrary.length} active topics):\n`;
    topicLibrary.forEach((topic, index) => {
      prompt += `\n${index + 1}. ${topic.title} (${topic.category})\n   ${topic.description}`;
      if (topic.tags && topic.tags.length > 0) {
        prompt += `\n   Tags: ${topic.tags.join(', ')}`;
      }
    });
  }

  prompt += `\n\nRequirements:
- Generate exactly 4-5 discussion topics (no more, no less)
- Rank topics by group relevance (topics that benefit multiple attendees are ranked higher)
- Do NOT attribute any topic to any individual attendee
- Match topics to AO Topic Library when possible, but feel free to create new relevant topics
- Each topic must include:
  - topic_title: Clear, concise title
  - topic_summary: 1-2 sentences describing the topic
  - why_this_fits_this_room: 1 sentence explaining why this topic is relevant to this specific group
  - starter_prompts: Array of 3-5 questions to start discussion

Return your response as a JSON array of topics, ordered by rank (most relevant first). Example format:
[
  {
    "topic_title": "Building High-Performance Teams",
    "topic_summary": "Strategies for assembling and developing teams that consistently deliver exceptional results.",
    "why_this_fits_this_room": "Multiple attendees lead teams and face challenges in team development and retention.",
    "starter_prompts": [
      "What are the key characteristics of a high-performance team?",
      "How do you identify and develop team members with high potential?",
      "What strategies have you used to maintain team cohesion during rapid growth?"
    ]
  }
]`;

  return prompt;
}
