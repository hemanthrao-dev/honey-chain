const BEEKEEPERS_STORAGE_KEY = 'mockBeekeepers';

function getTodayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeRegistrationDate(date) {
  if (typeof date !== 'string' || !date.trim()) {
    return getTodayInputDate();
  }

  const trimmed = date.trim();
  const parsedDate = new Date(trimmed);
  if (Number.isNaN(parsedDate.getTime())) {
    return getTodayInputDate();
  }

  return trimmed.slice(0, 10);
}

function normalizeHives(hives) {
  if (Array.isArray(hives)) {
    return hives.map(hive => String(hive).trim()).filter(Boolean);
  }

  if (typeof hives === 'string') {
    return hives.split(',').map(hive => hive.trim()).filter(Boolean);
  }

  return [];
}

function normalizeBeekeeper(beekeeper, index) {
  if (!beekeeper || typeof beekeeper !== 'object') return null;

  const rating = Number.parseFloat(beekeeper.rating);

  return {
    id: String(beekeeper.id || `BK${String(index + 1).padStart(3, '0')}`).trim(),
    name: String(beekeeper.name || '').trim(),
    location: String(beekeeper.location || '').trim(),
    hives: normalizeHives(beekeeper.hives),
    registrationDate: normalizeRegistrationDate(beekeeper.registrationDate || beekeeper.date),
    totalBatches: Number.parseInt(beekeeper.totalBatches, 10) || 0,
    rating: Number.isFinite(rating) ? rating : 4.5,
  };
}

export function loadBeekeepers() {
  try {
    const saved = localStorage.getItem(BEEKEEPERS_STORAGE_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((beekeeper, index) => normalizeBeekeeper(beekeeper, index))
      .filter(beekeeper => beekeeper?.id && beekeeper.name && beekeeper.location);
  } catch (error) {
    console.error('Error loading beekeepers:', error);
    return [];
  }
}

export function saveBeekeepers(beekeepers) {
  const normalized = Array.isArray(beekeepers)
    ? beekeepers
        .map((beekeeper, index) => normalizeBeekeeper(beekeeper, index))
        .filter(beekeeper => beekeeper?.id && beekeeper.name && beekeeper.location)
    : [];

  try {
    localStorage.setItem(BEEKEEPERS_STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    console.error('Error saving beekeepers:', error);
  }

  return normalized;
}

export function getNextBeekeeperId(beekeepers) {
  const maxIdNumber = beekeepers.reduce((max, beekeeper) => {
    const match = /^BK(\d+)$/.exec(beekeeper.id || '');
    return match ? Math.max(max, Number.parseInt(match[1], 10)) : max;
  }, 0);

  return `BK${String(maxIdNumber + 1).padStart(3, '0')}`;
}
