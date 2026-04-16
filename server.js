app.get('/', (req, res) => {
  res.send('MOSSES USSD server is running 🚀');
});
const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

// 🔐 FIREBASE VIA ENV (NO JSON FILE)
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// ===== HELPERS =====
const con = (t) => `CON ${t}`;
const end = (t) => `END ${t}`;
const now = () => admin.firestore.FieldValue.serverTimestamp();

function t(lang, sw, en) {
  return lang === 'en' ? en : sw;
}

function getLang(text) {
  const parts = (text || '').split('*');
  return parts[0] === '2' ? 'en' : 'sw';
}

// ===== SAVE FUNCTIONS =====
async function saveRequest(data) {
  await db.collection('spores').add({
    ...data,
    status: 'open',
    createdAt: now(),
    updatedAt: now(),
    source: 'ussd',
  });
}

// ===== MAIN MENU =====
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

// ===== ROUTE =====
app.post('/ussd', async (req, res) => {
  const { phoneNumber, text = '' } = req.body;

  let response = '';

  try {
    // STEP 0: LANGUAGE SELECT
    if (text === '') {
      response = con(`Karibu MOSSES
Choose language / Chagua lugha
1. Kiswahili
2. English`);
    }

    // STEP 1: LANGUAGE CHOSEN
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
            t(lang, 'Andika huduma unayohitaji:', 'Describe the service:')
          );
        }

        else if (parts.length === 3) {
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
        }

        else if (parts.length === 4) {
          if (parts[3] === '1') {
            await saveRequest({
              customerName: phoneNumber,
              requestType: 'service',
              description: parts[2],
              preferredLanguage: lang,
            });

            response = end(
              t(
                lang,
                'Ombi limepokelewa',
                'Request received successfully'
              )
            );
          } else {
            response = end(
              t(lang, 'Umeghairi', 'Cancelled')
            );
          }
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
2. Parcel`,
              `What are you transporting?
1. Myself
2. Parcel`
            )
          );
        }

        else if (parts[2] === '1') {
          if (parts.length === 3) {
            response = con(t(lang, 'Weka unapoanzia:', 'Pickup location:'));
          } else if (parts.length === 4) {
            response = con(t(lang, 'Weka unakoenda:', 'Destination:'));
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
                pickup: parts[3],
                destination: parts[4],
                preferredLanguage: lang,
              });

              response = end(
                t(lang, 'Ombi la usafiri limepokelewa', 'Transport request received')
              );
            } else {
              response = end(t(lang, 'Umeghairi', 'Cancelled'));
            }
          }
        }
      }

      // ===== ERRAND =====
      else if (parts[1] === '3') {
        if (parts.length === 2) {
          response = con(
            t(lang, 'Andika errand:', 'Describe errand:')
          );
        }

        else if (parts.length === 3) {
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
        }

        else if (parts.length === 4) {
          if (parts[3] === '1') {
            await saveRequest({
              customerName: phoneNumber,
              requestType: 'errand',
              description: parts[2],
              preferredLanguage: lang,
            });

            response = end(
              t(lang, 'Errand imepokelewa', 'Errand received')
            );
          } else {
            response = end(t(lang, 'Umeghairi', 'Cancelled'));
          }
        }
      }

      else {
        response = end(
          t(lang, 'Chaguo si sahihi', 'Invalid option')
        );
      }
    }
  } catch (e) {
    console.error(e);
    response = end('System error');
  }

  res.set('Content-Type', 'text/plain');
  res.send(response);
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('MOSSES USSD running on port ' + PORT);
});