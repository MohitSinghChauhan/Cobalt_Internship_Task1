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

// This function handles the POST request to the /form endpoint
const handleFormPost = async (request, response) => {
  // Ensure that the access token is valid and up to date
  await tokenValidation(request, response);

  // Get an instance of the EnvelopesApi with the configured API client
  const envelopesApi = getEnvelopesApi(request);

  // Create an envelope object for the provided recipient details
  const envelope = makeEnvelope(request.body.name, request.body.email);

  // Create the envelope on the DocuSign server
  const results = await envelopesApi.createEnvelope(process.env.ACCOUNT_ID, {
    envelopeDefinition: envelope,
  });

  console.log('Envelope results: ', results);
  response.send('Envelope created successfully');
};

app.post('/form', handleFormPost);

app.get('/', async (req, res) => {
  await tokenValidation(req, res);
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(3000, () => {
  console.log('server has started', process.env.USER_ID);
});
