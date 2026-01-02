import { useCallback, useState } from 'react';

/**
 * Small helper for dialogs that have a 2-step confirmation.
 *
 * @returns {{
 *  open: boolean,
 *  step: 1|2,
 *  openDialog: () => void,
 *  closeDialog: () => void,
 *  continueToStep2: () => void,
 * }}
 */
export function useTwoStepDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(/** @type {1|2} */ (1));

  const openDialog = useCallback(() => {
    setStep(1);
    setOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setOpen(false);
    setStep(1);
  }, []);

  const continueToStep2 = useCallback(() => {
    setStep(2);
  }, []);

  return { open, step, openDialog, closeDialog, continueToStep2 };
}
