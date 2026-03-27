/**
 * LOCAL TESTING CONFIG — Google Sheets ↔ Local Docker PostgreSQL
 * ================================================================
 *
 * This file pairs with docker-compose.sheets.yml which runs:
 *   1. A PostgreSQL 16 container  (port 5433 on your machine)
 *   2. An ngrok container          (TCP tunnel → postgres:5432)
 *
 * The ngrok TCP tunnel gives Google Apps Script JDBC a public
 * address to reach your local Postgres. The address changes every
 * time the stack restarts (free plan), so run the helper script
 * to get the current value.
 *
 * ================================================================
 * WORKFLOW
 * ================================================================
 *
 * STEP 1 — Start the stack
 * ------------------------
 * From the project root in WSL / bash terminal:
 *
 *   bash postgres-mirror/start-sheets.sh
 *
 * This starts both containers and prints the current ngrok TCP
 * address automatically. Example output:
 *
 *   Public Host : 0.tcp.in.ngrok.io
 *   Public Port : 15432
 *
 * STEP 2 — Update DB_CONFIG_LOCAL below
 * --------------------------------------
 * Copy the host and port from the script output into
 * the DB_CONFIG_LOCAL object below. Do this every time you
 * restart the stack (the port changes each run on free plan).
 *
 * STEP 3 — Test the connection
 * ----------------------------
 * In Apps Script editor:
 *   Run → testLocalConnection()
 * You should get a popup: "Connected! DB: migration_db"
 *
 * STEP 4 — Swap into any Phase script
 * ------------------------------------
 * Temporarily replace the DB_CONFIG at the top of the phase
 * script with DB_CONFIG_LOCAL. Example in pipeline_phase3.gs:
 *
 *   // const DB_CONFIG_PHASE_3 = { host: '13.232.148.68', ... }; // EC2
 *   const DB_CONFIG_PHASE_3 = DB_CONFIG_LOCAL;  // local testing
 *
 * Remember to revert before pointing at the EC2 database!
 *
 * STEP 5 — Stop with versioned dump
 * -----------------------------------
 * When done testing, run:
 *
 *   bash postgres-mirror/stop-and-dump.sh
 *
 * This saves a timestamped SQL dump to:
 *   dumps/migration_db_YYYY-MM-DD_HH-MM-SS.sql
 * ...then shuts down both containers.
 *
 * ================================================================
 * NOTE ON THE STATIC URL  uniridescent-darrel-ringed.ngrok-free.dev
 * ================================================================
 * That domain is an HTTP tunnel (for browser / frontend access).
 * PostgreSQL JDBC requires a TCP tunnel — ngrok assigns a separate
 * random address for TCP (the one shown by start-sheets.sh).
 * Both tunnels use the same auth token but serve different ports.
 *
 * ================================================================
 * IMPORTANT: Only ONE ngrok agent can run per account (free plan).
 * If docker-compose.full.yml is running with its own ngrok container,
 * stop it first before starting the sheets stack, or you will get
 * an "ERR_NGROK_108" auth error.
 * ================================================================
 */

// ── PASTE serveo OUTPUT HERE after running start-sheets.sh ─────
const DB_CONFIG_LOCAL = {
  host: 'serveo.net',   // always serveo.net — never changes
  port: '12345',        // ← copy the port from start-sheets.sh output (changes each restart)
  database: 'migration_db',
  user: 'postgres',
  password: 'localpass'
};


/**
 * Quick connectivity test.
 * Run this FIRST to confirm the tunnel is working before running
 * any Phase script.
 *
 * Apps Script editor → select "testLocalConnection" → Run
 */
function testLocalConnection() {
  let ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch(e) {}

  const connString = `jdbc:postgresql://${DB_CONFIG_LOCAL.host}:${DB_CONFIG_LOCAL.port}/${DB_CONFIG_LOCAL.database}`;
  let conn;

  try {
    conn = Jdbc.getConnection(connString, DB_CONFIG_LOCAL.user, DB_CONFIG_LOCAL.password);
    const stmt = conn.createStatement();
    const rs = stmt.executeQuery('SELECT current_database(), version()');
    rs.next();
    const msg = `Connected!\n\nDB   : ${rs.getString(1)}\n${rs.getString(2)}`;
    rs.close();
    stmt.close();
    if (ui) ui.alert('Local Connection Test', msg, ui.ButtonSet.OK);
    console.log(msg);
  } catch (err) {
    const msg = [
      'Connection Failed:',
      err.message,
      '',
      'Troubleshooting:',
      '1. Is the stack running?           bash postgres-mirror/start-sheets.sh',
      '2. Did you update host/port above? bash postgres-mirror/get-ngrok-address.sh',
      '3. Is docker-compose.full.yml also running ngrok? Stop it first.',
      '4. Check ngrok logs:               docker logs sheets-ngrok'
    ].join('\n');
    if (ui) ui.alert('Local Connection Failed', msg, ui.ButtonSet.OK);
    console.error(msg);
  } finally {
    if (conn) try { conn.close(); } catch(e) {}
  }
}
