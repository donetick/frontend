import { setupServer } from 'msw/node'

// Shared MSW server for tests. Add default handlers here; individual tests can
// override per-case with `server.use(...)`.
//
// Guiding principle (see TESTING.md): assert how the app RESPONDS to network
// data, NOT that a specific request was made. Request-assertions are an
// implementation detail — let handlers return the data/errors and test what the
// user sees.
export const server = setupServer()
