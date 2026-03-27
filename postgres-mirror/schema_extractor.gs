/**
 * Standalone Database Schema Extractor
 * Connects to Postgres, maps out all public tables, their columns, data types,
 * and Primary Keys, then writes it directly to the 'Schema_Log' sheet.
 */

const DB_CONFIG_SCHEMA = {
  host: '13.232.148.68', 
  port: '5432',
  database: 'better_task_db',
  user: 'admin',
  password: 'admin123' 
};

/**
 * Main entry point. Run this function specifically to pull only the Schema.
 */
function extractDatabaseSchema() {
  let ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) {}
  
  const connString = `jdbc:postgresql://${DB_CONFIG_SCHEMA.host}:${DB_CONFIG_SCHEMA.port}/${DB_CONFIG_SCHEMA.database}`;
  let conn;
  
  try {
    conn = Jdbc.getConnection(connString, DB_CONFIG_SCHEMA.user, DB_CONFIG_SCHEMA.password);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // DB -> Sheets Extraction
    generateSchemaLogStandalone(conn, ss);
    
    if (ui) ui.alert('Schema Extraction Complete!\n\nCheck the Schema_Log sheet for the updated database bindings.');
    
  } catch (err) {
    if(ui) {
      try { ui.alert(`Schema Extraction Failed:\n${err.message}`); } catch(e) {}
    }
    console.error('Schema Extraction Failed:', err.message);
  } finally {
    if (conn) {
      try { conn.close(); } catch(e) {}
    }
  }
}

/**
 * Executes the SQL extraction query logic
 */
function generateSchemaLogStandalone(conn, ss) {
  let stmt;
  let rs;
  
  try {
    stmt = conn.createStatement();
    
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
    
    let sheet = ss.getSheetByName('Schema_Log');
    if (!sheet) {
      sheet = ss.insertSheet('Schema_Log');
    } else {
      sheet.clearContents();
    }
    
    if (schemaData.length > 0) {
      sheet.getRange(1, 1, schemaData.length, schemaData[0].length).setValues(schemaData);
      
      // Quick UI Polish: Auto-resize and bold headers
      try {
        sheet.autoResizeColumns(1, 5);
        sheet.getRange("A1:E1").setFontWeight("bold").setBackground("#e0e0e0");
      } catch(e) {}
    }
    
  } catch (err) {
    throw new Error(`Failed to extract schema from Postgres: ${err.message}`);
  } finally {
    if (rs) try { rs.close(); } catch (e) {}
    if (stmt) try { stmt.close(); } catch (e) {}
  }
}
