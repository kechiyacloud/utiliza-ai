/**
 * Pull Data From Postgres to Google Sheets
 * Global Configuration for Database Connection
 */
const DB_CONFIG = {
  host: '13.232.148.68',
  port: '5432',
  database: 'better_task_db',
  user: 'admin',
  password: 'admin123'
};

/**
 * Main entry point for Phase 1: 
 * Syncs the entire Postgres database state to Google Sheets.
 */
function syncDatabaseToSheets() {
  const connString = `jdbc:postgresql://${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`;
  let conn;
  
  try {
    // 1. Establish connection using the pattern provided by the style guide
    conn = Jdbc.getConnection(connString, DB_CONFIG.user, DB_CONFIG.password);
    
    // 2. Extract schema metadata and write to "Schema_Log" sheet
    syncSchema(conn);
    
    // 3. Dynamically discover all user-created tables in the 'public' schema
    const tables = getPublicTables(conn);
    Logger.log(`Found ${tables.length} tables to sync: ${tables.join(', ')}`);
    
    // 4. Sync each discovered table to its own respective sheet
    for (let i = 0; i < tables.length; i++) {
      syncTableData(conn, tables[i]);
    }
    
    Logger.log('Database sync completed successfully.');
    if (typeof logSystemEvent === 'function') {
      logSystemEvent('SUCCESS', 'N/A', 'N/A', 'GLOBAL_SYNC', 'Phase 1 sync completed successfully.');
    }
  } catch (err) {
    console.error('Error during DB sync:', err);
    if (typeof logSystemEvent === 'function') {
      logSystemEvent('ERROR', 'N/A', 'N/A', 'GLOBAL_SYNC_FAILED', err.message);
    }
  } finally {
    // Rigorous connection cleanup to prevent leaks
    if (conn) {
      try {
        conn.close();
      } catch (closeErr) {
        console.error('Error closing connection:', closeErr);
      }
    }
  }
}

/**
 * Queries information_schema for table schema, column names, data types, 
 * and primary key flags, then writes them to the 'Schema_Log' sheet.
 * 
 * @param {JdbcConnection} conn The active JDBC connection.
 */
function syncSchema(conn) {
  let stmt;
  let rs;
  
  try {
    stmt = conn.createStatement();
    
    // Use a subquery to avoid duplicates when columns have multiple constraints (e.g. FK and PK)
    const query = `
      SELECT 
          c.table_name,
          c.column_name,
          c.data_type,
          CASE WHEN pk.column_name IS NOT NULL THEN 'YES' ELSE 'NO' END AS is_primary_key
      FROM information_schema.columns c
      LEFT JOIN (
          SELECT kcu.table_schema, kcu.table_name, kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.table_schema = pk.table_schema
          AND c.table_name = pk.table_name
          AND c.column_name = pk.column_name
      WHERE c.table_schema = 'public'
      ORDER BY c.table_name, c.ordinal_position;
    `;
    
    rs = stmt.executeQuery(query);
    
    const schemaData = [];
    schemaData.push(['Table Name', 'Column Name', 'Data Type', 'Is Primary Key', 'Pending_Action']); // Headers
    
    while (rs.next()) {
      schemaData.push([
        rs.getString('table_name'),
        rs.getString('column_name'),
        rs.getString('data_type'),
        rs.getString('is_primary_key'),
        'NONE'
      ]);
    }
    
    // Bulk write the fully assembled 2D array to the 'Schema_Log' sheet
    writeToSheet('Schema_Log', schemaData);
    
  } catch (err) {
    console.error('Error in syncSchema:', err);
    throw err;
  } finally {
    if (rs) try { rs.close(); } catch (e) {}
    if (stmt) try { stmt.close(); } catch (e) {}
  }
}

/**
 * Dynamically queries information_schema to discover all tables in the public schema.
 * 
 * @param {JdbcConnection} conn The active JDBC connection.
 * @returns {string[]} Array of table names.
 */
function getPublicTables(conn) {
  let stmt;
  let rs;
  const tables = [];
  
  try {
    stmt = conn.createStatement();
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    rs = stmt.executeQuery(query);
    
    while (rs.next()) {
      tables.push(rs.getString('table_name'));
    }
    return tables;
    
  } catch (err) {
    console.error('Error in getPublicTables:', err);
    throw err;
  } finally {
    if (rs) try { rs.close(); } catch (e) {}
    if (stmt) try { stmt.close(); } catch (e) {}
  }
}

/**
 * Extracts all rows for a given table and bulk-writes them to a dedicated sheet.
 * 
 * @param {JdbcConnection} conn The active JDBC connection.
 * @param {string} tableName The name of the table to sync.
 */
function syncTableData(conn, tableName) {
  let stmt;
  let rs;
  
  try {
    stmt = conn.createStatement();
    // Quote tableName to avoid issues with reserved keywords or case-sensitivity
    const query = `SELECT * FROM "${tableName}"`;
    rs = stmt.executeQuery(query);
    
    const metaData = rs.getMetaData();
    const columnCount = metaData.getColumnCount();
    
    const tableData = [];
    const headers = [];
    
    // 1. Build headers
    for (let i = 1; i <= columnCount; i++) {
      headers.push(metaData.getColumnName(i));
    }
    tableData.push(headers);
    
    // 2. Build rows
    while (rs.next()) {
      const row = [];
      for (let i = 1; i <= columnCount; i++) {
        let val = rs.getObject(i);
        
        // Handle Java Objects returned by JDBC so Apps Script doesn't crash on setValues()
        if (val === null) {
          row.push('');
        } else if (typeof val === 'object') {
          // Convert SQL Dates/Timestamps to native JavaScript Dates if supported, otherwise to strings
          if (val.getTime) {
            row.push(new Date(val.getTime()));
          } else {
            row.push(val.toString());
          }
        } else {
          row.push(val); // Strings, Numbers, Booleans are safe to push
        }
      }
      tableData.push(row);
    }
    
    // 3. Bulk write to a sheet strictly named after the table
    writeToSheet(tableName, tableData);
    
  } catch (err) {
    console.error(`Error in syncTableData for table ${tableName}:`, err);
    throw err;
  } finally {
    if (rs) try { rs.close(); } catch (e) {}
    if (stmt) try { stmt.close(); } catch (e) {}
  }
}

/**
 * Reusable helper method to bulk-write a 2D array of data into a Google Sheet.
 * This clears existing data to ensure a clean slate and avoids row-by-row loops 
 * to remain within Apps Script execution time limits.
 * 
 * @param {string} sheetName The target sheet name.
 * @param {any[][]} data2DArray A 2D array of rows containing data values.
 */
function writeToSheet(sheetName, data2DArray) {
  if (!data2DArray || data2DArray.length === 0) return;
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const allSheets = ss.getSheets();
  let sheet = null;
  
  for (const s of allSheets) {
    if (s.getName().trim().toLowerCase() === sheetName.trim().toLowerCase()) {
      sheet = s;
      break;
    }
  }
  
  // Create sheet if it doesn't exist, otherwise clear its current state
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clearContents();
  }
  
  const numRows = data2DArray.length;
  const numCols = data2DArray[0].length;
  
  // Perform the bulk write in a single operation
  sheet.getRange(1, 1, numRows, numCols).setValues(data2DArray);
}

/**
 * Phase 1 Audit Logging: Appends a record to 'System_Logs' sheet.
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
