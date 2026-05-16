import type { AppNotification } from './notifications';

/**
 * Verifica se o navegador suporta a Web Notifications API.
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Verifica se já temos permissão para enviar notificações.
 */
export function hasNotificationPermission(): boolean {
  return Notification.permission === 'granted';
}

/**
 * Solicita permissão ao usuário de forma amigável.
 * Retorna `true` se a permissão foi concedida, `false` caso contrário.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  // Se já foi negada permanentemente, não pedir de novo
  if (Notification.permission === 'denied') return false;

  // Se já foi concedida, retorna true
  if (Notification.permission === 'granted') return true;

  // Solicita permissão
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * Envia uma notificação push no dispositivo do usuário.
 * A notificação aparece fora do navegador, no sistema operacional.
 */
export function sendPushNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    data?: Record<string, unknown>;
    onClick?: () => void;
  }
): void {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  const notification = new Notification(title, {
    body: options?.body ?? '',
    icon: options?.icon ?? '/logo.png',
    tag: options?.tag,
    data: options?.data,
    silent: false,
  });

  // Fecha a notificação automaticamente após 8 segundos
  setTimeout(() => notification.close(), 8000);

  // Ação ao clicar na notificação
  if (options?.onClick) {
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      options.onClick!();
      notification.close();
    };
  }
}

/**
 * Converte uma notificação do Firestore para uma notificação push e a envia.
 */
export function fireAppNotificationToPush(
  notification: AppNotification,
  onClick?: () => void
): void {
  if (Notification.permission !== 'granted') return;

  const title = notification.title;
  const body = notification.body;

  sendPushNotification(title, {
    body,
    icon: '/logo.png',
    tag: notification.type === 'message' ? `msg-${notification.actorId}` : `post-${notification.postId}`,
    data: {
      type: notification.type,
      actorId: notification.actorId,
      postId: notification.postId,
      notifId: notification.id,
    },
    onClick,
  });
}