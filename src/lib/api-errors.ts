import 'server-only'

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  type SupportedLocale,
} from '@/lib/locale-path'

export type ApiLocale = SupportedLocale

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_FAILED'
  | 'CASE_NOT_FOUND'
  | 'INVITATION_NOT_FOUND'
  | 'INVITATION_ALREADY_ACCEPTED'
  | 'INVITATION_ACTIVE_EXISTS'
  | 'INVITATION_CASE_ID_REQUIRED'
  | 'SELF_INVITE_NOT_ALLOWED'
  | 'NO_REVIEW_ITEMS'
  | 'REVIEW_ITEMS_MISMATCH'
  | 'QUESTION_INVALID_FOR_CASE'
  | 'PHASE_NOT_ACTIVE'
  | 'PHASE_INCOMPLETE'
  | 'CHILD_ID_REQUIRED'
  | 'CHILD_ID_NOT_ALLOWED'
  | 'CHILD_INVALID_FOR_CASE'
  | 'NO_RESPONSES_FOUND'
  | 'COMPARISON_NOT_READY'
  | 'RESOLUTION_NOT_READY'
  | 'RESOLUTION_ITEM_NOT_FOUND'
  | 'RESOLUTION_ITEM_NOT_READY'
  | 'CASE_NOT_READY_FOR_COMPLETION'
  | 'EXPORT_NOT_READY'
  | 'EXPORT_SINGLE_PARTY_FREE'
  | 'EXPORT_INITIATOR_ONLY'
  | 'EXPORT_UNLOCK_REQUIRES_CONFIRMATION'
  | 'PROFILE_INCOMPLETE'
  | 'APP_URL_NOT_CONFIGURED'
  | 'STRIPE_NOT_CONFIGURED'
  | 'CHECKOUT_CREATION_FAILED'
  | 'SIGNATURE_MISSING'
  | 'SIGNATURE_INVALID'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'ACCOUNT_EXISTS'
  | 'PASSWORD_TOO_SHORT'
  | 'RATE_LIMITED'
  | 'FETCH_FAILED'
  | 'SAVE_FAILED'
  | 'CREATE_CASE_FAILED'
  | 'CREATE_INVITATION_FAILED'
  | 'SEND_INVITATION_FAILED'
  | 'CASE_UPDATE_FAILED'
  | 'CASE_DELETE_FORBIDDEN'
  | 'CASE_DELETE_FAILED'
  | 'QUESTION_FLOW_LOAD_FAILED'
  | 'INTERNAL_ERROR'

type ApiErrorDictionary = Record<ApiErrorCode, string>

const EN_MESSAGES: ApiErrorDictionary = {
    UNAUTHORIZED: 'Please sign in to continue.',
    FORBIDDEN: 'You do not have access to this.',
    VALIDATION_FAILED: 'Please check the information you entered and try again.',
    CASE_NOT_FOUND: 'We could not find that case.',
    INVITATION_NOT_FOUND: 'We could not find that invitation.',
    INVITATION_ALREADY_ACCEPTED: 'This invitation has already been accepted.',
    INVITATION_ACTIVE_EXISTS: 'An active invitation already exists for this email address.',
    INVITATION_CASE_ID_REQUIRED: 'A case is required before invitations can be loaded.',
    SELF_INVITE_NOT_ALLOWED: 'You cannot invite your own email address to this case.',
    NO_REVIEW_ITEMS: 'There are no review items available for this invitation.',
    REVIEW_ITEMS_MISMATCH: 'Your review answers do not match the items on this invitation.',
    QUESTION_INVALID_FOR_CASE: 'This question is not valid for this case.',
    PHASE_NOT_ACTIVE: 'There is no active phase ready to submit right now.',
    PHASE_INCOMPLETE: 'Please answer every question in this phase before submitting.',
    CHILD_ID_REQUIRED: 'This question needs a child to be selected.',
    CHILD_ID_NOT_ALLOWED: 'This question does not accept a child-specific answer.',
    CHILD_INVALID_FOR_CASE: 'That child is not linked to this case.',
    NO_RESPONSES_FOUND: 'There are no answers ready to submit for this case yet.',
    COMPARISON_NOT_READY: 'The comparison will unlock once both parents have finished their answers.',
    RESOLUTION_NOT_READY: 'Resolution suggestions are not ready yet.',
    RESOLUTION_ITEM_NOT_FOUND: 'We could not find that resolution item.',
    RESOLUTION_ITEM_NOT_READY: 'That resolution item is not ready yet.',
    CASE_NOT_READY_FOR_COMPLETION: 'This case is not ready for completion confirmation yet.',
    EXPORT_NOT_READY: 'Your case pack is not ready yet.',
    EXPORT_SINGLE_PARTY_FREE: 'Single-party exports do not need payment.',
    EXPORT_INITIATOR_ONLY: 'Only the initiator can purchase exports.',
    EXPORT_UNLOCK_REQUIRES_CONFIRMATION:
      'Both parents must confirm they are satisfied before export is unlocked.',
    PROFILE_INCOMPLETE: 'Complete your family profile before creating a new case.',
    APP_URL_NOT_CONFIGURED: 'The application URL is not configured.',
    STRIPE_NOT_CONFIGURED: 'Payments are not configured yet.',
    CHECKOUT_CREATION_FAILED: 'We could not start checkout. Please try again.',
    SIGNATURE_MISSING: 'The required signature is missing.',
    SIGNATURE_INVALID: 'The request signature is invalid.',
    INVALID_CREDENTIALS: 'Your email address or password is incorrect.',
    EMAIL_NOT_CONFIRMED: 'Please confirm your email address before signing in.',
    ACCOUNT_EXISTS: 'An account with this email address already exists.',
    PASSWORD_TOO_SHORT: 'Your password is too short.',
    RATE_LIMITED: 'Too many attempts were made. Please wait and try again.',
    FETCH_FAILED: 'We could not load this information right now.',
    SAVE_FAILED: 'We could not save your changes.',
    CREATE_CASE_FAILED: 'We could not create the case.',
    CREATE_INVITATION_FAILED: 'We could not create the invitation.',
    SEND_INVITATION_FAILED: 'We could not send the invitation email.',
    CASE_UPDATE_FAILED: 'We could not update the case.',
    CASE_DELETE_FORBIDDEN: 'Only draft cases can be deleted by the initiator.',
    CASE_DELETE_FAILED: 'We could not delete the case.',
    QUESTION_FLOW_LOAD_FAILED: 'We could not load the question flow.',
    INTERNAL_ERROR: 'Something went wrong. Please try again.',
  }

const MESSAGES: Record<ApiLocale, ApiErrorDictionary> = {
  en: EN_MESSAGES,
  pl: {
    UNAUTHORIZED: 'Zaloguj się, aby kontynuować.',
    FORBIDDEN: 'Nie masz dostępu do tego miejsca.',
    VALIDATION_FAILED: 'Sprawdź wprowadzone informacje i spróbuj ponownie.',
    CASE_NOT_FOUND: 'Nie mogliśmy znaleźć tej sprawy.',
    INVITATION_NOT_FOUND: 'Nie mogliśmy znaleźć tego zaproszenia.',
    INVITATION_ALREADY_ACCEPTED: 'To zaproszenie zostało już zaakceptowane.',
    INVITATION_ACTIVE_EXISTS: 'Aktywne zaproszenie dla tego adresu e-mail już istnieje.',
    INVITATION_CASE_ID_REQUIRED: 'Aby wczytać zaproszenia, wymagana jest sprawa.',
    SELF_INVITE_NOT_ALLOWED: 'Nie możesz zaprosić do tej sprawy własnego adresu e-mail.',
    NO_REVIEW_ITEMS: 'Dla tego zaproszenia nie ma pozycji do przejrzenia.',
    REVIEW_ITEMS_MISMATCH: 'Twoje odpowiedzi nie pasują do pozycji w tym zaproszeniu.',
    QUESTION_INVALID_FOR_CASE: 'To pytanie nie jest prawidłowe dla tej sprawy.',
    PHASE_NOT_ACTIVE: 'Obecnie nie ma aktywnej fazy gotowej do wysłania.',
    PHASE_INCOMPLETE: 'Odpowiedz na wszystkie pytania w tej fazie przed wysłaniem.',
    CHILD_ID_REQUIRED: 'To pytanie wymaga wskazania dziecka.',
    CHILD_ID_NOT_ALLOWED: 'To pytanie nie przyjmuje odpowiedzi przypisanej do dziecka.',
    CHILD_INVALID_FOR_CASE: 'To dziecko nie jest powiązane z tą sprawą.',
    NO_RESPONSES_FOUND: 'Nie ma jeszcze odpowiedzi gotowych do wysłania.',
    COMPARISON_NOT_READY: 'Porównanie odblokuje się, gdy oboje rodzice zakończą odpowiedzi.',
    RESOLUTION_NOT_READY: 'Sugestie rozwiązania nie są jeszcze gotowe.',
    RESOLUTION_ITEM_NOT_FOUND: 'Nie mogliśmy znaleźć tej pozycji rozwiązania.',
    RESOLUTION_ITEM_NOT_READY: 'Ta pozycja rozwiązania nie jest jeszcze gotowa.',
    CASE_NOT_READY_FOR_COMPLETION: 'Ta sprawa nie jest jeszcze gotowa do potwierdzenia zakończenia.',
    EXPORT_NOT_READY: 'Pakiet sprawy nie jest jeszcze gotowy.',
    EXPORT_SINGLE_PARTY_FREE: 'Eksport jednostronny nie wymaga płatności.',
    EXPORT_INITIATOR_ONLY: 'Eksport może kupić tylko osoba rozpoczynająca sprawę.',
    EXPORT_UNLOCK_REQUIRES_CONFIRMATION:
      'Oboje rodzice muszą potwierdzić satysfakcję, aby odblokować eksport.',
    PROFILE_INCOMPLETE: 'Uzupełnij profil rodzinny przed utworzeniem nowej sprawy.',
    APP_URL_NOT_CONFIGURED: 'Adres aplikacji nie jest skonfigurowany.',
    STRIPE_NOT_CONFIGURED: 'Płatności nie są jeszcze skonfigurowane.',
    CHECKOUT_CREATION_FAILED: 'Nie udało się rozpocząć płatności. Spróbuj ponownie.',
    SIGNATURE_MISSING: 'Brakuje wymaganego podpisu.',
    SIGNATURE_INVALID: 'Podpis żądania jest nieprawidłowy.',
    INVALID_CREDENTIALS: 'Adres e-mail lub hasło są nieprawidłowe.',
    EMAIL_NOT_CONFIRMED: 'Potwierdź swój adres e-mail przed zalogowaniem.',
    ACCOUNT_EXISTS: 'Konto z tym adresem e-mail już istnieje.',
    PASSWORD_TOO_SHORT: 'Hasło jest zbyt krótkie.',
    RATE_LIMITED: 'Wykonano zbyt wiele prób. Poczekaj i spróbuj ponownie.',
    FETCH_FAILED: 'Nie udało się teraz wczytać tych informacji.',
    SAVE_FAILED: 'Nie udało się zapisać zmian.',
    CREATE_CASE_FAILED: 'Nie udało się utworzyć sprawy.',
    CREATE_INVITATION_FAILED: 'Nie udało się utworzyć zaproszenia.',
    SEND_INVITATION_FAILED: 'Nie udało się wysłać e-maila z zaproszeniem.',
    CASE_UPDATE_FAILED: 'Nie udało się zaktualizować sprawy.',
    CASE_DELETE_FORBIDDEN: 'Tylko wersje robocze mogą zostać usunięte przez inicjatora.',
    CASE_DELETE_FAILED: 'Nie udało się usunąć sprawy.',
    QUESTION_FLOW_LOAD_FAILED: 'Nie udało się wczytać formularza pytań.',
    INTERNAL_ERROR: 'Coś poszło nie tak. Spróbuj ponownie.',
  },
  ro: {
    UNAUTHORIZED: 'Conectează-te pentru a continua.',
    FORBIDDEN: 'Nu ai acces la această zonă.',
    VALIDATION_FAILED: 'Verifică informațiile introduse și încearcă din nou.',
    CASE_NOT_FOUND: 'Nu am putut găsi acest caz.',
    INVITATION_NOT_FOUND: 'Nu am putut găsi această invitație.',
    INVITATION_ALREADY_ACCEPTED: 'Această invitație a fost deja acceptată.',
    INVITATION_ACTIVE_EXISTS: 'Există deja o invitație activă pentru această adresă de e-mail.',
    INVITATION_CASE_ID_REQUIRED: 'Este necesar un caz pentru a încărca invitațiile.',
    SELF_INVITE_NOT_ALLOWED: 'Nu îți poți invita propria adresă de e-mail în acest caz.',
    NO_REVIEW_ITEMS: 'Nu există elemente de revizuit pentru această invitație.',
    REVIEW_ITEMS_MISMATCH: 'Răspunsurile tale de revizuire nu se potrivesc cu elementele invitației.',
    QUESTION_INVALID_FOR_CASE: 'Această întrebare nu este validă pentru acest caz.',
    PHASE_NOT_ACTIVE: 'Nu există nicio etapă activă pregătită pentru trimitere acum.',
    PHASE_INCOMPLETE: 'Răspunde la toate întrebările din această etapă înainte de trimitere.',
    CHILD_ID_REQUIRED: 'Această întrebare necesită selectarea unui copil.',
    CHILD_ID_NOT_ALLOWED: 'Această întrebare nu acceptă un răspuns specific unui copil.',
    CHILD_INVALID_FOR_CASE: 'Acest copil nu este asociat cu acest caz.',
    NO_RESPONSES_FOUND: 'Nu există încă răspunsuri gata de trimis pentru acest caz.',
    COMPARISON_NOT_READY: 'Comparația se va debloca după ce ambii părinți își termină răspunsurile.',
    RESOLUTION_NOT_READY: 'Sugestiile de rezolvare nu sunt încă pregătite.',
    RESOLUTION_ITEM_NOT_FOUND: 'Nu am putut găsi acel element de rezolvare.',
    RESOLUTION_ITEM_NOT_READY: 'Acel element de rezolvare nu este încă pregătit.',
    CASE_NOT_READY_FOR_COMPLETION:
      'Acest caz nu este încă pregătit pentru confirmarea finalizării.',
    EXPORT_NOT_READY: 'Pachetul cazului tău nu este încă pregătit.',
    EXPORT_SINGLE_PARTY_FREE: 'Exporturile individuale nu necesită plată.',
    EXPORT_INITIATOR_ONLY: 'Doar inițiatorul poate cumpăra exporturi.',
    EXPORT_UNLOCK_REQUIRES_CONFIRMATION:
      'Ambii părinți trebuie să confirme că sunt mulțumiți înainte de deblocarea exportului.',
    PROFILE_INCOMPLETE: 'Completează profilul familiei înainte de a crea un caz nou.',
    APP_URL_NOT_CONFIGURED: 'Adresa aplicației nu este configurată.',
    STRIPE_NOT_CONFIGURED: 'Plățile nu sunt încă configurate.',
    CHECKOUT_CREATION_FAILED: 'Nu am putut porni checkout-ul. Încearcă din nou.',
    SIGNATURE_MISSING: 'Lipsește semnătura necesară.',
    SIGNATURE_INVALID: 'Semnătura cererii este invalidă.',
    INVALID_CREDENTIALS: 'Adresa de e-mail sau parola sunt incorecte.',
    EMAIL_NOT_CONFIRMED: 'Confirmă adresa de e-mail înainte de autentificare.',
    ACCOUNT_EXISTS: 'Există deja un cont cu această adresă de e-mail.',
    PASSWORD_TOO_SHORT: 'Parola este prea scurtă.',
    RATE_LIMITED: 'Au fost făcute prea multe încercări. Așteaptă și încearcă din nou.',
    FETCH_FAILED: 'Nu am putut încărca aceste informații acum.',
    SAVE_FAILED: 'Nu am putut salva modificările.',
    CREATE_CASE_FAILED: 'Nu am putut crea cazul.',
    CREATE_INVITATION_FAILED: 'Nu am putut crea invitația.',
    SEND_INVITATION_FAILED: 'Nu am putut trimite e-mailul de invitație.',
    CASE_UPDATE_FAILED: 'Nu am putut actualiza cazul.',
    CASE_DELETE_FORBIDDEN: 'Doar cazurile în stadiu draft pot fi șterse de inițiator.',
    CASE_DELETE_FAILED: 'Nu am putut șterge cazul.',
    QUESTION_FLOW_LOAD_FAILED: 'Nu am putut încărca fluxul de întrebări.',
    INTERNAL_ERROR: 'Ceva nu a mers bine. Te rugăm să încerci din nou.',
  },
  ar: {
    UNAUTHORIZED: 'يرجى تسجيل الدخول للمتابعة.',
    FORBIDDEN: 'ليس لديك صلاحية الوصول إلى هذا.',
    VALIDATION_FAILED: 'يرجى مراجعة المعلومات التي أدخلتها ثم المحاولة مرة أخرى.',
    CASE_NOT_FOUND: 'تعذر العثور على هذه القضية.',
    INVITATION_NOT_FOUND: 'تعذر العثور على هذه الدعوة.',
    INVITATION_ALREADY_ACCEPTED: 'تم قبول هذه الدعوة بالفعل.',
    INVITATION_ACTIVE_EXISTS: 'توجد دعوة نشطة بالفعل لهذا البريد الإلكتروني.',
    INVITATION_CASE_ID_REQUIRED: 'يجب تحديد قضية قبل تحميل الدعوات.',
    SELF_INVITE_NOT_ALLOWED: 'لا يمكنك دعوة بريدك الإلكتروني الخاص إلى هذه القضية.',
    NO_REVIEW_ITEMS: 'لا توجد عناصر للمراجعة في هذه الدعوة.',
    REVIEW_ITEMS_MISMATCH: 'إجابات المراجعة لا تطابق العناصر الموجودة في هذه الدعوة.',
    QUESTION_INVALID_FOR_CASE: 'هذا السؤال غير صالح لهذه القضية.',
    PHASE_NOT_ACTIVE: 'لا توجد مرحلة نشطة جاهزة للإرسال الآن.',
    PHASE_INCOMPLETE: 'يرجى الإجابة على جميع أسئلة هذه المرحلة قبل الإرسال.',
    CHILD_ID_REQUIRED: 'هذا السؤال يتطلب تحديد طفل.',
    CHILD_ID_NOT_ALLOWED: 'هذا السؤال لا يقبل إجابة مرتبطة بطفل.',
    CHILD_INVALID_FOR_CASE: 'هذا الطفل غير مرتبط بهذه القضية.',
    NO_RESPONSES_FOUND: 'لا توجد إجابات جاهزة للإرسال لهذه القضية بعد.',
    COMPARISON_NOT_READY: 'سيتم فتح المقارنة عندما يُكمل كلا الوالدين إجاباتهم.',
    RESOLUTION_NOT_READY: 'اقتراحات الحل ليست جاهزة بعد.',
    RESOLUTION_ITEM_NOT_FOUND: 'تعذر العثور على عنصر الحل هذا.',
    RESOLUTION_ITEM_NOT_READY: 'عنصر الحل هذا غير جاهز بعد.',
    CASE_NOT_READY_FOR_COMPLETION: 'هذه القضية ليست جاهزة بعد لتأكيد الإكمال.',
    EXPORT_NOT_READY: 'حزمة القضية ليست جاهزة بعد.',
    EXPORT_SINGLE_PARTY_FREE: 'التصدير من طرف واحد لا يحتاج إلى دفع.',
    EXPORT_INITIATOR_ONLY: 'فقط منشئ القضية يمكنه شراء التصدير.',
    EXPORT_UNLOCK_REQUIRES_CONFIRMATION:
      'يجب أن يؤكد كلا الوالدين رضاهما قبل فتح التصدير.',
    PROFILE_INCOMPLETE: 'أكمل ملف العائلة قبل إنشاء قضية جديدة.',
    APP_URL_NOT_CONFIGURED: 'رابط التطبيق غير مُعد.',
    STRIPE_NOT_CONFIGURED: 'الدفع غير مُعد بعد.',
    CHECKOUT_CREATION_FAILED: 'تعذر بدء صفحة الدفع. يرجى المحاولة مرة أخرى.',
    SIGNATURE_MISSING: 'التوقيع المطلوب مفقود.',
    SIGNATURE_INVALID: 'توقيع الطلب غير صالح.',
    INVALID_CREDENTIALS: 'عنوان البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    EMAIL_NOT_CONFIRMED: 'يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول.',
    ACCOUNT_EXISTS: 'يوجد حساب بالفعل بهذا البريد الإلكتروني.',
    PASSWORD_TOO_SHORT: 'كلمة المرور قصيرة جدًا.',
    RATE_LIMITED: 'تم إجراء عدد كبير جدًا من المحاولات. يرجى الانتظار ثم المحاولة مرة أخرى.',
    FETCH_FAILED: 'تعذر تحميل هذه المعلومات الآن.',
    SAVE_FAILED: 'تعذر حفظ التغييرات.',
    CREATE_CASE_FAILED: 'تعذر إنشاء القضية.',
    CREATE_INVITATION_FAILED: 'تعذر إنشاء الدعوة.',
    SEND_INVITATION_FAILED: 'تعذر إرسال بريد الدعوة.',
    CASE_UPDATE_FAILED: 'تعذر تحديث القضية.',
    CASE_DELETE_FORBIDDEN: 'يمكن فقط لمنشئ القضية حذف القضايا في وضع المسودة.',
    CASE_DELETE_FAILED: 'تعذر حذف القضية.',
    QUESTION_FLOW_LOAD_FAILED: 'تعذر تحميل مسار الأسئلة.',
    INTERNAL_ERROR: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
  },
  es: EN_MESSAGES,
  fr: EN_MESSAGES,
  de: EN_MESSAGES,
}

function parseAcceptLanguage(header: string | null): ApiLocale | null {
  if (!header) {
    return null
  }

  const candidates = header
    .split(',')
    .map((entry) => entry.trim().split(';')[0]?.toLowerCase())
    .filter(Boolean) as string[]

  for (const candidate of candidates) {
    const base = candidate.split('-')[0]

    if (isSupportedLocale(base)) {
      return base
    }
  }

  return null
}

export function mapAuthErrorCode(errorMessage: string | null | undefined): ApiErrorCode {
  const normalized = errorMessage?.trim().toLowerCase() ?? ''

  if (
    normalized.includes('email not confirmed') ||
    normalized.includes('email not verified') ||
    normalized.includes('confirm your email')
  ) {
    return 'EMAIL_NOT_CONFIRMED'
  }

  if (
    normalized.includes('user already registered') ||
    normalized.includes('already been registered') ||
    normalized.includes('already registered')
  ) {
    return 'ACCOUNT_EXISTS'
  }

  if (normalized.includes('password should be at least')) {
    return 'PASSWORD_TOO_SHORT'
  }

  if (normalized.includes('rate limit')) {
    return 'RATE_LIMITED'
  }

  if (normalized.includes('invalid login credentials')) {
    return 'INVALID_CREDENTIALS'
  }

  return 'INTERNAL_ERROR'
}

export async function resolveApiLocale(
  req?: Request,
  preferredLocale?: string | null,
): Promise<ApiLocale> {
  const headerLocale = req?.headers.get('x-fairsettle-locale')

  if (isSupportedLocale(headerLocale)) {
    return headerLocale
  }

  if (isSupportedLocale(preferredLocale)) {
    return preferredLocale
  }

  const cookieLocale = cookies().get('NEXT_LOCALE')?.value

  if (isSupportedLocale(cookieLocale)) {
    return cookieLocale
  }

  return parseAcceptLanguage(req?.headers.get('accept-language') ?? null) ?? DEFAULT_LOCALE
}

export async function apiError(
  req: Request | undefined,
  code: ApiErrorCode,
  status: number,
  options?: {
    preferredLocale?: string | null
    details?: unknown
  },
) {
  const locale = await resolveApiLocale(req, options?.preferredLocale)
  const message = MESSAGES[locale][code] ?? MESSAGES.en[code] ?? MESSAGES.en.INTERNAL_ERROR

  return NextResponse.json(
    {
      error: buildApiErrorPayload(code, message, status, options?.details),
    },
    { status },
  )
}

export function buildApiErrorPayload(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown,
) {
  return {
    code,
    message,
    status,
    details,
  }
}

export async function getApiErrorPayload(
  req: Request | undefined,
  code: ApiErrorCode,
  status: number,
  options?: {
    preferredLocale?: string | null
    details?: unknown
  },
) {
  const locale = await resolveApiLocale(req, options?.preferredLocale)
  const message = MESSAGES[locale][code] ?? MESSAGES.en[code] ?? MESSAGES.en.INTERNAL_ERROR

  return buildApiErrorPayload(code, message, status, options?.details)
}
