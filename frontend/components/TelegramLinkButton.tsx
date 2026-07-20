'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

export default function TelegramLinkButton({ alreadyLinked }: { alreadyLinked: boolean }) {
  const [loading, setLoading] = useState(false);

  async function link() {
    setLoading(true);
    try {
      const res = await fetch('/api/telegram-link', { method: 'POST' });
      const { deepLink } = await res.json();
      window.open(deepLink, '_blank');
    } finally {
      setLoading(false);
    }
  }

  if (alreadyLinked) {
    return <p className="text-sm text-clear">✓ Telegram linked — you'll get pings on both channels.</p>;
  }

  return (
    <button
      onClick={link}
      disabled={loading}
      className="flex items-center gap-2 rounded-instrument border border-haze-50 bg-panel px-4 py-2 text-sm text-ink hover:bg-panelRaised disabled:opacity-50"
    >
      <Send size={16} />
      {loading ? 'Opening Telegram…' : 'Link Telegram'}
    </button>
  );
}
