# Ryzenth Chat

> **⚠️ Note:** This version is **not actively updated**.
> To run or modify, **download the ZIP file** and open it in **VSCode**.

**Demo:** [https://chat.ryzenths.dpdns.org/](https://chat.ryzenths.dpdns.org/)

![Image](https://github.com/user-attachments/assets/1433a84c-ccdf-49a4-a886-090f9525aebd)

---

## Frontend Example

```tsx
import React, { useState, useRef, useEffect, useCallback } from 'react'

const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'moonshotai/kimi-k2-instruct',
    messages: [],
    stream: true,
  }),
})

const SomethingApp: React.FC = () => {
  // code gey here...
}
export default SomethingApp
```

---

## Backend API / Library

```ts
import OpenAI from 'openai';

const clients = new OpenAI({
  apiKey: "ryzenth-free",
  baseURL: "https://api.ryzenths.dpdns.org/api/v1"
});

const response = await clients.responses.create({
  model: 'gpt-5',
  input: [
    {
      role: "developer",
      content: "Talk like a pirate."
    },
    {
      role: "user",
      content: "Are semicolons optional in JavaScript?",
    }
  ]
});

const completion = await clients.chat.completions.create({
  model: 'moonshotai/kimi-k2-instruct',
  messages: [
    { role: 'system', content: 'Talk like a pirate.' },
    { role: 'user', content: "What's your name?" },
  ],
});

console.log(completion.choices[0].message.content);
console.log(response.output_text);
```

---

## 📝 Environment Variables

| Variable             | Description                                 |
| -------------------- | ------------------------------------------- |
| `MONGODB_URI`        | (Optional) for storing or deleting any file |
| `RYZENTH_API_KEY_AI` | Required for API access (just ignore blank)                  |

> **Important:**
> Starting **October 1, 2025**, the Ryzenth API will **require authentication** for all access.
> You can still use it **for free until September 30, 2025** plan ahead.

---

## 💻 Local Development

```bash
npm install
npm run dev
npm run build
```

---

## 🔗 API Endpoints

* `https://api.ryzenths.dpdns.org/api/v1/chat/completions`

---

## ☁️ Deploy to Vercel

1. Push your code to **GitHub**.
2. Go to [https://vercel.com/new](https://vercel.com/new).
3. Import your repository.
4. Add your **Environment Variables** in the **Vercel Project Settings**:

   * `MONGODB_URI`
   * `RYZENTH_API_KEY_AI`
5. Click **Deploy**.

Your app will be live at `https://domainname.vercel.app/` within seconds.

---

## 📄 License

**MIT License © 2025 Ryzenth Solo Dev from TeamKillerx**

This project is open source and available under the [MIT License](https://github.com/TeamKillerX/r-chat-nextjs/blob/main/LICENSE).
