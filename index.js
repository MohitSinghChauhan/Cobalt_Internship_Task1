const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
dotenv.config();
const docusign = require('docusign-esign');
const fs = require('fs');
const session = require('express-session');
const crypto = require('crypto');
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

const tokenValidation = async (req, res) => {
  const { accessToken, accessTokenExpiration } = req.session;
  const isAccessTokenValid = accessToken && Date.now() < accessTokenExpiration;

  if (isAccessTokenValid) {
    console.log('Reusing access token:', accessToken);
  } else {
    if (!req.query.code) {
      const authUrl =
        'https://account-d.docusign.com/oauth/auth?' +
        'response_type=code&' +
        'scope=signature%20impersonation&' +
        'client_id=' +
        `${process.env.INTEGRATION_KEY}&` +
        'redirect_uri=http://localhost:3000/';

      res.redirect(authUrl);
      return; // Stop processing
    } else {
      console.log('Generating new access token...');
      const dsApiClient = new docusign.ApiClient();
      dsApiClient.setBasePath(process.env.BASE_PATH);
      const jwtTokenResult = await dsApiClient.requestJWTUserToken(
        process.env.INTEGRATION_KEY,
        process.env.USER_ID,
        ['signature', 'impersonation'],
        fs.readFileSync(path.join(__dirname, 'private.key')),
        3600
      );
      console.log('New access token generated:', jwtTokenResult.body);
      req.session.accessToken = jwtTokenResult.body.access_token;
      // console.log('Access token:', req.session.accessToken);
      req.session.accessTokenExpiration =
        Date.now() + (jwtTokenResult.body.expires_in - 60) * 1000;
    }
  }
};

// This function returns an instance of the EnvelopesApi with the API client configured
const getEnvelopesApi = (req) => {
  // Create a new instance of the DocuSign API client
  const dsApiClient = new docusign.ApiClient();

  // Set the base path for the client using the environment variable
  dsApiClient.setBasePath(process.env.BASE_PATH);

  // Add the access token to the default headers using the request session
  dsApiClient.addDefaultHeader(
    'Authorization',
    'Bearer ' + req.session.accessToken
  );

  // Return an instance of the EnvelopesApi with the configured API client
  return new docusign.EnvelopesApi(dsApiClient);
};

// This function creates and returns an instance of an envelope object for the provided recipient details
const makeEnvelope = (name, email) => {
  // Create a new instance of the EnvelopeDefinition object
  const envelope = new docusign.EnvelopeDefinition();

  // Set the template ID for the envelope using the environment variable
  envelope.templateId = process.env.TEMPLATE_ID;

  // Create a new instance of the TemplateRole object for the recipient
  const signer1 = docusign.TemplateRole.constructFromObject({
    email: email,
    name: name,
    clientUserId: process.env.CLIENT_USER_ID,
    roleName: 'Applicant',
  });

  // Add the recipient to the envelope
  envelope.templateRoles = [signer1];

  // Set the status of the envelope to 'sent'
  envelope.status = 'sent';

  // Return the envelope object
  return envelope;
};

// Creates a RecipientViewRequest object for obtaining a recipient view URL.
const makeRecipientViewRequest = (recipientName, recipientEmail) => {
  // Create a new RecipientViewRequest object.
  const recipientViewRequest = new docusign.RecipientViewRequest();

  // Specify the URL that the recipient will be redirected to after completing the signing process.
  recipientViewRequest.returnUrl = 'http://localhost:3000/signing-complete';

  // Specify the authentication method that the recipient will use to access the signing process.
  recipientViewRequest.authenticationMethod = 'none';

  // Specify the recipient's name, email, and client user ID.
  recipientViewRequest.userName = recipientName;
  recipientViewRequest.email = recipientEmail;
  recipientViewRequest.clientUserId = process.env.CLIENT_USER_ID; // This is the client user ID that was set when creating the envelope.

  // Return the RecipientViewRequest object.
  return recipientViewRequest;
};

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
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/signing-complete', (req, res) => {
  res.send('Signing process complete.');
});

app.listen(3000, () => {
  console.log('server has started', process.env.USER_ID);
});
