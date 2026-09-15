/**
 * Fixed Assets Register — Google Sheets Sync Bridge
 * -----------------------------------------------------------------------
 * Paste this whole file into an Apps Script project bound to the Google
 * Sheet you want to use as your register's backing store, set SHARED_SECRET
 * below, then deploy it as a Web App (see the setup guide). The deployed
 * URL + your secret are what you enter in the app's
 * Administration -> Google Sheets Sync screen.
 *
 * Design notes:
 * - Each store (assets, transfers, users, ...) gets its own sheet tab.
 * - Each record is stored as ONE ROW: id | updatedAt | json
 *   The full record round-trips through the "json" cell. This deliberately
 *   avoids letting Google Sheets auto-reformat dates/numbers per column,
 *   which is the #1 cause of silent data corruption in DIY Sheets-as-a-
 *   database setups. Don't hand-edit the "json" column; it's the source
 *   of truth on the Sheets side.
 * - Nothing here ever deletes your Sheet's data on its own — pushes
 *   overwrite tab contents with what the app sends; pulls only read.
 * -----------------------------------------------------------------------
 */

// 1) CHANGE THIS to a long random string, e.g. from https://www.uuidgenerator.net/
//    Anyone with this secret AND your Web App URL can read/write this sheet,
//    so treat it like a password. Never commit it into a public GitHub repo —
//    it only ever needs to be pasted into the app's Admin screen in your browser.
const SHARED_SECRET = 'CHANGE-ME-TO-A-LONG-RANDOM-SECRET';

const STORE_NAMES = ['users','categories','assets','wipProjects','wipExpenditure','transfers','disposals','auditLog','settings'];

function doGet(e){ return handle(e); }
function doPost(e){ return handle(e); }

function handle(e){
  try{
    const params = (e && e.parameter) || {};
    if(params.secret !== SHARED_SECRET){
      return jsonOutput({ok:false, error:'Unauthorized — secret did not match.'});
    }
    if(params.action === 'pull'){
      return jsonOutput({ok:true, data: pullAll()});
    }
    if(params.action === 'push'){
      const raw = params.data;
      if(!raw) return jsonOutput({ok:false, error:'No data received.'});
      const payload = JSON.parse(raw);
      pushAll(payload);
      return jsonOutput({ok:true});
    }
    return jsonOutput({ok:false, error:'Unknown action: ' + params.action});
  } catch(err){
    return jsonOutput({ok:false, error: String(err && err.message ? err.message : err)});
  }
}

function getSS(){ return SpreadsheetApp.getActiveSpreadsheet(); }

function getOrCreateSheet(name){
  const ss = getSS();
  let sh = ss.getSheetByName(name);
  if(!sh){
    sh = ss.insertSheet(name);
  }
  return sh;
}

/** Reads every store's rows back out, reconstructing each record from
 *  its "json" cell. Sheets that don't exist yet simply come back empty. */
function pullAll(){
  const out = {};
  STORE_NAMES.forEach(function(name){
    const sh = getSS().getSheetByName(name);
    if(!sh){ out[name] = []; return; }
    const values = sh.getDataRange().getValues();
    const rows = values.slice(1).filter(function(r){ return r[0] !== '' && r[2]; });
    out[name] = rows.map(function(r){
      try{ return JSON.parse(r[2]); } catch(err){ return null; }
    }).filter(function(r){ return r !== null; });
  });
  return out;
}

/** Overwrites each store's tab with exactly what the app sent. */
function pushAll(payload){
  STORE_NAMES.forEach(function(name){
    const rows = payload[name] || [];
    const sh = getOrCreateSheet(name);
    sh.clearContents();
    // Force every cell to plain text so Sheets never "helpfully" reinterprets
    // a JSON string as a number or date.
    sh.getRange(1,1,Math.max(rows.length+1,1), 3).setNumberFormat('@');
    sh.getRange(1,1,1,3).setValues([['id','updatedAt','json']]);
    if(rows.length){
      const idField = (name === 'settings') ? 'key' : 'id';
      const now = new Date().toISOString();
      const data = rows.map(function(r){
        return [ String(r[idField]), now, JSON.stringify(r) ];
      });
      sh.getRange(2,1,data.length,3).setValues(data);
    }
  });

  const meta = getOrCreateSheet('_meta');
  meta.clearContents();
  meta.getRange(1,1,1,2).setNumberFormat('@');
  meta.getRange(1,1,2,2).setValues([['key','value'],['lastPush', new Date().toISOString()]]);
}

function jsonOutput(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
