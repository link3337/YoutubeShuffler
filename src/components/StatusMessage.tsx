import { Text } from '@mantine/core';
import type { MessageState } from '../types';

type StatusMessageProps = {
  status: string;
  message: MessageState | null;
};

export function StatusMessage({ status, message }: StatusMessageProps) {
  return (
    <>
      <Text c="dimmed" mt="md">
        {status}
      </Text>
      <Text c={message?.ok ? 'green' : 'red'} mt="xs" style={{ whiteSpace: 'pre-wrap' }}>
        {message?.text ?? ''}
      </Text>
    </>
  );
}
