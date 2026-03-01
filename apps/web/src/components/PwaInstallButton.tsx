'use client';

import { useEffect, useState } from 'react';
import { ActionIcon, Button, Modal, Text, Stack, Group, Tooltip } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconDownload, IconShare, IconSquarePlus, IconCheck } from '@tabler/icons-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [iosModalOpened, { open: openIosModal, close: closeIosModal }] = useDisclosure(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);

    const ua = navigator.userAgent;
    setIsIos(
      (/iphone|ipad|ipod/i.test(ua) && !('MSStream' in window)) ||
      (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
    );

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (isStandalone) return null;
  if (!deferredPrompt && !isIos) return null;

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
    }
  };

  const handleClick = () => {
    if (isIos) {
      openIosModal();
    } else {
      void handleAndroidInstall();
    }
  };

  return (
    <>
      <Tooltip label="Install app" position="bottom">
        {isMobile ? (
          <ActionIcon
            variant="light"
            color="indigo"
            size="lg"
            onClick={handleClick}
            aria-label="Install app"
          >
            <IconDownload size={18} />
          </ActionIcon>
        ) : (
          <Button
            variant="light"
            color="indigo"
            size="xs"
            leftSection={<IconDownload size={14} />}
            onClick={handleClick}
          >
            Install
          </Button>
        )}
      </Tooltip>

      <Modal
        opened={iosModalOpened}
        onClose={closeIosModal}
        title="Install Fitsy"
        centered
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            To install Fitsy on your iPhone or iPad:
          </Text>
          <Stack gap="sm">
            <Group gap="sm" align="flex-start">
              <Text fw={700} c="indigo" size="lg">1</Text>
              <Stack gap={2}>
                <Group gap="xs">
                  <Text size="sm" fw={500}>Tap the Share button</Text>
                  <IconShare size={16} color="var(--mantine-color-indigo-6)" />
                </Group>
                <Text size="xs" c="dimmed">at the bottom of your browser toolbar</Text>
              </Stack>
            </Group>
            <Group gap="sm" align="flex-start">
              <Text fw={700} c="indigo" size="lg">2</Text>
              <Stack gap={2}>
                <Group gap="xs">
                  <Text size="sm" fw={500}>Tap "Add to Home Screen"</Text>
                  <IconSquarePlus size={16} color="var(--mantine-color-indigo-6)" />
                </Group>
                <Text size="xs" c="dimmed">scroll down to find it in the list</Text>
              </Stack>
            </Group>
            <Group gap="sm" align="flex-start">
              <Text fw={700} c="indigo" size="lg">3</Text>
              <Stack gap={2}>
                <Group gap="xs">
                  <Text size="sm" fw={500}>Tap "Add" to confirm</Text>
                  <IconCheck size={16} color="var(--mantine-color-indigo-6)" />
                </Group>
                <Text size="xs" c="dimmed">Fitsy will appear on your home screen</Text>
              </Stack>
            </Group>
          </Stack>
        </Stack>
      </Modal>
    </>
  );
}
