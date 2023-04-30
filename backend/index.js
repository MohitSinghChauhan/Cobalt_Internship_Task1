const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
dotenv.config();
const docusign = require('docusign-esign');
const fs = require('fs');
const session = require('express-session');
const crypto = require('crypto');
const tokenValidation = require('./tokenValidation');
const { getEnvelopesApi, makeEnvelope, makeRecipientViewRequest} = require('./envelopeCreation');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const SECRET_KEY = crypto.randomBytes(32).toString('hex');
app.use(
  session({
    secret: SECRET_KEY,
    resave: true,
    saveUninitialized: true,
  })
);

// This function handles the POST request to the /form endpoint
const handleFormPost = async (req, res) => {
  // Ensure that the access token is valid and up to date
  await tokenValidation(req, res);

  // Get an instance of the EnvelopesApi with the configured API client
  const envelopesApi = getEnvelopesApi(req);

  // Extract the name and email of the recipient from the request body.
  const { name, email } = req.body;

  // Create an envelope object for the provided recipient details
  const envelope = makeEnvelope(name, email);

  // Create the envelope on the DocuSign server
  let results = await envelopesApi.createEnvelope(process.env.ACCOUNT_ID, {
    envelopeDefinition: envelope,
  });

  // Create a RecipientViewRequest object using the recipient's name and email.
  const recipientViewRequest = makeRecipientViewRequest(name, email);

  // Use the DocuSign API client to create a recipient view URL.
  results = await envelopesApi.createRecipientView(
    process.env.ACCOUNT_ID,
    results.envelopeId, // This should be the ID of the envelope that was created earlier in the process.
    { recipientViewRequest }
  );

  console.log('Envelope results: ', results);

  //For Testing Purpose: Redirect the client to the recipient view URL.
  res.redirect(results.url);
};

app.post('/form', handleFormPost);

app.get('/', async (req, res) => {
  await tokenValidation(req, res);
  res.sendFile(path.join(__dirname, '../frontend/public', 'index.html'));
});

app.get('/signing-complete', (req, res) => {
  res.send('Signing process complete.');
});

app.listen(3000, () => {
  console.log('server has started', process.env.USER_ID);
});
