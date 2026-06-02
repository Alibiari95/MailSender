/**
 * Cloudflare Worker — Bulk Email Sender
 * 
 * راه‌اندازی:
 * 1. این فایل رو به Cloudflare Workers deploy کن
 * 2. متغیرهای محیطی زیر رو در Dashboard تنظیم کن:
 *    - MAILCHANNELS_API_KEY  (اگه از MailChannels استفاده می‌کنی)
 *    - FROM_EMAIL            مثلاً: hello@startup.com
 *    - FROM_NAME             مثلاً: تیم استارتاپ
 *    - API_SECRET            یه رشته تصادفی برای احراز هویت داشبورد
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Secret",
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // ===== Route: POST /send =====
    if (request.method === "POST" && url.pathname === "/send") {
      return handleSend(request, env);
    }

    // ===== Route: POST /preview =====
    if (request.method === "POST" && url.pathname === "/preview") {
      return handlePreview(request, env);
    }

    return new Response("Not Found", { status: 404 });
  },
};

// ────────────────────────────────────────────────
// Preview: جایگذاری متغیرها بدون ارسال
// ────────────────────────────────────────────────
async function handlePreview(request, env) {
  try {
    const { template, recipient } = await request.json();
    const personalized = personalizeTemplate(template, recipient);
    return new Response(JSON.stringify({ html: personalized }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ────────────────────────────────────────────────
// Send: ارسال bulk با MailChannels
// ────────────────────────────────────────────────
async function handleSend(request, env) {
  // احراز هویت
  const secret = request.headers.get("X-API-Secret");
  if (env.API_SECRET && secret !== env.API_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const { recipients, template, subject } = await request.json();

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return errorResponse("لیست مخاطبین خالی است");
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const recipient of recipients) {
      try {
        const personalizedHtml = personalizeTemplate(template, recipient);
        const personalizedSubject = personalizeTemplate(subject, recipient);

        await sendEmail(env, {
          to: recipient.email,
          toName: recipient.name || "",
          subject: personalizedSubject,
          html: personalizedHtml,
        });

        results.push({ email: recipient.email, status: "sent" });
        successCount++;

        // جلوگیری از rate limiting — ۱۰۰ms بین هر ارسال
        await sleep(100);
      } catch (err) {
        results.push({ email: recipient.email, status: "failed", error: err.message });
        failCount++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: successCount, failed: failCount, results }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ────────────────────────────────────────────────
// جایگذاری متغیرها در template
// متغیرهای پشتیبانی‌شده: {{name}}, {{email}}, {{هر فیلدی در CSV}}
// ────────────────────────────────────────────────
function personalizeTemplate(template, recipient) {
  let result = template;
  for (const [key, value] of Object.entries(recipient)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
    result = result.replace(regex, value || "");
  }
  return result;
}

// ────────────────────────────────────────────────
// ارسال ایمیل از طریق MailChannels
// (رایگان برای Cloudflare Workers — بدون نیاز به API key)
// ────────────────────────────────────────────────
async function sendEmail(env, { to, toName, subject, html }) {
  const payload = {
    personalizations: [
      {
        to: [{ email: to, name: toName }],
      },
    ],
    from: {
      email: env.FROM_EMAIL || "hello@startup.com",
      name: env.FROM_NAME || "Startup",
    },
    subject,
    content: [{ type: "text/html; charset=utf-8", value: html }],
  };

  const response = await fetch("https://api.mailchannels.net/tx/v1/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok && response.status !== 202) {
    const text = await response.text();
    throw new Error(`MailChannels error ${response.status}: ${text}`);
  }

  return true;
}

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────
function errorResponse(message) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
