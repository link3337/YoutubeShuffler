import { Button, Card, Code, Group, Stack, Text, Textarea } from '@mantine/core';

type ManualInputCardProps = {
  value: string;
  onChange: (value: string) => void;
  onLoad: () => void;
  onClear: () => void;
};

export function ManualInputCard({ value, onChange, onLoad, onClear }: ManualInputCardProps) {
  return (
    <Card withBorder radius="md" p="sm">
      <Stack gap="xs">
        <Text size="xs" c="dimmed" fw={500}>
          Manual: paste video IDs (or URLs) - one per line
        </Text>
        <Textarea
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder={'dQw4w9WgXcQ\nhttps://www.youtube.com/watch?v=J---aiyznGQ\nkJQP7kiw5Fk'}
          autosize
          minRows={2}
          maxRows={5}
          size="xs"
        />
        <Group gap="xs" wrap="wrap">
          <Button size="compact-sm" onClick={onLoad}>
            Load + Shuffle
          </Button>
          <Button size="compact-sm" variant="default" onClick={onClear}>
            Clear
          </Button>
        </Group>
        <Text size="xs" c="dimmed">
          Accepts <Code>watch?v=</Code>, <Code>youtu.be/</Code>, or raw IDs.
        </Text>
      </Stack>
    </Card>
  );
}
