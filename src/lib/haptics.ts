/**
 * Haptic feedback utility using Web Vibration API
 * Provides tactile feedback for better mobile UX
 */

// Check if vibration API is supported
const isVibrationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'vibrate' in navigator;
};

// Vibration patterns (in milliseconds)
export const HapticPatterns = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 10] as number[],
  error: [20, 50, 20, 50, 20] as number[],
  warning: [10, 30, 10] as number[],
};

/**
 * Trigger haptic feedback
 * @param pattern - Vibration pattern or duration in ms
 * @param respectUserPreference - Whether to check user's haptic preference (default: true)
 */
export const triggerHaptic = (
  pattern: number | number[] = HapticPatterns.light,
  respectUserPreference: boolean = true
): void => {
  // Skip if not supported
  if (!isVibrationSupported()) {
    return;
  }

  // Check user preference from localStorage
  if (respectUserPreference) {
    try {
      const preferences = localStorage.getItem('userPreferences');
      if (preferences) {
        const { hapticsEnabled } = JSON.parse(preferences);
        if (hapticsEnabled === false) {
          return;
        }
      }
    } catch (error) {
      console.error('Error reading haptic preference:', error);
    }
  }

  // Trigger vibration
  try {
    navigator.vibrate(pattern);
  } catch (error) {
    console.error('Error triggering haptic:', error);
  }
};

/**
 * Convenience methods for common haptic patterns
 */
export const haptics = {
  /** Light tap feedback */
  light: () => triggerHaptic(HapticPatterns.light),

  /** Medium tap feedback */
  medium: () => triggerHaptic(HapticPatterns.medium),

  /** Heavy tap feedback */
  heavy: () => triggerHaptic(HapticPatterns.heavy),

  /** Success pattern */
  success: () => triggerHaptic(HapticPatterns.success),

  /** Error pattern */
  error: () => triggerHaptic(HapticPatterns.error),

  /** Warning pattern */
  warning: () => triggerHaptic(HapticPatterns.warning),

  /** Button tap */
  buttonTap: () => triggerHaptic(HapticPatterns.light),

  /** Checkbox toggle */
  checkboxToggle: () => triggerHaptic(HapticPatterns.medium),

  /** Navigation */
  navigation: () => triggerHaptic(HapticPatterns.light),

  /** Selection */
  selection: () => triggerHaptic(HapticPatterns.medium),
};

/**
 * Set user's haptic preference
 */
export const setHapticPreference = (enabled: boolean): void => {
  try {
    const preferences = localStorage.getItem('userPreferences');
    const currentPrefs = preferences ? JSON.parse(preferences) : {};

    localStorage.setItem(
      'userPreferences',
      JSON.stringify({
        ...currentPrefs,
        hapticsEnabled: enabled,
      })
    );
  } catch (error) {
    console.error('Error setting haptic preference:', error);
  }
};

/**
 * Get user's haptic preference
 */
export const getHapticPreference = (): boolean => {
  try {
    const preferences = localStorage.getItem('userPreferences');
    if (preferences) {
      const { hapticsEnabled } = JSON.parse(preferences);
      return hapticsEnabled !== false; // Default to true
    }
  } catch (error) {
    console.error('Error getting haptic preference:', error);
  }
  return true; // Default to enabled
};
