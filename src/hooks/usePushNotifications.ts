import { useEffect, useRef, useState } from 'react';
import { subscribeMyNotifications, type AppNotification } from '../services/notifications';
import {
  requestNotificationPermission,
  hasNotificationPermission,
  fireAppNotificationToPush,
} from '../services/webPushNotifications';

/**
 * Hook que gerencia o ciclo de vida das notificações push:
 * 1. Solicita permissão amigavelmente
 * 2. Assina as notificações do Firestore em tempo real
 * 3. Dispara notificações nativas do SO para cada nova notificação não lida
 */
export function usePushNotifications(uid: string | undefined) {
  const [permissionGranted, setPermissionGranted] = useState(hasNotificationPermission());
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const lastNotifIds = useRef<Set<string>>(new Set());

  // Pede permissão de forma amigável quando o usuário está logado
  useEffect(() => {
    if (!uid) return;

    // Se já negou, não pede de novo
    if (Notification.permission === 'denied' || Notification.permission === 'granted') return;

    // Ainda não perguntou (default): solicita permissão (dispara o popup do navegador)
    const askPermission = async () => {
      const granted = await requestNotificationPermission();
      setPermissionGranted(granted);
    };

    // Delay pequeno para não pedir imediatamente ao carregar
    const timer = setTimeout(() => {
      askPermission();
    }, 3000);

    return () => clearTimeout(timer);
  }, [uid]);

  // Assina notificações do Firestore e dispara push para novas
  useEffect(() => {
    if (!uid) return;

    return subscribeMyNotifications(uid, (list) => {
      // Filtra apenas notificações não lidas recentes
      const unread = list.filter((n) => !n.read);

      // Dispara push para notificações novas que ainda não vimos
      for (const notif of unread) {
        if (!lastNotifIds.current.has(notif.id)) {
          lastNotifIds.current.add(notif.id);

          if (hasNotificationPermission()) {
            // Navegação apropriada conforme o tipo
            const onClick = () => {
              if (notif.type === 'message') {
                window.location.href = `/mensagens/${notif.actorId}`;
              } else if (notif.type === 'review_post' && notif.postId) {
                // Vai para o feed (a página inicial)
                window.location.href = '/';
              }
            };

            fireAppNotificationToPush(notif, onClick);
          }
        }
      }

      // Mantém apenas os últimos 50 IDs para não crescer infinitamente
      if (lastNotifIds.current.size > 50) {
        const idsArray = Array.from(lastNotifIds.current);
        const toRemove = idsArray.slice(0, idsArray.length - 50);
        for (const id of toRemove) {
          lastNotifIds.current.delete(id);
        }
      }

      setNotifications(list);
    });
  }, [uid]);

  /**
   * Função para solicitar permissão manualmente (ex: de um botão nas Configurações)
   */
  const requestPermissionManually = async (): Promise<boolean> => {
    const granted = await requestNotificationPermission();
    setPermissionGranted(granted);
    return granted;
  };

  return {
    notifications,
    permissionGranted,
    requestPermissionManually,
  };
}