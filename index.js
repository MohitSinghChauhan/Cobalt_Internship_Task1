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
        'signature',
        fs.readFileSync(path.join(__dirname, 'private.key')),
        3600
      );
      console.log('New access token generated:', jwtTokenResult.body);
      req.session.accessToken = jwtTokenResult.body.access_token;
      req.session.accessTokenExpiration =
        Date.now() + (jwtTokenResult.body.expires_in - 60) * 1000;
    }
  }
};

app.get('/', async (req, res) => {
  await tokenValidation(req, res);
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(3000, () => {
  console.log('server has started', process.env.USER_ID);
});
