require('dotenv').config();
const PersistentPriorityQueue = require('./module');

const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};

async function runTests() {
  console.log('--- Starting Persistent Priority Queue Tests ---\n');
  const pq = new PersistentPriorityQueue(dbConfig);
  let failedTests = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`PASS: ${message}`);
    } else {
      console.error(`FAIL: ${message}`);
      failedTests++;
    }
  }

  try {
    console.log('Connecting to database and initializing...');
    await pq.connect();
    console.log('Clearing database for clean test run...');
    await pq.clear();

    const emptyCheck = await pq.is_empty();
    assert(emptyCheck === true, 'Queue should be empty initially');

    console.log('\nInserting tasks...');
    const item1 = await pq.insert('Task C', 10);
    assert(item1.element === 'Task C' && item1.priority === 10, 'Inserted Task C with priority 10');

    const item2 = await pq.insert('Task A', 2);
    assert(item2.element === 'Task A' && item2.priority === 2, 'Inserted Task A with priority 2');

    const item3 = await pq.insert('Task B', 5);
    assert(item3.element === 'Task B' && item3.priority === 5, 'Inserted Task B with priority 5');

    const item4 = await pq.insert('Task D', 15);
    assert(item4.element === 'Task D' && item4.priority === 15, 'Inserted Task D with priority 15');

    const emptyCheckFalse = await pq.is_empty();
    assert(emptyCheckFalse === false, 'Queue should not be empty after inserts');

    const items = await pq.getAll();
    assert(items.length === 4, 'Queue should contain exactly 4 items');
    assert(items[0].element === 'Task A' && items[3].element === 'Task D', 'Items should be sorted by priority');

    console.log('\nTesting peek...');
    const peeked = await pq.peek();
    assert(peeked.element === 'Task A' && peeked.priority === 2, 'Peek should return the minimum element (Task A, 2)');

    console.log('\nTesting update...');
    const updated = await pq.update('Task B', 1);
    assert(updated.element === 'Task B' && updated.priority === 1, 'Updated Task B priority to 1');
    
    const peekedAfterUpdate = await pq.peek();
    assert(peekedAfterUpdate.element === 'Task B' && peekedAfterUpdate.priority === 1, 'Peek should now return the updated minimum element (Task B, 1)');

    console.log('\nTesting extract_min...');
    const min = await pq.extract_min();
    assert(min.element === 'Task B' && min.priority === 1, 'extract_min should remove and return Task B (priority 1)');

    const peekedAfterExtractMin = await pq.peek();
    assert(peekedAfterExtractMin.element === 'Task A' && peekedAfterExtractMin.priority === 2, 'Next minimum element should be Task A (priority 2)');

    console.log('\nTesting extract_max...');
    const max = await pq.extract_max();
    assert(max.element === 'Task D' && max.priority === 15, 'extract_max should remove and return Task D (priority 15)');

    console.log('\nTesting delete...');
    const deleted = await pq.delete('Task A');
    assert(deleted.element === 'Task A' && deleted.priority === 2, 'delete should remove and return Task A');

    const remainingItems = await pq.getAll();
    assert(remainingItems.length === 1 && remainingItems[0].element === 'Task C', 'Queue should only contain Task C now');

    console.log('\nTesting duplicate insertion error handling...');
    try {
      await pq.insert('Task C', 20);
      assert(false, 'Should throw an error for duplicate insertion');
    } catch (err) {
      assert(err.message.includes('already exists'), `Expected error thrown: "${err.message}"`);
    }

    console.log('\nTesting non-existent update error handling...');
    try {
      await pq.update('NonExistentTask', 10);
      assert(false, 'Should throw an error when updating non-existent element');
    } catch (err) {
      assert(err.message.includes('not found'), `Expected error thrown: "${err.message}"`);
    }

    console.log('\nTesting non-existent delete error handling...');
    try {
      await pq.delete('NonExistentTask');
      assert(false, 'Should throw an error when deleting non-existent element');
    } catch (err) {
      assert(err.message.includes('not found'), `Expected error thrown: "${err.message}"`);
    }

    console.log('\nCleaning up final items...');
    const lastItem = await pq.extract_min();
    assert(lastItem.element === 'Task C' && lastItem.priority === 10, 'Extracted last item Task C');

    const finalEmptyCheck = await pq.is_empty();
    assert(finalEmptyCheck === true, 'Queue should be empty after extracting all elements');

    const nullPeek = await pq.peek();
    assert(nullPeek === null, 'Peek on empty queue should return null');

    const nullMin = await pq.extract_min();
    assert(nullMin === null, 'extract_min on empty queue should return null');

    const nullMax = await pq.extract_max();
    assert(nullMax === null, 'extract_max on empty queue should return null');

  } catch (err) {
    console.error('Unexpected error during tests:', err);
    failedTests++;
  } finally {
    await pq.close();
    console.log('\n--- Test Run Summary ---');
    if (failedTests === 0) {
      console.log('ALL TESTS PASSED SUCCESSFULLY!');
    } else {
      console.error(`${failedTests} TEST(S) FAILED.`);
    }
    process.exit(failedTests > 0 ? 1 : 0);
  }
}

runTests();
