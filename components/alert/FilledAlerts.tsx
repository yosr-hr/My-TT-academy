import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';

interface FilledAlertProps {
  alertType: 'success' | 'info' | 'warning' | 'error';
  message: string;
}
export default function FilledAlert({ alertType, message }: FilledAlertProps) {
  return (
    <Stack sx={{ width: '100%' }} spacing={2}>
      <Alert variant="filled" severity={alertType}>
        {message}
      </Alert>
    </Stack>
  );
}