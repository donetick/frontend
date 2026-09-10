// Global test setup. jsdom has no IndexedDB, so the document-store tests run
// against fake-indexeddb; installing it here keeps the store code unaware that
// it is under test.
import 'fake-indexeddb/auto'
