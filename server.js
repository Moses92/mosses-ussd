const express = require('express');

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('MOSSES USSD server is running 🚀');
});

app.get('/health', (req, res) => {
  res.json({ ok: true, message: 'health ok' });
});

app.all('/ussd', (req, res) => {
  console.log('USSD HIT METHOD:', req.method);
  console.log('USSD BODY:', req.body);
  console.log('USSD QUERY:', req.query);

  const text = (req.body?.text || req.query?.text || '').trim();

  let response = '';

  if (text === '') {
    response = `CON Karibu MOSSES
1. Omba Huduma
2. Omba Usafirishaji
3. Omba Errand`;
  } else {
    response = 'END Test OK';
  }

  res.set('Content-Type', 'text/plain');
  res.status(200).send(response);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`MOSSES USSD running on port ${PORT}`);
});