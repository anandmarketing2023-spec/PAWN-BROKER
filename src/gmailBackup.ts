import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, getAccessToken, setAccessToken } from './firebase';

export interface GmailBackupInfo {
  messageId: string;
  timestamp: string;
  appName: string;
  recordCount: number;
  snippet: string;
}

// Prompt/Trigger Google Sign-In with Gmail scopes if required
export async function ensureGmailToken(): Promise<string> {
  const existingToken = getAccessToken();
  if (existingToken) {
    return existingToken;
  }

  // If no in-memory token, trigger authenticating with popup
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
  provider.addScope('https://www.googleapis.com/auth/gmail.send');
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken || null;
  if (!token) {
    throw new Error('Could not retrieve access token from Google.');
  }
  setAccessToken(token);
  return token;
}

export async function sendGmailBackup(
  appName: string,
  recordCount: number,
  loansData: any
): Promise<void> {
  const token = await ensureGmailToken();

  const backupPayload = {
    appName,
    timestamp: new Date().toISOString(),
    loans: loansData,
  };

  const payloadString = JSON.stringify(backupPayload);
  const subject = `[GIRVI BACKUP] ${appName} - ${recordCount} items (${new Date().toLocaleDateString()})`;

  // Compose the email
  const emailLines = [
    'To: me',
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    '<html>',
    '<body style="font-family: sans-serif; color: #1e293b; background-color: #f8fafc; padding: 24px;">',
    '  <div style="max-width: 600px; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">',
    '    <h2 style="color: #d97706; margin-top: 0;">📚 Girvi Ledger Backup</h2>',
    `    <p>This email contains a secure backup of your <strong>${appName}</strong> pawn book ledger.</p>`,
    '    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">',
    '      <tr style="background: #f1f5f9;">',
    '        <td style="padding: 10px; font-weight: bold; border: 1px solid #cbd5e1;">Pawn Shop Store</td>',
    `        <td style="padding: 10px; border: 1px solid #cbd5e1;">${appName}</td>`,
    '      </tr>',
    '      <tr>',
    '        <td style="padding: 10px; font-weight: bold; border: 1px solid #cbd5e1;">Record Count</td>',
    `        <td style="padding: 10px; border: 1px solid #cbd5e1;">${recordCount} active accounts</td>`,
    '      </tr>',
    '      <tr style="background: #f1f5f9;">',
    '        <td style="padding: 10px; font-weight: bold; border: 1px solid #cbd5e1;">Timestamp</td>',
    `        <td style="padding: 10px; border: 1px solid #cbd5e1;">${new Date().toLocaleString()}</td>`,
    '      </tr>',
    '    </table>',
    '    <p style="color: #475569; font-size: 13px;">This message was created automatically. You can restore this backup easily across different phones, tablets, or computer systems by choosing "Restore from Gmail" in the Storage Tab of the app.</p>',
    '    <div style="margin-top: 24px; font-size: 11px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px;">',
    '      Secure Vault Sync System for Balaji Pawn Brokers',
    '    </div>',
    '  </div>',
    '  <!-- do not modify comments below - utilized to sync ledger data -->',
    '  <!--GIRVI_PAYLOAD_START-->' + payloadString + '<!--GIRVI_PAYLOAD_END-->',
    '</body>',
    '</html>'
  ];

  const emailContent = emailLines.join('\r\n');

  // Base64Url encode standard RFC822 format
  const base64Safe = btoa(unescape(encodeURIComponent(emailContent)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: base64Safe,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail Send Error (${response.status}): ${errorText}`);
  }
}

export async function listGmailBackups(): Promise<GmailBackupInfo[]> {
  const token = await ensureGmailToken();

  // Search messages with query "subject:[GIRVI BACKUP]"
  const searchUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?q=' + encodeURIComponent('subject:"[GIRVI BACKUP]"');
  const listResponse = await fetch(searchUrl, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!listResponse.ok) {
    const errorText = await listResponse.text();
    throw new Error(`Gmail List Error (${listResponse.status}): ${errorText}`);
  }

  const listData = await listResponse.json();
  const messages = listData.messages || [];

  const results: GmailBackupInfo[] = [];

  // Parallel fetch details for key entries up to 12 latest items
  const detailsPromises = messages.slice(0, 12).map(async (msg: any) => {
    try {
      const getUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`;
      const msgRes = await fetch(getUrl, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (msgRes.ok) {
        const fullMsg = await msgRes.json();
        
        // Extract headers
        const headers = fullMsg.payload.headers || [];
        const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '';
        const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';

        // Extract app name and records counts roughly from subject line
        // Standard shape is: "[GIRVI BACKUP] StoreName - X items (Date)"
        let appName = 'Store Ledger';
        let recordCount = 0;

        const subjectMatch = subjectHeader.match(/\[GIRVI BACKUP\]\s*(.*?)\s*-\s*(\d+)\s*items/);
        if (subjectMatch) {
          appName = subjectMatch[1];
          recordCount = parseInt(subjectMatch[2], 10);
        }

        results.push({
          messageId: msg.id,
          timestamp: dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString(),
          appName,
          recordCount,
          snippet: fullMsg.snippet || '',
        });
      }
    } catch (e) {
      console.error(`Error loading details for message ${msg.id}:`, e);
    }
  });

  await Promise.all(detailsPromises);

  // Sort descending by timestamp
  return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function restoreGmailBackup(messageId: string): Promise<any> {
  const token = await ensureGmailToken();

  const getUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`;
  const response = await fetch(getUrl, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail Retrieve Error (${response.status}): ${errorText}`);
  }

  const message = await response.json();
  const body = getMessageBody(message.payload);

  const startIdx = body.indexOf('<!--GIRVI_PAYLOAD_START-->');
  const endIdx = body.indexOf('<!--GIRVI_PAYLOAD_END-->');

  if (startIdx === -1 || endIdx === -1) {
    throw new Error('This email message does not contain a decipherable Girvi Ledger Backup payload tag.');
  }

  const jsonStr = body.substring(startIdx + '<!--GIRVI_PAYLOAD_START-->'.length, endIdx);
  try {
    return JSON.parse(jsonStr);
  } catch (err) {
    throw new Error('Found corrupted spreadsheet payload data. JSON parsing error.');
  }
}

// Deciphers multi-part nested message content
function getMessageBody(payload: any): string {
  if (payload.body && payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body && part.body.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    // Deep fallback
    for (const part of payload.parts) {
      if (part.body && part.body.data) {
        try {
          return decodeBase64Url(part.body.data);
        } catch (e) {
          // ignore
        }
      }
    }
  }
  return '';
}

function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return decodeURIComponent(escape(atob(base64)));
  } catch (e) {
    try {
      return atob(base64);
    } catch (err) {
      console.error('Base64 decode failed for contents:', err);
      return '';
    }
  }
}
