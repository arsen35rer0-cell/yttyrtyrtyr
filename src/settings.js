const SETTINGS_KEY = 'webforge.settings.v1';

export const defaultSettings = {
  theme: 'dark',
  autoRun: true,
  consoleFilter: 'all',
  fontSize: 14
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);

    if (!raw) {
      return { ...defaultSettings };
    }

    return {
      ...defaultSettings,
      ...JSON.parse(raw)
    };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // localStorage может быть недоступен в жёстко изолированных режимах.
    // Это не критично.
  }
}
