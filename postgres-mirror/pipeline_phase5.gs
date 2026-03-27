/**
 * Phase 5: Outbound Data Sync (DML) - Deletions
 * Identifies rows that have been physically deleted from Google Sheets 
 * but still exist in Postgres, and executes DELETE statements.
 */

const DB_CONFIG_PHASE_5 = {
  host: '13.232.148.68', 
  port: '5432',
  database: 'better_task_db',
  user: 'admin',
  password: 'admin123'
};

/**
 * Main entry point for Phase 5 Data Sync (Deletions).
 */
function syncSheetsToDatabaseDeletions() {
  let ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) {}
  const connString = `jdbc:postgresql://${DB_CONFIG_PHASE_5.host}:${DB_CONFIG_PHASE_5.port}/${DB_CONFIG_PHASE_5.database}`;
  let conn;
  
  try {
    conn = Jdbc.getConnection(connString, DB_CONFIG_PHASE_5.user, DB_CONFIG_PHASE_5.password);
    
    // 1. Get Primary Keys from Schema_Log
    const pKeyMap = getPrimaryKeyMapping();
    if (Object.keys(pKeyMap).length === 0) {
      if (ui) ui.alert('Error: Could not find Primary Keys in Schema_Log. Deletions require Primary Keys.');
      return;
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const allSheets = ss.getSheets();
    let tablesProcessedCount = 0;
    
    // 2. Validate and filter sheets before sorting
    // We want to delete Children first, then Parents to avoid Foreign Key errors
    const validSheetNames = [];
    for (const sheet of allSheets) {
      const sheetName = sheet.getName();
      if (sheetName.trim().toLowerCase() === 'schema_log' || sheetName.trim().toLowerCase() === 'system_logs' || sheetName.trim().toLowerCase() === 'users') continue;

      if (!pKeyMap[sheetName] || pKeyMap[sheetName].length === 0) {
        logSystemEvent('WARNING', sheetName, 'N/A', 'SKIPPED_DEL_SYNC', 'No Primary Key defined. Cannot delete.');
        continue;
      }
      validSheetNames.push(sheetName);
    }
    
    // Determine topological insertion order, but REVERSE IT for deletions
    const insertionOrder = getInsertionOrder(conn, validSheetNames);
    const deletionOrder = insertionOrder.reverse();
    
    // 3. Extract Data & Execute batch
    for (const sheetName of deletionOrder) {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) continue;
      
      const success = deleteOrphanedDatabaseRows(conn, sheet, sheetName, pKeyMap[sheetName]);
      if (success) {
        tablesProcessedCount++;
      }
    }
    
    if (ui) ui.alert(`Deletion Sync Complete! Processed ${tablesProcessedCount} table(s). Check System_Logs for details.`);
    
  } catch (err) {
    console.error('Phase 5 Deletion Sync Error:', err);
    logSystemEvent('ERROR', 'N/A', 'N/A', 'GLOBAL_DEL_SYNC_FAILED', err.message);
    if(ui) {
       try { ui.alert(`Critical Error during Deletion Sync:\n${err.message}\n\nOperation Aborted.`); } catch(e){}
    }
    throw err;
  } finally {
    if (conn) {
      try { conn.close(); } catch(e) {}
    }
  }
}

/**
 * Identifies and deletes rows in Postgres that are missing from the given Google Sheet.
 * 
 * @param {JdbcConnection} conn 
 * @param {Sheet} sheet 
 * @param {string} tableName 
 * @param {string[]} pkColumns 
 * @returns {boolean} True if successful.
 */
function deleteOrphanedDatabaseRows(conn, sheet, tableName, pkColumns) {
  let selectStmt, deleteStmt;
  let rs;
  let deletedCount = 0;
  
  try {
    // ---------------------------------------------------------
    // STEP A: Read Google Sheet Data & Extract Existing Primary Keys
    // ---------------------------------------------------------
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    let sheetHeaders = [];
    let sheetDataRows = [];
    
    if (lastRow > 0 && lastCol > 0) {
      const rawData = sheet.getRange(1, 1, lastRow, lastCol).getValues();
      sheetHeaders = rawData[0].map(h => h.toString().trim());
      sheetDataRows = rawData.slice(1);
    }
    
    // Find what index the Primary Key columns sit at inside the array
    const pkIndices = pkColumns.map(pk => sheetHeaders.indexOf(pk)).filter(idx => idx !== -1);
    
    // Security Check: If the sheet has data but we can't find its PK columns in the headers, DO NOT DELETE.
    // The user might have just accidentally renamed a header, which would wipe the DB.
    if (pkIndices.length !== pkColumns.length && lastRow > 1) {
      throw new Error(`Primary Key columns ${pkColumns.join(', ')} not found in sheet headers.`);
    }
    
    // Map of Primary Keys currently existing in Google Sheets
    // E.g. {"1|user5": true, "2|user8": true}
    const sheetPkMap = new Map();
    
    for (const row of sheetDataRows) {
      if (pkIndices.length > 0) {
        // Convert dates or other objects to string representation for accurate hashing
        const hashElements = pkIndices.map(idx => {
            const val = row[idx];
            if (val instanceof Date) return val.getTime().toString();
            if (val === null || val === undefined) return "";
            return val.toString();
        });
        const hashKey = hashElements.join('|');
        sheetPkMap.set(hashKey, true);
      }
    }
    
    // ---------------------------------------------------------
    // STEP B: Pull Postgres Primary Keys & Compare
    // ---------------------------------------------------------
    const quotedTable = `"${tableName}"`;
    const quotedPks = pkColumns.map(pk => `"${pk}"`);
    
    selectStmt = conn.createStatement();
    // Only pull down Primary Keys to save memory
    rs = selectStmt.executeQuery(`SELECT ${quotedPks.join(', ')} FROM ${quotedTable}`);
    
    const orphansToDelete = [];
    
    while (rs.next()) {
        const dbHashElements = [];
        let hasNullPk = false;
        
        for (let i = 1; i <= pkColumns.length; i++) {
            let val = rs.getObject(i);
            if (val === null) {
                hasNullPk = true;
                break;
            }
            if (val !== null && typeof val === 'object' && val.getTime) {
                 dbHashElements.push(val.getTime().toString());
            } else {
                 dbHashElements.push(val.toString());
            }
        }
        
        if (hasNullPk) continue; // Safety bounds
        
        const dbHashKey = dbHashElements.join('|');
        
        // If the Postgres row is NOT in Google Sheets anywhere, it was deleted by the user.
        if (!sheetPkMap.has(dbHashKey)) {
            // Store the raw values needed to execute the DELETE command
            const rawPkValues = [];
            for (let i = 1; i <= pkColumns.length; i++) {
                rawPkValues.push(rs.getObject(i));
            }
            orphansToDelete.push(rawPkValues);
        }
    }
    
    // ---------------------------------------------------------
    // STEP C: Transactional Deletion
    // ---------------------------------------------------------
    if (orphansToDelete.length > 0) {
        conn.setAutoCommit(false);
        
        const whereClause = quotedPks.map(pk => `${pk} = ?`).join(' AND ');
        const deleteSql = `DELETE FROM ${quotedTable} WHERE ${whereClause}`;
        
        deleteStmt = conn.prepareStatement(deleteSql);
        
        for (const pkVals of orphansToDelete) {
            for(let i=0; i < pkVals.length; i++) {
               const bindIndex = i + 1;
               const val = pkVals[i];
               
               if (val !== null && typeof val === 'object' && val.getTime) {
                   deleteStmt.setTimestamp(bindIndex, Jdbc.newTimestamp(val.getTime()));
               } else {
                   deleteStmt.setObject(bindIndex, val);
               }
            }
            deleteStmt.addBatch();
            deletedCount++;
            
            // Execute in chunks
            if (deletedCount % 500 === 0) {
                 deleteStmt.executeBatch();
            }
        }
        
        deleteStmt.executeBatch(); // flush
        conn.commit();
        
        logSystemEvent('SUCCESS', tableName, 'N/A', `DELETED_${deletedCount}_ROWS`, 'Batch deletion complete.');
    } else {
        logSystemEvent('SUCCESS', tableName, 'N/A', 'DELETION_SKIPPED', 'No missing rows found to delete.');
    }
    
    return true;
    
  } catch (err) {
    try { conn.rollback(); } catch(e) {}
    logSystemEvent('ERROR', tableName, 'N/A', 'DELETION_FAILED', err.message);
    throw new Error(`Failed to delete rows from table ${tableName}. Details: ${err.message}`);
  } finally {
    if (rs) try{ rs.close(); } catch(e){}
    if (selectStmt) try{ selectStmt.close(); } catch(e){}
    if (deleteStmt) try{ deleteStmt.close(); } catch(e){}
    try { conn.setAutoCommit(true); } catch(e) {}
  }
}

/**
 * Reads Schema_Log and groups Primary Key columns by table.
 * Shared utility.
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
 * Automatically calculates the correct insertion order for tables 
 * based on Foreign Key dependencies.
 * Shared utility.
 */
function getInsertionOrder(conn, tableNames) {
  let stmt;
  let rs;
  const graph = {}; 
  const inDegree = {}; 
  
  tableNames.forEach(name => {
    graph[name] = [];
    inDegree[name] = 0;
  });
  
  try {
    stmt = conn.createStatement();
    const query = `
      SELECT
          tc.table_name AS child,
          ccu.table_name AS parent
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public';
    `;
    rs = stmt.executeQuery(query);
    
    while (rs.next()) {
      const child = rs.getString('child');
      const parent = rs.getString('parent');
      
      if (tableNames.includes(child) && tableNames.includes(parent)) {
        graph[parent].push(child);
        inDegree[child]++;
      }
    }
    
    const queue = [];
    tableNames.forEach(name => {
      if (inDegree[name] === 0) queue.push(name);
    });
    
    const sorted = [];
    while (queue.length > 0) {
      const node = queue.shift();
      sorted.push(node);
      
      graph[node].forEach(child => {
        inDegree[child]--;
        if (inDegree[child] === 0) {
          queue.push(child);
        }
      });
    }
    
    tableNames.forEach(name => {
      if (!sorted.includes(name)) sorted.push(name);
    });
    
    return sorted;
    
  } catch(e) {
    console.warn("Topological sort for Foreign Keys failed:", e);
    return tableNames; 
  } finally {
    if (rs) try { rs.close(); } catch(e){}
    if (stmt) try { stmt.close(); } catch(e){}
  }
}

/**
 * Audit Logging.
 * Shared utility.
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
