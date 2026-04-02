import enMessages from '../../messages/en.json'

type Messages = Record<string, unknown>

function mergeMessages(base: Messages, overrides: Messages): Messages {
  const merged: Messages = { ...base }

  for (const [key, value] of Object.entries(overrides)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === 'object' &&
      !Array.isArray(base[key])
    ) {
      merged[key] = mergeMessages(base[key] as Messages, value as Messages)
    } else {
      merged[key] = value
    }
  }

  return merged
}

export async function loadMessages(locale: string): Promise<Messages> {
  if (locale === 'en') {
    return enMessages as Messages
  }

  const localizedMessages = (
    await import(`../../messages/${locale}.json`).catch(() => ({ default: {} }))
  ).default as Messages

  return mergeMessages(enMessages as Messages, localizedMessages)
}

export function getMessage(
  messages: Messages,
  path: string,
  values?: Record<string, string | number>,
): string {
  const rawValue = path
    .split('.')
    .reduce<unknown>((currentValue, segment) => {
      if (!currentValue || typeof currentValue !== 'object' || Array.isArray(currentValue)) {
        return undefined
      }

      return (currentValue as Messages)[segment]
    }, messages)

  if (typeof rawValue !== 'string') {
    return path
  }

  if (!values) {
    return rawValue
  }

  return Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    rawValue,
  )
}
