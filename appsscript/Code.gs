/**
 * Apps Script for the Asset Request workflow (Google Form -> Firestore).
 *
 * This project is on Firebase's free Spark plan, which doesn't support
 * Cloud Functions or Secret Manager. So instead of calling a Cloud Function,
 * this script authenticates directly to Firestore as a Google Cloud service
 * account and writes through the Firestore REST API.
 *
 * SETUP — see README.md ("Asset Request & Approval Workflow") for full steps:
 *   1. Create a Google Cloud service account for your Firebase project with
 *      the "Cloud Datastore User" role, and download its JSON key.
 *   2. Open this script's Project Settings > Script Properties, and add:
 *        FIREBASE_PROJECT_ID          your Firebase project id
 *        SERVICE_ACCOUNT_EMAIL        the key's "client_email"
 *        SERVICE_ACCOUNT_PRIVATE_KEY  the key's "private_key" (keep the \n's)
 *        APPROVAL_BASE_URL            e.g. https://YOUR-PROJECT.web.app/approvals
 *        APPROVER_NOTIFY_EMAIL        email (or Google group) to notify
 *   3. Update FIELD_MAP below so the keys match your Form's exact question
 *      titles.
 *   4. Triggers (clock icon in the left sidebar) > Add Trigger:
 *        Function: onFormSubmit_
 *        Event source: From form
 *        Event type: On form submit
 *      Run it once manually first to authorize the permissions it asks for.
 *
 * IMPORTANT: because there's no server in front of Firestore here, this
 * service account's key can read/write anything its IAM role allows, not
 * just the assetRequests collection — Firestore Security Rules don't apply
 * to service-account access (the same way they don't apply to the Admin
 * SDK). Keep the JSON key out of version control and grant the account only
 * the "Cloud Datastore User" role, nothing broader.
 */

// Map each Firestore field to the exact title of the matching Form question.
var FIELD_MAP = {
  requesterName: 'Your name',
  requesterEmail: 'Your email',
  assetName: 'Asset needed',
  category: 'Category',
  quantity: 'Quantity',
  notes: 'Notes / justification',
};

function onFormSubmit_(e) {
  var values = e.namedValues; // { "Question title": ["answer"], ... }

  function readField(key) {
    var question = FIELD_MAP[key];
    var arr = values[question];
    return arr && arr.length ? String(arr[0]).trim() : '';
  }

  var fields = {
    requesterName: readField('requesterName'),
    requesterEmail: readField('requesterEmail'),
    assetName: readField('assetName'),
    category: readField('category'),
    quantity: Number(readField('quantity')) || 1,
    notes: readField('notes'),
    formResponseId: e.response ? e.response.getId() : '',
  };

  if (!fields.requesterEmail || !fields.assetName) {
    Logger.log('Skipping submission missing requesterEmail/assetName: %s', JSON.stringify(fields));
    return;
  }

  var requestId = createAssetRequestDoc_(fields);
  notifyApprover_(fields, requestId);
}

/** Writes a new document to the "assetRequests" Firestore collection via the REST API. */
function createAssetRequestDoc_(fields) {
  var props = PropertiesService.getScriptProperties();
  var projectId = props.getProperty('FIREBASE_PROJECT_ID');
  var token = getServiceAccountAccessToken_();

  var url = 'https://firestore.googleapis.com/v1/projects/' + projectId +
    '/databases/(default)/documents/assetRequests';

  var body = {
    fields: {
      requesterName: { stringValue: fields.requesterName },
      requesterEmail: { stringValue: fields.requesterEmail },
      assetName: { stringValue: fields.assetName },
      category: { stringValue: fields.category },
      quantity: { integerValue: String(fields.quantity) },
      notes: { stringValue: fields.notes },
      formResponseId: { stringValue: fields.formResponseId },
      status: { stringValue: 'pending' },
      approverEmail: { nullValue: null },
      decisionAt: { nullValue: null },
      createdAt: { timestampValue: new Date().toISOString() },
    },
  };

  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() >= 300) {
    throw new Error('Firestore write failed: ' + response.getContentText());
  }

  var doc = JSON.parse(response.getContentText());
  var name = doc.name; // "projects/.../documents/assetRequests/<id>"
  return name.split('/').pop();
}

/** Emails the approver(s) a link to review the request in the web app. */
function notifyApprover_(fields, requestId) {
  var props = PropertiesService.getScriptProperties();
  var baseUrl = props.getProperty('APPROVAL_BASE_URL');
  var notifyEmail = props.getProperty('APPROVER_NOTIFY_EMAIL');
  var link = baseUrl + '/' + requestId;

  var subject = 'Asset request: ' + fields.assetName + ' (' + fields.requesterName + ')';
  var body =
    'A new asset request needs review:\n\n' +
    'Requester: ' + fields.requesterName + ' <' + fields.requesterEmail + '>\n' +
    'Asset: ' + fields.assetName + (fields.category ? ' (' + fields.category + ')' : '') + '\n' +
    'Quantity: ' + fields.quantity + '\n' +
    (fields.notes ? 'Notes: ' + fields.notes + '\n' : '') +
    '\nReview and decide here (sign in with your Google account):\n' + link;

  MailApp.sendEmail(notifyEmail, subject, body);
}

/**
 * Exchanges the service account key for a short-lived Google OAuth2 access
 * token scoped to Firestore, using the JWT bearer flow (RFC 7523).
 */
function getServiceAccountAccessToken_() {
  var props = PropertiesService.getScriptProperties();
  var clientEmail = props.getProperty('SERVICE_ACCOUNT_EMAIL');
  var privateKey = props.getProperty('SERVICE_ACCOUNT_PRIVATE_KEY').replace(/\\n/g, '\n');

  var header = { alg: 'RS256', typ: 'JWT' };
  var now = Math.floor(Date.now() / 1000);
  var claimSet = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  function encode(obj) {
    return Utilities.base64EncodeWebSafe(JSON.stringify(obj)).replace(/=+$/, '');
  }

  var toSign = encode(header) + '.' + encode(claimSet);
  var signatureBytes = Utilities.computeRsaSha256Signature(toSign, privateKey);
  var signature = Utilities.base64EncodeWebSafe(signatureBytes).replace(/=+$/, '');
  var jwt = toSign + '.' + signature;

  var response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    },
    muteHttpExceptions: true,
  });

  var result = JSON.parse(response.getContentText());
  if (!result.access_token) {
    throw new Error('Failed to get access token: ' + response.getContentText());
  }
  return result.access_token;
}
