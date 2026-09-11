/**
 * Browser Notification Helper for ConvertX
 * Handles browser desktop notifications and tab background status updates
 * when batch conversion queues complete.
 */

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return Notification.permission;
  }
}

export interface BatchNotificationDetails {
  completedCount: number;
  totalCount: number;
  failedCount?: number;
}

/**
 * Dispatches an OS/browser desktop notification when a batch queue finishes.
 * Also flashes the background tab title so the user is immediately aware in their browser tab bar.
 */
export function sendBatchCompleteNotification(details: BatchNotificationDetails) {
  const { completedCount, totalCount, failedCount = 0 } = details;

  // 1. Send desktop notification if supported and granted
  if (isNotificationSupported() && Notification.permission === 'granted') {
    const hasErrors = failedCount > 0;
    const title = hasErrors
      ? `ConvertX: Batch Queue Done with ${failedCount} Error${failedCount > 1 ? 's' : ''}`
      : `ConvertX: Batch Conversion Completed! 🎉`;

    let body = '';
    if (totalCount === 1) {
      body = hasErrors
        ? 'Your file encountered a conversion error. Click to inspect details.'
        : 'Your converted file is ready for download!';
    } else {
      body = hasErrors
        ? `${completedCount} of ${totalCount} files converted successfully (${failedCount} failed). Click to view results.`
        : `All ${completedCount} file${completedCount === 1 ? '' : 's'} in your batch queue have completed and are ready for download.`;
    }

    try {
      const options: NotificationOptions & { renotify?: boolean } = {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'convertx-batch-complete',
        renotify: true,
        requireInteraction: false,
      };
      const notification = new Notification(title, options);

      notification.onclick = () => {
        try {
          window.focus();
        } catch {
          // ignore
        }
        notification.close();
      };
    } catch (err) {
      console.error('Failed to trigger browser notification:', err);
    }
  }

  // 2. Background Tab Alert: If user is on another tab (document.hidden is true), flash document title
  if (typeof document !== 'undefined' && document.hidden) {
    const originalTitle = document.title;
    let flashes = 0;
    const interval = setInterval(() => {
      flashes++;
      document.title = flashes % 2 === 1 ? `(✓ Batch Ready!) ${originalTitle}` : originalTitle;
      if (flashes >= 14 || !document.hidden) {
        clearInterval(interval);
        document.title = originalTitle;
      }
    }, 1000);

    const onVisible = () => {
      clearInterval(interval);
      document.title = originalTitle;
      document.removeEventListener('visibilitychange', onVisible);
    };
    document.addEventListener('visibilitychange', onVisible);
  }
}
