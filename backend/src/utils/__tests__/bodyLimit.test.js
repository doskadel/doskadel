const express = require('express');
const request = require('supertest');

// Проверяем, что лимит body поднят до 2mb (ревью 2026-10-17):
// 300kb JSON с кириллицей проходит, а не режется дефолтными 100kb.
const makeApp = () => {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.post('/echo', (req, res) => res.json({ ok: true, len: JSON.stringify(req.body).length }));
  return app;
};

describe('express.json body limit', () => {
  const app = makeApp();

  test('300kb JSON проходит (не 413)', async () => {
    const big = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'я'.repeat(150000) }] }] };
    const res = await request(app).post('/echo').send(big);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('> 2mb -> 413', async () => {
    const huge = { text: 'x'.repeat(2.5 * 1024 * 1024) };
    const res = await request(app).post('/echo').send(huge);
    expect(res.status).toBe(413);
  });
});
