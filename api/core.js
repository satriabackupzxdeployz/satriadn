export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('');
  const db = process.env.DB_URL;
  const { action, payload } = req.body;

  try {
    if (action === 'REGISTER') {
      const u = await fetch(`${db}/users/${payload.username}.json`).then(r => r.json());
      if (u) return res.status(400).json({ e: 'Username sudah terdaftar' });
      await fetch(`${db}/users/${payload.username}.json`, {
        method: 'PUT',
        body: JSON.stringify({ 
          pw: payload.password, 
          pic: 'https://files.clxgo.my.id/9CWgw.jpeg',
          urlngl: `${payload.host}/${payload.username}`
        })
      });
      return res.json({ ok: true });
    }
    
    if (action === 'LOGIN') {
      const u = await fetch(`${db}/users/${payload.username}.json`).then(r => r.json());
      if (!u || u.pw !== payload.password) return res.status(400).json({ e: 'Username atau password salah' });
      return res.json({ ok: true });
    }

    if (action === 'GET_DATA') {
      const u = await fetch(`${db}/users/${payload.username}.json`).then(r => r.json());
      const m = await fetch(`${db}/messages/${payload.username}.json`).then(r => r.json());
      if (!u) return res.status(404).json({ e: 'Not found' });
      return res.json({ pic: u.pic, urlngl: u.urlngl, messages: m || {} });
    }

    if (action === 'UPDATE_PIC') {
      await fetch(`${db}/users/${payload.username}/pic.json`, { method: 'PUT', body: JSON.stringify(payload.pic) });
      return res.json({ ok: true });
    }

    if (action === 'DELETE_ACC') {
      await fetch(`${db}/users/${payload.username}.json`, { method: 'DELETE' });
      await fetch(`${db}/messages/${payload.username}.json`, { method: 'DELETE' });
      return res.json({ ok: true });
    }

    if (action === 'READ_MSG') {
      await fetch(`${db}/messages/${payload.username}/${payload.id}/read.json`, { method: 'PUT', body: 'true' });
      return res.json({ ok: true });
    }

    if (action === 'SEND_MSG') {
      const d = new Date();
      const msgId = Date.now();
      const msg = {
        id: msgId,
        sender: payload.sender,
        text: payload.text,
        media: payload.media || null,
        timestamp: d.toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric' }),
        read: false
      };
      
      // Save message to Firebase
      await fetch(`${db}/messages/${payload.to}/${msgId}.json`, { method: 'PUT', body: JSON.stringify(msg) });

      // Send to Telegram
      try {
        const cap = `Pesan Baru NGL\nUntuk: ${payload.to}\nDari: ${payload.sender}\n\nPesan:\n${payload.text}`;
        if (payload.media) {
          const buf = Buffer.from(payload.media.split(',')[1], 'base64');
          const blb = new Blob([buf], { type: 'image/jpeg' });
          const fd = new FormData();
          fd.append('chat_id', process.env.TG_ID);
          fd.append('photo', blb, 'img.jpg');
          fd.append('caption', cap);
          await fetch(`https://api.telegram.org/bot${process.env.TG_TOKEN}/sendPhoto`, { method: 'POST', body: fd });
        } else {
          await fetch(`https://api.telegram.org/bot${process.env.TG_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: process.env.TG_ID, text: cap })
          });
        }
      } catch (e) {}

      return res.json({ ok: true });
    }

    if (action === 'GET_PROFILE') {
      const u = await fetch(`${db}/users/${payload.username}.json`).then(r => r.json());
      if (!u) return res.status(404).json({ e: 'Not found' });
      return res.json({ pic: u.pic });
    }

  } catch (err) {
    return res.status(500).json({ e: 'Server error' });
  }
  
  res.status(400).send('');
}