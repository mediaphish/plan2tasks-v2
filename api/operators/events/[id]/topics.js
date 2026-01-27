/**
 * Get and Update Event Topics
 * 
 * GET /api/operators/events/[id]/topics?email=xxx
 * PUT /api/operators/events/[id]/topics
 * 
 * Get topics for an event (SA/CO/Accountant only)
 * Update topics for an event (SA/CO only, before event opens)
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { canManageTopics } from '../../../../lib/operators/permissions.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  try {
    const { id } = req.query;
    const email = req.method === 'GET' ? req.query.email : req.body.email;

    if (!id) {
      return res.status(400).json({ ok: false, error: 'Event ID required' });
    }
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }

    // Check permissions - only SA, CO, or Accountant can access topics
    const canAccess = await canManageTopics(email);
    if (!canAccess) {
      return res.status(403).json({ ok: false, error: 'Only Super Admins, Chief Operators, or Accountants can access topics' });
    }

    // Get event
    const { data: event, error: eventError } = await supabaseAdmin
      .from('operators_events')
      .select('id, state')
      .eq('id', id)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }

    if (req.method === 'GET') {
      // Get topics
      const { data: topics, error: topicsError } = await supabaseAdmin
        .from('operators_event_topics')
        .select('*')
        .eq('event_id', id)
        .order('rank', { ascending: true });

      if (topicsError) {
        console.error('[GET_TOPICS] Database error:', topicsError);
        return res.status(500).json({ ok: false, error: 'Failed to fetch topics' });
      }

      return res.status(200).json({ ok: true, topics: topics || [] });
    }

    if (req.method === 'PUT') {
      // Update topics
      const { topics } = req.body;

      if (!Array.isArray(topics)) {
        return res.status(400).json({ ok: false, error: 'Topics must be an array' });
      }

      // Check state - must be LIVE
      if (event.state !== 'LIVE') {
        return res.status(400).json({ ok: false, error: `Event must be LIVE to edit topics. Current state: ${event.state}` });
      }

      // Check if topics are locked
      const { data: existingTopics } = await supabaseAdmin
        .from('operators_event_topics')
        .select('is_locked')
        .eq('event_id', id)
        .limit(1);

      if (existingTopics && existingTopics.length > 0 && existingTopics[0].is_locked) {
        return res.status(400).json({ ok: false, error: 'Topics are locked and cannot be edited' });
      }

      // Validate topics structure
      if (topics.length < 4 || topics.length > 5) {
        return res.status(400).json({ ok: false, error: 'Must have exactly 4-5 topics' });
      }

      // Validate each topic
      for (const topic of topics) {
        if (!topic.id || !topic.topic_title || !topic.topic_summary || !topic.why_this_fits_this_room) {
          return res.status(400).json({ ok: false, error: 'Each topic must have id, topic_title, topic_summary, and why_this_fits_this_room' });
        }
        if (!Array.isArray(topic.starter_prompts) || topic.starter_prompts.length < 3) {
          return res.status(400).json({ ok: false, error: 'Each topic must have at least 3 starter_prompts' });
        }
      }

      // Update topics (delete all and reinsert with new ranks)
      // First, delete existing topics
      const { error: deleteError } = await supabaseAdmin
        .from('operators_event_topics')
        .delete()
        .eq('event_id', id);

      if (deleteError) {
        console.error('[UPDATE_TOPICS] Database error deleting topics:', deleteError);
        return res.status(500).json({ ok: false, error: 'Failed to update topics' });
      }

      // Insert updated topics with new ranks
      const topicsToInsert = topics.map((topic, index) => ({
        event_id: id,
        rank: index + 1,
        topic_title: topic.topic_title,
        topic_summary: topic.topic_summary,
        why_this_fits_this_room: topic.why_this_fits_this_room,
        starter_prompts: topic.starter_prompts,
        generated_by: 'AI',
        is_locked: false
      }));

      const { data: insertedTopics, error: insertError } = await supabaseAdmin
        .from('operators_event_topics')
        .insert(topicsToInsert)
        .select();

      if (insertError) {
        console.error('[UPDATE_TOPICS] Database error inserting topics:', insertError);
        return res.status(500).json({ ok: false, error: 'Failed to save topics' });
      }

      return res.status(200).json({ ok: true, topics: insertedTopics });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('[TOPICS] Error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
