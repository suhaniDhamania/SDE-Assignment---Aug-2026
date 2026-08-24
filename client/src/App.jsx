import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from './config';

function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(false);
  
  const [newElement, setNewElement] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [error, setError] = useState(null);
  
  const [lastExtracted, setLastExtracted] = useState(null);
  const [lastAction, setLastAction] = useState('');
  const [actionType, setActionType] = useState('success');

  const [editingElement, setEditingElement] = useState(null);
  const [editingPriority, setEditingPriority] = useState('');

  const fetchItems = async () => {
    try {
      setError(null);
      const res = await fetch(API_ENDPOINTS.items);
      const result = await res.json();
      if (result.success) {
        setItems(result.data);
        setDbConnected(true);
      } else {
        setError(result.error);
        setDbConnected(false);
      }
    } catch (err) {
      console.error(err);
      setError('Could not connect to the backend server. Make sure server.js is running.');
      setDbConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleInsert = async (e) => {
    e.preventDefault();
    if (!newElement.trim() || newPriority === '') return;

    setError(null);
    try {
      const res = await fetch(API_ENDPOINTS.insert, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          element: newElement.trim(),
          priority: Number(newPriority),
        }),
      });

      const result = await res.json();
      if (result.success) {
        setNewElement('');
        setNewPriority('');
        setLastExtracted(null);
        setActionType('success');
        setLastAction(`Inserted "${result.data.element}" with priority ${result.data.priority}`);
        fetchItems();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Connection error occurred while inserting.');
    }
  };

  const handleExtractMin = async () => {
    setError(null);
    try {
      const res = await fetch(API_ENDPOINTS.extractMin, { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        if (result.data) {
          setLastExtracted(result.data);
          setActionType('success');
          setLastAction('Extracted Minimum Element');
        } else {
          setLastExtracted(null);
          setLastAction('Queue is empty! Nothing to extract.');
          setActionType('danger');
        }
        fetchItems();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Connection error occurred during extract-min.');
    }
  };

  const handleExtractMax = async () => {
    setError(null);
    try {
      const res = await fetch(API_ENDPOINTS.extractMax, { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        if (result.data) {
          setLastExtracted(result.data);
          setActionType('success');
          setLastAction('Extracted Maximum Element');
        } else {
          setLastExtracted(null);
          setLastAction('Queue is empty! Nothing to extract.');
          setActionType('danger');
        }
        fetchItems();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Connection error occurred during extract-max.');
    }
  };

  const handleUpdate = async (element, priority) => {
    if (priority === '' || isNaN(Number(priority))) return;
    setError(null);

    try {
      const res = await fetch(API_ENDPOINTS.update, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          element: element,
          priority: Number(priority),
        }),
      });

      const result = await res.json();
      if (result.success) {
        setEditingElement(null);
        setLastExtracted(null);
        setActionType('success');
        setLastAction(`Updated "${element}" priority to ${priority}`);
        fetchItems();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Connection error occurred during update.');
    }
  };

  const handleDelete = async (element) => {
    setError(null);
    try {
      const res = await fetch(API_ENDPOINTS.delete(element), {
        method: 'DELETE',
      });

      const result = await res.json();
      if (result.success) {
        setLastExtracted(null);
        setActionType('danger');
        setLastAction(`Deleted "${element}" from the queue`);
        fetchItems();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Connection error occurred during deletion.');
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to clear the entire queue?')) return;
    setError(null);

    try {
      const res = await fetch(API_ENDPOINTS.clear, { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        setLastExtracted(null);
        setLastAction('Entire Priority Queue cleared.');
        setActionType('danger');
        fetchItems();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Connection error occurred during clear.');
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo-section">
          <span className="logo-text">Persistent Priority Queue</span>
        </div>
        <div className={`connection-status ${dbConnected ? '' : 'error'}`}>
          <span className="status-dot"></span>
          <span>{dbConnected ? 'PostgreSQL Connected' : 'Database Offline'}</span>
        </div>
      </header>

      <main className="main-content">
        <section className="controls-panel">
          
          <div className="card">
            <h2 className="card-title">Insert Element</h2>
            <form onSubmit={handleInsert}>
              <div className="form-group">
                <label className="form-label" htmlFor="element">Element Name / Payload</label>
                <input
                  id="element"
                  className="form-input"
                  type="text"
                  placeholder="e.g. Process Job A"
                  value={newElement}
                  onChange={(e) => setNewElement(e.target.value)}
                  disabled={!dbConnected}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="priority">Priority (Numeric)</label>
                <input
                  id="priority"
                  className="form-input"
                  type="number"
                  step="any"
                  placeholder="e.g. 5"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  disabled={!dbConnected}
                  required
                />
              </div>
              <button 
                className="btn btn-primary" 
                type="submit"
                disabled={!dbConnected || !newElement.trim() || newPriority === ''}
              >
                Insert to Queue
              </button>
            </form>
          </div>

          <div className="card">
            <h2 className="card-title">Queue Operations</h2>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="btn-group-row">
                <button 
                  className="btn btn-warning" 
                  onClick={handleExtractMin}
                  disabled={!dbConnected || items.length === 0}
                >
                  Extract Min
                </button>
                <button 
                  className="btn btn-warning" 
                  onClick={handleExtractMax}
                  disabled={!dbConnected || items.length === 0}
                >
                  Extract Max
                </button>
              </div>
              <button 
                className="btn btn-secondary" 
                onClick={fetchItems}
                disabled={loading}
              >
                Refresh State
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleClear}
                disabled={!dbConnected || items.length === 0}
              >
                Clear Queue
              </button>
            </div>
          </div>
        </section>

        <section className="queue-panel">
          {error && (
            <div className="action-banner action-banner-danger">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span><strong>Error:</strong> {error}</span>
              </div>
              <button className="btn-icon btn-icon-danger" onClick={() => setError(null)}>
                Close
              </button>
            </div>
          )}

          {lastAction && (
            <div className={`action-banner ${actionType === 'success' ? 'action-banner-success' : 'action-banner-danger'}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, opacity: 0.8 }}>
                  {actionType === 'success' ? 'Action Completed' : 'Queue Alert'}
                </span>
                <span style={{ fontWeight: 500 }}>{lastAction}</span>
                {lastExtracted && (
                  <span style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    Element: <strong>"{lastExtracted.element}"</strong> | Priority: <strong>{lastExtracted.priority}</strong>
                  </span>
                )}
              </div>
              <button className="btn-icon" onClick={() => { setLastAction(''); setLastExtracted(null); }}>
                Close
              </button>
            </div>
          )}

          <div className="card" style={{ flexGrow: 1 }}>
            <div className="queue-header-actions">
              <h2 className="card-title" style={{ marginBottom: 0 }}>Active Queue Items</h2>
              <span className="queue-count">
                {items.length} {items.length === 1 ? 'element' : 'elements'}
              </span>
            </div>

            {loading ? (
              <div className="empty-state">
                <p>Loading queue state...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="empty-state">
                <p>The priority queue is empty.</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Use the "Insert Element" panel on the left to add jobs.
                </p>
              </div>
            ) : (
              <div className="queue-list">
                {items.map((item, index) => (
                  <div key={item.element} className="queue-item">
                    <div className="queue-item-left">
                      <div className="queue-item-index">{index + 1}</div>
                      <div className="queue-item-details">
                        <span className="queue-item-name">{item.element}</span>
                        <span className="queue-item-time">
                          Inserted: {new Date(item.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    <div className="queue-item-right">
                      {editingElement === item.element ? (
                        <div className="inline-edit-form">
                          <input
                            type="number"
                            step="any"
                            className="inline-edit-input"
                            value={editingPriority}
                            onChange={(e) => setEditingPriority(e.target.value)}
                            required
                          />
                          <button 
                            className="btn-icon" 
                            style={{ color: 'var(--success)' }}
                            onClick={() => handleUpdate(item.element, editingPriority)}
                          >
                            Save
                          </button>
                          <button 
                            className="btn-icon" 
                            style={{ color: 'var(--danger)' }}
                            onClick={() => setEditingElement(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="priority-badge">
                            <span>P: {item.priority}</span>
                          </div>
                          <div className="queue-item-actions">
                            <button 
                              className="btn-icon" 
                              title="Update Priority"
                              onClick={() => {
                                setEditingElement(item.element);
                                setEditingPriority(item.priority);
                              }}
                            >
                              Edit
                            </button>
                            <button 
                              className="btn-icon btn-icon-danger" 
                              title="Delete Element"
                              onClick={() => handleDelete(item.element)}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem 3rem 2rem', width: '100%' }}>
        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', marginBottom: '2.5rem' }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Priority Queue Use Cases & Design Insights</h2>
        </div>

        <div className="educational-section">
          <div className="use-case-card">
            <h3 className="use-case-title">Operating System Schedulers</h3>
            <p className="use-case-desc">
              Priority queues form the core of CPU scheduling algorithms (like Shortest Job First or multi-level feedback queues). Processes with higher urgency or lower execution times are prioritized to improve system responsiveness.
            </p>
          </div>

          <div className="use-case-card">
            <h3 className="use-case-title">Network Traffic Routing & QoS</h3>
            <p className="use-case-desc">
              Routers use priority queues to manage network traffic packet routing. Under high loads, voice-over-IP (VoIP) and real-time streaming data packets are processed with higher priority than bulk text transfers to prevent lag.
            </p>
          </div>

          <div className="use-case-card">
            <h3 className="use-case-title">Graph Search (Dijkstra's Algorithm)</h3>
            <p className="use-case-desc">
              Pathfinding algorithms (such as Dijkstra's or A* search) use a min-priority queue to dynamically extract the closest unvisited node. This guarantees finding the shortest path efficiently.
            </p>
          </div>

          <div className="use-case-card">
            <h3 className="use-case-title">Why Persistent DB-Backed Queues?</h3>
            <p className="use-case-desc">
              Memory-based queues (like standard Binary Heaps) are lost when applications crash. By storing items in a relational database with indexes on priority, we get full ACID transactions, crash durability, and multi-worker safety (using FOR UPDATE SKIP LOCKED).
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
