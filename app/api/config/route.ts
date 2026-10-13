import {response,runtime} from "@/lib/server";

export async function GET(){return response({aiEnabled:!!runtime().OPENAI_API_KEY,emailEnabled:false});}
