/**
 * Phase 0: Initial Data Seeding and Schema Generation
 * Pushes all data from Google Sheets into respective Postgres tables.
 * Then extracts the live database schema (including Primary Keys) and generates the Schema_Log.
 */

const DB_CONFIG_PHASE_0 = {
  host: '13.232.148.68', 
  port: '5432',
  database: 'better_task_db',
  user: 'admin',
  password: 'admin123'
};

/**
 * Main entry point for Phase 0.
 */
function seedDataAndGenerateSchema() {
  let ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) {}
  const connString = `jdbc:postgresql://${DB_CONFIG_PHASE_0.host}:${DB_CONFIG_PHASE_0.port}/${DB_CONFIG_PHASE_0.database}`;
  let conn;
  
  try {
    conn = Jdbc.getConnection(connString, DB_CONFIG_PHASE_0.user, DB_CONFIG_PHASE_0.password);
    
    //-------------------------------------------------------------------------
    // STEP 1: Data Seeding (Sheets -> DB) 
    // Execute all INSERTS within a single transaction
    //-------------------------------------------------------------------------
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const allSheets = ss.getSheets();
    let tablesSeededCount = 0;
    
    // Filter out system sheets
    const validSheetNames = allSheets
      .map(s => s.getName())
      .filter(name => name.trim().toLowerCase() !== 'schema_log' && name.trim().toLowerCase() !== 'system_logs' && name.trim().toLowerCase() !== 'users');
    
    // Determine topological insertion order based on Foreign Keys
    const sortedSheetNames = getInsertionOrder(conn, validSheetNames);
    
    // Start Transaction
    conn.setAutoCommit(false);
    
    for (const sheetName of sortedSheetNames) {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) continue;
      
      const success = seedTableData(conn, sheet, sheetName);
      if (success) {
        tablesSeededCount++;
      }
    }
    
    // If all sheets seeded without throwing an error, commit the transaction.
    conn.commit();
    logSystemEvent('SUCCESS', 'N/A', 'N/A', 'PHASE0_SEED', `Successfully seeded ${tablesSeededCount} tables.`);
    
    //-------------------------------------------------------------------------
    // STEP 2: Schema Extraction & Schema_Log Generation (DB -> Sheets)
    //-------------------------------------------------------------------------
    // We turn autoCommit back on for standard SELECT queries.
    conn.setAutoCommit(true);
    generateSchemaLog(conn, ss);
    
    if (ui) ui.alert(`Phase 0 Complete!\n\nSeeded ${tablesSeededCount} table(s) and generated Schema_Log successfully. Check System_Logs for details.`);
    
  } catch (err) {
    // If the error occurred before the Schema extraction, rollback the seed.
    if (conn) {
      try { 
        conn.rollback(); 
      } catch(rollbackErr) {
        console.error('Critical Rollback Failure:', rollbackErr);
      }
    }
    logSystemEvent('ERROR', 'N/A', 'N/A', 'PHASE0_FAILED', err.message);
    if(ui) {
      try { ui.alert(`Phase 0 Failed:\n${err.message}\n\nTransaction Rolled Back.`); } catch(e) {}
    }
    console.error('Phase 0 Failed - Transaction Rolled Back:', err.message);
    throw err; // Re-throw to ensure the Apps Script console detects and displays the failure
  } finally {
    if (conn) {
      try { 
        conn.setAutoCommit(true); 
        conn.close(); 
      } catch(e) {}
    }
  }
}

/**
 * Extracts data from a single sheet and performs a batch INSERT.
 */
function seedTableData(conn, sheet, tableName) {
  let stmt;
  let rowsProcessed = 0;
  
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  if (lastRow <= 1 || lastCol === 0) {
    return true; // Sheet exists but is empty. Proceeding safely.
  }
  
  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = data[0].map(h => h.toString().trim());
  const rows = data.slice(1);
  
  try {
    const quotedTable = `"${tableName}"`;
    const quotedHeaders = headers.map(h => `"${h}"`).join(', ');
    const placeholders = headers.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${quotedTable} (${quotedHeaders}) VALUES (${placeholders})`;
    stmt = conn.prepareStatement(sql);
    
    for (let r = 0; r < rows.length; r++) {
      const rowData = rows[r];
      
      for (let c = 0; c < headers.length; c++) {
        let val = rowData[c];
        const bindIndex = c + 1; 
        
        // Sanitization: Convert empty/hyphen cells to standard SQL NULL bytes.
        if (val === "" || val === "-" || val === null || val === undefined) {
          stmt.setObject(bindIndex, null);
        } else {
          // Cast javascript native dates to JDBC readable Timestamps
          if (val instanceof Date || Object.prototype.toString.call(val) === '[object Date]') {
            stmt.setTimestamp(bindIndex, Jdbc.newTimestamp(val.getTime()));
          } else {
            stmt.setObject(bindIndex, val); // Safe Native Strings/Ints/Booleans
          }
        }
      }
      stmt.addBatch();
      rowsProcessed++;
      
      // Memory safety chunking
      if (rowsProcessed % 500 === 0) {
        stmt.executeBatch();
      }
    }
    
    stmt.executeBatch(); // Flush remainder
    return true;
    
  } catch (err) {
    throw new Error(`Failed to insert data into table [${tableName}]: ${err.message}`);
  } finally {
    if (stmt) try { stmt.close(); } catch(e) {}
  }
}

/**
 * Queries Postgres information_schema and generates the 'Schema_Log' sheet.
 */
function generateSchemaLog(conn, ss) {
  let stmt;
  let rs;
  
  try {
    stmt = conn.createStatement();
    
    /**
     * SQL QUERY EXPLANATION:
     * 1. `information_schema.columns (c)`: Provides every column in the database (table_name, column_name, data_type).
     * 2. The `LEFT JOIN`: We create an inline subquery (`pk`) that isolates ONLY primary keys.
     *    - `table_constraints (tc)` defines what constraints exist (e.g., 'PRIMARY KEY', 'FOREIGN KEY').
     *    - `key_column_usage (kcu)` links those constraints to specific column names.
     *    - Joining them on constraint_name + schema isolates just the columns acting as Primary Keys.
     * 3. The `CASE` statement: If a column from `c` successfully joined to a record in `pk`, 
     *    then pk.column_name IS NOT NULL, so it gets 'YES'. Otherwise, it gets 'NO'.
     */
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
    schemaData.push(['Table Name', 'Column Name', 'Data Type', 'Is Primary Key', 'Pending_Action']); 
    
    while (rs.next()) {
      schemaData.push([
        rs.getString('table_name'),
        rs.getString('column_name'),
        rs.getString('data_type'),
        rs.getString('is_primary_key'),
        'NONE' // Initialization for Phase 2 compatibility
      ]);
    }
    
    const allSheets = ss.getSheets();
    let sheet = null;
    for (const s of allSheets) {
      if (s.getName().trim().toLowerCase() === 'schema_log') {
        sheet = s;
        break;
      }
    }
    
    if (!sheet) {
      sheet = ss.insertSheet('Schema_Log');
    } else {
      sheet.clearContents();
    }
    
    if (schemaData.length > 0) {
      sheet.getRange(1, 1, schemaData.length, schemaData[0].length).setValues(schemaData);
    }
    
    logSystemEvent('SUCCESS', 'Schema_Log', 'N/A', 'PHASE0_SCHEMA', 'Generated Schema_Log sheet successfully.');
    
  } catch (err) {
    throw new Error(`Failed to extract schema from Postgres: ${err.message}`);
  } finally {
    if (rs) try { rs.close(); } catch (e) {}
    if (stmt) try { stmt.close(); } catch (e) {}
  }
}

/**
 * Phase 0 Audit Logging.
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
