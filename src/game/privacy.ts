/*
 * Everything the game keeps lives in this browser under keys starting with "kariyerweb-": the
 * day's checkpoint, achievements, sound and reading-size settings. Nothing is sent anywhere.
 * This removes all of it, for a player who wants the device to forget the game.
 */
const PREFIX = 'kariyerweb-';

export function clearAllGameData() {
  for (const pick of [() => localStorage, () => sessionStorage]) {
    try {
      const storage = pick();
      Array.from({ length: storage.length }, (_, i) => storage.key(i) ?? '')
        .filter((key) => key.startsWith(PREFIX))
        .forEach((key) => storage.removeItem(key));
    } catch {
      // storage unavailable: there was nothing kept either
    }
  }
}
