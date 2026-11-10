// Only confirmed successes are excluded on retry. A failed network response
// cannot prove that the server did not write; server idempotency is separate.
export async function createImportTasks({
  buildPayload,
  create,
  onCreated,
  onResult,
  successful,
  tasks,
}) {
  for (const task of tasks) {
    if (successful.has(task.key)) continue
    try {
      const result = await create(buildPayload(task))
      successful.add(task.key)
      onResult(task.key, { ok: true, queued: Boolean(result?._pendingCreate) })
      // An observer failure must not reclassify a successful server write.
      try {
        onCreated?.(result)
      } catch (error) {
        console.error(error)
      }
    } catch (error) {
      onResult(task.key, { ok: false, message: error.message })
    }
  }
}
