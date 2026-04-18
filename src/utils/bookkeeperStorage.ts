const STORAGE_KEY = 'budget-app-bookkeeper';

export interface StoredBookkeeper {
  id: string;
  name: string;
  ledgerId: string;
}

export function getStoredBookkeeper(ledgerId: string): StoredBookkeeper | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredBookkeeper;
    if (!data?.id || !data?.ledgerId || data.ledgerId !== ledgerId) return null;
    return data;
  } catch {
    return null;
  }
}

export function setStoredBookkeeper(ledgerId: string, bookkeeper: { id: string; name: string }): void {
  const payload: StoredBookkeeper = {
    id: bookkeeper.id,
    name: bookkeeper.name,
    ledgerId
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearStoredBookkeeper(): void {
  localStorage.removeItem(STORAGE_KEY);
}
