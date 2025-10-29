import { useState, useEffect, useCallback } from 'react';

// The aistudio object is injected by the environment.
// Using `any` for type safety as it might not exist.
const aistudio = (window as any).aistudio;

export const useApiKey = () => {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkApiKey = useCallback(async () => {
    setIsChecking(true);
    if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
      try {
        const hasKey = await aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } catch (e) {
        console.error("Error checking for API key:", e);
        setHasApiKey(false);
      }
    } else {
      // Fallback for environments where aistudio is not available.
      // This allows for development outside of the specific platform.
      console.warn('window.aistudio is not available.');
      setHasApiKey(false); // Default to false if the check can't be performed.
    }
    setIsChecking(false);
  }, []);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  const selectApiKey = useCallback(async () => {
    if (aistudio && typeof aistudio.openSelectKey === 'function') {
      await aistudio.openSelectKey();
      // Per guidelines, assume key selection is successful to mitigate race conditions.
      setHasApiKey(true);
    } else {
      alert('API key selection is not available in this environment.');
    }
  }, []);

  const resetApiKeyStatus = useCallback(() => {
    setHasApiKey(false);
  }, []);

  return { hasApiKey, isChecking, selectApiKey, resetApiKeyStatus };
};
