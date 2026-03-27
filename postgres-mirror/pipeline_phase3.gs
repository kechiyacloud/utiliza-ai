/**
 * Phase 3: Dynamic Data Sync (DML) - UPSERT Data to Postgres
 * Reads data from Google Sheets, loops through all table tabs,
 * and bulk UPSERTs (Insert on conflict Update) the data back to Postgres.
 */

const DB_CONFIG_PHASE_3 = {
  host: '13.232.148.68',
  port: '5432',
  database: 'better_task_db',
  user: 'admin',
  password: 'admin123'
};

/**
 * Main entry point for Phase 3 Data Sync.
 * Extracts designated Primary Keys from Schema_Log and executes 
 * a transactional batch UPSERT per table.
 */
function syncSheetsToDatabase() {
  let ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) {}
  const connString = `jdbc:postgresql://${DB_CONFIG_PHASE_3.host}:${DB_CONFIG_PHASE_3.port}/${DB_CONFIG_PHASE_3.database}`;
  let conn;
  
  try {
    conn = Jdbc.getConnection(connString, DB_CONFIG_PHASE_3.user, DB_CONFIG_PHASE_3.password);
    
    // 1. Build a mapping of Table Name -> [Primary Key Columns]
    const pKeyMap = getPrimaryKeyMapping();
    if (Object.keys(pKeyMap).length === 0) {
      if (ui) ui.alert('Error: Could not find any Primary Keys in the Schema_Log sheet. Sync aborted.');
      return;
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const allSheets = ss.getSheets();
    let tablesSyncedCount = 0;
    
    // 2. Validate and filter sheets before sorting
    const validSheetNames = [];
    for (const sheet of allSheets) {
      const sheetName = sheet.getName();
      if (sheetName === 'Schema_Log' || sheetName === 'System_Logs' || sheetName === 'users') continue;
      
      if (!pKeyMap[sheetName] || pKeyMap[sheetName].length === 0) {
        logSystemEvent('WARNING', sheetName, 'N/A', 'SKIPPED_SYNC', 'No Primary Key defined in Schema_Log. Cannot UPSERT.');
        continue;
      }
      validSheetNames.push(sheetName);
    }
    
    // Determine topological insertion order based on Foreign Keys
    const sortedSheetNames = getInsertionOrder(conn, validSheetNames);
    
    // 3. Extract Data & Execute batch
    for (const sheetName of sortedSheetNames) {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) continue;
      
      const success = upsertTableData(conn, sheet, sheetName, pKeyMap[sheetName]);
      if (success) {
        tablesSyncedCount++;
      }
    }
    
    if (ui) ui.alert(`Sync Complete! Successfully synced ${tablesSyncedCount} table(s). Check System_Logs for details.`);
    
  } catch (err) {
    console.error('Phase 3 Sync Error:', err);
    logSystemEvent('ERROR', 'N/A', 'N/A', 'GLOBAL_SYNC_FAILED', err.message);
    if(ui) {
       try { ui.alert(`Critical Error during Sync:\n${err.message}\n\nOperation Aborted.`); } catch(e){}
    }
    console.error('Phase 3 Failed:', err.message);
    throw err;
  } finally {
    if (conn) {
      try { 
        // Ensure auto-commit is turned back on in case the connection is pooled
        conn.setAutoCommit(true); 
        conn.close(); 
      } catch(e) {}
    }
  }
}

/**
 * Reads Schema_Log and groups Primary Key columns by table.
 * @returns {Object} e.g. { "users": ["id"], "project_roles": ["project_id", "user_id"] }
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
  if (values.length <= 1) return map; // Headers only
  
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
 * Reads data from a single sheet and executes a transactional batch UPSERT.
 * 
 * @param {JdbcConnection} conn 
 * @param {Sheet} sheet Google Sheet object mapped to the table
 * @param {string} tableName Name of the Postgres table
 * @param {string[]} pkColumns Array of Primary Key column names for this table
 * @returns {boolean} True if successful, false otherwise.
 */
function upsertTableData(conn, sheet, tableName, pkColumns) {
  let stmt = null;
  let rowsProcessed = 0;
  
  // 1. Extract Data
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  if (lastRow <= 1 || lastCol === 0) {
    logSystemEvent('SUCCESS', tableName, 'N/A', 'SYNC_SKIPPED', 'Table sheet is empty or contains only headers.');
    return true; // Nothing to sync, but not an error
  }
  
  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = data[0].map(h => h.toString().trim());
  const rows = data.slice(1);
  
  try {
    // 2. Begin Transaction
    conn.setAutoCommit(false);

    // Pre-delete rows that would violate non-PK unique constraints (e.g. unique email)
    // This handles cases where a unique value moves from one primary key to another in the sheet.
    deleteConflictingUniqueRows(conn, tableName, pkColumns, headers, rows);

    // 3. Construct the dynamic UPSERT Query string
    // Example target: 
    // INSERT INTO "users" ("id", "name") VALUES (?, ?) 
    // ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name"
    
    const quotedTable = `"${tableName}"`;
    const quotedHeaders = headers.map(h => `"${h}"`);
    const placeholders = headers.map(() => '?').join(', ');
    const quotedPks = pkColumns.map(pk => `"${pk}"`).join(', ');
    
    // We only want to UPDATE columns that are NOT part of the primary key.
    // If a table is *only* primary keys (e.g. a pure join table), DO NOTHING on conflict.
    const nonPkHeaders = headers.filter(h => !pkColumns.includes(h));
    
    let conflictAction = '';
    if (nonPkHeaders.length > 0) {
      const updateSetString = nonPkHeaders.map(h => `"${h}" = EXCLUDED."${h}"`).join(', ');
      conflictAction = `DO UPDATE SET ${updateSetString}`;
    } else {
      conflictAction = 'DO NOTHING'; 
    }
    
    const sql = `
      INSERT INTO ${quotedTable} (${quotedHeaders.join(', ')}) 
      VALUES (${placeholders}) 
      ON CONFLICT (${quotedPks}) ${conflictAction}
    `;
    
    stmt = conn.prepareStatement(sql);
    
    // 4. Bind variables and add to Batch
    for (let r = 0; r < rows.length; r++) {
      const rowData = rows[r];
      
      for (let c = 0; c < headers.length; c++) {
        let val = rowData[c];
        
        // JDBC Binding is 1-indexed
        const bindIndex = c + 1; 
        
        // Strict null handling: Convert empty strings, undefined, or specific markers to SQL NULL
        if (val === "" || val === "-" || val === null || val === undefined) {
          // setObject with null automatically sets the DB column to NULL.
          stmt.setObject(bindIndex, null);
        } else {
          // If it's a date object, pass it specifically to avoid string conversion issues
          if (val instanceof Date || Object.prototype.toString.call(val) === '[object Date]') {
            // Apps Script Dates can be converted to JDBC SQL Dates/Timestamps
            // We use java.sql.Timestamp to preserve time if it exists
            stmt.setTimestamp(bindIndex, Jdbc.newTimestamp(val.getTime()));
          } else {
            // Numbers, Booleans, and Strings
            stmt.setObject(bindIndex, val);
          }
        }
      }
      
      // Add the fully bound row to the batch payload
      stmt.addBatch();
      rowsProcessed++;
      
      // Execute in chunks of 500 to avoid memory overflow in Apps Script
      if (rowsProcessed % 500 === 0) {
        stmt.executeBatch();
      }
    }
    
    // Execute remaining batch
    stmt.executeBatch();
    
    // 5. Commit Transaction
    conn.commit();
    logSystemEvent('SUCCESS', tableName, 'N/A', `UPSERTED_${rowsProcessed}_ROWS`, 'Batch sync complete.');
    return true;
    
  } catch (err) {
    // 6. Rollback Transaction on Failure
    try {
      conn.rollback();
    } catch(rollbackErr) {
      console.error('Critical Rollback Failure:', rollbackErr);
    }
    
    logSystemEvent('ERROR', tableName, 'N/A', 'UPSERT_FAILED', err.message);
    throw new Error(`Failed to UPSERT table ${tableName}. Transaction rolled back. Details: ${err.message}`);
    
  } finally {
    if (stmt) try{ stmt.close(); } catch(e){}
  }
}

/**
 * Phase 3 Audit Logging: Appends a record to 'System_Logs' sheet.
 * Shared utility standard across tools.
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

/**
 * Before upserting, removes rows from the DB that would violate non-PK unique constraints.
 * Handles the case where a unique column value (e.g. email_id) moves from one PK to another.
 * Must be called inside an open transaction.
 *
 * @param {JdbcConnection} conn
 * @param {string} tableName
 * @param {string[]} pkColumns
 * @param {string[]} headers
 * @param {Array[]} rows
 */
function deleteConflictingUniqueRows(conn, tableName, pkColumns, headers, rows) {
  let qStmt = null, dStmt = null, rs = null;
  try {
    // 1. Fetch all non-PK unique constraint columns for this table
    qStmt = conn.createStatement();
    const query = `
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_schema = 'public'
        AND tc.table_name = '${tableName}'
    `;
    rs = qStmt.executeQuery(query);
    const uniqueCols = [];
    while (rs.next()) {
      const col = rs.getString('column_name');
      if (!pkColumns.includes(col)) uniqueCols.push(col);
    }
    if (rs)    { try { rs.close();    } catch(e){} rs    = null; }
    if (qStmt) { try { qStmt.close(); } catch(e){} qStmt = null; }

    if (uniqueCols.length === 0) return;

    // 2. For each unique column, delete any DB row that has the same value
    //    but a different primary key (i.e. the value was reassigned in the sheet).
    for (const uniqueCol of uniqueCols) {
      const colIdx = headers.indexOf(uniqueCol);
      if (colIdx === -1) continue;

      // DELETE FROM table WHERE unique_col = ? AND NOT (pk1 = ? AND pk2 = ? ...)
      const pkMatchCondition = pkColumns.map(pk => `"${pk}" = ?`).join(' AND ');
      const deleteSql = `DELETE FROM "${tableName}" WHERE "${uniqueCol}" = ? AND NOT (${pkMatchCondition})`;
      dStmt = conn.prepareStatement(deleteSql);

      for (const row of rows) {
        const uniqueVal = row[colIdx];
        if (uniqueVal === '' || uniqueVal === null || uniqueVal === undefined || uniqueVal === '-') continue;

        dStmt.setObject(1, uniqueVal);
        for (let p = 0; p < pkColumns.length; p++) {
          const pkColIdx = headers.indexOf(pkColumns[p]);
          dStmt.setObject(p + 2, pkColIdx !== -1 ? row[pkColIdx] : null);
        }
        dStmt.addBatch();
      }
      dStmt.executeBatch();
      if (dStmt) { try { dStmt.close(); } catch(e){} dStmt = null; }
    }
  } catch(e) {
    console.warn(`Could not pre-delete unique conflicts for ${tableName}:`, e.message);
    // Non-fatal: if we can't clean up, the subsequent UPSERT will throw a descriptive error.
  } finally {
    if (rs)    try { rs.close();    } catch(e){}
    if (qStmt) try { qStmt.close(); } catch(e){}
    if (dStmt) try { dStmt.close(); } catch(e){}
  }
}

/**
 * Automatically calculates the correct insertion order for tables
 * based on Foreign Key dependencies (Parents must be inserted before Children).
 * 
 * @param {JdbcConnection} conn 
 * @param {string[]} tableNames Array of sheet/table names to sort
 * @returns {string[]} Topologically sorted array of table names
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
