import { useRef } from "react";

/**
 * Manages optimistic updates with abort-resend, field accumulation,
 * and snapshot-based rollback for a list of entities keyed by ID.
 *
 * Designed for rapid-fire edits on the same entity: each call merges
 * new fields into a pending set, aborts any in-flight request, and
 * sends the accumulated fields. On failure, rolls back to the
 * server-confirmed snapshot taken before the first edit in the sequence.
 */
function useOptimisticUpdate<
  Entity extends Record<string, unknown>,
  UpdatableFields extends Partial<Entity>,
>({
  getEntity,
  applyUpdate,
  mutationFn,
}: {
  /** Look up the current entity by ID (for snapshotting). */
  getEntity: (id: string) => Entity | undefined;
  /** Apply a partial update to one entity in the list (optimistic + confirmed). */
  applyUpdate: (id: string, fields: Partial<Entity>) => void;
  /** Send the merged fields to the server. Must respect the signal for cancellation. */
  mutationFn: (
    id: string,
    fields: UpdatableFields,
    signal: AbortSignal,
  ) => Promise<Entity>;
}) {
  // Accumulated dirty fields per entity ID, not yet confirmed by the server
  const pendingFields = useRef<Map<string, UpdatableFields>>(new Map());
  // Last server-confirmed state per entity ID, used for rollback on failure
  const snapshots = useRef<Map<string, Entity>>(new Map());
  // In-flight mutation controller per entity ID, aborted when a newer mutation supersedes
  const controllers = useRef<Map<string, AbortController>>(new Map());

  /**
   * Optimistically updates the entity identified by `id` with `fields`,
   * accumulating with any pending fields, then sends to the server.
   *
   * Returns `{ success, aborted }`:
   * - `success: true` — server confirmed the update
   * - `success: false, aborted: false` — server rejected, entity rolled back
   * - `success: false, aborted: true` — superseded by a newer call, no action taken
   */
  async function mutate(
    id: string,
    fields: UpdatableFields,
  ): Promise<{ success: boolean; aborted: boolean }> {
    // Take snapshot before first optimistic update in a sequence
    if (!snapshots.current.has(id)) {
      const entity = getEntity(id);
      if (entity) {
        snapshots.current.set(id, { ...entity });
      }
    }

    // Merge new fields into accumulated pending fields
    pendingFields.current.set(id, {
      ...pendingFields.current.get(id),
      ...fields,
    });

    // Optimistic update
    applyUpdate(id, pendingFields.current.get(id) as UpdatableFields);

    // Abort previous in-flight request for same id, create new controller
    const existing = controllers.current.get(id);
    if (existing) existing.abort();
    const controller = new AbortController();
    controllers.current.set(id, controller);

    try {
      const confirmed = await mutationFn(
        id,
        pendingFields.current.get(id) as UpdatableFields,
        controller.signal,
      );

      applyUpdate(id, confirmed);
      pendingFields.current.delete(id);
      snapshots.current.delete(id);
      if (controllers.current.get(id) === controller) {
        controllers.current.delete(id);
      }
      return { success: true, aborted: false };
    } catch (err) {
      if (controller.signal.aborted) {
        return { success: false, aborted: true };
      }

      // Rollback to snapshot
      const snap = snapshots.current.get(id);
      if (snap) {
        applyUpdate(id, snap);
      }
      pendingFields.current.delete(id);
      snapshots.current.delete(id);
      if (controllers.current.get(id) === controller) {
        controllers.current.delete(id);
      }
      throw err;
    }
  }

  return { mutate };
}

export { useOptimisticUpdate };
