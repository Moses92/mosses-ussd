app.get('/health', (req, res) => {
  res.json({
    ok: true,
    message: 'MOSSES USSD health check OK',
  });
});

app.post('/ussd', async (req, res) => {
  console.log('USSD BODY:', req.body);

  const { phoneNumber, text = '' } = req.body;

  let response = '';

  try {
    if (text === '') {
      response = `CON Karibu MOSSES
Choose language / Chagua lugha
1. Kiswahili
2. English`;
    } else if (text === '1' || text === '2') {
      const lang = text === '2' ? 'en' : 'sw';
      response =
        lang === 'en'
          ? `CON Welcome to MOSSES
1. Request Service
2. Request Transport
3. Request Errand`
          : `CON Karibu MOSSES
1. Omba Huduma
2. Omba Usafirishaji
3. Omba Errand`;
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