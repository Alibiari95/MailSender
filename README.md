# 📨 Startup Email Sender

Bulk email sending with personalization, powered by Cloudflare Workers + MailChannels — no paid services like Mailchimp needed.

---

## ✨ Features

- Upload contact lists from CSV files
- Auto-personalize email content per recipient (`{{name}}`, `{{email}}`, any CSV column)
- Send custom HTML email templates
- Simple browser-based dashboard — no install required
- Batch sending with per-recipient error handling
- 100% free using Cloudflare Workers + MailChannels

---

## 📁 Files

```
├── worker.js           ← Cloudflare Worker (backend)
├── dashboard.html      ← Management dashboard (frontend)
└── email-template.html ← HTML email template
```

---

## 🚀 Setup

### Prerequisites

- A [Cloudflare](https://cloudflare.com) account (free)
- A domain with DNS managed by Cloudflare

---

### Step 1 — Deploy the Worker

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **Create**
3. Select **"Hello World"** and give it a name (e.g. `email-sender`)
4. Replace the default code with the contents of `worker.js`
5. Click **Deploy**

---

### Step 2 — Set Environment Variables

In your Worker: **Settings** → **Variables** → **Add variable**

| Variable | Example Value | Description |
|---|---|---|
| `FROM_EMAIL` | `hello@startup.com` | Sender email address |
| `FROM_NAME` | `Startup Team` | Sender display name |
| `API_SECRET` | any random string | Auth secret for the dashboard |

> ⚠️ Keep your `API_SECRET` somewhere safe — you'll need it in the dashboard settings.

---

### Step 3 — Configure DNS for MailChannels

Add a TXT record to your domain's DNS so MailChannels can send on your behalf:

In Cloudflare DNS:
```
Type:  TXT
Name:  @
Value: v=spf1 a mx include:relay.mailchannels.net ~all
```

> If you already have an SPF record, just append `include:relay.mailchannels.net` to it.

---

### Step 4 — Use the Dashboard

1. Open `dashboard.html` in your browser
2. Go to **⚙️ Settings** and enter your Worker URL and API Secret
3. Click **"Test Connection"** to verify the Worker is reachable

---

## 📋 CSV Format

Your CSV must have at least `name` and `email` columns:

```csv
name,email,company
John Smith,john@example.com,Acme Corp
Jane Doe,jane@example.com,Globex
Bob Johnson,bob@example.com,Initech
```

Any additional columns are available as template variables.

---

## ✍️ Email Personalization

Use `{{column_name}}` anywhere in your HTML template:

```html
<h1>Hello {{name}}!</h1>
<p>This email was sent to {{email}}.</p>
<p>We're excited to work with {{company}}.</p>
```

Every column in your CSV becomes an available variable.

---

## 📤 Sending Emails

1. **✍️ Compose** — Enter a subject line and paste your HTML template (you can use `email-template.html`)
2. **👥 Contacts** — Upload your CSV or paste contacts directly
3. **🚀 Send** — Review the pre-send checklist and start sending with real-time progress

---

## 🔌 Worker API

The Worker exposes two endpoints:

### `POST /send`

Send bulk emails to a list of recipients.

**Headers:** `X-API-Secret: your-secret`

```json
{
  "recipients": [
    { "name": "John", "email": "john@example.com", "company": "Acme" }
  ],
  "template": "<h1>Hello {{name}}, welcome from {{company}}!</h1>",
  "subject": "Welcome, {{name}}!"
}
```

**Response:**
```json
{
  "success": true,
  "sent": 1,
  "failed": 0,
  "results": [{ "email": "john@example.com", "status": "sent" }]
}
```

### `POST /preview`

Personalize and return HTML without sending.

```json
{
  "template": "<h1>Hello {{name}}</h1>",
  "recipient": { "name": "John", "email": "john@example.com" }
}
```

---

## ⚙️ Limits

- Cloudflare Workers free tier: **100,000 requests/day**
- MailChannels: free for Cloudflare Workers with no hard cap
- 100ms delay between sends to avoid rate limiting

---

## 🛟 Troubleshooting

| Issue | Fix |
|---|---|
| Emails landing in spam | Set up a DKIM record for your domain |
| `Unauthorized` error | Double-check API Secret in dashboard and Worker variables |
| Worker not sending | Verify `FROM_EMAIL` environment variable is set |
| DNS/SPF issues | Re-check the SPF TXT record format |

