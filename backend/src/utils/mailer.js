const RESEND_KEY = process.env.RESEND_API_KEY || '';
const MAIL_FROM = process.env.MAIL_FROM || 'DoskaDel <noreply@mail.doskadel.ru>';
const APP_URL = process.env.APP_URL || 'https://doskadel.ru';

/**
 * Отправка письма через Resend (https://resend.com). Без ключа — no-op (лог).
 * Не бросает наружу: ошибки логируются, регистрация не падает из-за почты.
 */
async function sendMail({ to, subject, html }) {
  if (!RESEND_KEY) {
    console.warn('[mailer] RESEND_API_KEY не задан — письмо не отправлено:', subject, '->', to);
    return { skipped: true };
  }
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: MAIL_FROM, to, subject, html }),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      console.error('[mailer] Resend error', resp.status, text);
      return { ok: false, status: resp.status };
    }
    return { ok: true };
  } catch (e) {
    console.error('[mailer] send error:', e?.message || e);
    return { ok: false };
  }
}

/** Шаблон письма подтверждения. */
function verifyEmailHtml(username, link) {
  return `<!doctype html><html lang="ru"><body style="margin:0;padding:0;background:#f3f5f8;font-family:Arial,sans-serif;color:#1b1f24">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;padding:32px">
    <h2 style="margin:0 0 12px">Подтвердите почту</h2>
    <p>Здравствуйте, ${username}!</p>
    <p>Вы зарегистрировались в DoskaDel. Подтвердите адрес почты, чтобы завершить регистрацию.</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${link}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">Подтвердить почту</a>
    </p>
    <p style="color:#6b7280;font-size:13px">Если кнопка не работает, откройте ссылку: <br><a href="${link}">${link}</a></p>
    <p style="color:#6b7280;font-size:13px">Ссылка действует 24 часа. Если вы не регистрировались — просто проигнорируйте письмо.</p>
  </div>
</body></html>`;
}

/** Шаблон письма сброса пароля. */
function resetPasswordHtml(username, link) {
  return `<!doctype html><html lang="ru"><body style="margin:0;padding:0;background:#f3f5f8;font-family:Arial,sans-serif;color:#1b1f24">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;padding:32px">
    <h2 style="margin:0 0 12px">Восстановление пароля</h2>
    <p>Здравствуйте, ${username}!</p>
    <p>Вы (или кто-то другой) запросили сброс пароля в DoskaDel. Если это были вы — нажмите кнопку ниже.</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${link}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">Задать новый пароль</a>
    </p>
    <p style="color:#6b7280;font-size:13px">Ссылка действует 1 час. Если вы не запрашивали сброс — просто проигнорируйте письмо, пароль останется прежним.</p>
  </div>
</body></html>`;
}

module.exports = { sendMail, verifyEmailHtml, resetPasswordHtml, APP_URL };
