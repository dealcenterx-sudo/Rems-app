import { useEffect, useState } from 'react';

/**
 * Delay-then-show flag. Returns false until `active` has stayed true for at
 * least `delayMs` (default 400ms, D-09), then true. Resets to false immediately
 * when `active` goes false. Used to avoid flashing skeletons on sub-threshold
 * loads.
 *
 * @param {boolean} active - the underlying loading/pending condition
 * @param {number} [delayMs=400] - how long `active` must stay true before flag flips
 * @returns {boolean} the delayed flag
 */
const useDelayedFlag = (active, delayMs = 400) => {
  const [flag, setFlag] = useState(false);

  useEffect(() => {
    if (!active) {
      setFlag(false);
      return undefined;
    }
    const timer = setTimeout(() => setFlag(true), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);

  return flag;
};

export default useDelayedFlag;
