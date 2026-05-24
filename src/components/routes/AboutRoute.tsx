import { Anchor, List, Paper, Stack, Text, Title } from '@mantine/core';
import packageJson from '../../../package.json';

const TESTERS = ['Homura'];

export default function AboutRoute() {
    return (
        <Paper withBorder radius="xl" p="lg" className="panel">
            <Stack gap="sm">
                <Title order={1} mb={6} className="title">
                    About
                </Title>

                <Text c="dimmed">YouTube Playlist Shuffler by link3337.</Text>
                <Text size="sm" c="dimmed">
                    Version: {packageJson.version}
                </Text>

                <Anchor href="https://github.com/link3337/YoutubeShuffler" target="_blank" rel="noreferrer">
                    Repository
                </Anchor>

                <Text fw={600} mt="xs">
                    Testers
                </Text>
                <List spacing="xs" size="sm">
                    {TESTERS.map((tester) => (
                        <List.Item key={tester}>{tester}</List.Item>
                    ))}
                </List>
            </Stack>
        </Paper>
    );
}
