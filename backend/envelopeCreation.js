const docusign = require('docusign-esign');


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

  module.exports = {getEnvelopesApi, makeEnvelope, makeRecipientViewRequest};