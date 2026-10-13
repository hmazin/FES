import assert from 'node:assert/strict';
import {ExternalAccountClient} from 'google-auth-library';
const client=ExternalAccountClient.fromJSON({
  type:'external_account',
  audience:'//iam.googleapis.com/projects/123456789/locations/global/workloadIdentityPools/test/providers/test',
  subject_token_type:'urn:ietf:params:oauth:token-type:jwt',
  token_url:'https://sts.googleapis.com/v1/token',
  subject_token_supplier:{getSubjectToken:async()=>''},
});
assert(client);
// No network or real credentials: exercise the header contract consumed by Firestore's installed REST transport.
client.getAccessToken=async()=>({token:'synthetic-token'});
const headers=await client.getRequestHeaders();
assert.equal({...headers}.Authorization,'Bearer synthetic-token','Firestore REST spreads auth headers; a Headers instance silently omits authorization.');
console.log('PASS: keyless Google authentication headers survive the installed Firestore REST transport contract. No network or real credentials used.');
