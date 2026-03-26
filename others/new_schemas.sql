-- ============================================================
--  COMPLETE DATABASE SETUP SCRIPT
--  Version: Final v3
--  Includes:
--    → Auto IDs: PRT, CLT, CP, CD, PA, CERT, SKL, DEPT, DESG
--    → FK Constraints with CASCADE rules
--    → Generated date columns (week_start_date, week_end_date)
--    → ISO Week validation trigger
--    → Department & Designation lookup tables linked to users
--    → Duplicate prevention (UNIQUE indexes + normalizer triggers)
--    → updated_at auto-maintenance triggers
--    → Full performance indexes
--  Order: Sequences → Tables → Functions → Triggers → Indexes
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- SECTION 1: SEQUENCES
-- ─────────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS users_id_seq                START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS cert_id_seq                 START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS skill_id_seq                START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS partner_id_seq              START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS client_id_seq               START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS cp_project_seq              START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS cd_project_seq              START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS alloc_id_seq                START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS weekly_allocations_id_seq   START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS project_commercials_id_seq  START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS project_scopes_id_seq       START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS actionable_todos_id_seq     START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS department_id_seq           START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS designation_id_seq          START 1 INCREMENT 1;


-- ─────────────────────────────────────────────────────────────
-- SECTION 2: LOOKUP / REFERENCE TABLES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS certificates (
    certificate_id   VARCHAR(50)  PRIMARY KEY
                         DEFAULT ('CERT-' || LPAD(nextval('cert_id_seq')::TEXT, 4, '0')),
    certificate_name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS skills (
    skill_id   VARCHAR(20)  PRIMARY KEY
                   DEFAULT ('SKL-' || LPAD(nextval('skill_id_seq')::TEXT, 3, '0')),
    skill_name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS partners (
    partner_id   VARCHAR(50)  PRIMARY KEY
                     DEFAULT ('PRT-' || LPAD(nextval('partner_id_seq')::TEXT, 4, '0')),
    partner_name VARCHAR(255) NOT NULL,
    status       VARCHAR(50)  DEFAULT 'Active',
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
    department_id   VARCHAR(20)  PRIMARY KEY
                        DEFAULT ('DEPT-' || LPAD(nextval('department_id_seq')::TEXT, 3, '0')),
    department_name VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS designations (
    designation_id   VARCHAR(20)  PRIMARY KEY
                         DEFAULT ('DESG-' || LPAD(nextval('designation_id_seq')::TEXT, 3, '0')),
    designation_name VARCHAR(255) NOT NULL,
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);


-- ─────────────────────────────────────────────────────────────
-- SECTION 3: CORE ENTITY TABLES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clients (
    client_id   VARCHAR(50)  PRIMARY KEY
                    DEFAULT ('CLT-' || LPAD(nextval('client_id_seq')::TEXT, 4, '0')),
    client_name VARCHAR(255) NOT NULL,
    website_url VARCHAR(255),
    industry    VARCHAR(100),
    status      VARCHAR(50)  DEFAULT 'Stable',
    budget      NUMERIC      DEFAULT 0.00,
    partner_id  VARCHAR(50)
                    REFERENCES partners(partner_id)
                    ON DELETE SET NULL
                    ON UPDATE CASCADE,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_master (
    si_number          INTEGER,
    employee_id        VARCHAR(50)  PRIMARY KEY,
    employee_name      VARCHAR(255) NOT NULL,
    phone_number       BIGINT,
    email_id           VARCHAR(255) UNIQUE NOT NULL,
    location           VARCHAR(255),
    mode_of_work       VARCHAR(50),
    date_of_joining    DATE,
    role_designation   VARCHAR(255),
    department         VARCHAR(255),
    employee_type      VARCHAR(50),
    total_experience   NUMERIC      DEFAULT 0.00,
    experience_in_cd   NUMERIC      DEFAULT 0.00,
    shift              VARCHAR(255),
    time_zone          VARCHAR(100),
    date_of_resign     DATE,
    photo_url          VARCHAR(255),
    created_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- One-to-one extension of employee_master
CREATE TABLE IF NOT EXISTS employee_master_pro (
    employee_id          VARCHAR(50) PRIMARY KEY
                             REFERENCES employee_master(employee_id)
                             ON DELETE CASCADE
                             ON UPDATE CASCADE,
    reporting_manager_id VARCHAR(50)
                             REFERENCES employee_master(employee_id)
                             ON DELETE SET NULL
                             ON UPDATE CASCADE,
    employee_status      VARCHAR(50)  DEFAULT 'Active',
    upcoming_leaves      VARCHAR(255),
    employee_allocations INTEGER      DEFAULT 0
);

-- Auth / Login table — linked to employee, department, designation
CREATE TABLE IF NOT EXISTS users (
    id                    BIGINT      DEFAULT nextval('users_id_seq') PRIMARY KEY,
    employee_id           VARCHAR(50) UNIQUE
                              REFERENCES employee_master(employee_id)
                              ON DELETE SET NULL
                              ON UPDATE CASCADE,
    email                 VARCHAR(255) NOT NULL UNIQUE,
    password_hash         VARCHAR(255) NOT NULL,
    is_active             BOOLEAN      NOT NULL DEFAULT true,
    failed_login_attempts INTEGER      NOT NULL DEFAULT 0,
    last_login_at         TIMESTAMP,
    password_changed_at   TIMESTAMP,
    department_id         VARCHAR(20)
                              REFERENCES departments(department_id)
                              ON DELETE SET NULL
                              ON UPDATE CASCADE,
    designation_id        VARCHAR(20)
                              REFERENCES designations(designation_id)
                              ON DELETE SET NULL
                              ON UPDATE CASCADE,
    created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ─────────────────────────────────────────────────────────────
-- SECTION 4: PROJECT TABLES
-- ─────────────────────────────────────────────────────────────

-- project_id auto-assigned by trigger (Section 8A)
-- 'Client' → CP-XXXX  |  'Internal' → CD-XXXX
CREATE TABLE IF NOT EXISTS projects (
    project_id     VARCHAR(50)  PRIMARY KEY,
    project_name   VARCHAR(255) NOT NULL,
    project_status VARCHAR(50)  DEFAULT 'Active',
    billable       VARCHAR(50)  DEFAULT 'Yes',
    start_date     DATE,
    end_date       DATE,
    project_type   VARCHAR(50)  DEFAULT 'Client',
    client_id      VARCHAR(50)
                       REFERENCES clients(client_id)
                       ON DELETE SET NULL
                       ON UPDATE CASCADE,
    partner_id     VARCHAR(50)
                       REFERENCES partners(partner_id)
                       ON DELETE SET NULL
                       ON UPDATE CASCADE,
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- One-to-one: commercial details per project
CREATE TABLE IF NOT EXISTS project_commercials (
    id               INTEGER     DEFAULT nextval('project_commercials_id_seq') PRIMARY KEY,
    project_id       VARCHAR(50) NOT NULL UNIQUE
                         REFERENCES projects(project_id)
                         ON DELETE CASCADE
                         ON UPDATE CASCADE,
    budget           NUMERIC     DEFAULT 0.00,
    billing_type     VARCHAR(100),
    contract_type    VARCHAR(100),
    revenue_model    VARCHAR(100),
    commercial_notes TEXT,
    created_at       TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

-- One-to-one: scope/delivery details per project
CREATE TABLE IF NOT EXISTS project_scopes (
    id             INTEGER     DEFAULT nextval('project_scopes_id_seq') PRIMARY KEY,
    project_id     VARCHAR(50) NOT NULL UNIQUE
                       REFERENCES projects(project_id)
                       ON DELETE CASCADE
                       ON UPDATE CASCADE,
    objective      TEXT,
    deliverables   TEXT,
    milestones     TEXT,
    timeline_notes TEXT,
    created_at     TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

-- Junction: projects ↔ skills (many-to-many)
CREATE TABLE IF NOT EXISTS project_skills (
    project_id VARCHAR(50) NOT NULL
                   REFERENCES projects(project_id)
                   ON DELETE CASCADE
                   ON UPDATE CASCADE,
    skill_id   VARCHAR(20) NOT NULL
                   REFERENCES skills(skill_id)
                   ON DELETE CASCADE
                   ON UPDATE CASCADE,
    PRIMARY KEY (project_id, skill_id)
);


-- ─────────────────────────────────────────────────────────────
-- SECTION 5: ALLOCATION TABLES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects_allocation (
    allocation_id         VARCHAR(50)  PRIMARY KEY
                              DEFAULT ('PA-' || LPAD(nextval('alloc_id_seq')::TEXT, 5, '0')),
    employee_id           VARCHAR(50)  NOT NULL
                              REFERENCES employee_master(employee_id)
                              ON DELETE RESTRICT
                              ON UPDATE CASCADE,
    project_id            VARCHAR(50)  NOT NULL
                              REFERENCES projects(project_id)
                              ON DELETE RESTRICT
                              ON UPDATE CASCADE,
    role_in_project       VARCHAR(255),
    allocation_percentage INTEGER      DEFAULT 0
                              CHECK (allocation_percentage BETWEEN 0 AND 100),
    allocation_start_date DATE,
    allocation_end_date   DATE,
    project_tags          VARCHAR(255),
    created_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weekly_allocations (
    id              INTEGER     DEFAULT nextval('weekly_allocations_id_seq') PRIMARY KEY,
    allocation_id   VARCHAR(50) NOT NULL
                        REFERENCES projects_allocation(allocation_id)
                        ON DELETE CASCADE
                        ON UPDATE CASCADE,
    allocation_year INTEGER     NOT NULL CHECK (allocation_year > 2000),
    week_number     INTEGER     NOT NULL CHECK (week_number BETWEEN 1 AND 53),
    allocated_hours INTEGER     DEFAULT 0 CHECK (allocated_hours >= 0),

    -- AUTO-COMPUTED via trigger (fn_validate_iso_week)
    week_start_date DATE,
    week_end_date   DATE,

    created_at      TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (allocation_id, allocation_year, week_number)
);


-- ─────────────────────────────────────────────────────────────
-- SECTION 6: EMPLOYEE ATTRIBUTE JUNCTION TABLES
-- ─────────────────────────────────────────────────────────────

-- Junction: employees ↔ certificates (many-to-many)
CREATE TABLE IF NOT EXISTS employee_certificates (
    employee_id    VARCHAR(50) NOT NULL
                       REFERENCES employee_master(employee_id)
                       ON DELETE CASCADE
                       ON UPDATE CASCADE,
    certificate_id VARCHAR(50) NOT NULL
                       REFERENCES certificates(certificate_id)
                       ON DELETE CASCADE
                       ON UPDATE CASCADE,
    issued_date    DATE,
    expiry_date    DATE,
    CONSTRAINT chk_cert_dates CHECK (expiry_date IS NULL OR expiry_date > issued_date),
    PRIMARY KEY (employee_id, certificate_id)
);

-- Junction: employees ↔ skills (many-to-many)
CREATE TABLE IF NOT EXISTS employee_skills (
    employee_id         VARCHAR(50) NOT NULL
                            REFERENCES employee_master(employee_id)
                            ON DELETE CASCADE
                            ON UPDATE CASCADE,
    skill_id            VARCHAR(20) NOT NULL
                            REFERENCES skills(skill_id)
                            ON DELETE CASCADE
                            ON UPDATE CASCADE,
    proficiency_level   INTEGER
                            CHECK (proficiency_level BETWEEN 1 AND 5),
    years_of_experience NUMERIC     DEFAULT 0.00,
    PRIMARY KEY (employee_id, skill_id)
);


-- ─────────────────────────────────────────────────────────────
-- SECTION 7: SYSTEM / UTILITY TABLES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS actionable_todos (
    id         INTEGER     DEFAULT nextval('actionable_todos_id_seq') PRIMARY KEY,
    user_id    BIGINT
                   REFERENCES users(id)
                   ON DELETE SET NULL,
    message    TEXT        NOT NULL,
    type       VARCHAR(50) DEFAULT 'info',
    status     VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);


-- ─────────────────────────────────────────────────────────────
-- SECTION 8: TRIGGER FUNCTIONS
-- ─────────────────────────────────────────────────────────────

-- ── 8A: Auto-generate project_id based on project_type ───────
CREATE OR REPLACE FUNCTION fn_generate_project_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.project_id IS NULL OR TRIM(NEW.project_id) = '' THEN
        IF NEW.project_type = 'Client' THEN
            NEW.project_id := 'CP-' || LPAD(nextval('cp_project_seq')::TEXT, 4, '0');
        ELSE
            NEW.project_id := 'CD-' || LPAD(nextval('cd_project_seq')::TEXT, 4, '0');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ── 8B: Auto-update updated_at on any row change ─────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ── 8C: Validate ISO week number for the given year ──────────
CREATE OR REPLACE FUNCTION fn_validate_iso_week()
RETURNS TRIGGER AS $$
DECLARE
    test_date DATE;
BEGIN
    BEGIN
        test_date := to_date(
            NEW.allocation_year::TEXT || ' ' || NEW.week_number::TEXT || ' 1',
            'IYYY IW ID'
        );
        IF EXTRACT(ISOYEAR FROM test_date) != NEW.allocation_year THEN
            RAISE EXCEPTION
                'Week % does not belong to ISO year %. Use year % instead.',
                NEW.week_number,
                NEW.allocation_year,
                EXTRACT(ISOYEAR FROM test_date)::INTEGER;
        END IF;

        -- Set computed dates
        NEW.week_start_date := test_date;
        NEW.week_end_date   := to_date(
            NEW.allocation_year::TEXT || ' ' || NEW.week_number::TEXT || ' 7',
            'IYYY IW ID'
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION
            'Invalid ISO week: Year % does not have Week %. Verify the week number.',
            NEW.allocation_year, NEW.week_number;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ── 8D: Normalizer — skills ───────────────────────────────────
CREATE OR REPLACE FUNCTION fn_normalize_skills()
RETURNS TRIGGER AS $$
BEGIN
    NEW.skill_name := TRIM(NEW.skill_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ── 8E: Normalizer — certificates ────────────────────────────
CREATE OR REPLACE FUNCTION fn_normalize_certificates()
RETURNS TRIGGER AS $$
BEGIN
    NEW.certificate_name := TRIM(NEW.certificate_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ── 8F: Normalizer — partners ────────────────────────────────
CREATE OR REPLACE FUNCTION fn_normalize_partners()
RETURNS TRIGGER AS $$
BEGIN
    NEW.partner_name := TRIM(NEW.partner_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ── 8G: Normalizer — clients ─────────────────────────────────
CREATE OR REPLACE FUNCTION fn_normalize_clients()
RETURNS TRIGGER AS $$
BEGIN
    NEW.client_name := TRIM(NEW.client_name);
    IF NEW.website_url IS NOT NULL THEN
        NEW.website_url := LOWER(TRIM(NEW.website_url));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ── 8H: Normalizer — employee_master ─────────────────────────
CREATE OR REPLACE FUNCTION fn_normalize_employee()
RETURNS TRIGGER AS $$
BEGIN
    NEW.employee_name := TRIM(NEW.employee_name);
    NEW.email_id      := LOWER(TRIM(NEW.email_id));
    NEW.location      := TRIM(NEW.location);
    NEW.department    := TRIM(NEW.department);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ── 8I: Normalizer — users ───────────────────────────────────
CREATE OR REPLACE FUNCTION fn_normalize_users()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email := LOWER(TRIM(NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ── 8J: Normalizer — projects ────────────────────────────────
CREATE OR REPLACE FUNCTION fn_normalize_projects()
RETURNS TRIGGER AS $$
BEGIN
    NEW.project_name := TRIM(NEW.project_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ── 8K: Normalizer — departments ─────────────────────────────
CREATE OR REPLACE FUNCTION fn_normalize_departments()
RETURNS TRIGGER AS $$
BEGIN
    NEW.department_name := TRIM(NEW.department_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ── 8L: Normalizer — designations ────────────────────────────
CREATE OR REPLACE FUNCTION fn_normalize_designations()
RETURNS TRIGGER AS $$
BEGIN
    NEW.designation_name := TRIM(NEW.designation_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────
-- SECTION 9: TRIGGER BINDINGS
-- ─────────────────────────────────────────────────────────────

-- Project ID auto-generation
CREATE TRIGGER trg_generate_project_id
BEFORE INSERT ON projects
FOR EACH ROW EXECUTE FUNCTION fn_generate_project_id();

-- ISO week validation
CREATE TRIGGER trg_validate_iso_week
BEFORE INSERT OR UPDATE ON weekly_allocations
FOR EACH ROW EXECUTE FUNCTION fn_validate_iso_week();

-- updated_at auto-maintenance
CREATE TRIGGER trg_updated_at_projects
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_updated_at_project_commercials
BEFORE UPDATE ON project_commercials
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_updated_at_project_scopes
BEFORE UPDATE ON project_scopes
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_updated_at_employee_master
BEFORE UPDATE ON employee_master
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_updated_at_users
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_updated_at_projects_allocation
BEFORE UPDATE ON projects_allocation
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_updated_at_actionable_todos
BEFORE UPDATE ON actionable_todos
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Normalizer triggers
CREATE TRIGGER trg_normalize_skills
BEFORE INSERT OR UPDATE ON skills
FOR EACH ROW EXECUTE FUNCTION fn_normalize_skills();

CREATE TRIGGER trg_normalize_certificates
BEFORE INSERT OR UPDATE ON certificates
FOR EACH ROW EXECUTE FUNCTION fn_normalize_certificates();

CREATE TRIGGER trg_normalize_partners
BEFORE INSERT OR UPDATE ON partners
FOR EACH ROW EXECUTE FUNCTION fn_normalize_partners();

CREATE TRIGGER trg_normalize_clients
BEFORE INSERT OR UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION fn_normalize_clients();

CREATE TRIGGER trg_normalize_employee
BEFORE INSERT OR UPDATE ON employee_master
FOR EACH ROW EXECUTE FUNCTION fn_normalize_employee();

CREATE TRIGGER trg_normalize_users
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION fn_normalize_users();

CREATE TRIGGER trg_normalize_projects
BEFORE INSERT OR UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION fn_normalize_projects();

CREATE TRIGGER trg_normalize_departments
BEFORE INSERT OR UPDATE ON departments
FOR EACH ROW EXECUTE FUNCTION fn_normalize_departments();

CREATE TRIGGER trg_normalize_designations
BEFORE INSERT OR UPDATE ON designations
FOR EACH ROW EXECUTE FUNCTION fn_normalize_designations();


-- ─────────────────────────────────────────────────────────────
-- SECTION 10: DUPLICATE PREVENTION — UNIQUE INDEXES
-- ─────────────────────────────────────────────────────────────

-- certificates
CREATE UNIQUE INDEX IF NOT EXISTS uidx_certificate_name_ci
    ON certificates (LOWER(TRIM(certificate_name)));

-- skills
CREATE UNIQUE INDEX IF NOT EXISTS uidx_skill_name_ci
    ON skills (LOWER(TRIM(skill_name)));

-- partners
CREATE UNIQUE INDEX IF NOT EXISTS uidx_partner_name_ci
    ON partners (LOWER(TRIM(partner_name)));

-- departments
CREATE UNIQUE INDEX IF NOT EXISTS uidx_department_name_ci
    ON departments (LOWER(TRIM(department_name)));

-- designations
CREATE UNIQUE INDEX IF NOT EXISTS uidx_designation_name_ci
    ON designations (LOWER(TRIM(designation_name)));

-- clients
CREATE UNIQUE INDEX IF NOT EXISTS uidx_client_name_partner
    ON clients (LOWER(TRIM(client_name)), partner_id);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_client_website
    ON clients (LOWER(TRIM(website_url)))
    WHERE website_url IS NOT NULL;

-- employee_master
CREATE UNIQUE INDEX IF NOT EXISTS uidx_employee_email_ci
    ON employee_master (LOWER(TRIM(email_id)));

CREATE UNIQUE INDEX IF NOT EXISTS uidx_employee_phone
    ON employee_master (phone_number)
    WHERE phone_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_employee_si_number
    ON employee_master (si_number)
    WHERE si_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_employee_name_doj
    ON employee_master (LOWER(TRIM(employee_name)), date_of_joining);

-- users
CREATE UNIQUE INDEX IF NOT EXISTS uidx_users_email_ci
    ON users (LOWER(TRIM(email)));

-- projects
CREATE UNIQUE INDEX IF NOT EXISTS uidx_project_name_client
    ON projects (LOWER(TRIM(project_name)), client_id)
    WHERE client_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_internal_project_name
    ON projects (LOWER(TRIM(project_name)))
    WHERE client_id IS NULL;

-- projects_allocation
CREATE UNIQUE INDEX IF NOT EXISTS uidx_allocation_employee_project
    ON projects_allocation (employee_id, project_id);

-- actionable_todos
CREATE UNIQUE INDEX IF NOT EXISTS uidx_todos_user_message_status
    ON actionable_todos (user_id, LOWER(TRIM(message)), status)
    WHERE status = 'pending';


-- ─────────────────────────────────────────────────────────────
-- SECTION 11: PERFORMANCE INDEXES
-- ─────────────────────────────────────────────────────────────

-- departments & designations
CREATE INDEX IF NOT EXISTS idx_departments_name      ON departments(department_name);
CREATE INDEX IF NOT EXISTS idx_designations_name     ON designations(designation_name);

-- employee_master
CREATE INDEX IF NOT EXISTS idx_employee_email        ON employee_master(email_id);
CREATE INDEX IF NOT EXISTS idx_employee_department   ON employee_master(department);
CREATE INDEX IF NOT EXISTS idx_employee_type         ON employee_master(employee_type);

-- employee_master_pro
CREATE INDEX IF NOT EXISTS idx_emp_pro_status        ON employee_master_pro(employee_status);
CREATE INDEX IF NOT EXISTS idx_emp_pro_manager       ON employee_master_pro(reporting_manager_id);

-- users
CREATE INDEX IF NOT EXISTS idx_users_email           ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_employee_id     ON users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_active          ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_department_id   ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_designation_id  ON users(designation_id);

-- projects
CREATE INDEX IF NOT EXISTS idx_projects_client       ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_partner      ON projects(partner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status       ON projects(project_status);
CREATE INDEX IF NOT EXISTS idx_projects_type         ON projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_dates        ON projects(start_date, end_date);

-- project_commercials
CREATE INDEX IF NOT EXISTS idx_commercials_project   ON project_commercials(project_id);

-- project_scopes
CREATE INDEX IF NOT EXISTS idx_scopes_project        ON project_scopes(project_id);

-- project_skills
CREATE INDEX IF NOT EXISTS idx_proj_skills_skill     ON project_skills(skill_id);

-- projects_allocation
CREATE INDEX IF NOT EXISTS idx_alloc_employee        ON projects_allocation(employee_id);
CREATE INDEX IF NOT EXISTS idx_alloc_project         ON projects_allocation(project_id);
CREATE INDEX IF NOT EXISTS idx_alloc_dates           ON projects_allocation(allocation_start_date, allocation_end_date);

-- weekly_allocations
CREATE INDEX IF NOT EXISTS idx_weekly_year_week      ON weekly_allocations(allocation_year, week_number);
CREATE INDEX IF NOT EXISTS idx_weekly_start_date     ON weekly_allocations(week_start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_end_date       ON weekly_allocations(week_end_date);
CREATE INDEX IF NOT EXISTS idx_weekly_date_range     ON weekly_allocations(week_start_date, week_end_date);

-- employee attributes
CREATE INDEX IF NOT EXISTS idx_emp_skills_skill      ON employee_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_emp_cert_cert         ON employee_certificates(certificate_id);

-- clients
CREATE INDEX IF NOT EXISTS idx_clients_partner       ON clients(partner_id);
CREATE INDEX IF NOT EXISTS idx_clients_status        ON clients(status);

-- todos
CREATE INDEX IF NOT EXISTS idx_todos_status          ON actionable_todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_user            ON actionable_todos(user_id);
