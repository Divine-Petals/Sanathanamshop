// Shared CORS headers for Supabase Edge Functions.
// Pattern: https://supabase.com/docs/guides/functions/cors
//
// Import this in every Edge Function and:
//   1. Return it for OPTIONS preflight requests.
//   2. Merge it into every other response.
//
// Example:
//   import { corsHeaders } from '../_shared/cors.ts'
//
//   Deno.serve(async (req) => {
//     if (req.method === 'OPTIONS') {
//       return new Response('ok', { headers: corsHeaders })
//     }
//     // ...
//     return new Response(JSON.stringify(data), {
//       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
//     })
//   })

export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://sanathanamshop.in',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
}
