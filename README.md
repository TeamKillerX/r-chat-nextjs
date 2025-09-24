Demo: https://chat.ryzenths.dpdns.org/

![Image](https://github.com/user-attachments/assets/1433a84c-ccdf-49a4-a886-090f9525aebd)

## Frontend

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
  .........
}
export default SomethingApp
```

## Backend API/Library
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

##  Environment
- `MONGODB_URI`: (Optional) if you can delete any file
- `RYZENTH_API_KEY_AI`: (for blank)

> **Important Note:**
> Remember, **starting October 1**, Ryzenth API will require **authentication for all API access**. However,
> You can still use it for **free until September 30**. Plan accordingly

## Command Terminal
```bash
- npm run dev
- npm build
- npm install
```

## Endpoints
- `https://api.ryzenths.dpdns.org/api/v1/chat/completions`

## License

**MIT License © 2025 Ryzenth Solo Dev from TeamKillerx**

This project is open source and available under the [MIT License](https://github.com/TeamKillerX/r-chat-nextjs/blob/main/LICENSE).
