type Translate = (key: string) => string

export async function readApiErrorMessage(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const payload = (await response.json().catch(() => null)) as { error?: unknown } | null

    if (typeof payload?.error === 'string' && payload.error.trim()) {
      return payload.error.trim()
    }
  } else {
    const text = await response.text().catch(() => '')

    if (text.trim()) {
      return text.trim()
    }
  }

  return null
}

export function mapAuthErrorMessage(errorMessage: string | null | undefined, t: Translate) {
  const normalized = errorMessage?.trim().toLowerCase() ?? ''

  if (!normalized) {
    return t('errors.generic')
  }

  if (normalized.includes('invalid login credentials')) {
    return t('errors.invalidCredentials')
  }

  if (
    normalized.includes('email not confirmed') ||
    normalized.includes('email not verified') ||
    normalized.includes('confirm your email')
  ) {
    return t('errors.emailNotConfirmed')
  }

  if (
    normalized.includes('user already registered') ||
    normalized.includes('already been registered') ||
    normalized.includes('already registered')
  ) {
    return t('errors.accountExists')
  }

  if (normalized.includes('password should be at least')) {
    return t('errors.passwordTooShort')
  }

  if (normalized.includes('rate limit')) {
    return t('errors.rateLimit')
  }

  return errorMessage?.trim() || t('errors.generic')
}

export function resolveApiErrorMessage(
  errorMessage: string | null | undefined,
  fallbackMessage: string,
) {
  return errorMessage?.trim() || fallbackMessage
}
