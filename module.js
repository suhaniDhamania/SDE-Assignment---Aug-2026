/**
 * module.js
 * 
 * Main implementation of the Persistent Priority Queue.
 * Exposes a class and methods that interact with PostgreSQL for persistence.
 * Uses pg.Pool for database connection pooling.
 * Implements concurrency-safe queue operations using transactions and SKIP LOCKED.
 */

const { Pool } = require('pg');

class PersistentPriorityQueue {
  /**
   * Initializes the Persistent Priority Queue.
   * @param {Object} config - Connection configurations for pg.Pool
   */
  constructor(config = {}) {
    // If no config is passed, it will automatically fall back to standard PG environment variables
    this.pool = new Pool(config);
  }

  /**
   * Connects to the database and verifies/initializes the schema.
   */
  async connect() {
    const client = await this.pool.connect();
    try {
      // Ensure the table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS priority_queue (
          id SERIAL PRIMARY KEY,
          element TEXT NOT NULL UNIQUE,
          priority DOUBLE PRECISION NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Ensure indexes exist for fast O(log N) operations
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_pq_priority ON priority_queue(priority ASC);
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_pq_element ON priority_queue(element);
      `);
    } finally {
      client.release();
    }
  }

  /**
   * Closes the connection pool.
   */
  async close() {
    await this.pool.end();
  }

  /**
   * Clears all elements in the queue. Mainly used for testing.
   */
  async clear() {
    await this.pool.query('TRUNCATE TABLE priority_queue RESTART IDENTITY;');
  }

  /**
   * Inserts an element into the priority queue with a given priority.
   * Throws an error if the element already exists.
   * 
   * @param {string} element - The value/string representation of the element.
   * @param {number} priority - The numeric priority. Lower values indicate higher priority (standard min-heap style).
   * @returns {Promise<Object>} The inserted element details { element, priority }.
   */
  async insert(element, priority) {
    if (element === undefined || element === null || element === '') {
      throw new Error('Element cannot be empty');
    }
    if (priority === undefined || priority === null || isNaN(Number(priority))) {
      throw new Error('Priority must be a valid number');
    }

    const queryText = `
      INSERT INTO priority_queue (element, priority)
      VALUES ($1, $2)
      RETURNING element, priority;
    `;
    try {
      const res = await this.pool.query(queryText, [element, Number(priority)]);
      return res.rows[0];
    } catch (err) {
      // Handle Postgres unique constraint violation (code 23505)
      if (err.code === '23505') {
        throw new Error(`Element '${element}' already exists in the queue.`);
      }
      throw err;
    }
  }

  /**
   * Removes and returns the element with the minimum priority value (highest priority).
   * Safe for concurrent consumers using SELECT FOR UPDATE SKIP LOCKED.
   * 
   * @returns {Promise<Object|null>} The extracted element { element, priority } or null if queue is empty.
   */
  async extract_min() {
    const queryText = `
      WITH target AS (
        SELECT id FROM priority_queue
        ORDER BY priority ASC, id ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      DELETE FROM priority_queue
      WHERE id = (SELECT id FROM target)
      RETURNING element, priority;
    `;
    const res = await this.pool.query(queryText);
    return res.rows[0] || null;
  }

  /**
   * Removes and returns the element with the maximum priority value (lowest priority).
   * Safe for concurrent consumers using SELECT FOR UPDATE SKIP LOCKED.
   * 
   * @returns {Promise<Object|null>} The extracted element { element, priority } or null if queue is empty.
   */
  async extract_max() {
    const queryText = `
      WITH target AS (
        SELECT id FROM priority_queue
        ORDER BY priority DESC, id ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      DELETE FROM priority_queue
      WHERE id = (SELECT id FROM target)
      RETURNING element, priority;
    `;
    const res = await this.pool.query(queryText);
    return res.rows[0] || null;
  }

  /**
   * Retrieves the element with the minimum priority value without removing it.
   * 
   * @returns {Promise<Object|null>} The element { element, priority } or null if queue is empty.
   */
  async peek() {
    const queryText = `
      SELECT element, priority FROM priority_queue
      ORDER BY priority ASC, id ASC
      LIMIT 1;
    `;
    const res = await this.pool.query(queryText);
    return res.rows[0] || null;
  }

  /**
   * Updates the priority of an existing element in the queue.
   * Throws an error if the element is not found.
   * 
   * @param {string} element - The element to update.
   * @param {number} new_priority - The new numeric priority value.
   * @returns {Promise<Object>} The updated element details { element, priority }.
   */
  async update(element, new_priority) {
    if (element === undefined || element === null || element === '') {
      throw new Error('Element cannot be empty');
    }
    if (new_priority === undefined || new_priority === null || isNaN(Number(new_priority))) {
      throw new Error('Priority must be a valid number');
    }

    const queryText = `
      UPDATE priority_queue
      SET priority = $2
      WHERE element = $1
      RETURNING element, priority;
    `;
    const res = await this.pool.query(queryText, [element, Number(new_priority)]);
    if (res.rowCount === 0) {
      throw new Error(`Element '${element}' not found in the queue.`);
    }
    return res.rows[0];
  }

  /**
   * Deletes an element from the queue.
   * Throws an error if the element is not found.
   * 
   * @param {string} element - The element to delete.
   * @returns {Promise<Object>} The deleted element details { element, priority }.
   */
  async delete(element) {
    if (element === undefined || element === null || element === '') {
      throw new Error('Element cannot be empty');
    }

    const queryText = `
      DELETE FROM priority_queue
      WHERE element = $1
      RETURNING element, priority;
    `;
    const res = await this.pool.query(queryText, [element]);
    if (res.rowCount === 0) {
      throw new Error(`Element '${element}' not found in the queue.`);
    }
    return res.rows[0];
  }

  /**
   * Checks if the priority queue is empty.
   * 
   * @returns {Promise<boolean>} True if empty, false otherwise.
   */
  async is_empty() {
    const queryText = `
      SELECT NOT EXISTS (SELECT 1 FROM priority_queue) AS is_empty;
    `;
    const res = await this.pool.query(queryText);
    return res.rows[0].is_empty;
  }

  /**
   * Utility method to fetch all elements in sorted order.
   * Essential for frontend visualization.
   * 
   * @returns {Promise<Array<Object>>} List of all queue items sorted by priority.
   */
  async getAll() {
    const queryText = `
      SELECT element, priority, created_at FROM priority_queue
      ORDER BY priority ASC, id ASC;
    `;
    const res = await this.pool.query(queryText);
    return res.rows;
  }
}

module.exports = PersistentPriorityQueue;
