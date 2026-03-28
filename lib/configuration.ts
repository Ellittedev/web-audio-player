import { v4 as uuidv4 } from 'uuid';

const CONFIGURATIONS_KEY = 'audioPlayerConfigurations';
const ACTIVE_CONFIGURATION_KEY = 'audioPlayerActiveConfiguration';

export interface AudioPlayerConfiguration {
  id: string;           // Auto-generated UUID, unique
  name: string;         // User-defined, can have duplicates
  createdAt: number;    // Timestamp
  updatedAt: number;    // Timestamp
}

/**
 * Get all configurations from localStorage
 */
export function getAllConfigurations(): AudioPlayerConfiguration[] {
  try {
    const stored = localStorage.getItem(CONFIGURATIONS_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load configurations:', error);
    return [];
  }
}

/**
 * Get the currently active configuration ID
 */
export function getActiveConfigurationId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_CONFIGURATION_KEY);
  } catch (error) {
    console.error('Failed to get active configuration:', error);
    return null;
  }
}

/**
 * Set the active configuration ID
 */
export function setActiveConfigurationId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_CONFIGURATION_KEY, id);
  } catch (error) {
    console.error('Failed to set active configuration:', error);
  }
}

/**
 * Create a new configuration with auto-generated ID
 */
export function createConfiguration(name: string): AudioPlayerConfiguration {
  const now = Date.now();
  const configuration: AudioPlayerConfiguration = {
    id: uuidv4(),
    name,
    createdAt: now,
    updatedAt: now
  };

  const configurations = getAllConfigurations();
  configurations.push(configuration);
  saveConfigurations(configurations);

  return configuration;
}

/**
 * Update an existing configuration
 */
export function updateConfiguration(
  id: string,
  updates: Partial<AudioPlayerConfiguration>
): AudioPlayerConfiguration | null {
  const configurations = getAllConfigurations();
  const index = configurations.findIndex(c => c.id === id);

  if (index === -1) return null;

  const updated = {
    ...configurations[index],
    ...updates,
    updatedAt: Date.now()
  };

  configurations[index] = updated;
  saveConfigurations(configurations);

  return updated;
}

/**
 * Delete a configuration
 */
export function deleteConfiguration(id: string): boolean {
  const configurations = getAllConfigurations();
  const index = configurations.findIndex(c => c.id === id);

  if (index === -1) return false;

  configurations.splice(index, 1);
  saveConfigurations(configurations);
  return true;
}

/**
 * Delete all configurations
 */
export function deleteAllConfigurations(): void {
  localStorage.removeItem(CONFIGURATIONS_KEY);
  localStorage.removeItem(ACTIVE_CONFIGURATION_KEY);
}

/**
 * Clear the active configuration ID
 */
export function clearActiveConfigurationId(): void {
  localStorage.removeItem(ACTIVE_CONFIGURATION_KEY);
}

/**
 * Initialize default "Default" configuration if none exists
 */
export function initializeDefaultConfiguration(): AudioPlayerConfiguration | null {
  const configurations = getAllConfigurations();
  
  if (configurations.length > 0) {
    // Configurations already exist, check if there's an active one
    const activeId = getActiveConfigurationId();
    if (activeId) return configurations.find(c => c.id === activeId) || null;
    
    // No active config but configs exist, use first one
    return configurations[0];
  }

  // No configurations exist, create default
  const defaultConfig = createConfiguration('Default');
  setActiveConfigurationId(defaultConfig.id);
  return defaultConfig;
}

/**
 * Get the localStorage keys for a specific configuration
 */
export function getConfigurationStorageKeys(configurationId: string): {
  bookmarksKey: string;
  loopsKey: string;
  activeLoopKey: string;
} {
  return {
    bookmarksKey: `audioPlayerBookmarks_${configurationId}`,
    loopsKey: `audioPlayerLoops_${configurationId}`,
    activeLoopKey: `audioPlayerActiveLoop_${configurationId}`
  };
}

/**
 * Save configurations to localStorage
 */
function saveConfigurations(configurations: AudioPlayerConfiguration[]): void {
  try {
    localStorage.setItem(CONFIGURATIONS_KEY, JSON.stringify(configurations));
  } catch (error) {
    console.error('Failed to save configurations:', error);
  }
}
