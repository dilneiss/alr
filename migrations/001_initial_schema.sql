-- ALR initial schema

CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    memory_type TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence REAL NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    version INTEGER NOT NULL,
    description TEXT NOT NULL,
    conditions TEXT NOT NULL,
    action TEXT NOT NULL,
    confidence REAL NOT NULL,
    success_rate REAL NOT NULL,
    executions INTEGER NOT NULL,
    failures INTEGER NOT NULL,
    origin TEXT NOT NULL,
    status TEXT NOT NULL,
    priority INTEGER NOT NULL,
    risk REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS episodes (
    id TEXT PRIMARY KEY,
    seed INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    score INTEGER NOT NULL,
    steps INTEGER NOT NULL,
    food_eaten INTEGER NOT NULL,
    collision INTEGER NOT NULL,
    llm_calls INTEGER NOT NULL,
    local_decisions INTEGER NOT NULL,
    autonomous_rate REAL NOT NULL,
    mean_confidence REAL NOT NULL,
    mean_novelty REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS experiences (
    id TEXT PRIMARY KEY,
    episode_id TEXT NOT NULL,
    step INTEGER NOT NULL,
    state_features TEXT NOT NULL,
    state_metadata TEXT NOT NULL,
    action_id TEXT NOT NULL,
    action_parameters TEXT NOT NULL,
    reward REAL NOT NULL,
    next_state_features TEXT,
    next_state_metadata TEXT,
    terminal INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY(episode_id) REFERENCES episodes(id)
);

CREATE TABLE IF NOT EXISTS knowledge_proposals (
    id TEXT PRIMARY KEY,
    proposal_type TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL,
    validation_notes TEXT,
    confidence REAL NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS policy_states (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS decisions_audit (
    id TEXT PRIMARY KEY,
    episode_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    state_hash TEXT NOT NULL,
    action_id TEXT NOT NULL,
    confidence REAL NOT NULL,
    novelty REAL NOT NULL,
    decision_source TEXT NOT NULL,
    skill_id TEXT,
    llm_call_id TEXT,
    reward REAL
);
