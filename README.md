# ✍️ TeXit

<div align="center">
  A modern, AI-powered LaTeX editing and sharing platform. Supercharged with Google Gemini, Supabase, and Next.js.
  
  <br />
  <br />

[![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![CodeMirror](https://img.shields.io/badge/CodeMirror-D52228?style=for-the-badge&logo=codemirror&logoColor=white)](https://codemirror.net/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

</div>

---

## ✨ Features

- **📝 Real-time LaTeX Editing:** Top-tier editor experience powered by CodeMirror.
- **👁️ Live Rendering:** Instant preview of your LaTeX documents powered by KaTeX.
- **🤖 AI-Powered Writing:** Integrated Google Gemini API to help draft, format, and debug LaTeX code.
- **🔒 Secure Authentication:** Handled securely with Supabase Auth.
- **📂 Cloud Storage:** Save, manage, and share your `tex` projects directly via Supabase Storage and Database.
- **📄 PDF Export:** Easily export your rendered documents to PDF via jsPDF.
- **🎨 Modern UI/UX:** Built with Tailwind CSS, Radix UI, and customized Shadcn components for a beautiful, responsive interface.

## 🚀 Tech Stack

- **Frontend:** Next.js (App Router), React 19, Tailwind CSS, Radix UI
- **Backend:** Supabase (PostgreSQL, Storage, Auth), Next.js Route Handlers
- **AI Integrations:** `@google/generative-ai` (Gemini API)
- **Editor & Rendering:** CodeMirror 6, KaTeX, `react-katex`

## 🛠️ Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed along with your preferred package manager (`npm`, `yarn`, `pnpm`, or `bun`).

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/moeezs/texit.git
   cd texit
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   pnpm install
   ```

3. Configure Environment Variables:
   Create a `.env.local` file in the root directory and add the following keys:

   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=project-assets

   # Gemini API
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. Run the development server:

   ```bash
   npm run dev
   # or
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```bash
├── app/                  # Next.js App Router (Pages & API routes)
│   ├── api/              # Backend route handlers (projects, messages, profile)
│   ├── auth/             # Supabase auth callbacks
│   ├── dashboard/        # User dashboard
│   ├── editor/           # LaTeX editor workspace
│   └── login/signup/     # Authentication pages
├── components/           # Reusable React components
│   ├── ui/               # Base UI components (Radix/Shadcn)
│   ├── code-editor.tsx   # CodeMirror integration
│   └── latex-renderer.tsx# KaTeX preview
├── lib/                  # Utilities, auth helpers, and Supabase clients
├── public/               # Static assets
└── supabase/             # Database schema and migrations
```

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
