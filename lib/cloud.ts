import { Storage } from "@google-cloud/storage";
import { Firestore } from "@google-cloud/firestore";
import { GoogleAuth, ExternalAccountClient } from "google-auth-library";
import { getVercelOidcToken } from "@vercel/oidc";

let auth: GoogleAuth | undefined;
export function cloudAuth() {
  if (auth) return auth;
  const projectId=process.env.GCP_PROJECT_ID;
  if (!projectId) throw new Error("Google Cloud project is not configured.");
  const credentials=process.env.GCP_SERVICE_ACCOUNT_JSON ? JSON.parse(process.env.GCP_SERVICE_ACCOUNT_JSON) : undefined;
  const {GCP_PROJECT_NUMBER: number,GCP_SERVICE_ACCOUNT_EMAIL: email,GCP_WORKLOAD_IDENTITY_POOL_ID: pool,GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: provider}=process.env;
  const authClient=number && email && pool && provider ? ExternalAccountClient.fromJSON({
    type:"external_account",audience:`//iam.googleapis.com/projects/${number}/locations/global/workloadIdentityPools/${pool}/providers/${provider}`,
    subject_token_type:"urn:ietf:params:oauth:token-type:jwt",token_url:"https://sts.googleapis.com/v1/token",
    service_account_impersonation_url:`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${email}:generateAccessToken`,
    subject_token_supplier:{getSubjectToken:() => getVercelOidcToken()},
  }) ?? undefined : undefined;
  if (process.env.VERCEL && !credentials && !authClient) throw new Error("Google Cloud authentication is not configured.");
  auth=new GoogleAuth({projectId,credentials,authClient,scopes:["https://www.googleapis.com/auth/cloud-platform"]});
  return auth;
}
let database: Firestore | undefined, storage: Storage | undefined;
export function firestore() {
  return database ??= new Firestore({projectId:process.env.GCP_PROJECT_ID,databaseId:process.env.GCP_FIRESTORE_DATABASE || "(default)",auth:cloudAuth(),preferRest:true});
}
export function cloudBucket() {
  if (!process.env.GCP_STORAGE_BUCKET) throw new Error("Drawing storage is not configured.");
  storage ??= new Storage({projectId:process.env.GCP_PROJECT_ID,authClient:cloudAuth()});
  return storage.bucket(process.env.GCP_STORAGE_BUCKET);
}
