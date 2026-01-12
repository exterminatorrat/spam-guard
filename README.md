# 🛡️ SpamGuard API

**Stop Spam Signups Without Captchas.**

SpamGuard is a blazing-fast, stateless API that detects disposable emails and bot-generated usernames instantly.

## ✨ Features

- **⚡ Zero Latency:** No heavy database lookups. Serverless architecture with instant cold starts.
- **🧠 Smart Heuristics:** Uses Shannon Entropy math to catch keyboard smashes (e.g., `x8z9q2p`) that bypass traditional filters.
- **🔒 Privacy First:** We never store your users' emails.
- **🌐 Full CORS:** Call from any frontend without restrictions.

## 🚀 Quick Start

```bash
curl "https://spam-guard-api.vercel.app/api/check?email=test@example.com"
```

## 📊 Response Format

```json
{
  "email": "user@example.com",
  "is_valid_format": true,
  "is_disposable": false,
  "risk_score": 25,
  "recommended_action": "allow",
  "details": {
    "entropy": 3.12,
    "digit_ratio": 0.15,
    "vowel_ratio": 0.42,
    "flags": ["No suspicious patterns detected"]
  }
}
```

## 🎯 Risk Scoring

| Score | Action | Meaning |
|-------|--------|---------|
| 0-39 | `allow` | ✅ Legitimate user |
| 40-69 | `flag` | ⚠️ Review recommended |
| 70-100 | `block` | 🚫 High-confidence spam |

## 🧪 Test Cases

```bash
# Legitimate email
curl "https://spam-guard-api.vercel.app/api/check?email=john.doe@gmail.com"
# Score: 0 ✅

# Keyboard smash
curl "https://spam-guard-api.vercel.app/api/check?email=qwrtyhjk123@example.com"
# Score: 50 ⚠️

# Disposable email
curl "https://spam-guard-api.vercel.app/api/check?email=test@tempmail.com"
# Score: 100 🚫
```

## 🛠️ Technology

- **Framework:** Vercel Serverless Functions (Node.js)
- **Dependencies:** ZERO - Uses only native fetch and Math modules
- **Detection Methods:**
  - 10,000+ disposable domain blocklist
  - Shannon Entropy analysis
  - Digit density heuristics
  - Vowel ratio (keyboard smash detection)

## 💰 Pricing

Available on [RapidAPI](https://rapidapi.com):

- **Basic:** Free (500 requests/month)
- **Pro:** $9/month (10,000 requests)
- **Scale:** $29/month (Unlimited)

## 📝 License

MIT License - Free to use and modify

---

**Built with ❤️ by developers, for developers.**