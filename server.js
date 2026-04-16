const express = require('express');

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('MOSSES USSD server is running 🚀');
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    message: 'MOSSES USSD health check OK',
  });
});

app.post('/ussd', async (req, res) => {
  console.log('USSD BODY:', req.body);

  const text = (req.body.text || '').trim();

  let response = '';

  try {
    if (text === '') {
      response = `CON Karibu MOSSES
Choose language / Chagua lugha
1. Kiswahili
2. English`;
    } else if (text === '1') {
      response = `CON Karibu MOSSES
1. Omba Huduma
2. Omba Usafirishaji
3. Omba Errand`;
    } else if (text === '2') {
      response = `CON Welcome to MOSSES
1. Request Service
2. Request Transport
3. Request Errand`;
    } else {
      response = 'END Test OK';
    }
  } catch (e) {
    console.error('USSD ERROR:', e);
    response = 'END System error';
  }

  res.set('Content-Type', 'text/plain');
  res.send(response);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`MOSSES USSD running on port ${PORT}`);
});