const express = require('express');
const admin = require('firebase-admin');

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ===== FIREBASE INIT =====
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();

// ===== HELPERS =====
const con = (text) => `CON ${text}`;
const end = (text) => `END ${text}`;
const now = () => admin.firestore.FieldValue.serverTimestamp();

function t(lang, sw, en) {
  return lang === 'en' ? en : sw;
}

function getLang(text) {
  const parts = (text || '').split('*');
  return parts[0] === '2' ? 'en' : 'sw';
}

function mainMenu(lang) {
  return con(
    t(
      lang,
      `Karibu MOSSES
1. Omba Huduma
2. Omba Usafirishaji
3. Omba Errand`,
      `Welcome to MOSSES
1. Request Service
2. Request Transport
3. Request Errand`
    )
  );
}

async function saveRequest(data) {
  await db.collection('spores').add({
    ...data,
    status: 'open',
    createdAt: now(),
    updatedAt: now(),
    source: 'ussd',
    imageUrls: [],
    likesCount: 0,
    viewsCount: 0,
    bidsCount: 0,
    budget: 0,
    category: 'other',
  });
}

// ===== BASIC ROUTES =====
app.get('/', (req, res) => {
  res.send('MOSSES USSD server is running 🚀');
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    message: 'MOSSES USSD health check OK',
  });
});

// ===== USSD ROUTE =====
app.all('/ussd', async (req, res) => {
  console.log('USSD HIT METHOD:', req.method);
  console.log('USSD BODY:', req.body);
  console.log('USSD QUERY:', req.query);

  const phoneNumber = req.body?.phoneNumber || req.query?.phoneNumber || '';
  const text = (req.body?.text || req.query?.text || '').trim();

  let response = '';

  try {
    // STEP 0: LANGUAGE
    if (text === '') {
      response = con(`Karibu MOSSES
Choose language / Chagua lugha
1. Kiswahili
2. English`);
    }

    // STEP 1: MAIN MENUS
    else if (text === '1' || text === '2') {
      const lang = text === '2' ? 'en' : 'sw';
      response = mainMenu(lang);
    }

    else {
      const parts = text.split('*');
      const lang = getLang(text);

      // ===== SERVICE =====
      if (parts[1] === '1') {
        if (parts.length === 2) {
          response = con(
            t(
              lang,
              'Andika huduma unayohitaji:',
              'Describe the service you need:'
            )
          );
        } else if (parts.length === 3) {
          response = con(
            t(
              lang,
              `Thibitisha:
${parts[2]}
1. Tuma
2. Ghairi`,
              `Confirm:
${parts[2]}
1. Submit
2. Cancel`
            )
          );
        } else if (parts.length === 4) {
          if (parts[3] === '1') {
            await saveRequest({
              customerName: phoneNumber,
              requestType: 'service',
              description: parts[2],
              title: parts[2],
              preferredLanguage: lang,
              needsTransport: false,
            });

            response = end(
              t(
                lang,
                'Ombi la huduma limepokelewa.',
                'Service request received successfully.'
              )
            );
          } else {
            response = end(t(lang, 'Umeghairi.', 'Cancelled.'));
          }
        } else {
          response = end(t(lang, 'Chaguo si sahihi.', 'Invalid option.'));
        }
      }

      // ===== TRANSPORT =====
      else if (parts[1] === '2') {
        if (parts.length === 2) {
          response = con(
            t(
              lang,
              `Unasafirisha nini?
1. Mimi
2. Parcel
3. Goods`,
              `What are you transporting?
1. Myself
2. Parcel
3. Goods`
            )
          );
        }

        // PASSENGER
        else if (parts[2] === '1') {
          if (parts.length === 3) {
            response = con(
              t(lang, 'Weka unapoanzia:', 'Enter pickup location:')
            );
          } else if (parts.length === 4) {
            response = con(
              t(lang, 'Weka unakoenda:', 'Enter destination:')
            );
          } else if (parts.length === 5) {
            response = con(
              t(
                lang,
                `Thibitisha safari:
${parts[3]} → ${parts[4]}
1. Tuma
2. Ghairi`,
                `Confirm trip:
${parts[3]} → ${parts[4]}
1. Submit
2. Cancel`
              )
            );
          } else if (parts.length === 6) {
            if (parts[5] === '1') {
              await saveRequest({
                customerName: phoneNumber,
                requestType: 'transport',
                transportType: 'passenger',
                pickupLocation: parts[3],
                destinationLocation: parts[4],
                locationName: parts[3],
                title:
                  lang === 'en'
                    ? `Trip: ${parts[3]} → ${parts[4]}`
                    : `Safari: ${parts[3]} → ${parts[4]}`,
                description:
                  lang === 'en'
                    ? `Passenger trip from ${parts[3]} to ${parts[4]}.`
                    : `Safari ya abiria kutoka ${parts[3]} kwenda ${parts[4]}.`,
                preferredLanguage: lang,
                needsTransport: true,
              });

              response = end(
                t(
                  lang,
                  'Ombi la usafiri limepokelewa.',
                  'Transport request received successfully.'
                )
              );
            } else {
              response = end(t(lang, 'Umeghairi.', 'Cancelled.'));
            }
          } else {
            response = end(t(lang, 'Chaguo si sahihi.', 'Invalid option.'));
          }
        }

        // PARCEL
        else if (parts[2] === '2') {
          if (parts.length === 3) {
            response = con(
              t(
                lang,
                'Weka sehemu ya kuchukulia parcel:',
                'Enter parcel pickup location:'
              )
            );
          } else if (parts.length === 4) {
            response = con(
              t(
                lang,
                'Weka sehemu ya kupeleka parcel:',
                'Enter parcel destination:'
              )
            );
          } else if (parts.length === 5) {
            response = con(
              t(
                lang,
                'Eleza ukubwa au uzito wa parcel:',
                'Describe parcel size or weight:'
              )
            );
          } else if (parts.length === 6) {
            response = con(
              t(
                lang,
                `Thibitisha parcel:
${parts[3]} → ${parts[4]}
Ukubwa/Uzito: ${parts[5]}
1. Tuma
2. Ghairi`,
                `Confirm parcel:
${parts[3]} → ${parts[4]}
Size/Weight: ${parts[5]}
1. Submit
2. Cancel`
              )
            );
          } else if (parts.length === 7) {
            if (parts[6] === '1') {
              await saveRequest({
                customerName: phoneNumber,
                requestType: 'transport',
                transportType: 'parcel',
                pickupLocation: parts[3],
                destinationLocation: parts[4],
                parcelSize: parts[5],
                locationName: parts[3],
                title:
                  lang === 'en'
                    ? `Parcel: ${parts[3]} → ${parts[4]}`
                    : `Parcel: ${parts[3]} → ${parts[4]}`,
                description:
                  lang === 'en'
                    ? `Parcel from ${parts[3]} to ${parts[4]}. Size/Weight: ${parts[5]}.`
                    : `Parcel kutoka ${parts[3]} kwenda ${parts[4]}. Ukubwa/Uzito: ${parts[5]}.`,
                preferredLanguage: lang,
                needsTransport: true,
              });

              response = end(
                t(
                  lang,
                  'Ombi la parcel limepokelewa.',
                  'Parcel request received successfully.'
                )
              );
            } else {
              response = end(t(lang, 'Umeghairi.', 'Cancelled.'));
            }
          } else {
            response = end(t(lang, 'Chaguo si sahihi.', 'Invalid option.'));
          }
        }

        // GOODS
        else if (parts[2] === '3') {
          if (parts.length === 3) {
            response = con(
              t(
                lang,
                'Weka sehemu ya kuchukulia goods:',
                'Enter goods pickup location:'
              )
            );
          } else if (parts.length === 4) {
            response = con(
              t(
                lang,
                'Weka sehemu ya kupeleka goods:',
                'Enter goods destination:'
              )
            );
          } else if (parts.length === 5) {
            response = con(
              t(
                lang,
                'Eleza ukubwa au kiasi cha goods:',
                'Describe goods size or quantity:'
              )
            );
          } else if (parts.length === 6) {
            response = con(
              t(
                lang,
                `Thibitisha goods:
${parts[3]} → ${parts[4]}
Ukubwa/Kiasi: ${parts[5]}
1. Tuma
2. Ghairi`,
                `Confirm goods:
${parts[3]} → ${parts[4]}
Size/Quantity: ${parts[5]}
1. Submit
2. Cancel`
              )
            );
          } else if (parts.length === 7) {
            if (parts[6] === '1') {
              await saveRequest({
                customerName: phoneNumber,
                requestType: 'transport',
                transportType: 'goods',
                pickupLocation: parts[3],
                destinationLocation: parts[4],
                parcelSize: parts[5],
                locationName: parts[3],
                title:
                  lang === 'en'
                    ? `Goods: ${parts[3]} → ${parts[4]}`
                    : `Goods: ${parts[3]} → ${parts[4]}`,
                description:
                  lang === 'en'
                    ? `Goods from ${parts[3]} to ${parts[4]}. Size/Quantity: ${parts[5]}.`
                    : `Goods kutoka ${parts[3]} kwenda ${parts[4]}. Ukubwa/Kiasi: ${parts[5]}.`,
                preferredLanguage: lang,
                needsTransport: true,
              });

              response = end(
                t(
                  lang,
                  'Ombi la goods limepokelewa.',
                  'Goods request received successfully.'
                )
              );
            } else {
              response = end(t(lang, 'Umeghairi.', 'Cancelled.'));
            }
          } else {
            response = end(t(lang, 'Chaguo si sahihi.', 'Invalid option.'));
          }
        } else {
          response = end(t(lang, 'Chaguo si sahihi.', 'Invalid option.'));
        }
      }

      // ===== ERRAND =====
      else if (parts[1] === '3') {
        if (parts.length === 2) {
          response = con(
            t(
              lang,
              'Andika errand unayohitaji:',
              'Describe the errand you need:'
            )
          );
        } else if (parts.length === 3) {
          response = con(
            t(
              lang,
              `Thibitisha:
${parts[2]}
1. Tuma
2. Ghairi`,
              `Confirm:
${parts[2]}
1. Submit
2. Cancel`
            )
          );
        } else if (parts.length === 4) {
          if (parts[3] === '1') {
            await saveRequest({
              customerName: phoneNumber,
              requestType: 'errand',
              description: parts[2],
              title: parts[2],
              preferredLanguage: lang,
              needsTransport: false,
            });

            response = end(
              t(
                lang,
                'Errand imepokelewa.',
                'Errand received successfully.'
              )
            );
          } else {
            response = end(t(lang, 'Umeghairi.', 'Cancelled.'));
          }
        } else {
          response = end(t(lang, 'Chaguo si sahihi.', 'Invalid option.'));
        }
      }

      else {
        response = end(t(lang, 'Chaguo si sahihi.', 'Invalid option.'));
      }
    }
  } catch (error) {
    console.error('USSD ERROR:', error);
    response = end('System error');
  }

  res.set('Content-Type', 'text/plain');
  res.status(200).send(response);
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`MOSSES USSD running on port ${PORT}`);
});