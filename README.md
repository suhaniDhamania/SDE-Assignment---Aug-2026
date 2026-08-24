# Persistent Priority Queue with Full-Stack Visualization

This project is a complete, production-ready implementation of a **Persistent Priority Queue** built for the SDE assignment. The queue is backed by **PostgreSQL** to guarantee durability and transaction safety. To demonstrate complete feature ownership and UI capabilities, the project includes an Express API server and a clean, responsive React frontend.

---

## Project Structure

```text
persistent-priority-queue/
├── README.md             # Detailed documentation, architectural decisions & use cases
├── schema.sql            # PostgreSQL schema definition and indexing
├── module.js             # Core Priority Queue implementation (Database interface)
├── test_module.js        # Comprehensive automated test suite
├── server.js             # Express API Server wrapping the module
├── start.sh              # Automated script to set up DB, install deps, and run everything
├── .env.example          # Environment variables template
├── .env                  # Local environment configuration file
└── client/               # React Frontend (Vite)
    ├── package.json      # Client-side dependencies (Lucide icons, etc.)
    ├── src/
    │   ├── App.jsx       # Main Dashboard interface
    │   ├── index.css     # Clean Vanilla CSS styling
    │   └── config.js     # API endpoints configuration (no hardcoding)
    └── index.html
```

---

## Features

1.  **Core Operations**: Supports `insert`, `extract_min`, `extract_max`, `peek`, `update`, `delete`, and `is_empty` as requested.
2.  **ACID Persistence**: States are fully saved in PostgreSQL. If the server crashes or restarts, the queue remains completely intact.
3.  **Concurrency Safety**: Uses a `WITH... SELECT FOR UPDATE SKIP LOCKED` query pattern during extractions. This allows multiple concurrent worker processes to pull items from the queue safely without double-processing or deadlock issues.
4.  **O(log N) Performance**: Table indexes on the `priority` and `element` columns ensure that queue operations run in log time instead of linear scans.
5.  **Interactive UI**: A simple, clean, and modern React dashboard with icons to visually insert, extract, update, and delete elements from the queue in real-time.

---

## Setup & Execution

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (>= 16) installed. If you do not have PostgreSQL installed, the startup script will attempt to install and run it automatically using [Homebrew](https://brew.sh/) (on macOS).

### 🚀 Quick Start (Automated)
Run the startup script in your terminal. This script will install all dependencies, start PostgreSQL, create the database, run the schema, and start both the backend API server and frontend client:
```bash
./start.sh
```
Once started:
*   **React Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
*   **Express API Server**: [http://localhost:5001](http://localhost:5001)

### 🧪 Running Tests
To execute the automated test suite verifying all priority queue operations, constraint safety, and error handling, run:
```bash
npm test
```

---

## Architecture & Implementation Choices

### 1. Relational Database vs In-Memory Heaps
Standard priority queues are implemented in-memory using **Binary Heaps** or **Fibonacci Heaps**. While heaps offer O(log N) insertion and extraction, they lack persistence.
*   **The Choice**: Storing elements in PostgreSQL gives us the durability of a database while maintaining high performance via indexing.
*   **Index Tuning**: We added an index `idx_pq_priority` on the `priority` column. A B-Tree index keeps priorities sorted, allowing PostgreSQL to locate and retrieve the minimum or maximum element in O(log N) time.
*   **Unique Constraints**: We enforce a `UNIQUE` constraint on the `element` column to prevent duplicate items and ensure `update` and `delete` operations map directly to a single, unambiguous record.

### 2. Multi-Worker Concurrency (SELECT FOR UPDATE SKIP LOCKED)
In production, database queues are often processed by multiple parallel consumer nodes. Without locking, two workers might run `extract_min()` at the same millisecond, read the same minimum item, and process it twice (double delivery).
*   **Our Solution**: In `extract_min` and `extract_max`, we run a Common Table Expression (CTE) utilizing:
    ```sql
    SELECT id FROM priority_queue
    ORDER BY priority ASC, id ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
    ```
*   `FOR UPDATE` locks the selected row for the duration of the transaction.
*   `SKIP LOCKED` instructs other concurrent queries to skip this locked row and grab the next available element instead of waiting. This eliminates thread-contention blocks and guarantees **exactly-once processing**.

### 3. Complexity Analysis of Operations
*   `insert(element, priority)`: **O(log N)** (PostgreSQL inserts row and updates the two B-Tree indexes).
*   `extract_min()` / `extract_max()`: **O(log N)** (Locates minimum/maximum node using index and deletes it).
*   `peek()`: **O(1)** (Scans index for the first entry without modifying the database).
*   `update(element, new_priority)`: **O(log N)** (Locates the node by unique element value in O(log N) and updates priority index in O(log N)).
*   `delete(element)`: **O(log N)** (Locates the node by unique value and deletes it).
*   `is_empty()`: **O(1)** (Executes `EXISTS` check on index).

---

## Real-World Use Cases for Priority Queues

Priority queues are fundamental data structures used across computing systems to govern order based on urgency rather than order-of-arrival:

1.  **Operating System CPU Schedulers**
    In time-sharing systems, the OS scheduler organizes processes in a priority queue. Real-time tasks (like processing audio or user mouse input) are assigned lower priority values (which represent higher urgency in min-priority queues) to keep the system responsive, while background disk-defragmentation tasks get lower priority.
    
2.  **Quality of Service (QoS) Network Packet Routing**
    Network routers manage packets using priority queues. High-priority voice/video packets (VoIP) are processed and forwarded before lower-priority web browsing packets to maintain service quality and prevent voice lag.
    
3.  **Shortest Path Routing (Dijkstra's & A* Algorithms)**
    Algorithms finding the shortest path between nodes (such as Google Maps GPS routing) use a min-priority queue. Unvisited nodes are held in the queue sorted by current distance from the source. The algorithm repeatedly extracts the closest node (`extract_min`) to expand the search space efficiently.
    
4.  **Data Compression (Huffman Coding)**
    File compression tools (like ZIP or GZIP) construct prefix trees using priority queues. Characters in the source text are counted, and nodes are inserted into a priority queue sorted by frequency. The two lowest-frequency nodes are repeatedly extracted and merged until a single binary tree is constructed.
