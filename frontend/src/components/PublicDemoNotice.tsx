import { useEffect, useState } from 'react';

export function PublicDemoNotice() {
  const [publicDemo, setPublicDemo] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/health', { signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then(data => setPublicDemo(data?.public_demo === true))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  if (!publicDemo) return null;
  return <aside role="note" style={{padding: '12px 20px', background: '#111318', color: '#F5F2EB', fontSize: 14, textAlign: 'center'}}>
    Public Offline Demo · Use sample information. Your disposable browser workspace may reset on sleep or restart (24-hour maximum); export your plan to keep it. Live AI is disabled here.{' '}
    <a style={{color: '#64E4C4', textDecoration: 'underline'}} href="https://drive.google.com/file/d/1XDARxC-xE-c1jaHbw7NWyblc-bSfNNmv/view" target="_blank" rel="noreferrer">Watch verified genuine AI</a>
  </aside>;
}
