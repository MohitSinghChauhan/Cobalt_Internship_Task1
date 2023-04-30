const docusign = require('docusign-esign');
const fs = require('fs');
const session = require('express-session');
const path = require('path');

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

  module.exports = tokenValidation;