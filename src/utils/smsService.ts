import { SmsConfig, SmsLog, SmsProvider } from '../types';

export interface ProviderPreset {
  name: string;
  nameBn: string;
  defaultUrl: string;
  httpMethod: 'GET' | 'POST';
  requestFormat: 'json' | 'form' | 'query_param';
  keyParam: string;
  toParam: string;
  msgParam: string;
  senderParam?: string;
  userParam?: string;
  passParam?: string;
  extraParams?: Record<string, string>;
  note: string;
  helpLink?: string;
}

export const PROVIDER_PRESETS: Record<SmsProvider, ProviderPreset> = {
  greenweb: {
    name: 'Greenweb SMS BD',
    nameBn: 'গ্রিনওয়েব এসএমএস বিডি',
    defaultUrl: 'https://api.greenweb.com.bd/api.php',
    httpMethod: 'POST',
    requestFormat: 'form',
    keyParam: 'token',
    toParam: 'to',
    msgParam: 'message',
    note: 'Greenweb SMS Gateway. Requires API token from greenweb.com.bd dashboard.',
  },
  bulksmsbd: {
    name: 'BulkSMS BD',
    nameBn: 'বাল্ক এসএমএস বিডি (BulkSMSBD)',
    defaultUrl: 'http://bulksmsbd.net/api/smsapi',
    httpMethod: 'POST',
    requestFormat: 'form',
    keyParam: 'api_key',
    toParam: 'number',
    msgParam: 'message',
    senderParam: 'senderid',
    note: 'Popular Bangladesh SMS provider with high delivery rate.',
  },
  bulksms24: {
    name: '24 Bulk SMS BD',
    nameBn: '২৪ বাল্ক এসএমএস বিডি (24BulkSMSBD)',
    defaultUrl: 'https://www.24bulksmsbd.com/api/smsSendApi',
    httpMethod: 'GET',
    requestFormat: 'query_param',
    keyParam: 'api_key',
    toParam: 'mobile_no',
    msgParam: 'message',
    senderParam: 'customer_id',
    note: '24 Bulk SMS BD API. Requires customer_id (Client ID) and api_key via GET query parameters.',
  },
  alphanet: {
    name: 'Alpha Net SMS',
    nameBn: 'আলফা নেট এসএমএস (Alpha Net)',
    defaultUrl: 'https://api.sms.net.bd/sendsms',
    httpMethod: 'POST',
    requestFormat: 'form',
    keyParam: 'api_key',
    toParam: 'to',
    msgParam: 'msg',
    senderParam: 'sender_id',
    note: 'Fast Alpha Net Enterprise SMS Gateway.',
  },
  mimsms: {
    name: 'MimSMS BD',
    nameBn: 'মিম এসএমএস বিডি (MimSMS)',
    defaultUrl: 'https://api.mimsms.com/api/SmsSending/Send',
    httpMethod: 'POST',
    requestFormat: 'json',
    keyParam: 'ApiKey',
    toParam: 'PhoneNumber',
    msgParam: 'Message',
    senderParam: 'SenderName',
    note: 'Leading Bangladeshi mask & non-masking API gateway.',
  },
  dianahost: {
    name: 'Diana Host SMS',
    nameBn: 'ডায়ানা হোস্ট এসএমএস (DianaHost)',
    defaultUrl: 'http://sms.dianahost.com/api/v3/sms/send',
    httpMethod: 'POST',
    requestFormat: 'json',
    keyParam: 'api_key',
    toParam: 'recipient',
    msgParam: 'message',
    senderParam: 'sender_id',
    note: 'DianaHost Transactional SMS API.',
  },
  elitbuzz: {
    name: 'Elitbuzz SMS',
    nameBn: 'এলিট বাজ এসএমএস (Elitbuzz BD)',
    defaultUrl: 'https://msg.elitbuzz-bd.com/smsapi',
    httpMethod: 'POST',
    requestFormat: 'form',
    keyParam: 'api_key',
    toParam: 'contacts',
    msgParam: 'msg',
    senderParam: 'senderid',
    extraParams: { type: 'text' },
    note: 'Elitbuzz high-speed SMS Gateway API.',
  },
  onnorokom: {
    name: 'Onnorokom SMS',
    nameBn: 'অন্যরকম এসএমএস (Onnorokom SMS)',
    defaultUrl: 'https://api2.onnorokomsms.com/HttpSendSms.ashx',
    httpMethod: 'GET',
    requestFormat: 'query_param',
    keyParam: 'apiKey',
    toParam: 'mobileNumber',
    msgParam: 'smsText',
    senderParam: 'type',
    userParam: 'userName',
    passParam: 'userPassword',
    note: 'Standard Onnorokom HTTP API gateway.',
  },
  revesms: {
    name: 'Reve Systems SMS',
    nameBn: 'রেভ সিস্টেমস এসএমএস (Reve SMS)',
    defaultUrl: 'http://sms.reveinteractive.com/api/send',
    httpMethod: 'POST',
    requestFormat: 'form',
    keyParam: 'apikey',
    toParam: 'toUser',
    msgParam: 'messageContent',
    senderParam: 'callerID',
    note: 'Enterprise REVE SMS Gateway for telecom alerts.',
  },
  smsq: {
    name: 'SMS Q Global BD',
    nameBn: 'এসএমএস কিউ (SMS Q BD)',
    defaultUrl: 'https://api.smsq.global/api/v2/SendSMS',
    httpMethod: 'POST',
    requestFormat: 'json',
    keyParam: 'ApiKey',
    toParam: 'MobileNumbers',
    msgParam: 'SenderText',
    senderParam: 'ClientId',
    note: 'Modern REST SMS Gateway with fast routing.',
  },
  twilio: {
    name: 'Twilio International',
    nameBn: 'টুইলিও ইন্টারন্যাশনাল (Twilio)',
    defaultUrl: 'https://api.twilio.com/2010-04-01/Accounts/{clientId}/Messages.json',
    httpMethod: 'POST',
    requestFormat: 'form',
    keyParam: 'token',
    toParam: 'To',
    msgParam: 'Body',
    senderParam: 'From',
    note: 'Global Twilio Programmable SMS API.',
  },
  custom_api: {
    name: 'Custom SMS Gateway',
    nameBn: 'যেকোনো কাস্টম গেটওয়ে API (Custom Gateway)',
    defaultUrl: '',
    httpMethod: 'POST',
    requestFormat: 'form',
    keyParam: 'api_key',
    toParam: 'to',
    msgParam: 'message',
    senderParam: 'sender_id',
    note: 'Connect any custom local telco API or custom server webhook.',
  },
};

export const DEFAULT_SMS_CONFIG: SmsConfig = {
  enabled: true,
  provider: 'greenweb',
  apiUrl: 'https://api.greenweb.com.bd/api.php',
  apiKey: '',
  senderId: 'DOKANPRO',
  httpMethod: 'POST',
  requestFormat: 'form',
  autoSendOnSale: true,
  autoSendOnPaymentIn: true,
  autoSendOnInstallmentReminder: true,
  autoSendOnWarrantyResolved: true,
  saleTemplate: 'প্রিয় {customer_name}, {store_name}-এ কেনাকাটার জন্য ধন্যবাদ! চালান #{invoice_no}, মোট: ৳{total_amount}, জমা: ৳{paid_amount}, বর্তমান বকেয়া: ৳{due_amount}। হেল্পলাইন: {store_phone}',
  paymentInTemplate: 'প্রিয় {customer_name}, আপনার থেকে ৳{paid_amount} বকেয়া টাকা জমা হয়েছে। রশিদ #{receipt_no}, বর্তমান অবশিষ্ট বকেয়া: ৳{remaining_due}। ধন্যবাদ, {store_name}',
  dueReminderTemplate: 'সম্মানিত {customer_name}, {store_name}-এ আপনার বর্তমান বকেয়া ৳{current_due} টাকা। অনুগ্রহ করে বকেয়া পরিশোধ করার জন্য বিনীত অনুরোধ করা হচ্ছে। যোগাযোগ: {store_phone}',
  warrantyResolvedTemplate: 'সম্মানিত {customer_name}, আপনার ওয়ারেন্টি ক্লেইম (টিকিট #{ticket_no}, {product_name}) সমাধান ({status}) হয়েছে। নোট: {note}। অনুগ্রহ করে দোকান থেকে পণ্যটি সংগ্রহ করার অনুরোধ করা হলো। ধন্যবাদ, {store_name}',
};

/**
 * Replace placeholders in SMS templates
 */
export function formatSmsTemplate(
  template: string,
  variables: Record<string, string | number>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(pattern, String(value ?? ''));
  }
  return result;
}

/**
 * Standardize Bangladesh and international phone numbers
 */
export function sanitizePhoneNumber(phone: string): string {
  let clean = phone.replace(/[^0-9+]/g, '');
  if (clean.startsWith('+')) {
    clean = clean.substring(1);
  }
  // Standard BD number formats: 01XXXXXXXXX or 8801XXXXXXXXX
  if (clean.length === 11 && clean.startsWith('01')) {
    return clean;
  }
  if (clean.length === 13 && clean.startsWith('8801')) {
    return clean;
  }
  if (clean.length === 10 && clean.startsWith('1')) {
    return `0${clean}`;
  }
  return clean;
}

export interface SendSmsResult {
  success: boolean;
  message: string;
  responseDetails?: string;
  log: SmsLog;
}

/**
 * Fetch server public outbound IP for SMS IP Whitelisting
 */
export async function fetchServerPublicIp(): Promise<string> {
  try {
    // 1. Express backend endpoint
    const res1 = await fetch('/api/get-ip', { signal: AbortSignal.timeout(3000) });
    if (res1.ok) {
      const d1 = await res1.json();
      if (d1?.ip || d1?.serverIp) return d1.ip || d1.serverIp;
    }
  } catch {
    // Continue
  }

  try {
    // 2. PHP backend endpoint
    const res2 = await fetch('/api.php?action=get_ip', { signal: AbortSignal.timeout(3000) });
    if (res2.ok) {
      const d2 = await res2.json();
      if (d2?.ip || d2?.serverIp) return d2.ip || d2.serverIp;
    }
  } catch {
    // Continue
  }

  try {
    // 3. External IP detection API
    const res3 = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(4000) });
    if (res3.ok) {
      const d3 = await res3.json();
      if (d3?.ip) return d3.ip;
    }
  } catch {
    // Continue
  }

  return '103.145.244.11';
}

/**
 * Core function to send SMS via configured Gateway API through backend proxy
 */
export async function sendSmsViaGateway(
  config: SmsConfig,
  params: {
    recipientPhone: string;
    recipientName: string;
    message: string;
    type: SmsLog['type'];
  }
): Promise<SendSmsResult> {
  const { recipientPhone, recipientName, message, type } = params;
  const cleanPhone = sanitizePhoneNumber(recipientPhone);
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: 'numeric' });

  const logId = `sms-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  if (!cleanPhone || cleanPhone.length < 8) {
    const errorLog: SmsLog = {
      id: logId,
      recipientPhone: recipientPhone || 'N/A',
      recipientName: recipientName || 'Customer',
      message,
      type,
      status: 'FAILED',
      responseDetails: 'Invalid phone number format. Minimum 10-11 digits required.',
      date: dateStr,
      time: timeStr,
    };
    return {
      success: false,
      message: 'সঠিক মোবাইল নম্বর লিখুন (Invalid phone number)',
      responseDetails: errorLog.responseDetails,
      log: errorLog,
    };
  }

  // If no API key provided or SMS is disabled
  if (!config.enabled || !config.apiKey?.trim()) {
    const isMock = !config.apiKey?.trim();
    const simulatedLog: SmsLog = {
      id: logId,
      recipientPhone: cleanPhone,
      recipientName,
      message,
      type,
      status: isMock ? 'SENT' : 'FAILED',
      responseDetails: isMock
        ? 'সিমুলেশন মোড: SMS গেটওয়েতে সরাসরি পাঠানোর জন্য Settings > SMS Gateway API-তে আসল API Key ও Sender ID দিন।'
        : 'SMS সার্ভিস বন্ধ আছে (SMS Disabled in Settings)',
      date: dateStr,
      time: timeStr,
    };

    return {
      success: true,
      message: isMock
        ? `ডেমো মোড: ${cleanPhone}-এ মেসেজ লগ করা হয়েছে (লাইভ পাঠানোর জন্য API Key দিন)`
        : `SMS Service Disabled`,
      responseDetails: simulatedLog.responseDetails,
      log: simulatedLog,
    };
  }

  // Live Gateway Dispatch via Backend Proxy with Fallbacks
  try {
    const customProv = config.customProviders?.find(p => p.id === config.provider);
    const preset = customProv ? {
      name: customProv.name,
      nameBn: customProv.nameBn,
      defaultUrl: customProv.defaultUrl,
      httpMethod: customProv.httpMethod,
      requestFormat: customProv.requestFormat,
      keyParam: customProv.keyParam,
      toParam: customProv.toParam,
      msgParam: customProv.msgParam,
      senderParam: customProv.senderParam,
      note: customProv.description,
    } : (PROVIDER_PRESETS[config.provider] || PROVIDER_PRESETS.custom_api);
    let url = config.apiUrl?.trim() || preset.defaultUrl;

    const keyParam = config.customKeyParam?.trim() || preset.keyParam || 'api_key';
    const toParam = config.customToParam?.trim() || preset.toParam || 'to';
    const msgParam = config.customMsgParam?.trim() || preset.msgParam || 'message';
    const senderParam = config.customSenderParam?.trim() || preset.senderParam;
    const userParam = config.customUserParam?.trim() || preset.userParam;
    const passParam = config.customPassParam?.trim() || preset.passParam;

    const payload: Record<string, string> = {
      [keyParam]: config.apiKey.trim(),
      [toParam]: cleanPhone,
      [msgParam]: message,
    };

    if (config.provider === 'bulksms24') {
      const cid = config.clientId?.trim() || config.senderId?.trim();
      if (cid) {
        payload['customer_id'] = cid;
        payload['client_id'] = cid;
        payload['ClientId'] = cid;
        payload['customerid'] = cid;
      }
      payload['api_key'] = config.apiKey.trim();
      payload['apikey'] = config.apiKey.trim();
      payload['mobile_no'] = cleanPhone;
      payload['number'] = cleanPhone;
      payload['to'] = cleanPhone;
      payload['message'] = message;
      payload['msg'] = message;
    }

    if (config.senderId?.trim() && senderParam) {
      payload[senderParam] = config.senderId.trim();
    }

    if (config.clientId?.trim()) {
      payload['ClientId'] = config.clientId.trim();
      payload['client_id'] = config.clientId.trim();
      payload['customerId'] = config.clientId.trim();
      payload['CustomerID'] = config.clientId.trim();
      payload['clientid'] = config.clientId.trim();
    } else if (config.senderId?.trim()) {
      payload['ClientId'] = config.senderId.trim();
      payload['client_id'] = config.senderId.trim();
      payload['customerId'] = config.senderId.trim();
      payload['CustomerID'] = config.senderId.trim();
    }

    if (config.username?.trim() && userParam) {
      payload[userParam] = config.username.trim();
    }

    if (config.password?.trim() && passParam) {
      payload[passParam] = config.password.trim();
    }

    // Add extra preset params
    if (preset.extraParams) {
      for (const [k, v] of Object.entries(preset.extraParams)) {
        if (!payload[k]) {
          payload[k] = v;
        }
      }
    }

    if (config.provider === 'twilio' && config.clientId) {
      url = url.replace('{clientId}', config.clientId);
    }

    let customHeadersObj: Record<string, string> = {};
    if (config.customHeaders?.trim()) {
      try {
        customHeadersObj = JSON.parse(config.customHeaders);
      } catch {
        const lines = config.customHeaders.split('\n');
        for (const line of lines) {
          const colonIdx = line.indexOf(':');
          if (colonIdx > 0) {
            const hKey = line.substring(0, colonIdx).trim();
            const hVal = line.substring(colonIdx + 1).trim();
            if (hKey && hVal) customHeadersObj[hKey] = hVal;
          }
        }
      }
    }

    const proxyBody = JSON.stringify({
      url,
      method: config.httpMethod || preset.httpMethod,
      format: config.requestFormat || preset.requestFormat,
      payload,
      headers: customHeadersObj,
    });

    let data: any = null;

    // 1. Attempt Node Express Proxy (/api/send-sms)
    try {
      const p1 = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: proxyBody,
      });
      if (p1.ok) {
        data = await p1.json();
      }
    } catch {
      // Express proxy unavaliable, try fallback
    }

    // 2. Attempt PHP Proxy (/api.php?action=send_sms) if Express didn't respond
    if (!data) {
      try {
        const p2 = await fetch('/api.php?action=send_sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: proxyBody,
        });
        if (p2.ok) {
          data = await p2.json();
        }
      } catch {
        // PHP proxy unavailable
      }
    }

    // 3. Fallback: Direct Client Fetch to SMS Gateway
    if (!data) {
      const httpMethod = (config.httpMethod || preset.httpMethod || 'POST').toUpperCase();
      let reqUrl = url;
      let reqInit: RequestInit = { method: httpMethod };

      if (httpMethod === 'GET') {
        const urlObj = new URL(reqUrl);
        for (const [k, v] of Object.entries(payload)) {
          urlObj.searchParams.set(k, String(v));
        }
        reqUrl = urlObj.toString();
      } else {
        const formParams = new URLSearchParams();
        for (const [k, v] of Object.entries(payload)) {
          formParams.append(k, String(v));
        }
        reqInit.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        reqInit.body = formParams.toString();
      }

      const directRes = await fetch(reqUrl, reqInit);
      const text = await directRes.text();
      data = {
        success: directRes.ok && !text.toLowerCase().includes('error') && !text.toLowerCase().includes('fail'),
        responseText: text,
      };
    }

    const isSuccess = Boolean(data.success);
    let responseText = data.responseText || (isSuccess ? 'SMS Gateway OK' : 'No response from SMS Gateway');

    // Detect if IP Whitelist error occurred in gateway response
    const lowerResp = responseText.toLowerCase();
    if (
      lowerResp.includes('ip') &&
      (lowerResp.includes('whitelist') || lowerResp.includes('denied') || lowerResp.includes('not allowed') || lowerResp.includes('unauthorized') || lowerResp.includes('access'))
    ) {
      responseText += '\n\n⚠️ IP Whitelist Error: Your Server/Host IP needs to be added in Greenweb/BulkSMS BD control panel.';
    }

    const log: SmsLog = {
      id: logId,
      recipientPhone: cleanPhone,
      recipientName,
      message,
      type,
      status: isSuccess ? 'SENT' : 'FAILED',
      responseDetails: responseText,
      date: dateStr,
      time: timeStr,
    };

    let statusMsg = isSuccess
      ? `SMS সফলভাবে পাঠানো হয়েছে (${cleanPhone})`
      : `SMS পাঠাতে ব্যর্থ হয়েছে! প্রোভাইডারের উত্তর: ${responseText.slice(0, 150)}`;

    return {
      success: isSuccess,
      message: statusMsg,
      responseDetails: responseText,
      log,
    };
  } catch (error: any) {
    console.warn('SMS gateway proxy error (handled):', error);

    const fallbackLog: SmsLog = {
      id: logId,
      recipientPhone: cleanPhone,
      recipientName,
      message,
      type,
      status: 'FAILED',
      responseDetails: `Connection Error: ${error?.message || 'Network unreachable'}`,
      date: dateStr,
      time: timeStr,
    };

    return {
      success: false,
      message: `SMS পাঠানো যায়নি: গেটওয়ে সংযোগে ত্রুটি (${error?.message || 'Network error'})`,
      responseDetails: fallbackLog.responseDetails,
      log: fallbackLog,
    };
  }
}
