-- SURAKSHA AI — Assistant Conversations & Legal Study Database Schema
-- Idempotent PostgreSQL schema for conversational history, verified case studies, and study tracking.
-- Preserves existing spatial_evidence and PostGIS configuration untouched.

-- 1. ASSISTANT CONVERSATIONS
CREATE TABLE IF NOT EXISTS assistant_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    title TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'casual', 'website', 'legal', 'safety')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assistant_conv_user ON assistant_conversations (user_id, archived_at, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_assistant_conv_lookup ON assistant_conversations (id, user_id);

-- 2. ASSISTANT MESSAGES
CREATE TABLE IF NOT EXISTS assistant_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES assistant_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    category VARCHAR(50),
    model VARCHAR(100),
    provider VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    token_usage JSONB DEFAULT '{}'::jsonb,
    idempotency_key VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assistant_msg_conv ON assistant_messages (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_assistant_msg_idemp ON assistant_messages (idempotency_key);

-- 3. LEGAL CASE STUDIES (Verified court judgments and precedent records)
CREATE TABLE IF NOT EXISTS legal_case_studies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    court VARCHAR(150) NOT NULL,
    case_number VARCHAR(100),
    judgment_date DATE,
    jurisdiction VARCHAR(100) NOT NULL DEFAULT 'India',
    legal_topics JSONB DEFAULT '[]'::jsonb,
    act_name TEXT NOT NULL,
    act_identifier VARCHAR(50) NOT NULL,
    section_number VARCHAR(50) NOT NULL,
    section_heading TEXT,
    facts_summary TEXT NOT NULL,
    legal_issues TEXT NOT NULL,
    applicable_provisions JSONB DEFAULT '[]'::jsonb,
    reasoning_summary TEXT NOT NULL,
    outcome_summary TEXT NOT NULL,
    educational_takeaways TEXT NOT NULL,
    source_urls JSONB DEFAULT '[]'::jsonb,
    source_titles JSONB DEFAULT '[]'::jsonb,
    verification_status VARCHAR(30) NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('unverified', 'verified', 'needs_review')),
    verified_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_case_title_court UNIQUE (title, court)
);

CREATE INDEX IF NOT EXISTS idx_legal_case_act_sec ON legal_case_studies (act_identifier, section_number);
CREATE INDEX IF NOT EXISTS idx_legal_case_court_date ON legal_case_studies (court, judgment_date);
CREATE INDEX IF NOT EXISTS idx_legal_case_status ON legal_case_studies (verification_status, is_active);

-- 4. USER LEGAL STUDY PROGRESS
CREATE TABLE IF NOT EXISTS user_legal_study_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    act_identifier VARCHAR(50) NOT NULL,
    section_number VARCHAR(50) NOT NULL,
    last_topic VARCHAR(100),
    step_index INT DEFAULT 0,
    total_steps INT DEFAULT 5,
    completed BOOLEAN DEFAULT false,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_act_sec UNIQUE (user_id, act_identifier, section_number)
);

CREATE INDEX IF NOT EXISTS idx_user_study_progress ON user_legal_study_progress (user_id, last_activity_at DESC);

-- 5. USER LEGAL QUIZ ATTEMPTS
CREATE TABLE IF NOT EXISTS user_legal_quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    act_identifier VARCHAR(50) NOT NULL,
    section_number VARCHAR(50) NOT NULL,
    question_text TEXT NOT NULL,
    selected_option VARCHAR(10),
    correct_option VARCHAR(10) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    explanation TEXT,
    score INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts ON user_legal_quiz_attempts (user_id, act_identifier, section_number, created_at DESC);

-- 6. USER LEGAL BOOKMARKS
CREATE TABLE IF NOT EXISTS user_legal_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    case_id UUID REFERENCES legal_case_studies(id) ON DELETE CASCADE,
    act_identifier VARCHAR(50),
    section_number VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_case_bookmark UNIQUE (user_id, case_id)
);

CREATE INDEX IF NOT EXISTS idx_user_bookmarks ON user_legal_bookmarks (user_id, created_at DESC);

