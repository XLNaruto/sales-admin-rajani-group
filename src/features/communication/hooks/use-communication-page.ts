import { useThreads } from '../api/use-communication'
import { useWhatsAppLog } from '../api/use-whatsapp'

/**
 * Orchestrates the communication screen: loads the internal message threads
 * and the WhatsApp send log. The page consumes this and only renders —
 * no data-fetching logic lives in the component.
 */
export function useCommunicationPage() {
  const { data: threads, isLoading: threadsLoading } = useThreads()
  const { data: log, isLoading: logLoading } = useWhatsAppLog()

  return {
    threads: threads ?? [],
    threadsLoading,
    log: log ?? [],
    logLoading,
  }
}
