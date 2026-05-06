--
-- PostgreSQL schema dump (structure only, no data)
-- Generated from: database/init.sql
-- Database version: 16.11
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- ============================================================
-- FUNCTIONS
-- ============================================================

CREATE FUNCTION public.fn_generate_project_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;

ALTER FUNCTION public.fn_generate_project_id() OWNER TO postgres;


CREATE FUNCTION public.fn_normalize_certificates() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.certificate_name := TRIM(NEW.certificate_name);
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.fn_normalize_certificates() OWNER TO postgres;


CREATE FUNCTION public.fn_normalize_clients() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.client_name := TRIM(NEW.client_name);
    IF NEW.website_url IS NOT NULL THEN
        NEW.website_url := LOWER(TRIM(NEW.website_url));
    END IF;
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.fn_normalize_clients() OWNER TO postgres;


CREATE FUNCTION public.fn_normalize_departments() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.department_name := TRIM(NEW.department_name);
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.fn_normalize_departments() OWNER TO postgres;


CREATE FUNCTION public.fn_normalize_designations() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.designation_name := TRIM(NEW.designation_name);
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.fn_normalize_designations() OWNER TO postgres;


CREATE FUNCTION public.fn_normalize_employee() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.employee_name := TRIM(NEW.employee_name);
    NEW.email_id      := LOWER(TRIM(NEW.email_id));
    NEW.location      := TRIM(NEW.location);
    NEW.department    := TRIM(NEW.department);
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.fn_normalize_employee() OWNER TO postgres;


CREATE FUNCTION public.fn_normalize_partners() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.partner_name := TRIM(NEW.partner_name);
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.fn_normalize_partners() OWNER TO postgres;


CREATE FUNCTION public.fn_normalize_projects() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.project_name := TRIM(NEW.project_name);
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.fn_normalize_projects() OWNER TO postgres;


CREATE FUNCTION public.fn_normalize_skills() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.skill_name := TRIM(NEW.skill_name);
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.fn_normalize_skills() OWNER TO postgres;


CREATE FUNCTION public.fn_normalize_users() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.email := LOWER(TRIM(NEW.email));
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.fn_normalize_users() OWNER TO postgres;


CREATE FUNCTION public.fn_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.fn_set_updated_at() OWNER TO postgres;


CREATE FUNCTION public.fn_validate_iso_week() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;

ALTER FUNCTION public.fn_validate_iso_week() OWNER TO postgres;


-- ============================================================
-- SEQUENCES
-- ============================================================

CREATE SEQUENCE public.actionable_todos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.actionable_todos_id_seq OWNER TO postgres;


CREATE SEQUENCE public.alloc_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.alloc_id_seq OWNER TO postgres;


CREATE SEQUENCE public.cd_project_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.cd_project_seq OWNER TO postgres;


CREATE SEQUENCE public.cert_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.cert_id_seq OWNER TO postgres;


CREATE SEQUENCE public.client_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.client_id_seq OWNER TO postgres;


CREATE SEQUENCE public.cp_project_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.cp_project_seq OWNER TO postgres;


CREATE SEQUENCE public.department_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.department_id_seq OWNER TO postgres;


CREATE SEQUENCE public.designation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.designation_id_seq OWNER TO postgres;


CREATE SEQUENCE public.feedback_tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.feedback_tickets_id_seq OWNER TO postgres;


CREATE SEQUENCE public.partner_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.partner_id_seq OWNER TO postgres;


CREATE SEQUENCE public.project_commercials_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.project_commercials_id_seq OWNER TO postgres;


CREATE SEQUENCE public.project_scopes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.project_scopes_id_seq OWNER TO postgres;


CREATE SEQUENCE public.skill_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.skill_id_seq OWNER TO postgres;


CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.users_id_seq OWNER TO postgres;


CREATE SEQUENCE public.weekly_allocations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.weekly_allocations_id_seq OWNER TO postgres;


-- ============================================================
-- TABLES
-- ============================================================

SET default_tablespace = '';
SET default_table_access_method = heap;

CREATE TABLE public.actionable_todos (
    id integer DEFAULT nextval('public.actionable_todos_id_seq'::regclass) NOT NULL,
    user_id bigint,
    message text NOT NULL,
    type character varying(50) DEFAULT 'info'::character varying,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.actionable_todos OWNER TO postgres;


CREATE TABLE public.certificates (
    certificate_id character varying(50) DEFAULT ('CERT-'::text || lpad((nextval('public.cert_id_seq'::regclass))::text, 4, '0'::text)) NOT NULL,
    certificate_name character varying(255) NOT NULL
);

ALTER TABLE public.certificates OWNER TO postgres;


CREATE TABLE public.clients (
    client_id character varying(50) DEFAULT ('CLT-'::text || lpad((nextval('public.client_id_seq'::regclass))::text, 4, '0'::text)) NOT NULL,
    client_name character varying(255) NOT NULL,
    website_url character varying(255),
    industry character varying(100),
    status character varying(50) DEFAULT 'Stable'::character varying,
    budget numeric DEFAULT 0.00,
    partner_id character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.clients OWNER TO postgres;


CREATE TABLE public.departments (
    department_id character varying(20) DEFAULT ('DEPT-'::text || lpad((nextval('public.department_id_seq'::regclass))::text, 3, '0'::text)) NOT NULL,
    department_name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.departments OWNER TO postgres;


CREATE TABLE public.designations (
    designation_id character varying(20) DEFAULT ('DESG-'::text || lpad((nextval('public.designation_id_seq'::regclass))::text, 3, '0'::text)) NOT NULL,
    designation_name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.designations OWNER TO postgres;


CREATE TABLE public.employee_certificates (
    employee_id character varying(50) NOT NULL,
    certificate_id character varying(50) NOT NULL,
    issued_date date,
    expiry_date date,
    CONSTRAINT chk_cert_dates CHECK (((expiry_date IS NULL) OR (expiry_date > issued_date)))
);

ALTER TABLE public.employee_certificates OWNER TO postgres;


CREATE TABLE public.employee_master (
    si_number integer,
    employee_id character varying(50) NOT NULL,
    employee_name character varying(255) NOT NULL,
    phone_number bigint,
    email_id character varying(255) NOT NULL,
    location character varying(255),
    mode_of_work character varying(50),
    date_of_joining date,
    role_designation character varying(255),
    department character varying(255),
    employee_type character varying(50),
    total_experience numeric DEFAULT 0.00,
    experience_in_cd numeric DEFAULT 0.00,
    shift character varying(255),
    time_zone character varying(100),
    date_of_resign date,
    photo_url character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.employee_master OWNER TO postgres;


CREATE TABLE public.employee_master_pro (
    employee_id character varying(50) NOT NULL,
    reporting_manager_id character varying(50),
    employee_status character varying(50) DEFAULT 'Active'::character varying,
    upcoming_leaves character varying(255),
    employee_allocations integer DEFAULT 0,
    pip_start_date date,
    pip_end_date date,
    notice_start_date date,
    notice_end_date date
);

COMMENT ON COLUMN public.employee_master_pro.pip_start_date IS 'Start date of Performance Improvement Plan';
COMMENT ON COLUMN public.employee_master_pro.pip_end_date IS 'Expected end date of Performance Improvement Plan';
COMMENT ON COLUMN public.employee_master_pro.notice_start_date IS 'Start date of employee notice period';
COMMENT ON COLUMN public.employee_master_pro.notice_end_date IS 'End date of employee notice period';

ALTER TABLE public.employee_master_pro OWNER TO postgres;


CREATE TABLE public.employee_skills (
    employee_id character varying(50) NOT NULL,
    skill_id character varying(20) NOT NULL,
    proficiency_level integer,
    years_of_experience numeric DEFAULT 0.00,
    CONSTRAINT employee_skills_proficiency_level_check CHECK (((proficiency_level >= 1) AND (proficiency_level <= 5)))
);

ALTER TABLE public.employee_skills OWNER TO postgres;


CREATE TABLE public.feedback_tickets (
    id integer NOT NULL,
    employee_id character varying(50),
    employee_name character varying(255),
    employee_email character varying(255) NOT NULL,
    subject character varying(500) NOT NULL,
    description text NOT NULL,
    type character varying(50) NOT NULL,
    priority character varying(20) NOT NULL,
    status character varying(30) DEFAULT 'open'::character varying NOT NULL,
    assigned_to character varying(255) DEFAULT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feedback_tickets_priority_check CHECK (((priority)::text = ANY (ARRAY[('Low'::character varying)::text, ('Medium'::character varying)::text, ('High'::character varying)::text]))),
    CONSTRAINT feedback_tickets_type_check CHECK (((type)::text = ANY (ARRAY[('Bug'::character varying)::text, ('Feature Request'::character varying)::text, ('General'::character varying)::text])))
);

COMMENT ON COLUMN public.feedback_tickets.assigned_to IS 'Teammate name who claimed this ticket via the MCP agent';

ALTER TABLE public.feedback_tickets OWNER TO postgres;

ALTER SEQUENCE public.feedback_tickets_id_seq OWNED BY public.feedback_tickets.id;

ALTER TABLE ONLY public.feedback_tickets ALTER COLUMN id SET DEFAULT nextval('public.feedback_tickets_id_seq'::regclass);



CREATE TABLE public.partners (
    partner_id character varying(50) DEFAULT ('PRT-'::text || lpad((nextval('public.partner_id_seq'::regclass))::text, 4, '0'::text)) NOT NULL,
    partner_name character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'Active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.partners OWNER TO postgres;


CREATE TABLE public.project_commercials (
    id integer DEFAULT nextval('public.project_commercials_id_seq'::regclass) NOT NULL,
    project_id character varying(50) NOT NULL,
    budget numeric DEFAULT 0.00,
    billing_type character varying(100),
    contract_type character varying(100),
    revenue_model character varying(100),
    commercial_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.project_commercials OWNER TO postgres;


CREATE TABLE public.project_scopes (
    id integer DEFAULT nextval('public.project_scopes_id_seq'::regclass) NOT NULL,
    project_id character varying(50) NOT NULL,
    objective text,
    deliverables text,
    milestones text,
    timeline_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.project_scopes OWNER TO postgres;


CREATE TABLE public.project_skills (
    project_id character varying(50) NOT NULL,
    skill_id character varying(20) NOT NULL
);

ALTER TABLE public.project_skills OWNER TO postgres;


CREATE TABLE public.projects (
    project_id character varying(50) NOT NULL,
    project_name character varying(255) NOT NULL,
    project_status character varying(50) DEFAULT 'Active'::character varying,
    sub_status character varying(50),
    billable character varying(50) DEFAULT 'Yes'::character varying,
    start_date date,
    end_date date,
    project_type character varying(50) DEFAULT 'Client'::character varying,
    client_id character varying(50),
    partner_id character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.projects OWNER TO postgres;


CREATE TABLE public.projects_allocation (
    allocation_id character varying(50) DEFAULT ('PA-'::text || lpad((nextval('public.alloc_id_seq'::regclass))::text, 5, '0'::text)) NOT NULL,
    employee_id character varying(50) NOT NULL,
    project_id character varying(50) NOT NULL,
    role_in_project character varying(255),
    allocation_percentage integer DEFAULT 0,
    allocation_start_date date,
    allocation_end_date date,
    project_tags character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    location character varying(100) DEFAULT 'Remote',
    CONSTRAINT projects_allocation_allocation_percentage_check CHECK (((allocation_percentage >= 0) AND (allocation_percentage <= 100)))
);

ALTER TABLE public.projects_allocation OWNER TO postgres;


CREATE TABLE public.skills (
    skill_id character varying(20) DEFAULT ('SKL-'::text || lpad((nextval('public.skill_id_seq'::regclass))::text, 3, '0'::text)) NOT NULL,
    skill_name character varying(255) NOT NULL
);

ALTER TABLE public.skills OWNER TO postgres;


CREATE TABLE public.users (
    id bigint DEFAULT nextval('public.users_id_seq'::regclass) NOT NULL,
    employee_id character varying(50),
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    last_login_at timestamp without time zone,
    password_changed_at timestamp without time zone,
    department_id character varying(20),
    designation_id character varying(20),
    role_id integer NOT NULL,
    sub_role_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE public.users OWNER TO postgres;


CREATE TABLE public.weekly_allocations (
    id integer DEFAULT nextval('public.weekly_allocations_id_seq'::regclass) NOT NULL,
    allocation_id character varying(50) NOT NULL,
    allocation_year integer NOT NULL,
    week_number integer NOT NULL,
    allocated_hours integer DEFAULT 0,
    week_start_date date,
    week_end_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT weekly_allocations_allocated_hours_check CHECK ((allocated_hours >= 0)),
    CONSTRAINT weekly_allocations_allocation_year_check CHECK ((allocation_year > 2000)),
    CONSTRAINT weekly_allocations_week_number_check CHECK (((week_number >= 1) AND (week_number <= 53)))
);

ALTER TABLE public.weekly_allocations OWNER TO postgres;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    role_id integer NOT NULL,
    role_name character varying(50) NOT NULL,
    role_label character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_role_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.roles_role_id_seq OWNER TO postgres;

ALTER SEQUENCE public.roles_role_id_seq OWNED BY public.roles.role_id;

ALTER TABLE ONLY public.roles ALTER COLUMN role_id SET DEFAULT nextval('public.roles_role_id_seq'::regclass);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    permission_id integer NOT NULL,
    resource_name character varying(100) NOT NULL,
    action character varying(50) NOT NULL,
    description text
);

ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: permissions_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.permissions_permission_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.permissions_permission_id_seq OWNER TO postgres;

ALTER SEQUENCE public.permissions_permission_id_seq OWNED BY public.permissions.permission_id;

ALTER TABLE ONLY public.permissions ALTER COLUMN permission_id SET DEFAULT nextval('public.permissions_permission_id_seq'::regclass);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    role_id integer NOT NULL,
    permission_id integer NOT NULL
);

ALTER TABLE public.role_permissions OWNER TO postgres;


--
-- Name: sub_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sub_roles (
    sub_role_id integer NOT NULL,
    name character varying(100) NOT NULL,
    label character varying(150) NOT NULL,
    description text,
    base_role character varying(50) NOT NULL,
    page_access text[] DEFAULT '{}'::text[] NOT NULL,
    field_restrictions jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.sub_roles OWNER TO postgres;

--
-- Name: sub_roles_sub_role_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sub_roles_sub_role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.sub_roles_sub_role_id_seq OWNER TO postgres;

ALTER SEQUENCE public.sub_roles_sub_role_id_seq OWNED BY public.sub_roles.sub_role_id;

ALTER TABLE ONLY public.sub_roles ALTER COLUMN sub_role_id SET DEFAULT nextval('public.sub_roles_sub_role_id_seq'::regclass);


-- ============================================================
-- PRIMARY KEY & UNIQUE CONSTRAINTS
-- ============================================================

ALTER TABLE ONLY public.actionable_todos
    ADD CONSTRAINT actionable_todos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (certificate_id);

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (client_id);

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (department_id);

ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_pkey PRIMARY KEY (designation_id);

ALTER TABLE ONLY public.employee_certificates
    ADD CONSTRAINT employee_certificates_pkey PRIMARY KEY (employee_id, certificate_id);

ALTER TABLE ONLY public.employee_master
    ADD CONSTRAINT employee_master_email_id_key UNIQUE (email_id);

ALTER TABLE ONLY public.employee_master
    ADD CONSTRAINT employee_master_pkey PRIMARY KEY (employee_id);

ALTER TABLE ONLY public.employee_master_pro
    ADD CONSTRAINT employee_master_pro_pkey PRIMARY KEY (employee_id);

ALTER TABLE ONLY public.employee_skills
    ADD CONSTRAINT employee_skills_pkey PRIMARY KEY (employee_id, skill_id);

ALTER TABLE ONLY public.feedback_tickets
    ADD CONSTRAINT feedback_tickets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_pkey PRIMARY KEY (partner_id);

ALTER TABLE ONLY public.project_commercials
    ADD CONSTRAINT project_commercials_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.project_commercials
    ADD CONSTRAINT project_commercials_project_id_key UNIQUE (project_id);

ALTER TABLE ONLY public.project_scopes
    ADD CONSTRAINT project_scopes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.project_scopes
    ADD CONSTRAINT project_scopes_project_id_key UNIQUE (project_id);

ALTER TABLE ONLY public.project_skills
    ADD CONSTRAINT project_skills_pkey PRIMARY KEY (project_id, skill_id);

ALTER TABLE ONLY public.projects_allocation
    ADD CONSTRAINT projects_allocation_pkey PRIMARY KEY (allocation_id);

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (project_id);

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (skill_id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_employee_id_key UNIQUE (employee_id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.weekly_allocations
    ADD CONSTRAINT weekly_allocations_allocation_id_allocation_year_week_numbe_key UNIQUE (allocation_id, allocation_year, week_number);

ALTER TABLE ONLY public.weekly_allocations
    ADD CONSTRAINT weekly_allocations_pkey PRIMARY KEY (id);


ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (role_id);

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_role_name_key UNIQUE (role_name);

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (permission_id);

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_resource_name_action_key UNIQUE (resource_name, action);

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);

ALTER TABLE ONLY public.sub_roles
    ADD CONSTRAINT sub_roles_name_key UNIQUE (name);

ALTER TABLE ONLY public.sub_roles
    ADD CONSTRAINT sub_roles_pkey PRIMARY KEY (sub_role_id);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_alloc_dates ON public.projects_allocation USING btree (allocation_start_date, allocation_end_date);
CREATE INDEX idx_alloc_employee ON public.projects_allocation USING btree (employee_id);
CREATE INDEX idx_alloc_project ON public.projects_allocation USING btree (project_id);
CREATE INDEX idx_clients_partner ON public.clients USING btree (partner_id);
CREATE INDEX idx_clients_status ON public.clients USING btree (status);
CREATE INDEX idx_commercials_project ON public.project_commercials USING btree (project_id);
CREATE INDEX idx_departments_name ON public.departments USING btree (department_name);
CREATE INDEX idx_designations_name ON public.designations USING btree (designation_name);
CREATE INDEX idx_emp_cert_cert ON public.employee_certificates USING btree (certificate_id);
CREATE INDEX idx_emp_pro_manager ON public.employee_master_pro USING btree (reporting_manager_id);
CREATE INDEX idx_emp_pro_status ON public.employee_master_pro USING btree (employee_status);
CREATE INDEX idx_emp_skills_skill ON public.employee_skills USING btree (skill_id);
CREATE INDEX idx_employee_department ON public.employee_master USING btree (department);
CREATE INDEX idx_employee_email ON public.employee_master USING btree (email_id);
CREATE INDEX idx_employee_type ON public.employee_master USING btree (employee_type);
CREATE INDEX idx_feedback_tickets_created_at ON public.feedback_tickets USING btree (created_at DESC);
CREATE INDEX idx_feedback_tickets_employee_id ON public.feedback_tickets USING btree (employee_id);
CREATE INDEX idx_proj_skills_skill ON public.project_skills USING btree (skill_id);
CREATE INDEX idx_projects_client ON public.projects USING btree (client_id);
CREATE INDEX idx_projects_dates ON public.projects USING btree (start_date, end_date);
CREATE INDEX idx_projects_partner ON public.projects USING btree (partner_id);
CREATE INDEX idx_projects_status ON public.projects USING btree (project_status);
CREATE INDEX idx_projects_type ON public.projects USING btree (project_type);
CREATE INDEX idx_scopes_project ON public.project_scopes USING btree (project_id);
CREATE INDEX idx_todos_status ON public.actionable_todos USING btree (status);
CREATE INDEX idx_todos_user ON public.actionable_todos USING btree (user_id);
CREATE INDEX idx_users_active ON public.users USING btree (is_active);
CREATE INDEX idx_users_department_id ON public.users USING btree (department_id);
CREATE INDEX idx_users_designation_id ON public.users USING btree (designation_id);
CREATE INDEX idx_users_email ON public.users USING btree (email);
CREATE INDEX idx_users_employee_id ON public.users USING btree (employee_id);
CREATE INDEX idx_weekly_date_range ON public.weekly_allocations USING btree (week_start_date, week_end_date);
CREATE INDEX idx_weekly_end_date ON public.weekly_allocations USING btree (week_end_date);
CREATE INDEX idx_weekly_start_date ON public.weekly_allocations USING btree (week_start_date);
CREATE INDEX idx_weekly_year_week ON public.weekly_allocations USING btree (allocation_year, week_number);

-- Unique indexes
CREATE UNIQUE INDEX uidx_allocation_employee_project ON public.projects_allocation USING btree (employee_id, project_id);
CREATE UNIQUE INDEX uidx_certificate_name_ci ON public.certificates USING btree (lower(TRIM(BOTH FROM certificate_name)));
CREATE UNIQUE INDEX uidx_client_name_partner ON public.clients USING btree (lower(TRIM(BOTH FROM client_name)), partner_id);
CREATE UNIQUE INDEX uidx_client_website ON public.clients USING btree (lower(TRIM(BOTH FROM website_url))) WHERE (website_url IS NOT NULL);
CREATE UNIQUE INDEX uidx_department_name_ci ON public.departments USING btree (lower(TRIM(BOTH FROM department_name)));
CREATE UNIQUE INDEX uidx_designation_name_ci ON public.designations USING btree (lower(TRIM(BOTH FROM designation_name)));
CREATE UNIQUE INDEX uidx_employee_email_ci ON public.employee_master USING btree (lower(TRIM(BOTH FROM email_id)));
CREATE UNIQUE INDEX uidx_employee_name_doj ON public.employee_master USING btree (lower(TRIM(BOTH FROM employee_name)), date_of_joining);
-- NOTE: uidx_employee_phone enforces unique phone numbers. Ensure all employees have distinct phone numbers before applying.
CREATE UNIQUE INDEX uidx_employee_phone ON public.employee_master USING btree (phone_number) WHERE (phone_number IS NOT NULL);
CREATE UNIQUE INDEX uidx_employee_si_number ON public.employee_master USING btree (si_number) WHERE (si_number IS NOT NULL);
CREATE UNIQUE INDEX uidx_internal_project_name ON public.projects USING btree (lower(TRIM(BOTH FROM project_name))) WHERE (client_id IS NULL);
CREATE UNIQUE INDEX uidx_partner_name_ci ON public.partners USING btree (lower(TRIM(BOTH FROM partner_name)));
CREATE UNIQUE INDEX uidx_project_name_client ON public.projects USING btree (lower(TRIM(BOTH FROM project_name)), client_id) WHERE (client_id IS NOT NULL);
CREATE UNIQUE INDEX uidx_skill_name_ci ON public.skills USING btree (lower(TRIM(BOTH FROM skill_name)));
CREATE UNIQUE INDEX uidx_todos_user_message_status ON public.actionable_todos USING btree (user_id, lower(TRIM(BOTH FROM message)), status) WHERE ((status)::text = 'pending'::text);
CREATE UNIQUE INDEX uidx_users_email_ci ON public.users USING btree (lower(TRIM(BOTH FROM email)));


-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER trg_generate_project_id BEFORE INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.fn_generate_project_id();
CREATE TRIGGER trg_normalize_certificates BEFORE INSERT OR UPDATE ON public.certificates FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_certificates();
CREATE TRIGGER trg_normalize_clients BEFORE INSERT OR UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_clients();
CREATE TRIGGER trg_normalize_departments BEFORE INSERT OR UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_departments();
CREATE TRIGGER trg_normalize_designations BEFORE INSERT OR UPDATE ON public.designations FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_designations();
CREATE TRIGGER trg_normalize_employee BEFORE INSERT OR UPDATE ON public.employee_master FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_employee();
CREATE TRIGGER trg_normalize_partners BEFORE INSERT OR UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_partners();
CREATE TRIGGER trg_normalize_projects BEFORE INSERT OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_projects();
CREATE TRIGGER trg_normalize_skills BEFORE INSERT OR UPDATE ON public.skills FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_skills();
CREATE TRIGGER trg_normalize_users BEFORE INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_users();
CREATE TRIGGER trg_updated_at_actionable_todos BEFORE UPDATE ON public.actionable_todos FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_updated_at_employee_master BEFORE UPDATE ON public.employee_master FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_updated_at_project_commercials BEFORE UPDATE ON public.project_commercials FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_updated_at_project_scopes BEFORE UPDATE ON public.project_scopes FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_updated_at_projects BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_updated_at_projects_allocation BEFORE UPDATE ON public.projects_allocation FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_updated_at_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();
CREATE TRIGGER trg_validate_iso_week BEFORE INSERT OR UPDATE ON public.weekly_allocations FOR EACH ROW EXECUTE FUNCTION public.fn_validate_iso_week();


CREATE TRIGGER trg_updated_at_sub_roles BEFORE UPDATE ON public.sub_roles FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


-- ============================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================

ALTER TABLE ONLY public.actionable_todos
    ADD CONSTRAINT actionable_todos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(partner_id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.employee_certificates
    ADD CONSTRAINT employee_certificates_certificate_id_fkey FOREIGN KEY (certificate_id) REFERENCES public.certificates(certificate_id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.employee_certificates
    ADD CONSTRAINT employee_certificates_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee_master(employee_id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.employee_master_pro
    ADD CONSTRAINT employee_master_pro_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee_master(employee_id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.employee_master_pro
    ADD CONSTRAINT employee_master_pro_reporting_manager_id_fkey FOREIGN KEY (reporting_manager_id) REFERENCES public.employee_master(employee_id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.employee_skills
    ADD CONSTRAINT employee_skills_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee_master(employee_id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.employee_skills
    ADD CONSTRAINT employee_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(skill_id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.project_commercials
    ADD CONSTRAINT project_commercials_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.project_scopes
    ADD CONSTRAINT project_scopes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.project_skills
    ADD CONSTRAINT project_skills_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.project_skills
    ADD CONSTRAINT project_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(skill_id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.projects_allocation
    ADD CONSTRAINT projects_allocation_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee_master(employee_id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.projects_allocation
    ADD CONSTRAINT projects_allocation_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(client_id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(partner_id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(department_id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_designation_id_fkey FOREIGN KEY (designation_id) REFERENCES public.designations(designation_id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee_master(employee_id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.weekly_allocations
    ADD CONSTRAINT weekly_allocations_allocation_id_fkey FOREIGN KEY (allocation_id) REFERENCES public.projects_allocation(allocation_id) ON UPDATE CASCADE ON DELETE CASCADE;


ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(permission_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.sub_roles
    ADD CONSTRAINT sub_roles_base_role_fkey FOREIGN KEY (base_role) REFERENCES public.roles(role_name) ON DELETE RESTRICT;

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_sub_role_id_fkey FOREIGN KEY (sub_role_id) REFERENCES public.sub_roles(sub_role_id) ON DELETE SET NULL;
