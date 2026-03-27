/**
 * Phase 2: Safe Schema Modification (DDL) and Audit Logging
 * Allows users to safely ADD or DROP columns in Postgres directly from Google Sheets.
 * Uses a two-key validation system (Data Sheet Headers + Schema_Log Pending_Action).
 */

// You may share this DB_CONFIG with Phase 1 if they are in the same script project.
// If so, you can remove this declaration. Included here for completeness.
const DB_CONFIG_PHASE_2 = {
  host: '13.232.148.68',
  port: '5432',
  database: 'better_task_db',
  user: 'admin',
  password: 'admin123'
};

/**
 * Main entry point for Phase 2 DDL Sync.
 * Compares data sheets vs live DB schema, validates against Schema_Log, 
 * and executes ALTER TABLE commands if authorized.
 */
function syncSchemaChanges() {
  let ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) {}
  const connString = `jdbc:postgresql://${DB_CONFIG_PHASE_2.host}:${DB_CONFIG_PHASE_2.port}/${DB_CONFIG_PHASE_2.database}`;
  let conn;
  
  try {
    conn = Jdbc.getConnection(connString, DB_CONFIG_PHASE_2.user, DB_CONFIG_PHASE_2.password);
    
    // 1. Get Live DB Schema
    const liveSchema = getLiveDbSchema(conn);
    
    // 2. Read Schema_Log sheet (Expected headers: Table Name, Column Name, Data Type, Is Primary Key, Pending_Action)
    const schemaLogState = readSchemaLog();
    if (!schemaLogState) {
      if (ui) ui.alert('Error: Schema_Log sheet not found or empty.');
      return;
    }
    
    // 3. Get list of data tables (assume we only care about tables listed in Schema_Log)
    // We group the Schema_Log by table name.
    const tablesInLog = [...new Set(schemaLogState.data.map(row => row.tableName))];
    
    let actionsToExecute = [];
    
    // 4. Validate Differences: Compare Data Sheets vs Live DB
    for (const tableName of tablesInLog) {
      const liveColumns = liveSchema[tableName] || [];
      const sheetHeaders = getDataSheetHeaders(tableName);
      
      if (!sheetHeaders) continue; // Skip if no data sheet exists for this table
      
      // Filter log entries for this specific table
      const tableLogEntries = schemaLogState.data.filter(row => row.tableName === tableName);
      
      // Validation Check: Did the user forget to add/delete the column from the Data Sheet?
      for (const logEntry of tableLogEntries) {
        if (logEntry.pendingAction === 'DROP' && sheetHeaders.includes(logEntry.columnName)) {
           throw new Error(`Validation Failed: You marked '${logEntry.columnName}' for 'DROP' in Schema_Log, but it is still physically present in the '${tableName}' sheet! You must delete the entire column from the Data Sheet to authorize the drop.`);
        }
        if (logEntry.pendingAction === 'ADD' && !sheetHeaders.includes(logEntry.columnName)) {
           throw new Error(`Validation Failed: You marked '${logEntry.columnName}' for 'ADD' in Schema_Log, but it is missing from the '${tableName}' sheet! You must add the column header to the Data Sheet to authorize the addition.`);
        }
      }
      
      // Check A: Are there columns in the Sheet that are NOT in the Live DB? (Potential ADD)
      for (const sheetCol of sheetHeaders) {
        if (!liveColumns.includes(sheetCol)) {
          // Attempting to ADD a column. Check Schema_Log for authorization.
          const logEntry = tableLogEntries.find(row => row.columnName === sheetCol);
          
          if (!logEntry || logEntry.pendingAction !== 'ADD') {
            throw new Error(`Unauthorized schema change detected. Column '${sheetCol}' added to sheet '${tableName}' without 'ADD' action in Schema_Log. Update Schema_Log first.`);
          }
          
          if (!logEntry.dataType) {
            throw new Error(`Cannot ADD column '${sheetCol}' to table '${tableName}'. Missing Data Type in Schema_Log.`);
          }
          
          actionsToExecute.push({
            type: 'ADD',
            tableName: tableName,
            columnName: sheetCol,
            dataType: logEntry.dataType,
            logRowIndex: logEntry.rowIndex
          });
        }
      }
      
      // Check B: Are there columns in the Live DB that are NOT in the Sheet? (Potential DROP)
      for (const liveCol of liveColumns) {
         if (!sheetHeaders.includes(liveCol)) {
           // Attempting to DROP a column. Check Schema_Log for authorization.
           const logEntry = tableLogEntries.find(row => row.columnName === liveCol);
           
           if (!logEntry || logEntry.pendingAction !== 'DROP') {
              throw new Error(`Unauthorized schema change detected. Column '${liveCol}' missing from sheet '${tableName}' without 'DROP' action in Schema_Log. Update Schema_Log first.`);
           }
           
           actionsToExecute.push({
              type: 'DROP',
              tableName: tableName,
              columnName: liveCol,
              logRowIndex: logEntry.rowIndex
           });
         }
      }
    }
    
    // 5. If no actions needed, stop early.
    if (actionsToExecute.length === 0) {
      if (ui) ui.alert('Schema is up to date. No pending actions found.');
      return;
    }
    
    // 6. Execute DDL Operations and Clean up State
    executeDDLActions(conn, actionsToExecute);
    
    if (ui) ui.alert(`Successfully executed ${actionsToExecute.length} schema change(s). Check System_Logs for details.`);
    
  } catch (err) {
    console.error('Validation/Execution Error:', err);
    logSystemEvent('ERROR', 'N/A', 'N/A', 'VALIDATION_FAILED', err.message);
    if(ui) {
      try { ui.alert(`Validation Failed:\n${err.message}\n\nOperation Aborted.`); } catch(e) {}
    }
    console.error('Phase 2 Failed:', err.message);
    throw err;
  } finally {
    if (conn) try { conn.close(); } catch(e) {}
  }
}

/**
 * Queries the live Postgres DB to get all columns for public tables.
 * Returns an object mapping table names to arrays of column names.
 * @param {JdbcConnection} conn
 * @returns {Object} e.g. { "users": ["id", "name", "email"], "projects": ["id", "title"] }
 */
function getLiveDbSchema(conn) {
  let stmt;
  let rs;
  const schema = {};
  
  try {
    stmt = conn.createStatement();
    const query = `
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public'
    `;
    rs = stmt.executeQuery(query);
    
    while(rs.next()) {
      const tName = rs.getString('table_name');
      const cName = rs.getString('column_name');
      if (!schema[tName]) schema[tName] = [];
      schema[tName].push(cName);
    }
    return schema;
  } catch (err) {
    throw new Error('Failed to query live database schema: ' + err.message);
  } finally {
    if (rs) try{ rs.close(); }catch(e){}
    if (stmt) try{ stmt.close(); }catch(e){}
  }
}

/**
 * Reads the Schema_Log sheet and parses it into objects.
 * Assumes column structure: [Table Name, Column Name, Data Type, Is Primary Key, Pending_Action]
 * Note: Assumes Pending_Action is in column 5 (index 4).
 * @returns {Object} { sheet: Sheet, data: Array of parsed row objects }
 */
function readSchemaLog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const allSheets = ss.getSheets();
  let sheet = null;
  
  for (const s of allSheets) {
    if (s.getName().trim().toLowerCase() === 'schema_log') {
      sheet = s;
      break;
    }
  }
  
  if (!sheet) return null;
  
  const range = sheet.getDataRange();
  const values = range.getValues();
  
  if (values.length <= 1) return { sheet: sheet, data: [] }; // Only headers or empty
  
  const headers = values[0];
  // Basic validation that Pending_Action exists. If missing, Phase 1 might need updating to include it.
  const pendingActionIdx = headers.indexOf('Pending_Action');
  
  const data = [];
  // Start from row 2 (index 1)
  for (let i = 1; i < values.length; i++) {
    data.push({
      rowIndex: i + 1, // 1-based index for Google Sheets (row numbers)
      tableName: values[i][0] ? values[i][0].toString().trim() : '',
      columnName: values[i][1] ? values[i][1].toString().trim() : '',
      dataType: values[i][2] ? values[i][2].toString().trim() : '',
      pendingAction: pendingActionIdx > -1 && values[i][pendingActionIdx] ? values[i][pendingActionIdx].toString().trim().toUpperCase() : 'NONE'
    });
  }
  return { sheet: sheet, data: data };
}

/**
 * Gets the headers (Row 1) of a specific data sheet.
 * @param {string} sheetName 
 * @returns {string[]|null} Array of header names, or null if sheet doesn't exist.
 */
function getDataSheetHeaders(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const allSheets = ss.getSheets();
  let sheet = null;
  
  for (const s of allSheets) {
    if (s.getName().trim().toLowerCase() === sheetName.trim().toLowerCase()) {
      sheet = s;
      break;
    }
  }
  
  if (!sheet) return null;
  
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return []; // Empty sheet
  
  // Get row 1, cols 1 to lastCol. getValues() returns 2D array, we want the first array.
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  return headers.map(h => h.toString().trim());
}

/**
 * Executes the authorized ADD/DROP DDL commands against Postgres,
 * updates the Schema_Log sheet to reflect the changes, and logs to System_Logs.
 * 
 * @param {JdbcConnection} conn 
 * @param {Array} actions Array of action objects to execute.
 */
function executeDDLActions(conn, actions) {
  let stmt = null;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const allSheets = ss.getSheets();
  let logSheet = null;
  
  for (const s of allSheets) {
    if (s.getName().trim().toLowerCase() === 'schema_log') {
      logSheet = s;
      break;
    }
  }
  
  if (!logSheet) throw new Error("Schema_Log sheet disappeared during execution.");
  
  let rowsToDelete = [];
  
  try {
    // 1. Begin SQL Transaction
    conn.setAutoCommit(false);
    stmt = conn.createStatement();
    
    for (const action of actions) {
      const tName = `"${action.tableName}"`; // Quote to handle keywords/case
      const cName = `"${action.columnName}"`;
      
      if (action.type === 'ADD') {
         stmt.execute(`ALTER TABLE ${tName} ADD COLUMN ${cName} ${action.dataType}`);
      } else if (action.type === 'DROP') {
         stmt.execute(`ALTER TABLE ${tName} DROP COLUMN ${cName}`);
      }
    }
    
    // 2. Everything valid? Commit the DB.
    conn.commit();
    
    // 3. --- NOW UPDATE SHEET STATE ONLY AFTER DB IS SAFE ---
    for (const action of actions) {
      if (action.type === 'ADD') {
         logSystemEvent('SUCCESS', action.tableName, action.columnName, 'ADD_COLUMN', `Added with type ${action.dataType}`);
         // Reset state: Set Pending_Action to 'NONE'
         logSheet.getRange(action.logRowIndex, 5).setValue('NONE');
      } else if (action.type === 'DROP') {
         logSystemEvent('SUCCESS', action.tableName, action.columnName, 'DROP_COLUMN', 'Column removed');
         // Queue row to be removed from Google Sheet
         rowsToDelete.push(action.logRowIndex);
      }
    }
    
    // 4. Process row deletions from bottom up so row indexes don't shift during deletion.
    if (rowsToDelete.length > 0) {
      rowsToDelete.sort((a, b) => b - a);
      for (const rowNum of rowsToDelete) {
        logSheet.deleteRow(rowNum);
      }
    }
    
  } catch (err) {
    // 5. On failure, rollback DB and DO NOT touch Google Sheets state to keep them in sync
    try { conn.rollback(); } catch(e) {}
    throw new Error(`Transaction failed and rolled back. No DB changes applied. Details: ${err.message}`);
  } finally {
    if (stmt) try { stmt.close(); } catch(e) {}
    try { conn.setAutoCommit(true); } catch(e) {}
  }
}

/**
 * Audit Logging: Appends a record of the action to the 'System_Logs' sheet.
 * Creates the sheet if it doesn't exist.
 * Columns: [Timestamp, Status (Success/Error), Table_Name, Column_Name, Action_Executed, Error_Message]
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
    // Optional formatting for headers
    logSheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  }
  
  const timestamp = new Date();
  logSheet.appendRow([timestamp, status, tableName, columnName, action, message]);
}
