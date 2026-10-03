/*
 * Delayed game events: the manager "typing" before he answers, a few more files landing after
 * you close the queue, the day ending a moment after the last file. They belong to the week
 * that scheduled them, so starting, continuing or restarting a week cancels whatever the
 * previous one left pending instead of letting it fire into the new one.
 */
const pending = new Set<ReturnType<typeof setTimeout>>();

export function later(act: () => void, ms: number) {
  const id = setTimeout(() => {
    pending.delete(id);
    act();
  }, ms);
  pending.add(id);
}

export function cancelLater() {
  pending.forEach((id) => clearTimeout(id));
  pending.clear();
}
