-- Schema definition for Persistent Priority Queue

-- Table structure for storing priority queue elements
CREATE TABLE IF NOT EXISTS priority_queue (
    id SERIAL PRIMARY KEY,
    element TEXT NOT NULL UNIQUE,
    priority DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for ordering queue elements by priority (min/max heap operations)
-- Having this index ensures O(log N) or O(1) retrieval for minimum and maximum elements
CREATE INDEX IF NOT EXISTS idx_pq_priority ON priority_queue(priority ASC);

-- Index for fast lookup by element value for update and delete operations
CREATE INDEX IF NOT EXISTS idx_pq_element ON priority_queue(element);
