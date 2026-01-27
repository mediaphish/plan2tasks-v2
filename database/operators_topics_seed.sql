-- AO Topic Library Seed Data
-- Initial topics in 8 categories for AI topic generation

-- People Category
INSERT INTO operators_topics (title, description, category, tags, is_active) VALUES
('Building High-Performance Teams', 'Strategies for assembling and developing teams that consistently deliver exceptional results.', 'People', ARRAY['team-building', 'performance', 'leadership'], true),
('Retention and Engagement', 'Methods to keep top talent engaged and committed to organizational goals.', 'People', ARRAY['retention', 'engagement', 'culture'], true),
('Conflict Resolution', 'Approaches to navigating and resolving workplace conflicts constructively.', 'People', ARRAY['conflict', 'communication', 'mediation'], true);

-- Culture Category
INSERT INTO operators_topics (title, description, category, tags, is_active) VALUES
('Values Alignment', 'Ensuring organizational values are lived daily, not just posted on walls.', 'Culture', ARRAY['values', 'alignment', 'authenticity'], true),
('Psychological Safety', 'Creating environments where team members feel safe to speak up and take risks.', 'Culture', ARRAY['safety', 'trust', 'innovation'], true),
('Remote and Hybrid Work Culture', 'Maintaining strong culture and connection in distributed teams.', 'Culture', ARRAY['remote', 'hybrid', 'connection'], true);

-- Decisions Category
INSERT INTO operators_topics (title, description, category, tags, is_active) VALUES
('Decision-Making Frameworks', 'Structured approaches to making high-stakes decisions under uncertainty.', 'Decisions', ARRAY['frameworks', 'strategy', 'uncertainty'], true),
('Speed vs. Quality Trade-offs', 'Balancing the need for fast decisions with thorough analysis.', 'Decisions', ARRAY['speed', 'quality', 'balance'], true),
('Consensus vs. Authority', 'When to seek consensus versus making authoritative decisions.', 'Decisions', ARRAY['consensus', 'authority', 'leadership'], true);

-- Ops Category
INSERT INTO operators_topics (title, description, category, tags, is_active) VALUES
('Process Optimization', 'Identifying and eliminating bottlenecks in organizational processes.', 'Ops', ARRAY['process', 'efficiency', 'optimization'], true),
('Resource Allocation', 'Strategies for allocating limited resources across competing priorities.', 'Ops', ARRAY['resources', 'priorities', 'allocation'], true),
('Scaling Operations', 'Maintaining quality and culture while scaling operations rapidly.', 'Ops', ARRAY['scaling', 'growth', 'quality'], true);

-- Clients Category
INSERT INTO operators_topics (title, description, category, tags, is_active) VALUES
('Client Relationship Management', 'Building and maintaining long-term, mutually beneficial client relationships.', 'Clients', ARRAY['relationships', 'retention', 'value'], true),
('Managing Difficult Clients', 'Strategies for handling challenging client situations while preserving relationships.', 'Clients', ARRAY['difficult', 'conflict', 'service'], true),
('Value Delivery and Pricing', 'Communicating and demonstrating value to justify pricing and build trust.', 'Clients', ARRAY['value', 'pricing', 'communication'], true);

-- Growth Category
INSERT INTO operators_topics (title, description, category, tags, is_active) VALUES
('Strategic Planning', 'Developing and executing long-term strategic plans that drive sustainable growth.', 'Growth', ARRAY['strategy', 'planning', 'execution'], true),
('Market Expansion', 'Entering new markets or segments while managing risk and maintaining focus.', 'Growth', ARRAY['expansion', 'markets', 'risk'], true),
('Innovation and Disruption', 'Fostering innovation while protecting core business from disruption.', 'Growth', ARRAY['innovation', 'disruption', 'adaptation'], true);

-- Integrity Category
INSERT INTO operators_topics (title, description, category, tags, is_active) VALUES
('Ethical Decision-Making', 'Navigating ethical dilemmas and maintaining integrity under pressure.', 'Integrity', ARRAY['ethics', 'integrity', 'values'], true),
('Transparency and Communication', 'Balancing transparency with discretion in organizational communication.', 'Integrity', ARRAY['transparency', 'communication', 'trust'], true),
('Accountability Systems', 'Creating systems that hold individuals and teams accountable without blame.', 'Integrity', ARRAY['accountability', 'systems', 'responsibility'], true);

-- Health Category
INSERT INTO operators_topics (title, description, category, tags, is_active) VALUES
('Work-Life Integration', 'Supporting sustainable work practices that honor both professional and personal needs.', 'Health', ARRAY['balance', 'wellbeing', 'sustainability'], true),
('Burnout Prevention', 'Recognizing and preventing burnout at individual and organizational levels.', 'Health', ARRAY['burnout', 'prevention', 'wellness'], true),
('Mental Health in Leadership', 'Addressing mental health challenges in leadership roles and supporting team members.', 'Health', ARRAY['mental-health', 'leadership', 'support'], true);
