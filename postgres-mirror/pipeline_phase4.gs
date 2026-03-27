/**
 * Phase 4: Inbound Data Sync (DB -> Sheets) with Strict Deduplication
 * Pulls the latest state from Postgres and updates Google Sheets using an in-memory
 * dictionary (Map) keyed by Primary Key to selectively apply additions, updates, and 
 * deletions (orphan cleanup) without duplicating rows or relying on row-by-row I/O.
 */

const DB_CONFIG_PHASE_4 = {
  host: '13.232.148.68',
  port: '5432',
  database: 'better_task_db',
  user: 'admin',
  password: 'admin123'
};

/**
 * Main entry point for Phase 4.
 */
function syncDatabaseToSheetsDedupe() {
  let ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) {}
  const connString = `jdbc:postgresql://${DB_CONFIG_PHASE_4.host}:${DB_CONFIG_PHASE_4.port}/${DB_CONFIG_PHASE_4.database}`;
  let conn;
  
  try {
    conn = Jdbc.getConnection(connString, DB_CONFIG_PHASE_4.user, DB_CONFIG_PHASE_4.password);
    
    // 1. Get Schema and Primary Keys from Schema_Log
    const pKeyMap = getPrimaryKeyMapping();
    if (Object.keys(pKeyMap).length === 0) {
      if (ui) ui.alert('Error: Could not find any Primary Keys in Schema_Log. Orphan cleanup requires Primary Keys. Aborting.');
      return;
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const allSheets = ss.getSheets();
    let tablesSyncedCount = 0;
    
    // 2. Loop through all table sheets
    for (const sheet of allSheets) {
      const sheetName = sheet.getName();
      
      // Ignore system sheets
      if (sheetName.trim().toLowerCase() === 'schema_log' || sheetName.trim().toLowerCase() === 'system_logs' || sheetName.trim().toLowerCase() === 'users') continue;

      // If no valid PK is documented for this table, we cannot deduplicate safely. Skip it.
      if (!pKeyMap[sheetName] || pKeyMap[sheetName].length === 0) {
        logSystemEvent('WARNING', sheetName, 'N/A', 'SKIPPED_P4_SYNC', 'No Primary Key found in Schema_Log. Cannot deduplicate.');
        continue;
      }
      
      const success = dedupeTableSync(conn, sheet, sheetName, pKeyMap[sheetName]);
      if (success) tablesSyncedCount++;
    }
    
    if (ui) ui.alert(`Phase 4 Sync Complete! Successfully synced and deduplicated ${tablesSyncedCount} table(s). Check System_Logs for details.`);
    
  } catch (err) {
    console.error('Phase 4 Sync Error:', err);
    logSystemEvent('ERROR', 'N/A', 'N/A', 'GLOBAL_P4_SYNC_FAILED', err.message);
    if(ui) {
      try { ui.alert(`Critical Error during Sync:\n${err.message}\n\nOperation Aborted.`); } catch(e) {}
    }
    console.error('Phase 4 Failed:', err.message);
    throw err;
  } finally {
    if (conn) try { conn.close(); } catch(e) {}
  }
}

/**
 * Pulls Postgres data and performs the in-memory dictionary merge against Google Sheet data.
 *
 * @param {JdbcConnection} conn 
 * @param {Sheet} sheet 
 * @param {string} tableName 
 * @param {string[]} pkColumns 
 * @returns {boolean}
 */
function dedupeTableSync(conn, sheet, tableName, pkColumns) {
  let stmt;
  let rs;
  
  try {
    // ---------------------------------------------------------
    // STEP A: Read Google Sheet Data & Build Dictionary
    // ---------------------------------------------------------
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    let sheetHeaders = [];
    let sheetDataRows = [];
    
    if (lastRow > 0 && lastCol > 0) {
      const rawData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
      sheetHeaders = rawData[0].map(h => h.toString().trim());
      // Everything below row 1
      sheetDataRows = rawData.slice(1);
    } else {
      // If sheet is completely empty, we can just do a mass insert, but for safety we'll 
      // rely on DB headers in Step B.
      sheetHeaders = [];
    }
    
    // Find what index the Primary Key columns sit at inside the array.
    // E.g., if ID is the first column, pkIndices = [0]
    const pkIndices = pkColumns.map(pk => sheetHeaders.indexOf(pk)).filter(idx => idx !== -1);
    
    // The Deduplication Dictionary (Map)
    // Key: Compound string representation of the Primary Key(s) (e.g. "1" or "1|user5")
    // Value: The actual row array in memory.
    const sheetRowDict = new Map();
    
    for (const row of sheetDataRows) {
      if (pkIndices.length > 0) {
        // Build a unique key for this row using its primary key data
        const hashKey = pkIndices.map(idx => row[idx]).join('|');
        // Register the row in the dictionary
        sheetRowDict.set(hashKey, row);
      }
    }
    
    // ---------------------------------------------------------
    // STEP B: Pull Postgres Data
    // ---------------------------------------------------------
    stmt = conn.createStatement();
    // Use quotes around the table name to handle case sensitivity
    const query = `SELECT * FROM "${tableName}"`;
    rs = stmt.executeQuery(query);
    
    const metaData = rs.getMetaData();
    const columnCount = metaData.getColumnCount();
    const dbHeaders = [];
    for (let i = 1; i <= columnCount; i++) {
      dbHeaders.push(metaData.getColumnName(i).trim());
    }
    
    // If sheet was totally empty, inherit DB headers
    if (sheetHeaders.length === 0) {
      sheetHeaders = dbHeaders;
    }
    
    // Find where the PK sits in the generic DB row output
    const dbPkIndices = pkColumns.map(pk => dbHeaders.indexOf(pk)).filter(idx => idx !== -1);
    
    const dbRowDict = new Map(); // Store incoming rows temporarily to help with Orphan Cleanup
    
    // Parse ResultSet
    while (rs.next()) {
      const dbRowArray = [];
      for (let i = 1; i <= columnCount; i++) {
        let val = rs.getObject(i);
        
        // Convert SQL Timestamp to native JS Date for Google Sheets compatibility
        if (val !== null && typeof val === 'object' && val.getTime) {
          dbRowArray.push(new Date(val.getTime()));
        } else if (val === null) {
          dbRowArray.push('');
        } else {
          dbRowArray.push(val);
        }
      }
      
      // Calculate HashKey of incoming Postgres row
      if (dbPkIndices.length > 0) {
        const hashKey = dbPkIndices.map(idx => dbRowArray[idx]).join('|');
        // Map the full DB row to the dictionary
        dbRowDict.set(hashKey, dbRowArray);
      }
    }
    
    // ---------------------------------------------------------
    // STEP C: The Merge & Deduplication Engine (In-Memory)
    // ---------------------------------------------------------
    let addedCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;
    
    // Create the final array that will overwrite the sheet
    const finalMergedArray = [];
    
    // We want the final sheet to match Postgres *exactly*.
    // Therefore, the sequence of the new array will simply be the sequence of the Postgres rows.
    for (const [hashKey, dbRow] of dbRowDict.entries()) {
      
      // Does this row exist in the old Google sheet?
      if (sheetRowDict.has(hashKey)) {
        // It existed. It might be identical, or it might have been updated.
        // We overwrite our memory representation with the fresh Postgres 'dbRow'.
        finalMergedArray.push(dbRow);
        
        // (Optional strict tracking: We could compare array contents to see if it truly changed, 
        // but for bulk overwrites, classifying it as an "upserted" refresh is computationally cheaper).
        updatedCount++;
      } else {
        // The Postgres row did NOT exist in Google Sheets. It's brand new.
        finalMergedArray.push(dbRow);
        addedCount++;
      }
    }
    
    // Orphan Cleanup: 
    // If a key was in 'sheetRowDict' (Google Sheets) but NOT in 'dbRowDict' (Postgres),
    // then that row was deleted from Postgres via API. 
    // Because we only pushed rows to `finalMergedArray` by iterating over `dbRowDict`, 
    // the orphans are naturally excluded from `finalMergedArray`.
    // We just count them for the audit log.
    deletedCount = sheetRowDict.size - updatedCount;
    if (deletedCount < 0) deletedCount = 0; // Sanity check
    
    // ---------------------------------------------------------
    // STEP D: bulk Sheet Execution (1 API Call)
    // ---------------------------------------------------------
    if (finalMergedArray.length > 0) {
      // 1. Wipe the old data (start from row 2 to preserve row 1 headers)
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
      }
      
      // 2. Dump the new data
      // Ensure the sheet has enough columns to hold the new array structure
      if (sheet.getMaxColumns() < dbHeaders.length) {
         sheet.insertColumnsAfter(sheet.getMaxColumns(), dbHeaders.length - sheet.getMaxColumns());
      }
      
      // Set headers on row 1 just to be strictly certain they align with Postgres
      sheet.getRange(1, 1, 1, dbHeaders.length).setValues([dbHeaders]);
      
      // Set all data starting from row 2
      sheet.getRange(2, 1, finalMergedArray.length, dbHeaders.length).setValues(finalMergedArray);
      
    } else {
      // Postgres table is totally empty. Wipe the sheet.
      logSystemEvent('WARNING', tableName, 'N/A', 'DELETED_ALL', 'Postgres table is completely empty. Wiped sheet.');
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
      }
    }
    
    // Audit Log Generation
    const msg = `Synced ${finalMergedArray.length} rows. Added: ${addedCount}. Updated: ${updatedCount}. Deleted (Orphans): ${deletedCount}.`;
    logSystemEvent('SUCCESS', tableName, 'N/A', 'P4_DEDUPE_SYNC', msg);
    
    return true;
    
  } catch (err) {
    logSystemEvent('ERROR', tableName, 'N/A', 'P4_SYNC_FAILED', err.message);
    throw new Error(`Failed dedupe-sync on table ${tableName}: ${err.message}`);
  } finally {
    if (rs) try { rs.close(); } catch(e) {}
    if (stmt) try { stmt.close(); } catch(e) {}
  }
}

/**
 * Reads Schema_Log and groups Primary Key columns by table.
 * Shared from Phase 3.
 */
function getPrimaryKeyMapping() {
  const map = {};
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const allSheets = ss.getSheets();
  let sheet = null;
  
  for (const s of allSheets) {
    if (s.getName().trim().toLowerCase() === 'schema_log') {
      sheet = s;
      break;
    }
  }
  
  if (!sheet) return map;
  
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return map;
  
  const headers = values[0];
  const tNameIdx = headers.indexOf('Table Name');
  const cNameIdx = headers.indexOf('Column Name');
  const pkIdx = headers.indexOf('Is Primary Key');
  
  if (tNameIdx === -1 || cNameIdx === -1 || pkIdx === -1) return map;
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const tName = row[tNameIdx] ? row[tNameIdx].toString().trim() : '';
    const cName = row[cNameIdx] ? row[cNameIdx].toString().trim() : '';
    const isPk = row[pkIdx] ? row[pkIdx].toString().trim().toUpperCase() : 'NO';
    
    if (tName && cName && isPk === 'YES') {
      if (!map[tName]) map[tName] = [];
      map[tName].push(cName);
    }
  }
  
  return map;
}

/**
 * Audit Logging.
 * Shared across tools.
 */
function logSystemEvent(status, tableName, columnName, action, message) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const allSheets = ss.getSheets();
  let logSheet = null;
  
  for (const s of allSheets) {
    if (s.getName().trim().toLowerCase() === 'system_logs') {
      logSheet = s;
      break;
    }
  }
  
  if (!logSheet) {
    logSheet = ss.insertSheet('System_Logs');
    logSheet.appendRow(['Timestamp', 'Status', 'Table_Name', 'Column_Name', 'Action_Executed', 'Error_Message']);
    logSheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  }
  
  logSheet.appendRow([new Date(), status, tableName, columnName, action, message]);
}
