import { OAuth2Client } from 'google-auth-library';
import { token, digest, hashPassword } from './security.js';
import { createHash } from 'node:crypto';
export const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const origin = process.env.APP_ORIGIN;
const callback = `${origin}/api/auth/google/callback`;
const client = googleEnabled ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, callback) : null;
const stateCookie = (value, age) => `ronda_oauth=${value}; HttpOnly; SameSite=Lax; Secure; Path=/api/auth/google; Max-Age=${age}`;
export async function googleStart(pool, res) {
  if (!client) { res.writeHead(503, {'Content-Type':'application/json'}); res.end(JSON.stringify({error:'Google aún no está configurado.'})); return; }
  const state = token(), nonce = token(), verifier = token();
  await pool.query("INSERT INTO oauth_states VALUES($1,$2,$3,now()+interval '10 minutes')",[digest(state),nonce,verifier]);
  const location=client.generateAuthUrl({scope:['openid','email','profile'],state,nonce,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',access_type:'online'});
  res.writeHead(302,{Location:location,'Set-Cookie':stateCookie(state,600),'Cache-Control':'no-store'});res.end();
}
export async function googleCallback(pool, req, res, cookie) {
  try {
    if (!client) throw new Error('not_configured');
    const params=new URL(req.url,origin).searchParams;
    const savedCookie=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('ronda_oauth='))?.slice(12);
    if (!savedCookie || params.get('state')!==savedCookie || !params.get('code') || params.has('error')) throw new Error('invalid_state');
    const saved=await pool.query('DELETE FROM oauth_states WHERE token_hash=$1 AND expires_at>now() RETURNING nonce,verifier',[digest(savedCookie)]);
    if (!saved.rows[0]) throw new Error('expired_state');
    const {tokens}=await client.getToken({code:params.get('code'),codeVerifier:saved.rows[0].verifier});
    const ticket=await client.verifyIdToken({idToken:tokens.id_token,audience:process.env.GOOGLE_CLIENT_ID});
    const identity=ticket.getPayload();
    if (!identity?.email_verified || identity.nonce!==saved.rows[0].nonce || !identity.sub || !identity.email) throw new Error('invalid_identity');
    const connection=await pool.connect();
    let user;
    try {
      await connection.query('BEGIN');
      const existing=await connection.query('SELECT id FROM users WHERE google_sub=$1',[identity.sub]);
      if(existing.rows[0]) user=existing.rows[0];
      else {
        // Never silently merge with an unverified email/password account.
        const sameEmail=await connection.query('SELECT id FROM users WHERE email=$1',[identity.email.toLowerCase()]);
        if(sameEmail.rows.length) throw new Error('email_requires_link');
        const result=await connection.query('INSERT INTO users(email,name,password_hash,google_sub) VALUES($1,$2,$3,$4) RETURNING id',[identity.email.toLowerCase(),String(identity.name||identity.email).slice(0,100),await hashPassword(token()),identity.sub]);
        user=result.rows[0];
        const space=await connection.query('INSERT INTO workspaces(name) VALUES($1) RETURNING id',[`Espacio de ${String(identity.name||identity.email).slice(0,100)}`]);
        await connection.query("INSERT INTO workspace_members VALUES($1,$2,'admin')",[space.rows[0].id,user.id]);
      }
      const value=token();
      await connection.query("INSERT INTO sessions VALUES($1,$2,now()+interval '7 days')",[digest(value),user.id]);
      await connection.query('COMMIT');
      res.writeHead(302,{Location:origin,'Set-Cookie':[cookie(value,604800),stateCookie('',0)],'Cache-Control':'no-store'});res.end();
    } catch(error){await connection.query('ROLLBACK');throw error;} finally {connection.release();}
  } catch(error) {
    console.error('google_login_failed');
    res.writeHead(302,{Location:`${origin}/?authError=google`,'Set-Cookie':stateCookie('',0),'Cache-Control':'no-store'});res.end();
  }
}
