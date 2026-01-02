import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

export default function TwoStepConfirmDialog({
  open,
  step,
  titleStep1,
  bodyStep1,
  titleStep2,
  bodyStep2,
  cancelLabel,
  continueLabel,
  confirmLabel,
  onCancel,
  onContinue,
  onConfirm,
}) {
  const isStep2 = step === 2;

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{isStep2 ? titleStep2 : titleStep1}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {isStep2 ? bodyStep2 : bodyStep1}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{cancelLabel}</Button>
        {!isStep2 ? (
          <Button variant="contained" onClick={onContinue}>
            {continueLabel}
          </Button>
        ) : (
          <Button color="error" variant="contained" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
