import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';
import { generateFullSqlDump, generateFreshCleanSqlDump } from './src/utils/sqlExporter';

function syncMiddlewarePlugin(): Plugin {
  return {
    name: 'sync-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const urlPath = req.url?.split('?')[0] || '';
        const queryString = req.url?.includes('?') ? req.url.split('?')[1] : '';

        // Handle fresh clean SQL database download (zero transaction entries)
        if (
          urlPath === '/download-fresh-sql' ||
          urlPath === '/fresh_database.sql' ||
          urlPath === '/clean_database.sql' ||
          (urlPath.startsWith('/api.php') && queryString.includes('action=download_fresh_sql'))
        ) {
          const freshSqlDump = generateFreshCleanSqlDump();
          const freshSqlPath = path.resolve(process.cwd(), 'fresh_database.sql');
          const publicFreshSqlPath = path.resolve(process.cwd(), 'public/fresh_database.sql');
          try {
            fs.writeFileSync(freshSqlPath, freshSqlDump, 'utf-8');
            if (!fs.existsSync(path.resolve(process.cwd(), 'public'))) {
              fs.mkdirSync(path.resolve(process.cwd(), 'public'), { recursive: true });
            }
            fs.writeFileSync(publicFreshSqlPath, freshSqlDump, 'utf-8');
          } catch {}

          res.setHeader('Content-Type', 'application/sql; charset=utf-8');
          res.setHeader('Content-Disposition', 'attachment; filename="dokanpro_fresh_clean_database.sql"');
          res.statusCode = 200;
          res.end(freshSqlDump);
          return;
        }

        // Handle direct SQL database download
        if (
          urlPath === '/download-database-sql' ||
          urlPath === '/database.sql' ||
          (urlPath.startsWith('/api.php') && queryString.includes('action=download_sql'))
        ) {
          const snapshotPath = path.resolve(process.cwd(), 'erp_data_snapshot.json');
          const backupPath = path.resolve(process.cwd(), 'erp_local_backup.json');
          const rootSqlPath = path.resolve(process.cwd(), 'database.sql');
          const fileToRead = fs.existsSync(snapshotPath) ? snapshotPath : (fs.existsSync(backupPath) ? backupPath : null);
          
          let sqlContent = '';
          if (fileToRead) {
            try {
              const content = fs.readFileSync(fileToRead, 'utf-8');
              const data = JSON.parse(content);
              const state = data.data || data;
              sqlContent = generateFullSqlDump(state);
              fs.writeFileSync(rootSqlPath, sqlContent, 'utf-8');
              const publicSqlPath = path.resolve(process.cwd(), 'public/database.sql');
              fs.writeFileSync(publicSqlPath, sqlContent, 'utf-8');
            } catch {}
          }

          if (!sqlContent && fs.existsSync(rootSqlPath)) {
            sqlContent = fs.readFileSync(rootSqlPath, 'utf-8');
          }

          if (sqlContent) {
            res.setHeader('Content-Type', 'application/sql; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="dokanpro_database.sql"');
            res.statusCode = 200;
            res.end(sqlContent);
            return;
          }
        }
        
        // Handle /api/sync and /api.php endpoints
        if (urlPath === '/api/sync' || urlPath === '/api.php' || urlPath.startsWith('/api/sync') || urlPath.startsWith('/api.php')) {
          const backupPath = path.resolve(process.cwd(), 'erp_local_backup.json');
          const snapshotPath = path.resolve(process.cwd(), 'erp_data_snapshot.json');
          const publicSnapshotPath = path.resolve(process.cwd(), 'public/erp_data_snapshot.json');
          const rootSqlPath = path.resolve(process.cwd(), 'database.sql');
          const publicSqlPath = path.resolve(process.cwd(), 'public/database.sql');

          const mergeCollection = (existingList: any, incomingList: any, deletedIds?: Set<string>): any[] => {
            if (!Array.isArray(existingList) && !Array.isArray(incomingList)) return [];
            if (!Array.isArray(existingList)) return (Array.isArray(incomingList) ? incomingList : []).filter(item => !deletedIds?.has(String(item?.id)));
            if (!Array.isArray(incomingList)) return existingList.filter(item => !deletedIds?.has(String(item?.id)));
            if (incomingList.length === 0) return existingList.filter(item => !deletedIds?.has(String(item?.id)));

            const map = new Map<string, any>();
            for (const item of existingList) {
              if (item && item.id !== undefined && item.id !== null) {
                if (!deletedIds?.has(String(item.id))) {
                  map.set(String(item.id), item);
                }
              }
            }
            for (const item of incomingList) {
              if (item && item.id !== undefined && item.id !== null) {
                if (!deletedIds?.has(String(item.id))) {
                  const existing = map.get(String(item.id));
                  if (existing) {
                    map.set(String(item.id), { ...existing, ...item });
                  } else {
                    map.set(String(item.id), item);
                  }
                }
              }
            }
            return Array.from(map.values());
          };

          const mergeErpData = (existing: any, incoming: any): any => {
            if (!existing || typeof existing !== 'object') return incoming;
            if (!incoming || typeof incoming !== 'object') return existing;

            const resolvedExisting = existing.data || existing;
            const resolvedIncoming = incoming.data || incoming;

            const existingSettings = resolvedExisting.companySettings || {};
            const incomingSettings = resolvedIncoming.companySettings || {};
            const mergedSettings = {
              ...existingSettings,
              ...incomingSettings,
            };

            const resolvedName = incomingSettings.name || incomingSettings.companyName || existingSettings.name || existingSettings.companyName;
            if (resolvedName) {
              mergedSettings.name = resolvedName;
            }
            if (!mergedSettings.phone && existingSettings.phone) mergedSettings.phone = existingSettings.phone;
            if (!mergedSettings.address && existingSettings.address) mergedSettings.address = existingSettings.address;
            if (!mergedSettings.email && existingSettings.email) mergedSettings.email = existingSettings.email;

            // Gather deleted record IDs to prevent resurrection
            const deletedSaleIds = new Set<string>([
              ...((resolvedExisting.deletedSaleInvoices || []).map((d: any) => String(d?.id || d?.invoiceId || ''))),
              ...((resolvedIncoming.deletedSaleInvoices || []).map((d: any) => String(d?.id || d?.invoiceId || ''))),
            ].filter(Boolean));

            const deletedPurchaseIds = new Set<string>([
              ...((resolvedExisting.deletedPurchaseInvoices || []).map((d: any) => String(d?.id || d?.billNumber || ''))),
              ...((resolvedIncoming.deletedPurchaseInvoices || []).map((d: any) => String(d?.id || d?.billNumber || ''))),
            ].filter(Boolean));

            const deletedProductIds = new Set<string>([
              ...((resolvedExisting.deletedProductIds || []).map((d: any) => String(d))),
              ...((resolvedIncoming.deletedProductIds || []).map((d: any) => String(d))),
            ].filter(Boolean));

            return {
              ...resolvedExisting,
              ...resolvedIncoming,
              companySettings: mergedSettings,
              products: mergeCollection(resolvedExisting.products, resolvedIncoming.products, deletedProductIds),
              deletedProductIds: Array.from(deletedProductIds),
              categories: mergeCollection(resolvedExisting.categories, resolvedIncoming.categories),
              parties: mergeCollection(resolvedExisting.parties, resolvedIncoming.parties),
              wallets: mergeCollection(resolvedExisting.wallets, resolvedIncoming.wallets),
              saleInvoices: mergeCollection(resolvedExisting.saleInvoices, resolvedIncoming.saleInvoices, deletedSaleIds),
              deletedSaleInvoices: mergeCollection(resolvedExisting.deletedSaleInvoices, resolvedIncoming.deletedSaleInvoices),
              saleReturns: mergeCollection(resolvedExisting.saleReturns, resolvedIncoming.saleReturns),
              purchaseInvoices: mergeCollection(resolvedExisting.purchaseInvoices, resolvedIncoming.purchaseInvoices, deletedPurchaseIds),
              deletedPurchaseInvoices: mergeCollection(resolvedExisting.deletedPurchaseInvoices, resolvedIncoming.deletedPurchaseInvoices),
              purchaseReturns: mergeCollection(resolvedExisting.purchaseReturns, resolvedIncoming.purchaseReturns),
              purchaseOrders: mergeCollection(resolvedExisting.purchaseOrders, resolvedIncoming.purchaseOrders),
              quotations: mergeCollection(resolvedExisting.quotations, resolvedIncoming.quotations),
              expiredReturnLogs: mergeCollection(resolvedExisting.expiredReturnLogs, resolvedIncoming.expiredReturnLogs),
              installmentSchemes: mergeCollection(resolvedExisting.installmentSchemes, resolvedIncoming.installmentSchemes),
              employees: mergeCollection(resolvedExisting.employees, resolvedIncoming.employees),
              advanceSalaries: mergeCollection(resolvedExisting.advanceSalaries, resolvedIncoming.advanceSalaries),
              payrollHistory: mergeCollection(resolvedExisting.payrollHistory, resolvedIncoming.payrollHistory),
              expenseCategories: mergeCollection(resolvedExisting.expenseCategories, resolvedIncoming.expenseCategories),
              expenseVouchers: mergeCollection(resolvedExisting.expenseVouchers, resolvedIncoming.expenseVouchers),
              dayBookEntries: mergeCollection(resolvedExisting.dayBookEntries, resolvedIncoming.dayBookEntries),
              cashAdjustments: mergeCollection(resolvedExisting.cashAdjustments, resolvedIncoming.cashAdjustments),
              activityLogs: mergeCollection(resolvedExisting.activityLogs, resolvedIncoming.activityLogs),
              users: mergeCollection(resolvedExisting.users, resolvedIncoming.users),
              warrantyPolicies: mergeCollection(resolvedExisting.warrantyPolicies, resolvedIncoming.warrantyPolicies),
              warrantyRecords: mergeCollection(resolvedExisting.warrantyRecords, resolvedIncoming.warrantyRecords),
              warrantyClaims: mergeCollection(resolvedExisting.warrantyClaims, resolvedIncoming.warrantyClaims),
              smsLogs: mergeCollection(resolvedExisting.smsLogs, resolvedIncoming.smsLogs),
              smsConfig: {
                ...(resolvedExisting.smsConfig || {}),
                ...(resolvedIncoming.smsConfig || {}),
              },
              lastUpdatedEpoch: Math.max(
                Date.now(),
                Number(resolvedIncoming.lastUpdatedEpoch) || 0,
                Number(resolvedExisting.lastUpdatedEpoch) || 0
              ),
            };
          };

          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk;
            });
            req.on('end', () => {
              res.setHeader('Content-Type', 'application/json');
              try {
                const incomingData = JSON.parse(body || '{}');

                let existingData: any = {};
                const fileToRead = fs.existsSync(snapshotPath) ? snapshotPath : (fs.existsSync(backupPath) ? backupPath : null);
                if (fileToRead) {
                  try {
                    existingData = JSON.parse(fs.readFileSync(fileToRead, 'utf-8'));
                  } catch {}
                }

                const mergedData = mergeErpData(existingData, incomingData);
                const jsonStr = JSON.stringify(mergedData, null, 2);

                fs.writeFileSync(backupPath, jsonStr, 'utf-8');
                fs.writeFileSync(snapshotPath, jsonStr, 'utf-8');
                try {
                  if (!fs.existsSync(path.resolve(process.cwd(), 'public'))) {
                    fs.mkdirSync(path.resolve(process.cwd(), 'public'), { recursive: true });
                  }
                  fs.writeFileSync(publicSnapshotPath, jsonStr, 'utf-8');
                } catch {}

                // Auto-generate fresh database.sql with all live records
                try {
                  const sqlDump = generateFullSqlDump(mergedData);
                  fs.writeFileSync(rootSqlPath, sqlDump, 'utf-8');
                  fs.writeFileSync(publicSqlPath, sqlDump, 'utf-8');
                } catch (sqlErr) {
                  console.warn('Failed to update database.sql:', sqlErr);
                }

                res.statusCode = 200;
                res.end(JSON.stringify({
                  success: true,
                  message: 'Data merged, snapshot saved, and database.sql updated successfully.',
                  timestamp: new Date().toISOString(),
                  lastUpdatedEpoch: mergedData.lastUpdatedEpoch,
                  ...mergedData,
                }));
              } catch (err: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
            return;
          }

          if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            try {
              const fileToRead = fs.existsSync(snapshotPath) ? snapshotPath : backupPath;
              if (fs.existsSync(fileToRead)) {
                const content = fs.readFileSync(fileToRead, 'utf-8');
                const data = JSON.parse(content);
                const resolved = data.data || data;
                res.statusCode = 200;
                res.end(JSON.stringify({
                  success: true,
                  ...resolved,
                  data: resolved,
                  timestamp: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  lastUpdatedEpoch: resolved.lastUpdatedEpoch || Date.now(),
                }));
              } else {
                res.statusCode = 200;
                res.end(JSON.stringify({ success: true, data: null, empty: true }));
              }
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
            return;
          }
        }

        // Handle /api/health
        if (urlPath === '/api/health') {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({
            status: 'online',
            app: 'DokanPro Enterprise ERP Server',
            version: '4.5.0',
            timestamp: new Date().toISOString(),
          }));
          return;
        }

        // Handle /api/get-ip
        if (urlPath === '/api/get-ip') {
          res.setHeader('Content-Type', 'application/json');
          try {
            let publicIp = '127.0.0.1';
            try {
              const ipRes = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
              if (ipRes.ok) {
                const ipData = (await ipRes.json()) as any;
                publicIp = ipData.ip || publicIp;
              }
            } catch {}
            res.statusCode = 200;
            res.end(JSON.stringify({
              success: true,
              serverIp: publicIp,
              clientIp: req.socket.remoteAddress || '127.0.0.1',
              ip: publicIp,
            }));
          } catch {
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, ip: '127.0.0.1' }));
          }
          return;
        }

        next();
      });
    },
  };
}

function smsProxyPlugin(): Plugin {
  return {
    name: 'sms-proxy-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/send-sms')) {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk;
            });

            req.on('end', async () => {
              res.setHeader('Content-Type', 'application/json');
              try {
                const parsed = JSON.parse(body || '{}');
                const {
                  url,
                  method = 'POST',
                  format = 'form',
                  payload = {},
                  headers = {},
                } = parsed;

                if (!url) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ success: false, message: 'URL is required' }));
                  return;
                }

                let targetUrl = url;
                const requestHeaders: Record<string, string> = {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DokanPro ERP SMS Client',
                  'Accept': '*/*',
                  ...headers,
                };

                let requestInit: RequestInit = {
                  method: method.toUpperCase(),
                  headers: requestHeaders,
                };

                if (method.toUpperCase() === 'GET') {
                  const urlObj = new URL(targetUrl);
                  for (const [k, v] of Object.entries(payload)) {
                    if (v !== undefined && v !== null && String(v).length > 0) {
                      urlObj.searchParams.set(k, String(v));
                    }
                  }
                  targetUrl = urlObj.toString();
                } else {
                  // POST
                  if (format === 'json') {
                    requestHeaders['Content-Type'] = 'application/json';
                    requestInit.body = JSON.stringify(payload);
                  } else {
                    requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
                    const formParams = new URLSearchParams();
                    for (const [k, v] of Object.entries(payload)) {
                      if (v !== undefined && v !== null) {
                        formParams.append(k, String(v));
                      }
                    }
                    requestInit.body = formParams.toString();
                  }
                }

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);
                requestInit.signal = controller.signal;

                const fetchResponse = await fetch(targetUrl, requestInit);
                clearTimeout(timeoutId);

                const responseText = await fetchResponse.text();
                const isHttpOk = fetchResponse.ok;

                // Provider specific response analysis
                let isSuccess = isHttpOk;
                const lowerText = responseText.toLowerCase();

                // Common error keywords in SMS gateways
                if (
                  lowerText.includes('invalid') ||
                  lowerText.includes('fail') ||
                  lowerText.includes('error') ||
                  lowerText.includes('missing') ||
                  lowerText.includes('incorrect') ||
                  lowerText.includes('insufficient') ||
                  lowerText.includes('denied') ||
                  lowerText.includes('unauthorized')
                ) {
                  isSuccess = false;
                } else if (isHttpOk) {
                  isSuccess = true;
                }

                // Known success indicators in Bangladesh Gateways
                if (
                  lowerText.includes('status":"sent"') ||
                  lowerText.includes('status": "sent"') ||
                  lowerText.includes('status":"success"') ||
                  lowerText.includes('response_code":202') ||
                  lowerText.includes('response_code": 202') ||
                  lowerText.includes('sms submitted successfully') ||
                  lowerText.includes('status:sent') ||
                  lowerText.includes('1900') ||
                  lowerText.includes('success') ||
                  lowerText.includes('sent')
                ) {
                  isSuccess = true;
                }

                res.statusCode = 200;
                res.end(
                  JSON.stringify({
                    success: isSuccess,
                    httpStatus: fetchResponse.status,
                    responseText,
                    targetUrl,
                  })
                );
              } catch (err: any) {
                console.error('[SMS Proxy Error]:', err);
                res.statusCode = 200;
                res.end(
                  JSON.stringify({
                    success: false,
                    error: err?.message || 'Failed to connect to SMS Gateway',
                    responseText: `Gateway Connection Error: ${err?.message || 'Timeout/Network issue'}`,
                  })
                );
              }
            });
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), syncMiddlewarePlugin(), smsProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 2500,
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
