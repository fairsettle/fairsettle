import { getMessage, loadMessages } from '@/lib/messages'

export function getAiDisclaimer(
  messages: Awaited<ReturnType<typeof loadMessages>>,
) {
  return getMessage(messages, 'ai.disclaimer')
}
