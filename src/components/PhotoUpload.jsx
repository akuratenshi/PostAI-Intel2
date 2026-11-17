import { useEffect, useRef, useState } from 'react';

export function PhotoUpload({ value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current++; }, []);

  const choose = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const current = ++sequence.current;
    setBusy(true);
    setError('');
    let objectUrl;
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Выберите JPG, PNG или WebP.');
      if (file.size > 12 * 1024 * 1024) throw new Error('Выберите фото размером до 12 МБ.');
      objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = objectUrl;
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error('Не удалось открыть фото.')); });
      if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth * img.naturalHeight > 50000000) throw new Error('Фото слишком большое. Уменьшите его разрешение.');
      if (Math.max(img.naturalWidth / img.naturalHeight, img.naturalHeight / img.naturalWidth) > 20) throw new Error('Выберите фото с менее вытянутыми пропорциями.');
      const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Браузер не поддерживает обработку фото.');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let data;
      for (const quality of [0.86, 0.72, 0.58, 0.44]) {
        data = canvas.toDataURL('image/jpeg', quality);
        if (data.length <= 800000) break;
      }
      if (!data?.startsWith('data:image/jpeg;base64,') || data.length > 800000) throw new Error('Не удалось уменьшить фото. Выберите другое изображение.');
      if (sequence.current === current) onChange(data);
    } catch (err) {
      if (sequence.current === current) setError(err.message);
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (sequence.current === current) setBusy(false);
    }
  };

  return <section style={{ marginBottom: '20px' }}>
    <label className="label">Своя картинка</label>
    {value && <img src={value} alt="Выбранное фото" style={{ display: 'block', width: '100%', maxHeight: '360px', objectFit: 'contain', borderRadius: '10px', marginBottom: '10px' }} />}
    <label className="btn-sm" style={{ display: 'inline-block', cursor: busy ? 'wait' : 'pointer' }}>
      {busy ? 'Подготавливаю фото...' : value ? 'Заменить фото' : 'Загрузить своё фото'}
      <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={choose} style={{ display: 'none' }} />
    </label>
    {value && <button type="button" className="btn-sm" style={{ marginLeft: '8px' }} disabled={busy} onClick={() => onChange(null)}>Убрать фото</button>}
    <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>JPG, PNG или WebP до 12 МБ. Фото автоматически уменьшается. Выбранное фото и правки текста сохранятся в задаче после нажатия «Запланировать»; несохранённые правки исчезнут при обновлении страницы.</p>
    {error && <p role="alert" style={{ color: '#F76E6E' }}>{error}</p>}
  </section>;
}
