--
-- PostgreSQL database dump
--

\restrict fxVYmwTKGp0QFqq6ftEgEgz2ZeSg2ydCffOAK9TmCb5Z7FIf4B0sG8agsLuhoCc

-- Dumped from database version 16.11
-- Dumped by pg_dump version 16.11

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

--
-- Name: fn_generate_project_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

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

--
-- Name: fn_normalize_certificates(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_normalize_certificates() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.certificate_name := TRIM(NEW.certificate_name);
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_normalize_certificates() OWNER TO postgres;

--
-- Name: fn_normalize_clients(); Type: FUNCTION; Schema: public; Owner: postgres
--

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

--
-- Name: fn_normalize_departments(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_normalize_departments() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.department_name := TRIM(NEW.department_name);
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_normalize_departments() OWNER TO postgres;

--
-- Name: fn_normalize_designations(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_normalize_designations() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.designation_name := TRIM(NEW.designation_name);
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_normalize_designations() OWNER TO postgres;

--
-- Name: fn_normalize_employee(); Type: FUNCTION; Schema: public; Owner: postgres
--

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

--
-- Name: fn_normalize_partners(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_normalize_partners() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.partner_name := TRIM(NEW.partner_name);
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_normalize_partners() OWNER TO postgres;

--
-- Name: fn_normalize_projects(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_normalize_projects() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.project_name := TRIM(NEW.project_name);
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_normalize_projects() OWNER TO postgres;

--
-- Name: fn_normalize_skills(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_normalize_skills() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.skill_name := TRIM(NEW.skill_name);
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_normalize_skills() OWNER TO postgres;

--
-- Name: fn_normalize_users(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_normalize_users() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.email := LOWER(TRIM(NEW.email));
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_normalize_users() OWNER TO postgres;

--
-- Name: fn_set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_set_updated_at() OWNER TO postgres;

--
-- Name: fn_validate_iso_week(); Type: FUNCTION; Schema: public; Owner: postgres
--

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

--
-- Name: actionable_todos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.actionable_todos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.actionable_todos_id_seq OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: actionable_todos; Type: TABLE; Schema: public; Owner: postgres
--

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

--
-- Name: alloc_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.alloc_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.alloc_id_seq OWNER TO postgres;

--
-- Name: cd_project_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cd_project_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cd_project_seq OWNER TO postgres;

--
-- Name: cert_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cert_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cert_id_seq OWNER TO postgres;

--
-- Name: certificates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.certificates (
    certificate_id character varying(50) DEFAULT ('CERT-'::text || lpad((nextval('public.cert_id_seq'::regclass))::text, 4, '0'::text)) NOT NULL,
    certificate_name character varying(255) NOT NULL
);


ALTER TABLE public.certificates OWNER TO postgres;

--
-- Name: client_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.client_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.client_id_seq OWNER TO postgres;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

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

--
-- Name: cp_project_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cp_project_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cp_project_seq OWNER TO postgres;

--
-- Name: department_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.department_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.department_id_seq OWNER TO postgres;

--
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    department_id character varying(20) DEFAULT ('DEPT-'::text || lpad((nextval('public.department_id_seq'::regclass))::text, 3, '0'::text)) NOT NULL,
    department_name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- Name: designation_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.designation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.designation_id_seq OWNER TO postgres;

--
-- Name: designations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.designations (
    designation_id character varying(20) DEFAULT ('DESG-'::text || lpad((nextval('public.designation_id_seq'::regclass))::text, 3, '0'::text)) NOT NULL,
    designation_name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.designations OWNER TO postgres;

--
-- Name: employee_certificates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_certificates (
    employee_id character varying(50) NOT NULL,
    certificate_id character varying(50) NOT NULL,
    issued_date date,
    expiry_date date,
    CONSTRAINT chk_cert_dates CHECK (((expiry_date IS NULL) OR (expiry_date > issued_date)))
);


ALTER TABLE public.employee_certificates OWNER TO postgres;

--
-- Name: employee_master; Type: TABLE; Schema: public; Owner: postgres
--

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

--
-- Name: employee_master_pro; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_master_pro (
    employee_id character varying(50) NOT NULL,
    reporting_manager_id character varying(50),
    employee_status character varying(50) DEFAULT 'Active'::character varying,
    upcoming_leaves character varying(255),
    employee_allocations integer DEFAULT 0
);


ALTER TABLE public.employee_master_pro OWNER TO postgres;

--
-- Name: employee_skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_skills (
    employee_id character varying(50) NOT NULL,
    skill_id character varying(20) NOT NULL,
    proficiency_level integer,
    years_of_experience numeric DEFAULT 0.00,
    CONSTRAINT employee_skills_proficiency_level_check CHECK (((proficiency_level >= 1) AND (proficiency_level <= 5)))
);


ALTER TABLE public.employee_skills OWNER TO postgres;

--
-- Name: feedback_tickets; Type: TABLE; Schema: public; Owner: postgres
--

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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT feedback_tickets_priority_check CHECK (((priority)::text = ANY (ARRAY[('Low'::character varying)::text, ('Medium'::character varying)::text, ('High'::character varying)::text]))),
    CONSTRAINT feedback_tickets_type_check CHECK (((type)::text = ANY (ARRAY[('Bug'::character varying)::text, ('Feature Request'::character varying)::text, ('General'::character varying)::text])))
);


ALTER TABLE public.feedback_tickets OWNER TO postgres;

--
-- Name: feedback_tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.feedback_tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.feedback_tickets_id_seq OWNER TO postgres;

--
-- Name: feedback_tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.feedback_tickets_id_seq OWNED BY public.feedback_tickets.id;


--
-- Name: map_partners; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.map_partners (
    old_id integer,
    new_id character varying(50)
);


ALTER TABLE public.map_partners OWNER TO postgres;

--
-- Name: map_skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.map_skills (
    old_id integer,
    new_id character varying(20)
);


ALTER TABLE public.map_skills OWNER TO postgres;

--
-- Name: partner_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.partner_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.partner_id_seq OWNER TO postgres;

--
-- Name: partners; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.partners (
    partner_id character varying(50) DEFAULT ('PRT-'::text || lpad((nextval('public.partner_id_seq'::regclass))::text, 4, '0'::text)) NOT NULL,
    partner_name character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'Active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.partners OWNER TO postgres;

--
-- Name: project_commercials_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_commercials_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_commercials_id_seq OWNER TO postgres;

--
-- Name: project_commercials; Type: TABLE; Schema: public; Owner: postgres
--

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

--
-- Name: project_scopes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_scopes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_scopes_id_seq OWNER TO postgres;

--
-- Name: project_scopes; Type: TABLE; Schema: public; Owner: postgres
--

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

--
-- Name: project_skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_skills (
    project_id character varying(50) NOT NULL,
    skill_id character varying(20) NOT NULL
);


ALTER TABLE public.project_skills OWNER TO postgres;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    project_id character varying(50) NOT NULL,
    project_name character varying(255) NOT NULL,
    project_status character varying(50) DEFAULT 'Active'::character varying,
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

--
-- Name: projects_allocation; Type: TABLE; Schema: public; Owner: postgres
--

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
    CONSTRAINT projects_allocation_allocation_percentage_check CHECK (((allocation_percentage >= 0) AND (allocation_percentage <= 100)))
);


ALTER TABLE public.projects_allocation OWNER TO postgres;

--
-- Name: skill_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.skill_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.skill_id_seq OWNER TO postgres;

--
-- Name: skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.skills (
    skill_id character varying(20) DEFAULT ('SKL-'::text || lpad((nextval('public.skill_id_seq'::regclass))::text, 3, '0'::text)) NOT NULL,
    skill_name character varying(255) NOT NULL
);


ALTER TABLE public.skills OWNER TO postgres;

--
-- Name: stg_actionable_todos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stg_actionable_todos (
    id integer,
    message text,
    type character varying(50),
    status character varying(50),
    created_at timestamp without time zone
);


ALTER TABLE public.stg_actionable_todos OWNER TO postgres;

--
-- Name: stg_certificates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stg_certificates (
    certificate_id character varying(50),
    certificate_name character varying(255)
);


ALTER TABLE public.stg_certificates OWNER TO postgres;

--
-- Name: stg_clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stg_clients (
    client_id character varying(255),
    client_name character varying(255),
    website_url character varying(255),
    industry character varying(255),
    status character varying(255),
    budget numeric
);


ALTER TABLE public.stg_clients OWNER TO postgres;

--
-- Name: stg_employee_certificates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stg_employee_certificates (
    certificate_id character varying(50),
    employee_id character varying(50)
);


ALTER TABLE public.stg_employee_certificates OWNER TO postgres;

--
-- Name: stg_employee_master; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stg_employee_master (
    si_number integer,
    employee_id character varying(50),
    employee_name character varying(255),
    phone_number bigint,
    email_id character varying(255),
    location character varying(255),
    mode_of_work character varying(50),
    date_of_joining date,
    role_designation character varying(255),
    department character varying(255),
    employee_type character varying(50),
    total_experience numeric,
    experience_in_cd numeric,
    shift character varying(255),
    time_zone character varying(100),
    date_of_resign date,
    photo_url character varying(255)
);


ALTER TABLE public.stg_employee_master OWNER TO postgres;

--
-- Name: stg_employee_master_pro; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stg_employee_master_pro (
    employee_id character varying(50),
    reporting_manager_id character varying(50),
    employee_status character varying(50),
    upcoming_leaves character varying(255),
    employee_allocations integer
);


ALTER TABLE public.stg_employee_master_pro OWNER TO postgres;

--
-- Name: stg_employee_nominations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stg_employee_nominations (
    id integer,
    nominator_id character varying(50),
    nominee_id character varying(50),
    reason text,
    nomination_date date
);


ALTER TABLE public.stg_employee_nominations OWNER TO postgres;

--
-- Name: stg_employee_skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stg_employee_skills (
    skill_id integer,
    employee_id character varying(50),
    proficiency_level integer,
    years_of_experience numeric
);


ALTER TABLE public.stg_employee_skills OWNER TO postgres;

--
-- Name: stg_partners; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stg_partners (
    id integer,
    name character varying(255)
);


ALTER TABLE public.stg_partners OWNER TO postgres;

--
-- Name: stg_project_commercials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stg_project_commercials (
    id integer,
    project_id character varying(50),
    budget numeric,
    billing_type character varying(100),
    contract_type character varying(100),
    revenue_model character varying(100),
    commercial_notes text
);


ALTER TABLE public.stg_project_commercials OWNER TO postgres;

--
-- Name: stg_project_scopes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stg_project_scopes (
    id integer,
    project_id character varying(50),
    objective text,
    deliverables text,
    milestones text,
    timeline_notes text
);


ALTER TABLE public.stg_project_scopes OWNER TO postgres;

--
-- Name: stg_project_skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stg_project_skills (
    project_id character varying(50),
    skill_id integer
);


ALTER TABLE public.stg_project_skills OWNER TO postgres;

--
-- Name: stg_projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stg_projects (
    project_id character varying(50),
    project_name character varying(255),
    project_status character varying(50),
    billable character varying(50),
    start_date date,
    end_date date,
    project_type character varying(255),
    client_name character varying(255),
    budget character varying(255),
    billing_type character varying(255),
    contract_type character varying(255),
    revenue_model character varying(255),
    commercial_notes text,
    objective text,
    deliverables text,
    milestones text,
    timeline_notes text,
    client_id character varying(255),
    partner_id integer
);


ALTER TABLE public.stg_projects OWNER TO postgres;

--
-- Name: stg_projects_allocation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stg_projects_allocation (
    allocation_id character varying(50),
    employee_id character varying(50),
    project_id character varying(50),
    role_in_project character varying(255),
    allocation_percentage integer,
    allocation_start_date date,
    allocation_end_date date,
    project_tags character varying(255),
    w1 integer,
    w2 integer,
    w3 integer,
    w4 integer,
    weekly_hours numeric(6,2),
    weekly_plan jsonb
);


ALTER TABLE public.stg_projects_allocation OWNER TO postgres;

--
-- Name: stg_skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stg_skills (
    skill_id integer,
    skill_name character varying(255)
);


ALTER TABLE public.stg_skills OWNER TO postgres;

--
-- Name: stg_team_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stg_team_members (
    id integer,
    project_id character varying(255),
    name character varying(255),
    role character varying(255),
    company character varying(255),
    company_type character varying(50),
    location character varying(150),
    allocation_percentage integer,
    allocation_start_date date,
    allocation_end_date date,
    project_tags character varying(255),
    w1 integer,
    w2 integer,
    w3 integer,
    w4 integer
);


ALTER TABLE public.stg_team_members OWNER TO postgres;

--
-- Name: stg_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stg_users (
    id integer,
    employee_id character varying(50),
    email character varying(255),
    password_hash character varying(255),
    is_active boolean,
    failed_login_attempts integer,
    last_login_at timestamp without time zone,
    password_changed_at timestamp without time zone,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.stg_users OWNER TO postgres;

--
-- Name: stg_weekly_allocations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stg_weekly_allocations (
    id integer,
    allocation_id character varying(50),
    allocation_year integer,
    week_number integer,
    allocated_hours integer,
    created_at timestamp without time zone
);


ALTER TABLE public.stg_weekly_allocations OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

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
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: weekly_allocations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.weekly_allocations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.weekly_allocations_id_seq OWNER TO postgres;

--
-- Name: weekly_allocations; Type: TABLE; Schema: public; Owner: postgres
--

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
-- Name: feedback_tickets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback_tickets ALTER COLUMN id SET DEFAULT nextval('public.feedback_tickets_id_seq'::regclass);


--
-- Data for Name: actionable_todos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.actionable_todos (id, user_id, message, type, status, created_at, updated_at) FROM stdin;
6	\N	we cango for production	info	pending	2026-03-25 23:47:02.40423	2026-03-25 23:47:02.40423
\.


--
-- Data for Name: certificates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.certificates (certificate_id, certificate_name) FROM stdin;
C11242	AWS Certified Cloud Practitioner (CLF-C02)
CI1234	HashiCorp Certified: Terraform Associate (003)
CI1235	Microsoft Certified: DevOps Engineer Expert (AZ-400)
CI1236	AWS Certified Solutions Architect - Professional
CI1237	AWS Certified Solutions Architect – Associate (SAA-C03)
CI1238	Certified Kubernetes Administrator (CKA)
CI1239	Microsoft Certified: Azure Administrator Associate (AZ-104)
CI1240	Microsoft Certified: Azure Solutions Architect Expert (AZ-305)
CI1241	Microsoft Azure Administrator Certification Transition (AZ-102)
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clients (client_id, client_name, website_url, industry, status, budget, partner_id, created_at) FROM stdin;
CL-1774437023740	masterbatter	masterbatter	Retail	Growing	10000.0	\N	2026-03-25 15:49:39.908026
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departments (department_id, department_name, created_at) FROM stdin;
\.


--
-- Data for Name: designations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.designations (designation_id, designation_name, created_at) FROM stdin;
\.


--
-- Data for Name: employee_certificates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_certificates (employee_id, certificate_id, issued_date, expiry_date) FROM stdin;
CD-MAA01-00368	CI1237	\N	\N
CD-MAA01-00363	CI1237	\N	\N
CD-MAA01-00363	C11242	\N	\N
CD-MAA01-00361	CI1239	\N	\N
CD-MAA01-00368	CI1234	\N	\N
\.


--
-- Data for Name: employee_master; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url, created_at, updated_at) FROM stdin;
19	CD-CJB01-00030	Aravindan Rajendran	9123456941	aravindanr@clouddestinations.com	Remote	WFO	2020-06-20	Engineer	SRE	FTE	7	5.7	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
14	CD-MAA01-00365	Bhavani Selvarajah	9123456931	bhavani@clouddestinations.com	Remote	WFO	2023-07-26	Senior Engineer	Cloud Solutions Engineering	FTE	5	2.6	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
7	CD-RMT-00129	DharaniKumar Appar	9123456924	dharanik@clouddestinations.com	Chennai	WFO	2018-06-08	Engineer	Cloud Solutions Engineering	FTE	8	7.8	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
10	CD-CJB01-00212	Dinesh Palanisamy	9123456926	dineshp@clouddestinations.com	Coimbatore	WFO	2018-01-24	Senior Engineer	Cloud Solutions Engineering	FTE	10	8.1	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
22	CD-MAA01-00458	Ijaaz Ahamed	9551416338	ijaaza@clouddestinations.com	Chennai	Hybrid	2025-05-11	Associate Engineer	Cloud Solutions Engineering	Full Time	8	0.8	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
4	CD-MAA01-00217	Muthu Mohamed Inzamam Bari Mahaboob Ali	9123456905	inzamamb@clouddestinations.com	Remote	WFO	2023-10-18	Senior Engineer	Cloud Solutions Engineering	FTE	5	2.4	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
8	CD-CJB01-00206	Jose Rayan	9123456928	joser@clouddestinations.com	Chennai	WFO	2021-04-25	Engineer	Cloud Solutions Engineering	FTE	4.9	4.9	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
25	CD-MAA01-00456	Kechiya Sunil	9566464770	kechiyav@clouddestinations.com	Chennai	WFO	2025-05-14	Associate Engineer	Cloud Solutions Engineering	FTE	1	0.8	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
2	CD-MAA01-00090	Mohan Muruganandham	9123456903	mohanm@clouddestinations.com	Chennai	WFO	2020-12-17	Senior Engineer	Cloud Solutions Engineering	FTE	6	5.2	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
11	CD-MAA01-00005	Mohanraj Balan	9123456927	mohanrajb@clouddestinations.com	Chennai	WFO	2017-08-18	Senior Engineer	Cloud Solutions Engineering	FTE	9	8.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
13	CD-CJB01-00190	Naresh Pandian Chinna	9123456930	nareshp@clouddestinations.com	Remote	WFO	2020-09-13	Senior Engineer	Cloud Solutions Engineering	FTE	5	5.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
15	CD-MAA01-00361	Naveen Srinivasan	9123456934	naveens@clouddestinations.com	Remote	WFO	2017-09-08	Devops Engineer	Cloud Solutions Engineering	FTE	12	8.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
1	CD-MAA01-00033	Naveen Vasanthakumar	9123456902	naveenv@clouddestinations.com	Coimbatore	WFO	2021-02-03	Cloud Architecht	Cloud Solutions Engineering	FTE	6	5.1	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
3	CD-MAA01-00136	Pavithra Ranganathan	9123456904	pavithrar@clouddestinations.com	Coimbatore	WFO	2019-10-26	Senior Engineer	Cloud Solutions Engineering	FTE	7	6.4	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
18	CD-MAA01-00079	Preethi Ramesh	9123456940	preethir@clouddestinations.com	Remote	WFO	2020-09-11	Engineer	Cloud Solutions Engineering	FTE	6	5.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
12	CD-MAA01-00204	Priyanka Mohan	9123456929	priyankam@clouddestinations.com	Coimbatore	WFO	2019-08-24	Engineer	Cloud Solutions Engineering	FTE	8	6.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
9	CD-RMT-00088	Prudhvi Raj Anupoju	9123456925	prudhvir@clouddestinations.com	Chennai	WFO	2017-06-15	Engineer	Cloud Solutions Engineering	FTE	8	8.7	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
16	CD-MAA01-00368	Rahul Mohan	9123456935	rahulm@clouddestinations.com	Chennai	WFO	2023-03-02	Devops Lead 	Cloud Solutions Engineering	FTE	4	3	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
20	CD-MAA01-00417	Ramkumar C	9123456844	ramkumar@clouddestinations.com	Chennai	WFO	2025-10-31	Engineer	Cloud Solutions Engineering	FTE	4	0.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
26	CD-CJB01-00433	Santhosh Kumar Periasamy	9566464771	santhoshp@clouddestinations.com	Chennai	WFO	2025-05-14	Senior DevOps Engineer	Cloud Solutions Engineering	FTE	5	4	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
27	CD-MAA01-00273	Sona Shri Suresh Sangeetha	9566464772	sonas@clouddestinations.com	Chennai	WFO	2021-04-25	Engineer	Cloud Solutions Engineering	FTE	2	2	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
5	CD-MAA01-00220	Syed Ali Asan	9123456906	syeda@clouddestinations.com	Coimbatore	WFO	2017-08-25	Senior Engineer	Cloud Solutions Engineering	FTE	10	8.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
6	CD-RMT-00068	Varisha P Md	9123456922	varishap@clouddestinations.com	Chennai	WFO	2020-08-09	Engineer	Cloud Solutions Engineering	FTE	7	5.6	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
17	CD-MAA01-00363	Venkatesh Gunasekaran	9123456938	venkateshg@clouddestinations.com	Remote	WFO	2017-02-22	Engineer	Cloud Solutions Engineering	FTE	9	9	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
23	CD-MAA01-00457	Vishnupriya Eakambaram	8300059342	vishnupriyae@clouddestinations.com	Chennai	WFO	2025-05-11	Associate Engineer	Cloud Solutions Engineering	FTE	1	0.8	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
24	CD-A0082	Vivin kumar	9003013557	vivink@clouddestination.com	Chennai	WFO	2025-06-22	 Associate Trainee	Cloud Solutions Engineering	INTEN	1	0.7	General (10:00 AM - 07:00 PM)	(GMT+05:30)	2026-03-13	\N	2026-03-25 15:49:39.912335	2026-03-25 15:49:39.912335
\.


--
-- Data for Name: employee_master_pro; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) FROM stdin;
CD-MAA01-00033	\N	Allocated	\N	100
CD-A0082	\N	Bench	\N	0
CD-MAA01-00361	\N	Bench	\N	0
CD-MAA01-00368	\N	Bench	\N	0
CD-MAA01-00005	\N	Allocated	\N	100
CD-RMT-00068	\N	Allocated	\N	100
CD-RMT-00088	\N	Allocated	\N	100
CD-MAA01-00090	\N	Allocated	\N	100
CD-RMT-00129	\N	Allocated	\N	100
CD-MAA01-00136	\N	Allocated	\N	100
CD-CJB01-00206	\N	Allocated	\N	100
CD-MAA01-00220	\N	Allocated	\N	100
CD-MAA01-00217	\N	Allocated	\N	100
CD-MAA01-00204	\N	Allocated	\N	100
CD-CJB01-00212	\N	Allocated	\N	100
CD-MAA01-00365	\N	Allocated	\N	100
CD-MAA01-00458	\N	Allocated	\N	100
CD-CJB01-00030	\N	Bench	\N	0
CD-MAA01-00417	\N	Bench	\N	0
CD-MAA01-00079	\N	Allocated	\N	100
CD-CJB01-00190	\N	Allocated	\N	100
CD-MAA01-00273	CD-MAA01-00217	Allocated	\N	100
CD-MAA01-00363	\N	Allocated	\N	100
CD-MAA01-00457	\N	Allocated	\N	100
CD-MAA01-00456	CD-MAA01-00005	Allocated	\N	100
CD-CJB01-00433	CD-MAA01-00005	Allocated	\N	100
\.


--
-- Data for Name: employee_skills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) FROM stdin;
CD-CJB01-00190	SKL-001	3	2
CD-MAA01-00220	SKL-001	1	2.5
CD-MAA01-00079	SKL-001	4	3.5
CD-MAA01-00363	SKL-001	1	2.5
CD-RMT-00088	SKL-001	1	3.5
CD-CJB01-00206	SKL-001	2	4.5
CD-MAA01-00033	SKL-001	2	1.5
CD-CJB01-00190	SKL-003	2	2.5
CD-MAA01-00217	SKL-003	2	2
CD-RMT-00068	SKL-003	5	4.5
CD-MAA01-00204	SKL-003	4	4.5
CD-CJB01-00190	SKL-005	1	2
CD-CJB01-00206	SKL-005	4	1.5
CD-CJB01-00190	SKL-007	3	4
CD-MAA01-00220	SKL-007	5	4.5
CD-RMT-00068	SKL-007	2	5
CD-MAA01-00005	SKL-007	2	5
CD-CJB01-00212	SKL-009	2	3
CD-MAA01-00204	SKL-009	5	5
CD-MAA01-00136	SKL-009	3	2
CD-MAA01-00033	SKL-009	1	4.5
CD-CJB01-00030	SKL-011	5	5
CD-MAA01-00363	SKL-011	4	2
CD-MAA01-00204	SKL-011	3	4.5
CD-CJB01-00190	SKL-013	5	1.5
CD-MAA01-00363	SKL-013	2	3
CD-MAA01-00361	SKL-013	1	2.5
CD-MAA01-00136	SKL-013	4	5
CD-MAA01-00090	SKL-013	5	2.5
CD-CJB01-00030	SKL-015	5	1.5
CD-MAA01-00363	SKL-015	2	1
CD-RMT-00088	SKL-015	1	3.5
CD-CJB01-00190	SKL-017	1	5
CD-MAA01-00005	SKL-019	1	3
CD-RMT-00129	SKL-019	1	3
CD-MAA01-00136	SKL-019	1	5
CD-CJB01-00212	SKL-021	5	3.5
CD-CJB01-00030	SKL-023	2	4
CD-RMT-00088	SKL-023	5	3.5
CD-RMT-00068	SKL-023	2	4.5
CD-MAA01-00005	SKL-025	1	2.5
CD-MAA01-00368	SKL-027	5	1.5
CD-RMT-00068	SKL-027	2	5
CD-MAA01-00217	SKL-029	1	3.5
CD-CJB01-00030	SKL-029	1	0.5
CD-CJB01-00190	SKL-029	3	3.5
CD-MAA01-00217	SKL-031	3	5
CD-RMT-00068	SKL-031	4	0.5
CD-MAA01-00368	SKL-031	1	3
CD-MAA01-00005	SKL-031	4	4
CD-RMT-00088	SKL-031	4	4
CD-MAA01-00363	SKL-035	2	4.5
CD-MAA01-00365	SKL-035	3	3.5
CD-MAA01-00005	SKL-035	2	2.5
CD-MAA01-00079	SKL-037	5	5
CD-MAA01-00368	SKL-037	1	5
CD-RMT-00068	SKL-039	1	1.5
CD-MAA01-00368	SKL-039	2	2.5
CD-MAA01-00217	SKL-041	5	2
CD-MAA01-00368	SKL-041	5	2
CD-MAA01-00005	SKL-041	1	4.5
CD-MAA01-00136	SKL-041	5	1.5
CD-MAA01-00220	SKL-043	3	4.5
CD-MAA01-00217	SKL-043	2	0.5
CD-MAA01-00136	SKL-043	1	2.5
CD-CJB01-00212	SKL-043	4	4
CD-RMT-00088	SKL-043	5	4
CD-MAA01-00363	SKL-045	5	5
CD-RMT-00068	SKL-045	4	5
CD-MAA01-00090	SKL-045	4	1.5
CD-MAA01-00204	SKL-049	3	4.5
CD-MAA01-00220	SKL-053	5	4.5
CD-MAA01-00090	SKL-055	2	4
CD-MAA01-00363	SKL-057	4	3.5
CD-CJB01-00206	SKL-057	5	5
CD-MAA01-00005	SKL-057	2	4
CD-MAA01-00365	SKL-059	3	3
CD-CJB01-00212	SKL-059	1	5
CD-MAA01-00204	SKL-059	5	1
CD-MAA01-00220	SKL-063	5	3
CD-MAA01-00079	SKL-063	2	1.5
CD-MAA01-00033	SKL-067	3	1
CD-MAA01-00079	SKL-071	2	3.5
CD-RMT-00068	SKL-073	4	1.5
CD-MAA01-00368	SKL-073	2	3
CD-MAA01-00204	SKL-073	5	3
CD-CJB01-00030	SKL-075	5	3
CD-MAA01-00368	SKL-075	5	3.5
CD-MAA01-00365	SKL-077	2	2.5
CD-MAA01-00220	SKL-077	5	0.5
CD-MAA01-00368	SKL-077	4	2.5
CD-MAA01-00136	SKL-077	5	1.5
CD-MAA01-00079	SKL-079	2	4
CD-MAA01-00005	SKL-079	5	1
CD-CJB01-00190	SKL-081	3	4.5
CD-MAA01-00079	SKL-081	2	5
CD-MAA01-00005	SKL-081	1	2.5
CD-CJB01-00030	SKL-085	4	1.5
CD-RMT-00068	SKL-085	2	1.5
CD-MAA01-00365	SKL-085	5	0.5
CD-MAA01-00217	SKL-095	4	5
CD-CJB01-00212	SKL-095	1	1
CD-RMT-00129	SKL-095	3	4
CD-RMT-00129	SKL-097	3	2.5
CD-MAA01-00365	SKL-099	2	5
CD-CJB01-00206	SKL-101	5	4.5
CD-MAA01-00361	SKL-103	2	0.5
CD-MAA01-00365	SKL-105	1	4
CD-CJB01-00030	SKL-105	2	5
CD-MAA01-00361	SKL-105	5	3.5
CD-RMT-00068	SKL-109	5	2
CD-RMT-00129	SKL-109	4	5
CD-MAA01-00361	SKL-109	1	1
CD-CJB01-00206	SKL-111	5	1
CD-CJB01-00030	SKL-113	5	3
CD-RMT-00088	SKL-113	5	5
CD-MAA01-00361	SKL-117	2	2.5
CD-MAA01-00079	SKL-119	5	4.5
CD-MAA01-00090	SKL-119	3	3
CD-RMT-00088	SKL-121	2	5
CD-CJB01-00206	SKL-121	4	5
CD-MAA01-00361	SKL-121	3	2.5
CD-CJB01-00212	SKL-123	2	4.5
CD-MAA01-00361	SKL-125	2	3
CD-MAA01-00220	SKL-129	1	3
CD-MAA01-00033	SKL-129	1	5
CD-RMT-00129	SKL-131	2	2.5
CD-MAA01-00005	SKL-131	1	0.5
CD-CJB01-00206	SKL-139	2	3.5
CD-CJB01-00030	SKL-141	5	4
CD-CJB01-00212	SKL-141	1	4.5
CD-MAA01-00365	SKL-141	2	4
CD-MAA01-00365	SKL-143	4	3.5
CD-MAA01-00079	SKL-143	1	4
CD-RMT-00129	SKL-143	5	1.5
CD-MAA01-00217	SKL-147	1	0.5
CD-MAA01-00204	SKL-147	5	2.5
CD-MAA01-00363	SKL-149	3	0.5
CD-CJB01-00212	SKL-149	1	2
CD-RMT-00088	SKL-149	1	0.5
CD-MAA01-00361	SKL-151	3	5
CD-MAA01-00090	SKL-151	1	2.5
CD-MAA01-00033	SKL-151	1	4.5
CD-MAA01-00361	SKL-155	4	1.5
CD-CJB01-00212	SKL-157	2	2.5
CD-MAA01-00090	SKL-157	3	3
CD-MAA01-00090	SKL-159	2	3
CD-MAA01-00204	SKL-161	3	5
CD-MAA01-00090	SKL-161	3	1
CD-MAA01-00033	SKL-161	2	3.5
CD-CJB01-00030	SKL-163	1	4
CD-MAA01-00365	SKL-163	4	2.5
CD-RMT-00129	SKL-163	3	3
CD-MAA01-00079	SKL-167	5	4
CD-MAA01-00217	SKL-175	4	0.5
CD-MAA01-00033	SKL-175	5	0.5
CD-RMT-00088	SKL-179	3	2
CD-RMT-00129	SKL-179	5	4
CD-MAA01-00368	SKL-179	2	5
CD-MAA01-00204	SKL-179	3	1.5
CD-CJB01-00206	SKL-181	2	5
CD-RMT-00129	SKL-181	3	1
\.


--
-- Data for Name: feedback_tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.feedback_tickets (id, employee_id, employee_name, employee_email, subject, description, type, priority, status, created_at) FROM stdin;
\.


--
-- Data for Name: map_partners; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.map_partners (old_id, new_id) FROM stdin;
\.


--
-- Data for Name: map_skills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.map_skills (old_id, new_id) FROM stdin;
1001	SKL-001
1001	SKL-002
1002	SKL-003
1002	SKL-004
1003	SKL-005
1003	SKL-006
1004	SKL-007
1004	SKL-008
1005	SKL-009
1005	SKL-010
1006	SKL-011
1006	SKL-012
1007	SKL-013
1007	SKL-014
1008	SKL-015
1008	SKL-016
1009	SKL-017
1009	SKL-018
1010	SKL-019
1010	SKL-020
1011	SKL-021
1011	SKL-022
1012	SKL-023
1012	SKL-024
1013	SKL-025
1013	SKL-026
1014	SKL-027
1014	SKL-028
1015	SKL-029
1015	SKL-030
1016	SKL-031
1016	SKL-032
1017	SKL-033
1017	SKL-034
1018	SKL-035
1018	SKL-036
1019	SKL-037
1019	SKL-038
1020	SKL-039
1020	SKL-040
1021	SKL-041
1021	SKL-042
1022	SKL-043
1022	SKL-044
1023	SKL-045
1023	SKL-046
1024	SKL-047
1024	SKL-048
1025	SKL-049
1025	SKL-050
1101	SKL-051
1101	SKL-052
1102	SKL-053
1102	SKL-054
1103	SKL-055
1103	SKL-056
1104	SKL-057
1104	SKL-058
1105	SKL-059
1105	SKL-060
1106	SKL-061
1106	SKL-062
1107	SKL-063
1107	SKL-064
1108	SKL-065
1108	SKL-066
1109	SKL-067
1109	SKL-068
1110	SKL-069
1110	SKL-070
1111	SKL-071
1111	SKL-072
1112	SKL-073
1112	SKL-074
1113	SKL-075
1113	SKL-076
1114	SKL-077
1114	SKL-078
1115	SKL-079
1115	SKL-080
1116	SKL-081
1116	SKL-082
1117	SKL-083
1117	SKL-084
1118	SKL-085
1118	SKL-086
1119	SKL-087
1119	SKL-088
1120	SKL-089
1120	SKL-090
1121	SKL-091
1121	SKL-092
1122	SKL-093
1122	SKL-094
1123	SKL-095
1123	SKL-096
1124	SKL-097
1124	SKL-098
1125	SKL-099
1125	SKL-100
1126	SKL-101
1126	SKL-102
1127	SKL-103
1127	SKL-104
1128	SKL-105
1128	SKL-106
1129	SKL-107
1129	SKL-108
1130	SKL-109
1130	SKL-110
1131	SKL-111
1131	SKL-112
1132	SKL-113
1132	SKL-114
1133	SKL-115
1133	SKL-116
1134	SKL-117
1134	SKL-118
1135	SKL-119
1135	SKL-120
1136	SKL-121
1136	SKL-122
1137	SKL-123
1137	SKL-124
1138	SKL-125
1138	SKL-126
1139	SKL-127
1139	SKL-128
1140	SKL-129
1140	SKL-130
1141	SKL-131
1141	SKL-132
1142	SKL-133
1142	SKL-134
1143	SKL-135
1143	SKL-136
1144	SKL-137
1144	SKL-138
1145	SKL-139
1145	SKL-140
1146	SKL-141
1146	SKL-142
1147	SKL-143
1147	SKL-144
1148	SKL-145
1148	SKL-146
1149	SKL-147
1149	SKL-148
1150	SKL-149
1150	SKL-150
1151	SKL-151
1151	SKL-152
1152	SKL-153
1152	SKL-154
1153	SKL-155
1153	SKL-156
1154	SKL-157
1154	SKL-158
1155	SKL-159
1155	SKL-160
1156	SKL-161
1156	SKL-162
1157	SKL-163
1157	SKL-164
1158	SKL-165
1158	SKL-166
1159	SKL-167
1159	SKL-168
1160	SKL-169
1160	SKL-170
1161	SKL-171
1161	SKL-172
1162	SKL-173
1162	SKL-174
1163	SKL-175
1163	SKL-176
1164	SKL-177
1164	SKL-178
1165	SKL-179
1165	SKL-180
1166	SKL-181
1166	SKL-182
1167	SKL-183
1167	SKL-184
1168	SKL-185
1168	SKL-186
\.


--
-- Data for Name: partners; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.partners (partner_id, partner_name, status, created_at) FROM stdin;
\.


--
-- Data for Name: project_commercials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_commercials (id, project_id, budget, billing_type, contract_type, revenue_model, commercial_notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: project_scopes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_scopes (id, project_id, objective, deliverables, milestones, timeline_notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: project_skills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_skills (project_id, skill_id) FROM stdin;
CP005	SKL-001
CP004	SKL-001
CP002	SKL-001
CP013	SKL-003
CP006	SKL-003
CP004	SKL-003
CP015	SKL-005
CP008	SKL-005
CP007	SKL-005
CP001	SKL-005
CP015	SKL-007
CP014	SKL-007
CP013	SKL-007
CP012	SKL-007
CP005	SKL-007
CP004	SKL-007
CP003	SKL-007
CP002	SKL-007
CDIN001	SKL-007
CP010	SKL-011
CP005	SKL-011
CP001	SKL-011
CP015	SKL-013
CP010	SKL-013
CP001	SKL-013
CP010	SKL-015
CP001	SKL-015
CP008	SKL-017
CP007	SKL-017
CP015	SKL-019
CP006	SKL-019
CP013	SKL-021
CP010	SKL-021
CP005	SKL-021
CP001	SKL-021
CDIN001	SKL-021
CP014	SKL-025
CP013	SKL-025
CP004	SKL-025
CP003	SKL-025
CDIN001	SKL-025
CP007	SKL-027
CP010	SKL-029
CP005	SKL-029
CP003	SKL-029
CP012	SKL-031
CP009	SKL-031
CP010	SKL-033
CP010	SKL-035
CP003	SKL-035
CP006	SKL-037
CP004	SKL-037
CP013	SKL-039
CP012	SKL-039
CP006	SKL-039
CP004	SKL-041
CP003	SKL-041
CP014	SKL-043
CP006	SKL-043
CP001	SKL-043
CP008	SKL-047
CP004	SKL-047
CP007	SKL-049
CP003	SKL-053
CP014	SKL-055
CP013	SKL-055
CP002	SKL-055
CP015	SKL-057
CP010	SKL-057
CP009	SKL-057
CP015	SKL-059
CP010	SKL-059
CP011	SKL-063
CP003	SKL-063
CP015	SKL-071
CP006	SKL-071
CP003	SKL-071
CP012	SKL-073
CP010	SKL-073
CP004	SKL-073
CP003	SKL-073
CP002	SKL-073
CP006	SKL-075
CP012	SKL-077
CP005	SKL-077
CP015	SKL-079
CP004	SKL-079
CP002	SKL-079
CDIN001	SKL-079
CP012	SKL-081
CP003	SKL-081
CP013	SKL-085
CP012	SKL-085
CP011	SKL-095
CP009	SKL-095
CP007	SKL-095
CP009	SKL-097
CP006	SKL-097
CP001	SKL-099
CP014	SKL-101
CP013	SKL-101
CP009	SKL-101
CP008	SKL-101
CP007	SKL-101
CP005	SKL-101
CP002	SKL-101
CP009	SKL-103
CP002	SKL-103
CDIN001	SKL-103
CP011	SKL-105
CP007	SKL-105
CDIN001	SKL-105
CP013	SKL-109
CP008	SKL-109
CP005	SKL-109
CP002	SKL-109
CP011	SKL-111
CP009	SKL-113
CP010	SKL-115
CP007	SKL-115
CP002	SKL-115
CP013	SKL-119
CP011	SKL-129
CP001	SKL-129
CP008	SKL-131
CP002	SKL-131
CP012	SKL-133
CP007	SKL-133
CP009	SKL-135
CDIN001	SKL-135
CP004	SKL-137
CP014	SKL-139
CP008	SKL-139
CP014	SKL-143
CP007	SKL-143
CP011	SKL-145
CP002	SKL-147
CP012	SKL-149
CP014	SKL-157
CP007	SKL-157
CP009	SKL-159
CP008	SKL-159
CDIN001	SKL-159
CP014	SKL-163
CP011	SKL-163
CP009	SKL-163
CP008	SKL-163
CP011	SKL-165
CP005	SKL-165
CP014	SKL-167
CP005	SKL-167
CP004	SKL-167
CP013	SKL-175
CP011	SKL-175
CP008	SKL-175
CP015	SKL-177
CP011	SKL-177
CP008	SKL-177
CP004	SKL-177
CP011	SKL-179
CDIN001	SKL-179
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.projects (project_id, project_name, project_status, billable, start_date, end_date, project_type, client_id, partner_id, created_at, updated_at) FROM stdin;
CDIN001	Project Dashboard	In Progress	Non - Billable	2026-01-13	2026-03-12	Internal	\N	\N	2026-03-25 15:49:39.923204	2026-03-25 15:49:39.923204
CP001	MHC	In-Progress	Billable	2025-12-31	2026-07-31	Client	\N	\N	2026-03-25 15:49:39.923204	2026-03-25 15:49:39.923204
CP002	Bespin POD - Costco	In-Progress	Billable	2025-12-31	2026-12-31	Client	\N	\N	2026-03-25 15:49:39.923204	2026-03-25 15:49:39.923204
CP003	Bespin - SEA	In-Progress	Billable	2025-12-31	2026-12-31	Client	\N	\N	2026-03-25 15:49:39.923204	2026-03-25 15:49:39.923204
CP004	Bespin POD - Services for SRTA Tolling System AWS Design and Build - Phase 2\n	In-Progress	Billable	2025-12-31	2026-12-31	Client	\N	\N	2026-03-25 15:49:39.923204	2026-03-25 15:49:39.923204
CP005	Josys Infrastructure Provisioning & Management\n	In-Progress	Billable	2025-12-31	2026-03-30	Client	\N	\N	2026-03-25 15:49:39.923204	2026-03-25 15:49:39.923204
CP006	Inertia	In-Progress	Billable	2025-12-31	2026-07-31	Client	\N	\N	2026-03-25 15:49:39.923204	2026-03-25 15:49:39.923204
CP007	Forge	In-Progress	Billable	2025-12-31	2026-07-31	Client	\N	\N	2026-03-25 15:49:39.923204	2026-03-25 15:49:39.923204
CP008	Bespin Non POD - MAP	In-Progress	Billable	2025-12-31	2026-04-13	Client	\N	\N	2026-03-25 15:49:39.923204	2026-03-25 15:49:39.923204
CP009	Forge- Shadow (Priyanka)	In-Progress	Non - Billable	2025-12-31	\N	Client	\N	\N	2026-03-25 15:49:39.923204	2026-03-25 15:49:39.923204
CP010	On Lok	In-Progress	Billable	2025-12-31	2026-07-31	Client	\N	\N	2026-03-25 15:49:39.923204	2026-03-25 15:49:39.923204
CP011	On Lok -NOC/SOC - Planned	In-Progress	Non - Billable	2025-12-31	2027-03-30	Client	\N	\N	2026-03-25 15:49:39.923204	2026-03-25 15:49:39.923204
CP012	EverGreen Unification- Planned	In-Progress	Non - Billable	2025-12-31	\N	Client	\N	\N	2026-03-25 15:49:39.923204	2026-03-25 15:49:39.923204
CP013	Quantiphi, Caresoft - Planned\n	In-Progress	Non - Billable	2025-12-31	\N	Client	\N	\N	2026-03-25 15:49:39.923204	2026-03-25 15:49:39.923204
CP014	Optum AIOps	In-Progress	Billable	2025-12-31	2026-05-29	Client	\N	\N	2026-03-25 15:49:39.923204	2026-03-25 15:49:39.923204
CP015	Movius - Onprem to Cloud Migration	In-Progress	Billable	2025-12-31	2026-04-16	Client	\N	\N	2026-03-25 15:49:39.923204	2026-03-25 15:49:39.923204
CP016	Onyx Devops Support	In-Progress	Billable	2025-12-31	2026-12-30	Client	\N	\N	2026-03-25 15:49:39.923204	2026-03-25 15:49:39.923204
\.


--
-- Data for Name: projects_allocation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, created_at, updated_at) FROM stdin;
AL00137	CD-MAA01-00005	CP002	Cloud Solutions Engineering	100	2025-12-31	2026-12-30	Billable	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
AL00138	CD-RMT-00068	CP003	Cloud Solutions Engineering	100	2025-12-31	2026-12-30	Billable	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
AL00139	CD-MAA01-00079	CP014	Cloud Solutions Engineering	100	2025-12-31	2026-05-30	Billable	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
AL00140	CD-RMT-00088	CP004	Cloud Solutions Engineering	50	2025-12-31	2026-12-30	Billable	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
AL00141	CD-RMT-00088	CP015	Cloud Solutions Engineering	50	2025-12-31	2026-04-16	Billable	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
AL00142	CD-MAA01-00090	CP005	Cloud Solutions Engineering	100	2025-12-31	2026-03-29	Billable	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
AL00143	CD-RMT-00129	CP006	Cloud Solutions Engineering	100	2025-12-31	2026-07-30	Billable	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
AL00144	CD-MAA01-00136	CP005	Cloud Solutions Engineering	100	2025-12-31	2026-03-29	Billable	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
AL00145	CD-CJB01-00206	CP007	Cloud Solutions Engineering	100	2025-12-31	2026-07-30	Billable	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
AL00146	CD-MAA01-00220	CP005	Cloud Solutions Engineering	100	2025-12-31	2026-03-29	Billable	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
AL00147	CD-MAA01-00217	CP005	Cloud Solutions Engineering	100	2025-12-31	2026-03-29	Billable	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
AL00148	CD-CJB01-00190	CP008	Cloud Solutions Engineering	100	2025-12-31	2026-04-12	Billable	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
AL00149	CD-MAA01-00204	CP007	Cloud Solutions Engineering	100	2025-12-31	2026-07-30	Billable	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
AL00150	CD-CJB01-00212	CP004	Cloud Solutions Engineering	100	2025-12-31	2026-12-30	Billable	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
AL00151	CD-MAA01-00273	CP009	Cloud Solutions Engineering	100	2025-12-31	\N	NonBillabel	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
AL00154	CD-MAA01-00363	CP010	Cloud Solutions Engineering	100	2025-12-31	2026-07-29	Billable	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
AL00155	CD-MAA01-00365	CDIN001	Cloud Solutions Engineering	100	2025-12-31	\N	NonBillabel	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
AL00158	CD-MAA01-00457	CDIN001	Cloud Solutions Engineering	100	2025-12-31	\N	NonBillabel	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
AL00159	CD-MAA01-00456	CP011	Cloud Solutions Engineering	100	2025-12-31	2027-03-29	NonBillabel	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
AL00160	CD-CJB01-00433	CP012	Cloud Solutions Engineering	100	2025-12-31	\N	NonBillabel	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
AL00164	CD-MAA01-00033	CP016	Cloud Solutions Engineering	25	2025-12-31	2026-12-30	Billable	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
AL00165	CD-MAA01-00033	CP015	Cloud Solutions Engineering	25	2025-12-31	2026-04-16	Billable	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
AL00166	CD-MAA01-00033	CP010	Cloud Solutions Engineering	25	2025-12-31	2026-07-30	Billable	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
0e7a77d0-101f-462a-b318-3bd87925aa0b	CD-MAA01-00458	CP011	Cloud Solutions Engineering	100	2025-12-31	2027-03-29	billable	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
AL-CP001-001	CD-MAA01-00033	CP001	Cloud Architecht	25	2025-12-31	2026-07-30	Billable	2026-03-25 15:49:39.987348	2026-03-25 15:49:39.987348
\.


--
-- Data for Name: skills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.skills (skill_id, skill_name) FROM stdin;
SKL-001	Python
SKL-003	GitHub Actions
SKL-005	Jenkins
SKL-007	Linux
SKL-009	ECS
SKL-011	EKS
SKL-013	CloudFormation
SKL-015	Route 53
SKL-017	DataDogs
SKL-019	Promethius
SKL-021	Grafana
SKL-023	React
SKL-025	Power BI
SKL-027	Postgres SQL
SKL-029	Docker
SKL-031	EC2
SKL-033	AWS KMS
SKL-035	GCP
SKL-037	Vertex AI
SKL-039	Azure
SKL-041	RAG
SKL-043	Vector DB
SKL-045	Javascript
SKL-047	Cost Explorer
SKL-049	Lambda
SKL-053	Bash Scripting
SKL-055	Python Automation
SKL-057	Git
SKL-059	GitHub
SKL-063	GitLab CI/CD
SKL-067	CI/CD Pipeline Design
SKL-071	Kubernetes
SKL-073	Helm
SKL-075	Terraform
SKL-077	Ansible
SKL-079	Infrastructure as Code
SKL-081	AWS
SKL-085	Google Cloud Platform
SKL-095	S3
SKL-097	IAM
SKL-099	VPC
SKL-101	Load Balancer
SKL-103	CloudWatch
SKL-105	Prometheus
SKL-109	ELK Stack
SKL-111	Splunk
SKL-113	Datadog
SKL-115	Observability
SKL-117	Monitoring & Alerting
SKL-119	Incident Management
SKL-121	Root Cause Analysis
SKL-123	Site Reliability Engineering
SKL-125	Service Level Objectives (SLO)
SKL-127	Service Level Indicators (SLI)
SKL-129	Service Level Agreements (SLA)
SKL-131	High Availability Architecture
SKL-133	Auto Scaling
SKL-135	Capacity Planning
SKL-137	Disaster Recovery
SKL-139	Networking Fundamentals
SKL-141	TCP/IP
SKL-143	DNS
SKL-145	HTTP/HTTPS
SKL-147	Security Best Practices
SKL-149	DevSecOps
SKL-151	Secrets Management
SKL-155	Container Security
SKL-157	Kafka
SKL-159	RabbitMQ
SKL-161	NGINX
SKL-163	API Gateway
SKL-165	System Design
SKL-167	Chaos Engineering
SKL-169	Performance Tuning
SKL-175	Tailwind CSS
SKL-177	SQL
SKL-179	InfluxDB
SKL-181	PostgreSQL
\.


--
-- Data for Name: stg_actionable_todos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stg_actionable_todos (id, message, type, status, created_at) FROM stdin;
\.


--
-- Data for Name: stg_certificates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stg_certificates (certificate_id, certificate_name) FROM stdin;
CI1234	HashiCorp Certified: Terraform Associate (003)
CI1235	Microsoft Certified: DevOps Engineer Expert (AZ-400)
CI1236	AWS Certified Solutions Architect - Professional
CI1237	AWS Certified Solutions Architect – Associate (SAA-C03)
CI1238	Certified Kubernetes Administrator (CKA)
CI1239	Microsoft Certified: Azure Administrator Associate (AZ-104)
CI1240	Microsoft Certified: Azure Solutions Architect Expert (AZ-305)
CI1241	Microsoft Azure Administrator Certification Transition (AZ-102)
C11242	AWS Certified Cloud Practitioner (CLF-C02)
CI1234	HashiCorp Certified: Terraform Associate (003)
CI1235	Microsoft Certified: DevOps Engineer Expert (AZ-400)
CI1236	AWS Certified Solutions Architect - Professional
CI1237	AWS Certified Solutions Architect – Associate (SAA-C03)
CI1238	Certified Kubernetes Administrator (CKA)
CI1239	Microsoft Certified: Azure Administrator Associate (AZ-104)
CI1240	Microsoft Certified: Azure Solutions Architect Expert (AZ-305)
CI1241	Microsoft Azure Administrator Certification Transition (AZ-102)
C11242	AWS Certified Cloud Practitioner (CLF-C02)
\.


--
-- Data for Name: stg_clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stg_clients (client_id, client_name, website_url, industry, status, budget) FROM stdin;
CL-1774437023740	masterbatter	masterbatter	Retail	Growing	10000.0
CL-1774437023740	masterbatter	masterbatter	Retail	Growing	10000.0
\.


--
-- Data for Name: stg_employee_certificates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stg_employee_certificates (certificate_id, employee_id) FROM stdin;
CI1237	CD-MAA01-00368
CI1237	CD-MAA01-00363
C11242	CD-MAA01-00363
CI1239	CD-MAA01-00361
CI1234	CD-MAA01-00368
CI1237	CD-MAA01-00368
CI1237	CD-MAA01-00363
C11242	CD-MAA01-00363
CI1239	CD-MAA01-00361
CI1234	CD-MAA01-00368
\.


--
-- Data for Name: stg_employee_master; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) FROM stdin;
1	CD-MAA01-00033	Naveen Vasanthakumar	9123456902	naveenv@clouddestinations.com	Coimbatore	WFO	2021-02-03	Cloud Architecht	Cloud Solutions Engineering	FTE	6	5.1	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
2	CD-MAA01-00090	Mohan Muruganandham	9123456903	mohanm@clouddestinations.com	Chennai	WFO	2020-12-17	Senior Engineer	Cloud Solutions Engineering	FTE	6	5.2	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
3	CD-MAA01-00136	Pavithra Ranganathan	9123456904	pavithrar@clouddestinations.com	Coimbatore	WFO	2019-10-26	Senior Engineer	Cloud Solutions Engineering	FTE	7	6.4	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
4	CD-MAA01-00217	Muthu Mohamed Inzamam Bari Mahaboob Ali	9123456905	inzamamb@clouddestinations.com	Remote	WFO	2023-10-18	Senior Engineer	Cloud Solutions Engineering	FTE	5	2.4	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
5	CD-MAA01-00220	Syed Ali Asan	9123456906	syeda@clouddestinations.com	Coimbatore	WFO	2017-08-25	Senior Engineer	Cloud Solutions Engineering	FTE	10	8.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
6	CD-RMT-00068	Varisha P Md	9123456922	varishap@clouddestinations.com	Chennai	WFO	2020-08-09	Engineer	Cloud Solutions Engineering	FTE	7	5.6	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
7	CD-RMT-00129	DharaniKumar Appar	9123456924	dharanik@clouddestinations.com	Chennai	WFO	2018-06-08	Engineer	Cloud Solutions Engineering	FTE	8	7.8	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
8	CD-CJB01-00206	Jose Rayan	9123456928	joser@clouddestinations.com	Chennai	WFO	2021-04-25	Engineer	Cloud Solutions Engineering	FTE	4.9	4.9	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
9	CD-RMT-00088	Prudhvi Raj Anupoju	9123456925	prudhvir@clouddestinations.com	Chennai	WFO	2017-06-15	Engineer	Cloud Solutions Engineering	FTE	8	8.7	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
22	CD-MAA01-00458	Ijaaz Ahamed	9551416338	ijaaza@clouddestinations.com	Chennai	Hybrid	2025-05-11	Associate Engineer	Cloud Solutions Engineering	Full Time	8	0.8	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
10	CD-CJB01-00212	Dinesh Palanisamy	9123456926	dineshp@clouddestinations.com	Coimbatore	WFO	2018-01-24	Senior Engineer	Cloud Solutions Engineering	FTE	10	8.1	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
11	CD-MAA01-00005	Mohanraj Balan	9123456927	mohanrajb@clouddestinations.com	Chennai	WFO	2017-08-18	Senior Engineer	Cloud Solutions Engineering	FTE	9	8.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
12	CD-MAA01-00204	Priyanka Mohan	9123456929	priyankam@clouddestinations.com	Coimbatore	WFO	2019-08-24	Engineer	Cloud Solutions Engineering	FTE	8	6.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
13	CD-CJB01-00190	Naresh Pandian Chinna	9123456930	nareshp@clouddestinations.com	Remote	WFO	2020-09-13	Senior Engineer	Cloud Solutions Engineering	FTE	5	5.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
14	CD-MAA01-00365	Bhavani Selvarajah	9123456931	bhavani@clouddestinations.com	Remote	WFO	2023-07-26	Senior Engineer	Cloud Solutions Engineering	FTE	5	2.6	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
15	CD-MAA01-00361	Naveen Srinivasan	9123456934	naveens@clouddestinations.com	Remote	WFO	2017-09-08	Devops Engineer	Cloud Solutions Engineering	FTE	12	8.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
23	CD-MAA01-00457	Vishnupriya Eakambaram	8300059342	vishnupriyae@clouddestinations.com	Chennai	WFO	2025-05-11	Associate Engineer	Cloud Solutions Engineering	FTE	1	0.8	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
16	CD-MAA01-00368	Rahul Mohan	9123456935	rahulm@clouddestinations.com	Chennai	WFO	2023-03-02	Devops Lead 	Cloud Solutions Engineering	FTE	4	3	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
17	CD-MAA01-00363	Venkatesh Gunasekaran	9123456938	venkateshg@clouddestinations.com	Remote	WFO	2017-02-22	Engineer	Cloud Solutions Engineering	FTE	9	9	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
18	CD-MAA01-00079	Preethi Ramesh	9123456940	preethir@clouddestinations.com	Remote	WFO	2020-09-11	Engineer	Cloud Solutions Engineering	FTE	6	5.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
19	CD-CJB01-00030	Aravindan Rajendran	9123456941	aravindanr@clouddestinations.com	Remote	WFO	2020-06-20	Engineer	SRE	FTE	7	5.7	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
20	CD-MAA01-00417	Ramkumar C	9123456844	ramkumar@clouddestinations.com	Chennai	WFO	2025-10-31	Engineer	Cloud Solutions Engineering	FTE	4	0.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
21	CD-MAA01-00459	Prasanth Subramanian	9566464770	sprasanth@clouddestinations.com	Chennai	WFO	2025-05-11	Associate Engineer	Cloud Solutions Engineering	FTE	2	0.8	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
24	CD-A0082	Vivin kumar 	9003013557	vivink@clouddestination.com 	Chennai	WFO	2025-06-22	 Associate Trainee	Cloud Solutions Engineering	INTEN	1	0.7	General (10:00 AM - 07:00 PM)	(GMT+05:30)	2026-03-13	\N
25	CD-MAA01-00456	Kechiya Sunil	9566464770	kechiyav@clouddestinations.com	Chennai	WFO	2025-05-14	Associate Engineer	Cloud Solutions Engineering	FTE	1	0.8	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
26	CD-CJB01-00433	Santhosh Kumar Periasamy	9566464771	santhoshp@clouddestinations.com	Chennai	WFO	2025-05-14	Senior DevOps Engineer	Cloud Solutions Engineering	FTE	5	4	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
27	CD-MAA01-00273	Sona Shri Suresh Sangeetha	9566464772	sonas@clouddestinations.com	Chennai	WFO	2021-04-25	Engineer	Cloud Solutions Engineering	FTE	2	2	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
28	CD-CJB01-00262	Durai Kanakashabai	9566464772	\N	Chennai	WFO	2021-04-25	Associate Lead Site Reliability Engineer	SRE	FTE	3	2	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
29	CD-MAA01-00120	Gobi	9566464772	\N	Chennai	WFO	2021-04-26	Associate Lead Site Reliability Engineer	SRE	FTE	2	1	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
30	CD-CJB01-00269	Sriram Rajasekaran	9566464772	\N	Chennai	WFO	2021-04-27	Senior Engineer	Cloud Solutions Engineering	FTE	4	3	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
31	CD-MAA01-00375	Thamizh	9566464772	\N	Chennai	WFO	2021-04-28	Senior SRE Engineer	SRE	FTE	3	2	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
32	CD-CJB01-00060	Vasanth Poovaraghavan	9566464772	\N	Chennai	WFO	2021-04-29	Site Reliability Engineer	SRE	FTE	3	2	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
1	CD-MAA01-00033	Naveen Vasanthakumar	9123456902	naveenv@clouddestinations.com	Coimbatore	WFO	2021-02-03	Cloud Architecht	Cloud Solutions Engineering	FTE	6	5.1	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
2	CD-MAA01-00090	Mohan Muruganandham	9123456903	mohanm@clouddestinations.com	Chennai	WFO	2020-12-17	Senior Engineer	Cloud Solutions Engineering	FTE	6	5.2	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
3	CD-MAA01-00136	Pavithra Ranganathan	9123456904	pavithrar@clouddestinations.com	Coimbatore	WFO	2019-10-26	Senior Engineer	Cloud Solutions Engineering	FTE	7	6.4	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
4	CD-MAA01-00217	Muthu Mohamed Inzamam Bari Mahaboob Ali	9123456905	inzamamb@clouddestinations.com	Remote	WFO	2023-10-18	Senior Engineer	Cloud Solutions Engineering	FTE	5	2.4	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
5	CD-MAA01-00220	Syed Ali Asan	9123456906	syeda@clouddestinations.com	Coimbatore	WFO	2017-08-25	Senior Engineer	Cloud Solutions Engineering	FTE	10	8.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
6	CD-RMT-00068	Varisha P Md	9123456922	varishap@clouddestinations.com	Chennai	WFO	2020-08-09	Engineer	Cloud Solutions Engineering	FTE	7	5.6	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
7	CD-RMT-00129	DharaniKumar Appar	9123456924	dharanik@clouddestinations.com	Chennai	WFO	2018-06-08	Engineer	Cloud Solutions Engineering	FTE	8	7.8	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
8	CD-CJB01-00206	Jose Rayan	9123456928	joser@clouddestinations.com	Chennai	WFO	2021-04-25	Engineer	Cloud Solutions Engineering	FTE	4.9	4.9	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
9	CD-RMT-00088	Prudhvi Raj Anupoju	9123456925	prudhvir@clouddestinations.com	Chennai	WFO	2017-06-15	Engineer	Cloud Solutions Engineering	FTE	8	8.7	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
22	CD-MAA01-00458	Ijaaz Ahamed	9551416338	ijaaza@clouddestinations.com	Chennai	Hybrid	2025-05-11	Associate Engineer	Cloud Solutions Engineering	Full Time	8	0.8	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
10	CD-CJB01-00212	Dinesh Palanisamy	9123456926	dineshp@clouddestinations.com	Coimbatore	WFO	2018-01-24	Senior Engineer	Cloud Solutions Engineering	FTE	10	8.1	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
11	CD-MAA01-00005	Mohanraj Balan	9123456927	mohanrajb@clouddestinations.com	Chennai	WFO	2017-08-18	Senior Engineer	Cloud Solutions Engineering	FTE	9	8.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
12	CD-MAA01-00204	Priyanka Mohan	9123456929	priyankam@clouddestinations.com	Coimbatore	WFO	2019-08-24	Engineer	Cloud Solutions Engineering	FTE	8	6.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
13	CD-CJB01-00190	Naresh Pandian Chinna	9123456930	nareshp@clouddestinations.com	Remote	WFO	2020-09-13	Senior Engineer	Cloud Solutions Engineering	FTE	5	5.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
14	CD-MAA01-00365	Bhavani Selvarajah	9123456931	bhavani@clouddestinations.com	Remote	WFO	2023-07-26	Senior Engineer	Cloud Solutions Engineering	FTE	5	2.6	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
15	CD-MAA01-00361	Naveen Srinivasan	9123456934	naveens@clouddestinations.com	Remote	WFO	2017-09-08	Devops Engineer	Cloud Solutions Engineering	FTE	12	8.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
23	CD-MAA01-00457	Vishnupriya Eakambaram	8300059342	vishnupriyae@clouddestinations.com	Chennai	WFO	2025-05-11	Associate Engineer	Cloud Solutions Engineering	FTE	1	0.8	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
16	CD-MAA01-00368	Rahul Mohan	9123456935	rahulm@clouddestinations.com	Chennai	WFO	2023-03-02	Devops Lead 	Cloud Solutions Engineering	FTE	4	3	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
17	CD-MAA01-00363	Venkatesh Gunasekaran	9123456938	venkateshg@clouddestinations.com	Remote	WFO	2017-02-22	Engineer	Cloud Solutions Engineering	FTE	9	9	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
18	CD-MAA01-00079	Preethi Ramesh	9123456940	preethir@clouddestinations.com	Remote	WFO	2020-09-11	Engineer	Cloud Solutions Engineering	FTE	6	5.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
19	CD-CJB01-00030	Aravindan Rajendran	9123456941	aravindanr@clouddestinations.com	Remote	WFO	2020-06-20	Engineer	SRE	FTE	7	5.7	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
20	CD-MAA01-00417	Ramkumar C	9123456844	ramkumar@clouddestinations.com	Chennai	WFO	2025-10-31	Engineer	Cloud Solutions Engineering	FTE	4	0.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
21	CD-MAA01-00459	Prasanth Subramanian	9566464770	sprasanth@clouddestinations.com	Chennai	WFO	2025-05-11	Associate Engineer	Cloud Solutions Engineering	FTE	2	0.8	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
24	CD-A0082	Vivin kumar 	9003013557	vivink@clouddestination.com 	Chennai	WFO	2025-06-22	 Associate Trainee	Cloud Solutions Engineering	INTEN	1	0.7	General (10:00 AM - 07:00 PM)	(GMT+05:30)	2026-03-13	\N
25	CD-MAA01-00456	Kechiya Sunil	9566464770	kechiyav@clouddestinations.com	Chennai	WFO	2025-05-14	Associate Engineer	Cloud Solutions Engineering	FTE	1	0.8	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
26	CD-CJB01-00433	Santhosh Kumar Periasamy	9566464771	santhoshp@clouddestinations.com	Chennai	WFO	2025-05-14	Senior DevOps Engineer	Cloud Solutions Engineering	FTE	5	4	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
27	CD-MAA01-00273	Sona Shri Suresh Sangeetha	9566464772	sonas@clouddestinations.com	Chennai	WFO	2021-04-25	Engineer	Cloud Solutions Engineering	FTE	2	2	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
28	CD-CJB01-00262	Durai Kanakashabai	9566464772	\N	Chennai	WFO	2021-04-25	Associate Lead Site Reliability Engineer	SRE	FTE	3	2	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
29	CD-MAA01-00120	Gobi	9566464772	\N	Chennai	WFO	2021-04-26	Associate Lead Site Reliability Engineer	SRE	FTE	2	1	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
30	CD-CJB01-00269	Sriram Rajasekaran	9566464772	\N	Chennai	WFO	2021-04-27	Senior Engineer	Cloud Solutions Engineering	FTE	4	3	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
31	CD-MAA01-00375	Thamizh	9566464772	\N	Chennai	WFO	2021-04-28	Senior SRE Engineer	SRE	FTE	3	2	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
32	CD-CJB01-00060	Vasanth Poovaraghavan	9566464772	\N	Chennai	WFO	2021-04-29	Site Reliability Engineer	SRE	FTE	3	2	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
\.


--
-- Data for Name: stg_employee_master_pro; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) FROM stdin;
CD-MAA01-00033	CD-CJB01-011473	Allocated	\N	100
CD-A0082	\N	Bench	\N	0
CD-MAA01-00361	CD-CJB01-011473	Bench	\N	0
CD-MAA01-00368	CD-CJB01-011470	Bench	\N	0
CD-MAA01-00005	CD-CJB01-011470	Allocated	\N	100
CD-RMT-00068	CD-CJB01-011473	Allocated	\N	100
CD-RMT-00088	CD-CJB01-011472	Allocated	\N	100
CD-MAA01-00090	CD-CJB01-011469	Allocated	\N	100
CD-RMT-00129	CD-CJB01-011470	Allocated	\N	100
CD-MAA01-00136	CD-CJB01-011470	Allocated	\N	100
CD-CJB01-00206	CD-CJB01-011470	Allocated	\N	100
CD-MAA01-00220	CD-CJB01-011473	Allocated	\N	100
CD-MAA01-00217	CD-CJB01-011473	Allocated	\N	100
CD-MAA01-00204	CD-CJB01-011470	Allocated	\N	100
CD-CJB01-00212	CD-CJB01-011469	Allocated	\N	100
CD-MAA01-00365	CD-CJB01-011473	Allocated	\N	100
CD-MAA01-00458	CD-MAA01-00255	Allocated	\N	100
CD-CJB01-00030	CD-CJB01-011472	Bench	\N	0
CD-MAA01-00417	CD-CJB01-011470	Bench	\N	0
CD-CJB01-00060	CD-MAA01-00005	Allocated	\N	100
CD-MAA01-00079	CD-CJB01-011470	Allocated	\N	100
CD-CJB01-00190	CD-CJB01-011473	Allocated	\N	100
CD-MAA01-00273	CD-MAA01-00217	Allocated	\N	100
CD-CJB01-00262	CD-MAA01-00217	Allocated	\N	100
CD-CJB01-00269	CD-CJB01-00269	Allocated	\N	100
CD-MAA01-00363	CD-CJB01-011469	Allocated	\N	100
CD-MAA01-00459	CD-CJB01-011470	Allocated	\N	100
CD-MAA01-00457	CD-CJB01-00269	Allocated	\N	100
CD-MAA01-00456	CD-MAA01-00005	Allocated	\N	100
CD-CJB01-00433	CD-MAA01-00005	Allocated	\N	100
CD-MAA01-00120	CD-MAA01-00255	Allocated	\N	100
CD-MAA01-00375	CD-MAA01-00005	Allocated	\N	100
CD-MAA01-00033	CD-CJB01-011473	Allocated	\N	100
CD-A0082	\N	Bench	\N	0
CD-MAA01-00361	CD-CJB01-011473	Bench	\N	0
CD-MAA01-00368	CD-CJB01-011470	Bench	\N	0
CD-MAA01-00005	CD-CJB01-011470	Allocated	\N	100
CD-RMT-00068	CD-CJB01-011473	Allocated	\N	100
CD-RMT-00088	CD-CJB01-011472	Allocated	\N	100
CD-MAA01-00090	CD-CJB01-011469	Allocated	\N	100
CD-RMT-00129	CD-CJB01-011470	Allocated	\N	100
CD-MAA01-00136	CD-CJB01-011470	Allocated	\N	100
CD-CJB01-00206	CD-CJB01-011470	Allocated	\N	100
CD-MAA01-00220	CD-CJB01-011473	Allocated	\N	100
CD-MAA01-00217	CD-CJB01-011473	Allocated	\N	100
CD-MAA01-00204	CD-CJB01-011470	Allocated	\N	100
CD-CJB01-00212	CD-CJB01-011469	Allocated	\N	100
CD-MAA01-00365	CD-CJB01-011473	Allocated	\N	100
CD-MAA01-00458	CD-MAA01-00255	Allocated	\N	100
CD-CJB01-00030	CD-CJB01-011472	Bench	\N	0
CD-MAA01-00417	CD-CJB01-011470	Bench	\N	0
CD-CJB01-00060	CD-MAA01-00005	Allocated	\N	100
CD-MAA01-00079	CD-CJB01-011470	Allocated	\N	100
CD-CJB01-00190	CD-CJB01-011473	Allocated	\N	100
CD-MAA01-00273	CD-MAA01-00217	Allocated	\N	100
CD-CJB01-00262	CD-MAA01-00217	Allocated	\N	100
CD-CJB01-00269	CD-CJB01-00269	Allocated	\N	100
CD-MAA01-00363	CD-CJB01-011469	Allocated	\N	100
CD-MAA01-00459	CD-CJB01-011470	Allocated	\N	100
CD-MAA01-00457	CD-CJB01-00269	Allocated	\N	100
CD-MAA01-00456	CD-MAA01-00005	Allocated	\N	100
CD-CJB01-00433	CD-MAA01-00005	Allocated	\N	100
CD-MAA01-00120	CD-MAA01-00255	Allocated	\N	100
CD-MAA01-00375	CD-MAA01-00005	Allocated	\N	100
\.


--
-- Data for Name: stg_employee_nominations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stg_employee_nominations (id, nominator_id, nominee_id, reason, nomination_date) FROM stdin;
\.


--
-- Data for Name: stg_employee_skills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stg_employee_skills (skill_id, employee_id, proficiency_level, years_of_experience) FROM stdin;
1109	CD-MAA01-00033	3	1
1168	CD-MAA01-00033	5	3
1001	CD-MAA01-00033	2	1.5
1151	CD-MAA01-00033	1	4.5
1005	CD-MAA01-00033	1	4.5
1140	CD-MAA01-00033	1	5
1163	CD-MAA01-00033	5	0.5
1110	CD-MAA01-00033	4	1.5
1156	CD-MAA01-00033	2	3.5
1152	CD-MAA01-00033	5	3.5
1023	CD-MAA01-00090	4	1.5
1151	CD-MAA01-00090	1	2.5
1135	CD-MAA01-00090	3	3
1129	CD-MAA01-00090	4	5
1156	CD-MAA01-00090	3	1
1161	CD-MAA01-00090	3	3.5
1155	CD-MAA01-00090	2	3
1103	CD-MAA01-00090	2	4
1007	CD-MAA01-00090	5	2.5
1154	CD-MAA01-00090	3	3
1021	CD-MAA01-00136	5	1.5
1005	CD-MAA01-00136	3	2
1110	CD-MAA01-00136	1	5
1114	CD-MAA01-00136	5	1.5
1119	CD-MAA01-00136	4	1
1106	CD-MAA01-00136	5	2
1007	CD-MAA01-00136	4	5
1117	CD-MAA01-00136	5	3.5
1010	CD-MAA01-00136	1	5
1140	CD-MAA01-00220	1	3
1104	CD-MAA01-00005	2	4
1115	CD-MAA01-00005	5	1
1018	CD-MAA01-00005	2	2.5
1116	CD-MAA01-00005	1	2.5
1021	CD-MAA01-00005	1	4.5
1141	CD-MAA01-00005	1	0.5
1002	CD-MAA01-00204	4	4.5
1149	CD-MAA01-00204	5	2.5
1006	CD-MAA01-00204	3	4.5
1105	CD-MAA01-00204	5	1
1165	CD-MAA01-00204	3	1.5
1112	CD-MAA01-00204	5	3
1156	CD-MAA01-00204	3	5
1005	CD-MAA01-00204	5	5
1129	CD-MAA01-00204	2	0.5
1025	CD-MAA01-00204	3	4.5
1161	CD-CJB01-00190	4	1.5
1015	CD-CJB01-00190	3	3.5
1118	CD-MAA01-00365	5	0.5
1146	CD-MAA01-00365	2	4
1125	CD-MAA01-00365	2	5
1018	CD-MAA01-00365	3	3.5
1128	CD-MAA01-00361	5	3.5
1134	CD-MAA01-00361	2	2.5
1127	CD-MAA01-00361	2	0.5
1151	CD-MAA01-00361	3	5
1136	CD-MAA01-00361	3	2.5
1153	CD-MAA01-00361	4	1.5
1168	CD-MAA01-00361	1	2.5
1138	CD-MAA01-00361	2	3
1130	CD-MAA01-00361	1	1
1007	CD-MAA01-00361	1	2.5
1165	CD-MAA01-00368	2	5
1113	CD-MAA01-00368	5	3.5
1112	CD-MAA01-00368	2	3
1112	CD-RMT-00068	4	1.5
1002	CD-RMT-00068	5	4.5
1014	CD-RMT-00068	2	5
1023	CD-RMT-00068	4	5
1118	CD-RMT-00068	2	1.5
1012	CD-RMT-00068	2	4.5
1157	CD-RMT-00129	3	3
1166	CD-RMT-00129	3	1
1147	CD-RMT-00129	5	1.5
1123	CD-RMT-00129	3	4
1124	CD-RMT-00129	3	2.5
1130	CD-RMT-00129	4	5
1165	CD-RMT-00129	5	4
1161	CD-RMT-00129	5	4.5
1141	CD-RMT-00129	2	2.5
1010	CD-RMT-00129	1	3
1001	CD-CJB01-00206	2	4.5
1129	CD-CJB01-00206	1	2.5
1136	CD-CJB01-00206	4	5
1131	CD-CJB01-00206	5	1
1104	CD-CJB01-00206	5	5
1126	CD-CJB01-00206	5	4.5
1167	CD-CJB01-00206	3	3.5
1166	CD-CJB01-00206	2	5
1145	CD-CJB01-00206	2	3.5
1003	CD-CJB01-00206	4	1.5
1132	CD-RMT-00088	5	5
1122	CD-RMT-00088	3	5
1012	CD-RMT-00088	5	3.5
1016	CD-RMT-00088	4	4
1165	CD-RMT-00088	3	2
1022	CD-RMT-00088	5	4
1136	CD-RMT-00088	2	5
1001	CD-RMT-00088	1	3.5
1150	CD-RMT-00088	1	0.5
1008	CD-RMT-00088	1	3.5
1154	CD-CJB01-00212	2	2.5
1022	CD-CJB01-00212	4	4
1005	CD-CJB01-00212	2	3
1011	CD-CJB01-00212	5	3.5
1105	CD-CJB01-00212	1	5
1150	CD-CJB01-00212	1	2
1123	CD-CJB01-00212	1	1
1137	CD-CJB01-00212	2	4.5
1162	CD-CJB01-00212	4	0.5
1146	CD-CJB01-00212	1	4.5
1010	CD-MAA01-00005	1	3
1016	CD-MAA01-00005	4	4
1004	CD-MAA01-00005	2	5
1013	CD-MAA01-00005	1	2.5
1105	CD-MAA01-00365	3	3
1157	CD-MAA01-00365	4	2.5
1020	CD-MAA01-00368	2	2.5
1014	CD-MAA01-00368	5	1.5
1021	CD-MAA01-00368	5	2
1108	CD-MAA01-00368	2	4.5
1016	CD-MAA01-00368	1	3
1019	CD-MAA01-00368	1	5
1114	CD-MAA01-00368	4	2.5
1119	CD-MAA01-00363	3	1
1018	CD-MAA01-00363	2	4.5
1001	CD-MAA01-00363	1	2.5
1007	CD-MAA01-00363	2	3
1150	CD-MAA01-00363	3	0.5
1104	CD-MAA01-00363	4	3.5
1006	CD-MAA01-00363	4	2
1023	CD-MAA01-00363	5	5
1008	CD-MAA01-00363	2	1
1122	CD-MAA01-00363	2	4
1110	CD-MAA01-00079	5	1
1159	CD-MAA01-00079	5	4
1001	CD-MAA01-00079	4	3.5
1019	CD-MAA01-00079	5	5
1115	CD-MAA01-00079	2	4
1147	CD-MAA01-00079	1	4
1135	CD-MAA01-00079	5	4.5
1111	CD-MAA01-00079	2	3.5
1116	CD-MAA01-00079	2	5
1107	CD-MAA01-00079	2	1.5
1012	CD-CJB01-00030	2	4
1015	CD-CJB01-00030	1	0.5
1113	CD-CJB01-00030	5	3
1157	CD-CJB01-00030	1	4
1128	CD-CJB01-00030	2	5
1132	CD-CJB01-00030	5	3
1006	CD-CJB01-00030	5	5
1118	CD-CJB01-00030	4	1.5
1008	CD-CJB01-00030	5	1.5
1146	CD-CJB01-00030	5	4
1130	CD-RMT-00068	5	2
1004	CD-RMT-00068	2	5
1016	CD-RMT-00068	4	0.5
1020	CD-RMT-00068	1	1.5
1022	CD-MAA01-00136	1	2.5
1149	CD-MAA01-00217	1	0.5
1015	CD-MAA01-00217	1	3.5
1123	CD-MAA01-00217	4	5
1106	CD-MAA01-00217	3	4.5
1016	CD-MAA01-00217	3	5
1163	CD-MAA01-00217	4	0.5
1022	CD-MAA01-00217	2	0.5
1122	CD-MAA01-00217	2	5
1021	CD-MAA01-00217	5	2
1002	CD-MAA01-00217	2	2
1162	CD-MAA01-00220	3	0.5
1101	CD-MAA01-00220	4	4.5
1022	CD-MAA01-00220	3	4.5
1119	CD-MAA01-00220	3	4
1107	CD-MAA01-00220	5	3
1102	CD-MAA01-00220	5	4.5
1001	CD-MAA01-00220	1	2.5
1004	CD-MAA01-00220	5	4.5
1114	CD-MAA01-00220	5	0.5
1001	CD-CJB01-00190	3	2
1002	CD-CJB01-00190	2	2.5
1004	CD-CJB01-00190	3	4
1003	CD-CJB01-00190	1	2
1007	CD-CJB01-00190	5	1.5
1009	CD-CJB01-00190	1	5
1106	CD-CJB01-00190	5	1.5
1116	CD-CJB01-00190	3	4.5
1114	CD-MAA01-00365	2	2.5
1128	CD-MAA01-00365	1	4
1147	CD-MAA01-00365	4	3.5
1121	CD-MAA01-00365	4	3
1109	CD-MAA01-00033	3	1
1168	CD-MAA01-00033	5	3
1001	CD-MAA01-00033	2	1.5
1151	CD-MAA01-00033	1	4.5
1005	CD-MAA01-00033	1	4.5
1140	CD-MAA01-00033	1	5
1163	CD-MAA01-00033	5	0.5
1110	CD-MAA01-00033	4	1.5
1156	CD-MAA01-00033	2	3.5
1152	CD-MAA01-00033	5	3.5
1023	CD-MAA01-00090	4	1.5
1151	CD-MAA01-00090	1	2.5
1135	CD-MAA01-00090	3	3
1129	CD-MAA01-00090	4	5
1156	CD-MAA01-00090	3	1
1161	CD-MAA01-00090	3	3.5
1155	CD-MAA01-00090	2	3
1103	CD-MAA01-00090	2	4
1007	CD-MAA01-00090	5	2.5
1154	CD-MAA01-00090	3	3
1021	CD-MAA01-00136	5	1.5
1005	CD-MAA01-00136	3	2
1110	CD-MAA01-00136	1	5
1114	CD-MAA01-00136	5	1.5
1119	CD-MAA01-00136	4	1
1106	CD-MAA01-00136	5	2
1007	CD-MAA01-00136	4	5
1117	CD-MAA01-00136	5	3.5
1010	CD-MAA01-00136	1	5
1140	CD-MAA01-00220	1	3
1104	CD-MAA01-00005	2	4
1115	CD-MAA01-00005	5	1
1018	CD-MAA01-00005	2	2.5
1116	CD-MAA01-00005	1	2.5
1021	CD-MAA01-00005	1	4.5
1141	CD-MAA01-00005	1	0.5
1002	CD-MAA01-00204	4	4.5
1149	CD-MAA01-00204	5	2.5
1006	CD-MAA01-00204	3	4.5
1105	CD-MAA01-00204	5	1
1165	CD-MAA01-00204	3	1.5
1112	CD-MAA01-00204	5	3
1156	CD-MAA01-00204	3	5
1005	CD-MAA01-00204	5	5
1129	CD-MAA01-00204	2	0.5
1025	CD-MAA01-00204	3	4.5
1161	CD-CJB01-00190	4	1.5
1015	CD-CJB01-00190	3	3.5
1118	CD-MAA01-00365	5	0.5
1146	CD-MAA01-00365	2	4
1125	CD-MAA01-00365	2	5
1018	CD-MAA01-00365	3	3.5
1128	CD-MAA01-00361	5	3.5
1134	CD-MAA01-00361	2	2.5
1127	CD-MAA01-00361	2	0.5
1151	CD-MAA01-00361	3	5
1136	CD-MAA01-00361	3	2.5
1153	CD-MAA01-00361	4	1.5
1168	CD-MAA01-00361	1	2.5
1138	CD-MAA01-00361	2	3
1130	CD-MAA01-00361	1	1
1007	CD-MAA01-00361	1	2.5
1165	CD-MAA01-00368	2	5
1113	CD-MAA01-00368	5	3.5
1112	CD-MAA01-00368	2	3
1112	CD-RMT-00068	4	1.5
1002	CD-RMT-00068	5	4.5
1014	CD-RMT-00068	2	5
1023	CD-RMT-00068	4	5
1118	CD-RMT-00068	2	1.5
1012	CD-RMT-00068	2	4.5
1157	CD-RMT-00129	3	3
1166	CD-RMT-00129	3	1
1147	CD-RMT-00129	5	1.5
1123	CD-RMT-00129	3	4
1124	CD-RMT-00129	3	2.5
1130	CD-RMT-00129	4	5
1165	CD-RMT-00129	5	4
1161	CD-RMT-00129	5	4.5
1141	CD-RMT-00129	2	2.5
1010	CD-RMT-00129	1	3
1001	CD-CJB01-00206	2	4.5
1129	CD-CJB01-00206	1	2.5
1136	CD-CJB01-00206	4	5
1131	CD-CJB01-00206	5	1
1104	CD-CJB01-00206	5	5
1126	CD-CJB01-00206	5	4.5
1167	CD-CJB01-00206	3	3.5
1166	CD-CJB01-00206	2	5
1145	CD-CJB01-00206	2	3.5
1003	CD-CJB01-00206	4	1.5
1132	CD-RMT-00088	5	5
1122	CD-RMT-00088	3	5
1012	CD-RMT-00088	5	3.5
1016	CD-RMT-00088	4	4
1165	CD-RMT-00088	3	2
1022	CD-RMT-00088	5	4
1136	CD-RMT-00088	2	5
1001	CD-RMT-00088	1	3.5
1150	CD-RMT-00088	1	0.5
1008	CD-RMT-00088	1	3.5
1154	CD-CJB01-00212	2	2.5
1022	CD-CJB01-00212	4	4
1005	CD-CJB01-00212	2	3
1011	CD-CJB01-00212	5	3.5
1105	CD-CJB01-00212	1	5
1150	CD-CJB01-00212	1	2
1123	CD-CJB01-00212	1	1
1137	CD-CJB01-00212	2	4.5
1162	CD-CJB01-00212	4	0.5
1146	CD-CJB01-00212	1	4.5
1010	CD-MAA01-00005	1	3
1016	CD-MAA01-00005	4	4
1004	CD-MAA01-00005	2	5
1013	CD-MAA01-00005	1	2.5
1105	CD-MAA01-00365	3	3
1157	CD-MAA01-00365	4	2.5
1020	CD-MAA01-00368	2	2.5
1014	CD-MAA01-00368	5	1.5
1021	CD-MAA01-00368	5	2
1108	CD-MAA01-00368	2	4.5
1016	CD-MAA01-00368	1	3
1019	CD-MAA01-00368	1	5
1114	CD-MAA01-00368	4	2.5
1119	CD-MAA01-00363	3	1
1018	CD-MAA01-00363	2	4.5
1001	CD-MAA01-00363	1	2.5
1007	CD-MAA01-00363	2	3
1150	CD-MAA01-00363	3	0.5
1104	CD-MAA01-00363	4	3.5
1006	CD-MAA01-00363	4	2
1023	CD-MAA01-00363	5	5
1008	CD-MAA01-00363	2	1
1122	CD-MAA01-00363	2	4
1110	CD-MAA01-00079	5	1
1159	CD-MAA01-00079	5	4
1001	CD-MAA01-00079	4	3.5
1019	CD-MAA01-00079	5	5
1115	CD-MAA01-00079	2	4
1147	CD-MAA01-00079	1	4
1135	CD-MAA01-00079	5	4.5
1111	CD-MAA01-00079	2	3.5
1116	CD-MAA01-00079	2	5
1107	CD-MAA01-00079	2	1.5
1012	CD-CJB01-00030	2	4
1015	CD-CJB01-00030	1	0.5
1113	CD-CJB01-00030	5	3
1157	CD-CJB01-00030	1	4
1128	CD-CJB01-00030	2	5
1132	CD-CJB01-00030	5	3
1006	CD-CJB01-00030	5	5
1118	CD-CJB01-00030	4	1.5
1008	CD-CJB01-00030	5	1.5
1146	CD-CJB01-00030	5	4
1130	CD-RMT-00068	5	2
1004	CD-RMT-00068	2	5
1016	CD-RMT-00068	4	0.5
1020	CD-RMT-00068	1	1.5
1022	CD-MAA01-00136	1	2.5
1149	CD-MAA01-00217	1	0.5
1015	CD-MAA01-00217	1	3.5
1123	CD-MAA01-00217	4	5
1106	CD-MAA01-00217	3	4.5
1016	CD-MAA01-00217	3	5
1163	CD-MAA01-00217	4	0.5
1022	CD-MAA01-00217	2	0.5
1122	CD-MAA01-00217	2	5
1021	CD-MAA01-00217	5	2
1002	CD-MAA01-00217	2	2
1162	CD-MAA01-00220	3	0.5
1101	CD-MAA01-00220	4	4.5
1022	CD-MAA01-00220	3	4.5
1119	CD-MAA01-00220	3	4
1107	CD-MAA01-00220	5	3
1102	CD-MAA01-00220	5	4.5
1001	CD-MAA01-00220	1	2.5
1004	CD-MAA01-00220	5	4.5
1114	CD-MAA01-00220	5	0.5
1001	CD-CJB01-00190	3	2
1002	CD-CJB01-00190	2	2.5
1004	CD-CJB01-00190	3	4
1003	CD-CJB01-00190	1	2
1007	CD-CJB01-00190	5	1.5
1009	CD-CJB01-00190	1	5
1106	CD-CJB01-00190	5	1.5
1116	CD-CJB01-00190	3	4.5
1114	CD-MAA01-00365	2	2.5
1128	CD-MAA01-00365	1	4
1147	CD-MAA01-00365	4	3.5
1121	CD-MAA01-00365	4	3
\.


--
-- Data for Name: stg_partners; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stg_partners (id, name) FROM stdin;
\.


--
-- Data for Name: stg_project_commercials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stg_project_commercials (id, project_id, budget, billing_type, contract_type, revenue_model, commercial_notes) FROM stdin;
\.


--
-- Data for Name: stg_project_scopes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stg_project_scopes (id, project_id, objective, deliverables, milestones, timeline_notes) FROM stdin;
\.


--
-- Data for Name: stg_project_skills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stg_project_skills (project_id, skill_id) FROM stdin;
CDIN001	1013
CDIN001	1161
CDIN001	1155
CDIN001	1165
CDIN001	1129
CDIN001	1143
CDIN001	1120
CDIN001	1011
CDIN001	1128
CDIN001	1004
CDIN001	1115
CDIN001	1127
CP001	1007
CP001	1125
CP001	1003
CP001	1121
CP001	1011
CP001	1167
CP001	1140
CP001	1008
CP001	1006
CP001	1168
CP001	1022
CP001	1129
CP002	1103
CP002	1112
CP002	1130
CP002	1004
CP002	1110
CP002	1141
CP002	1149
CP002	1001
CP002	1133
CP002	1115
CP002	1127
CP002	1126
CP003	1004
CP003	1013
CP003	1116
CP003	1018
CP003	1107
CP003	1119
CP003	1021
CP003	1101
CP003	1015
CP003	1111
CP003	1112
CP003	1102
CP004	1001
CP004	1019
CP004	1112
CP004	1115
CP004	1021
CP004	1164
CP004	1144
CP004	1013
CP004	1159
CP004	1024
CP004	1002
CP004	1004
CP005	1120
CP005	1129
CP005	1114
CP005	1011
CP005	1130
CP005	1015
CP005	1004
CP005	1001
CP005	1159
CP005	1006
CP005	1126
CP005	1158
CP006	1124
CP006	1106
CP006	1002
CP006	1121
CP006	1019
CP006	1113
CP006	1022
CP006	1010
CP006	1108
CP006	1020
CP006	1111
CP006	1119
CP007	1003
CP007	1123
CP007	1133
CP007	1014
CP007	1126
CP007	1154
CP007	1009
CP007	1142
CP007	1147
CP007	1122
CP007	1128
CP007	1025
CP008	1145
CP008	1126
CP008	1162
CP008	1163
CP008	1130
CP008	1141
CP008	1155
CP008	1003
CP008	1157
CP008	1164
CP008	1024
CP008	1009
CP009	1104
CP009	1016
CP009	1123
CP009	1126
CP009	1132
CP009	1155
CP009	1157
CP009	1143
CP009	1124
CP009	1127
CP009	1168
CP009	1129
CP010	1011
CP010	1112
CP010	1104
CP010	1105
CP010	1015
CP010	1008
CP010	1122
CP010	1006
CP010	1007
CP010	1017
CP010	1018
CP010	1133
CP011	1107
CP011	1128
CP011	1158
CP011	1163
CP011	1131
CP011	1157
CP011	1168
CP011	1165
CP011	1148
CP011	1140
CP011	1123
CP011	1164
CP012	1004
CP012	1016
CP012	1118
CP012	1112
CP012	1121
CP012	1114
CP012	1122
CP012	1150
CP012	1020
CP012	1117
CP012	1116
CP012	1142
CP013	1126
CP013	1011
CP013	1103
CP013	1110
CP013	1002
CP013	1004
CP013	1130
CP013	1013
CP013	1135
CP013	1020
CP013	1163
CP013	1118
CP014	1013
CP014	1145
CP014	1103
CP014	1161
CP014	1004
CP014	1168
CP014	1147
CP014	1126
CP014	1157
CP014	1022
CP014	1159
CP014	1154
CP015	1007
CP015	1003
CP015	1164
CP015	1119
CP015	1111
CP015	1010
CP015	1104
CP015	1117
CP015	1115
CP015	1105
CP015	1110
CP015	1004
CDIN001	1013
CDIN001	1161
CDIN001	1155
CDIN001	1165
CDIN001	1129
CDIN001	1143
CDIN001	1120
CDIN001	1011
CDIN001	1128
CDIN001	1004
CDIN001	1115
CDIN001	1127
CP001	1007
CP001	1125
CP001	1003
CP001	1121
CP001	1011
CP001	1167
CP001	1140
CP001	1008
CP001	1006
CP001	1168
CP001	1022
CP001	1129
CP002	1103
CP002	1112
CP002	1130
CP002	1004
CP002	1110
CP002	1141
CP002	1149
CP002	1001
CP002	1133
CP002	1115
CP002	1127
CP002	1126
CP003	1004
CP003	1013
CP003	1116
CP003	1018
CP003	1107
CP003	1119
CP003	1021
CP003	1101
CP003	1015
CP003	1111
CP003	1112
CP003	1102
CP004	1001
CP004	1019
CP004	1112
CP004	1115
CP004	1021
CP004	1164
CP004	1144
CP004	1013
CP004	1159
CP004	1024
CP004	1002
CP004	1004
CP005	1120
CP005	1129
CP005	1114
CP005	1011
CP005	1130
CP005	1015
CP005	1004
CP005	1001
CP005	1159
CP005	1006
CP005	1126
CP005	1158
CP006	1124
CP006	1106
CP006	1002
CP006	1121
CP006	1019
CP006	1113
CP006	1022
CP006	1010
CP006	1108
CP006	1020
CP006	1111
CP006	1119
CP007	1003
CP007	1123
CP007	1133
CP007	1014
CP007	1126
CP007	1154
CP007	1009
CP007	1142
CP007	1147
CP007	1122
CP007	1128
CP007	1025
CP008	1145
CP008	1126
CP008	1162
CP008	1163
CP008	1130
CP008	1141
CP008	1155
CP008	1003
CP008	1157
CP008	1164
CP008	1024
CP008	1009
CP009	1104
CP009	1016
CP009	1123
CP009	1126
CP009	1132
CP009	1155
CP009	1157
CP009	1143
CP009	1124
CP009	1127
CP009	1168
CP009	1129
CP010	1011
CP010	1112
CP010	1104
CP010	1105
CP010	1015
CP010	1008
CP010	1122
CP010	1006
CP010	1007
CP010	1017
CP010	1018
CP010	1133
CP011	1107
CP011	1128
CP011	1158
CP011	1163
CP011	1131
CP011	1157
CP011	1168
CP011	1165
CP011	1148
CP011	1140
CP011	1123
CP011	1164
CP012	1004
CP012	1016
CP012	1118
CP012	1112
CP012	1121
CP012	1114
CP012	1122
CP012	1150
CP012	1020
CP012	1117
CP012	1116
CP012	1142
CP013	1126
CP013	1011
CP013	1103
CP013	1110
CP013	1002
CP013	1004
CP013	1130
CP013	1013
CP013	1135
CP013	1020
CP013	1163
CP013	1118
CP014	1013
CP014	1145
CP014	1103
CP014	1161
CP014	1004
CP014	1168
CP014	1147
CP014	1126
CP014	1157
CP014	1022
CP014	1159
CP014	1154
CP015	1007
CP015	1003
CP015	1164
CP015	1119
CP015	1111
CP015	1010
CP015	1104
CP015	1117
CP015	1115
CP015	1105
CP015	1110
CP015	1004
\.


--
-- Data for Name: stg_projects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stg_projects (project_id, project_name, project_status, billable, start_date, end_date, project_type, client_name, budget, billing_type, contract_type, revenue_model, commercial_notes, objective, deliverables, milestones, timeline_notes, client_id, partner_id) FROM stdin;
CDIN001	Project Dashboard	In Progress	Non - Billable	2026-01-13	2026-03-12	Internal	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP010	On Lok	In-Progress	Billable	2025-12-31	2026-07-31	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP001	MHC	In-Progress	Billable	2025-12-31	2026-07-31	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP002	Bespin POD - Costco	In-Progress	Billable	2025-12-31	2026-12-31	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP003	Bespin - SEA	In-Progress	Billable	2025-12-31	2026-12-31	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP004	Bespin POD - Services for SRTA Tolling System AWS Design and Build - Phase 2\n	In-Progress	Billable	2025-12-31	2026-12-31	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP005	Josys Infrastructure Provisioning & Management\n	In-Progress	Billable	2025-12-31	2026-03-30	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP006	Inertia	In-Progress	Billable	2025-12-31	2026-07-31	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP007	Forge	In-Progress	Billable	2025-12-31	2026-07-31	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP008	Bespin Non POD - MAP	In-Progress	Billable	2025-12-31	2026-04-13	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP009	Forge- Shadow (Priyanka)	In-Progress	Non - Billable	2025-12-31	\N	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP011	On Lok -NOC/SOC - Planned	In-Progress	Non - Billable	2025-12-31	2027-03-30	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP012	EverGreen Unification- Planned	In-Progress	Non - Billable	2025-12-31	\N	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP013	Quantiphi, Caresoft - Planned\n	In-Progress	Non - Billable	2025-12-31	\N	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP014	Optum AIOps	In-Progress	Billable	2025-12-31	2026-05-29	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP015	Movius - Onprem to Cloud Migration	In-Progress	Billable	2025-12-31	2026-04-16	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP016	Onyx Devops Support	In-Progress	Billable	2025-12-31	2026-12-30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CDIN001	Project Dashboard	In Progress	Non - Billable	2026-01-13	2026-03-12	Internal	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP010	On Lok	In-Progress	Billable	2025-12-31	2026-07-31	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP001	MHC	In-Progress	Billable	2025-12-31	2026-07-31	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP002	Bespin POD - Costco	In-Progress	Billable	2025-12-31	2026-12-31	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP003	Bespin - SEA	In-Progress	Billable	2025-12-31	2026-12-31	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP004	Bespin POD - Services for SRTA Tolling System AWS Design and Build - Phase 2\n	In-Progress	Billable	2025-12-31	2026-12-31	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP005	Josys Infrastructure Provisioning & Management\n	In-Progress	Billable	2025-12-31	2026-03-30	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP006	Inertia	In-Progress	Billable	2025-12-31	2026-07-31	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP007	Forge	In-Progress	Billable	2025-12-31	2026-07-31	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP008	Bespin Non POD - MAP	In-Progress	Billable	2025-12-31	2026-04-13	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP009	Forge- Shadow (Priyanka)	In-Progress	Non - Billable	2025-12-31	\N	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP011	On Lok -NOC/SOC - Planned	In-Progress	Non - Billable	2025-12-31	2027-03-30	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP012	EverGreen Unification- Planned	In-Progress	Non - Billable	2025-12-31	\N	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP013	Quantiphi, Caresoft - Planned\n	In-Progress	Non - Billable	2025-12-31	\N	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP014	Optum AIOps	In-Progress	Billable	2025-12-31	2026-05-29	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP015	Movius - Onprem to Cloud Migration	In-Progress	Billable	2025-12-31	2026-04-16	Client	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
CP016	Onyx Devops Support	In-Progress	Billable	2025-12-31	2026-12-30	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: stg_projects_allocation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) FROM stdin;
AL00137	CD-MAA01-00005	CP002	Cloud Solutions Engineering	100	2025-12-31	2026-12-30	Billable	40	40	40	40	40.00	[40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0]
AL00138	CD-RMT-00068	CP003	Cloud Solutions Engineering	100	2025-12-31	2026-12-30	Billable	40	40	40	40	\N	\N
AL00139	CD-MAA01-00079	CP014	Cloud Solutions Engineering	100	2025-12-31	2026-05-30	Billable	40	40	40	40	\N	\N
AL00140	CD-RMT-00088	CP004	Cloud Solutions Engineering	50	2025-12-31	2026-12-30	Billable	20	20	20	20	\N	\N
AL00141	CD-RMT-00088	CP015	Cloud Solutions Engineering	50	2025-12-31	2026-04-16	Billable	20	20	20	20	\N	\N
AL00142	CD-MAA01-00090	CP005	Cloud Solutions Engineering	100	2025-12-31	2026-03-29	Billable	40	40	40	40	\N	\N
AL00143	CD-RMT-00129	CP006	Cloud Solutions Engineering	100	2025-12-31	2026-07-30	Billable	40	40	40	40	\N	\N
AL00144	CD-MAA01-00136	CP005	Cloud Solutions Engineering	100	2025-12-31	2026-03-29	Billable	40	40	40	40	\N	\N
AL00145	CD-CJB01-00206	CP007	Cloud Solutions Engineering	100	2025-12-31	2026-07-30	Billable	40	40	40	40	\N	\N
AL00146	CD-MAA01-00220	CP005	Cloud Solutions Engineering	100	2025-12-31	2026-03-29	Billable	40	40	40	40	\N	\N
AL00147	CD-MAA01-00217	CP005	Cloud Solutions Engineering	100	2025-12-31	2026-03-29	Billable	40	40	40	40	\N	\N
AL00148	CD-CJB01-00190	CP008	Cloud Solutions Engineering	100	2025-12-31	2026-04-12	Billable	40	40	40	40	\N	\N
AL00149	CD-MAA01-00204	CP007	Cloud Solutions Engineering	100	2025-12-31	2026-07-30	Billable	40	40	40	40	\N	\N
AL00150	CD-CJB01-00212	CP004	Cloud Solutions Engineering	100	2025-12-31	2026-12-30	Billable	40	40	40	40	\N	\N
AL00151	CD-MAA01-00273	CP009	Cloud Solutions Engineering	100	2025-12-31	\N	NonBillabel	40	40	40	40	\N	\N
AL00152	CD-CJB01-00262	CP010	SRE	100	2025-12-31	2026-07-29	Billable	40	40	40	40	\N	\N
AL00153	CD-CJB01-00269	CP014	Cloud Solutions Engineering	100	2025-12-31	2026-05-29	Billable	40	40	40	40	\N	\N
AL00154	CD-MAA01-00363	CP010	Cloud Solutions Engineering	100	2025-12-31	2026-07-29	Billable	40	40	40	40	\N	\N
AL00155	CD-MAA01-00365	CDIN001	Cloud Solutions Engineering	100	2025-12-31	\N	NonBillabel	40	40	40	40	\N	\N
AL00156	CD-MAA01-00459	CP011	Cloud Solutions Engineering	100	2025-12-31	2027-03-29	NonBillabel	40	40	40	40	\N	\N
AL00158	CD-MAA01-00457	CDIN001	Cloud Solutions Engineering	100	2025-12-31	\N	NonBillabel	40	40	40	40	\N	\N
AL00159	CD-MAA01-00456	CP011	Cloud Solutions Engineering	100	2025-12-31	2027-03-29	NonBillabel	40	40	40	40	\N	\N
AL00160	CD-CJB01-00433	CP012	Cloud Solutions Engineering	100	2025-12-31	\N	NonBillabel	40	40	40	40	\N	\N
AL00161	CD-MAA01-00120	CP010	Cloud Solutions Engineering	100	2025-12-31	2026-07-29	Billable	40	40	40	40	\N	\N
AL00162	CD-MAA01-00375	CP013	SRE	100	2025-12-31	\N	NonBillabel	40	40	40	40	\N	\N
AL00163	CD-CJB01-00060	CP013	SRE	100	2025-12-31	\N	NonBillabel	40	40	40	40	\N	\N
AL00164	CD-MAA01-00033	CP016	Cloud Solutions Engineering	25	2025-12-31	2026-12-30	Billable	10	10	10	10	\N	\N
AL00165	CD-MAA01-00033	CP015	Cloud Solutions Engineering	25	2025-12-31	2026-04-16	Billable	10	10	10	10	\N	\N
AL00166	CD-MAA01-00033	CP010	Cloud Solutions Engineering	25	2025-12-31	2026-07-30	Billable	10	10	10	10	\N	\N
0e7a77d0-101f-462a-b318-3bd87925aa0b	CD-MAA01-00458	CP011	Cloud Solutions Engineering	100	2025-12-31	2027-03-29	billable	0	0	0	0	\N	\N
AL-CP001-001	CD-MAA01-00033	CP001	Cloud Architecht	25	2025-12-31	2026-07-30	Billable	0	0	0	0	\N	\N
AL00137	CD-MAA01-00005	CP002	Cloud Solutions Engineering	100	2025-12-31	2026-12-30	Billable	40	40	40	40	40.00	[40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0]
AL00138	CD-RMT-00068	CP003	Cloud Solutions Engineering	100	2025-12-31	2026-12-30	Billable	40	40	40	40	\N	\N
AL00139	CD-MAA01-00079	CP014	Cloud Solutions Engineering	100	2025-12-31	2026-05-30	Billable	40	40	40	40	\N	\N
AL00140	CD-RMT-00088	CP004	Cloud Solutions Engineering	50	2025-12-31	2026-12-30	Billable	20	20	20	20	\N	\N
AL00141	CD-RMT-00088	CP015	Cloud Solutions Engineering	50	2025-12-31	2026-04-16	Billable	20	20	20	20	\N	\N
AL00142	CD-MAA01-00090	CP005	Cloud Solutions Engineering	100	2025-12-31	2026-03-29	Billable	40	40	40	40	\N	\N
AL00143	CD-RMT-00129	CP006	Cloud Solutions Engineering	100	2025-12-31	2026-07-30	Billable	40	40	40	40	\N	\N
AL00144	CD-MAA01-00136	CP005	Cloud Solutions Engineering	100	2025-12-31	2026-03-29	Billable	40	40	40	40	\N	\N
AL00145	CD-CJB01-00206	CP007	Cloud Solutions Engineering	100	2025-12-31	2026-07-30	Billable	40	40	40	40	\N	\N
AL00146	CD-MAA01-00220	CP005	Cloud Solutions Engineering	100	2025-12-31	2026-03-29	Billable	40	40	40	40	\N	\N
AL00147	CD-MAA01-00217	CP005	Cloud Solutions Engineering	100	2025-12-31	2026-03-29	Billable	40	40	40	40	\N	\N
AL00148	CD-CJB01-00190	CP008	Cloud Solutions Engineering	100	2025-12-31	2026-04-12	Billable	40	40	40	40	\N	\N
AL00149	CD-MAA01-00204	CP007	Cloud Solutions Engineering	100	2025-12-31	2026-07-30	Billable	40	40	40	40	\N	\N
AL00150	CD-CJB01-00212	CP004	Cloud Solutions Engineering	100	2025-12-31	2026-12-30	Billable	40	40	40	40	\N	\N
AL00151	CD-MAA01-00273	CP009	Cloud Solutions Engineering	100	2025-12-31	\N	NonBillabel	40	40	40	40	\N	\N
AL00152	CD-CJB01-00262	CP010	SRE	100	2025-12-31	2026-07-29	Billable	40	40	40	40	\N	\N
AL00153	CD-CJB01-00269	CP014	Cloud Solutions Engineering	100	2025-12-31	2026-05-29	Billable	40	40	40	40	\N	\N
AL00154	CD-MAA01-00363	CP010	Cloud Solutions Engineering	100	2025-12-31	2026-07-29	Billable	40	40	40	40	\N	\N
AL00155	CD-MAA01-00365	CDIN001	Cloud Solutions Engineering	100	2025-12-31	\N	NonBillabel	40	40	40	40	\N	\N
AL00156	CD-MAA01-00459	CP011	Cloud Solutions Engineering	100	2025-12-31	2027-03-29	NonBillabel	40	40	40	40	\N	\N
AL00158	CD-MAA01-00457	CDIN001	Cloud Solutions Engineering	100	2025-12-31	\N	NonBillabel	40	40	40	40	\N	\N
AL00159	CD-MAA01-00456	CP011	Cloud Solutions Engineering	100	2025-12-31	2027-03-29	NonBillabel	40	40	40	40	\N	\N
AL00160	CD-CJB01-00433	CP012	Cloud Solutions Engineering	100	2025-12-31	\N	NonBillabel	40	40	40	40	\N	\N
AL00161	CD-MAA01-00120	CP010	Cloud Solutions Engineering	100	2025-12-31	2026-07-29	Billable	40	40	40	40	\N	\N
AL00162	CD-MAA01-00375	CP013	SRE	100	2025-12-31	\N	NonBillabel	40	40	40	40	\N	\N
AL00163	CD-CJB01-00060	CP013	SRE	100	2025-12-31	\N	NonBillabel	40	40	40	40	\N	\N
AL00164	CD-MAA01-00033	CP016	Cloud Solutions Engineering	25	2025-12-31	2026-12-30	Billable	10	10	10	10	\N	\N
AL00165	CD-MAA01-00033	CP015	Cloud Solutions Engineering	25	2025-12-31	2026-04-16	Billable	10	10	10	10	\N	\N
AL00166	CD-MAA01-00033	CP010	Cloud Solutions Engineering	25	2025-12-31	2026-07-30	Billable	10	10	10	10	\N	\N
0e7a77d0-101f-462a-b318-3bd87925aa0b	CD-MAA01-00458	CP011	Cloud Solutions Engineering	100	2025-12-31	2027-03-29	billable	0	0	0	0	\N	\N
AL-CP001-001	CD-MAA01-00033	CP001	Cloud Architecht	25	2025-12-31	2026-07-30	Billable	0	0	0	0	\N	\N
\.


--
-- Data for Name: stg_skills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stg_skills (skill_id, skill_name) FROM stdin;
1001	Python
1002	GitHub Actions
1003	Jenkins
1004	Linux
1005	ECS
1006	EKS
1007	CloudFormation
1008	Route 53
1009	DataDogs
1010	Promethius
1011	Grafana
1012	React
1013	Power BI
1014	Postgres SQL
1015	Docker
1016	EC2
1017	AWS KMS
1018	GCP
1019	Vertex AI
1020	Azure
1021	RAG
1022	Vector DB
1023	Javascript
1024	Cost Explorer
1025	Lambda
1101	Linux
1102	Bash Scripting
1103	Python Automation
1104	Git
1105	GitHub
1106	GitHub Actions
1107	GitLab CI/CD
1108	Jenkins
1109	CI/CD Pipeline Design
1110	Docker
1111	Kubernetes
1112	Helm
1113	Terraform
1114	Ansible
1115	Infrastructure as Code
1116	AWS
1117	Azure
1118	Google Cloud Platform
1119	EC2
1120	EKS
1121	ECS
1122	Lambda
1123	S3
1124	IAM
1125	VPC
1126	Load Balancer
1127	CloudWatch
1128	Prometheus
1129	Grafana
1130	ELK Stack
1131	Splunk
1132	Datadog
1133	Observability
1134	Monitoring & Alerting
1135	Incident Management
1136	Root Cause Analysis
1137	Site Reliability Engineering
1138	Service Level Objectives (SLO)
1139	Service Level Indicators (SLI)
1140	Service Level Agreements (SLA)
1141	High Availability Architecture
1142	Auto Scaling
1143	Capacity Planning
1144	Disaster Recovery
1145	Networking Fundamentals
1146	TCP/IP
1147	DNS
1148	HTTP/HTTPS
1149	Security Best Practices
1150	DevSecOps
1151	Secrets Management
1152	AWS KMS
1153	Container Security
1154	Kafka
1155	RabbitMQ
1156	NGINX
1157	API Gateway
1158	System Design
1159	Chaos Engineering
1160	Performance Tuning
1161	CloudFormation
1162	React
1163	Tailwind CSS
1164	SQL
1165	InfluxDB
1166	PostgreSQL
1167	Python
1168	Power BI
1001	Python
1002	GitHub Actions
1003	Jenkins
1004	Linux
1005	ECS
1006	EKS
1007	CloudFormation
1008	Route 53
1009	DataDogs
1010	Promethius
1011	Grafana
1012	React
1013	Power BI
1014	Postgres SQL
1015	Docker
1016	EC2
1017	AWS KMS
1018	GCP
1019	Vertex AI
1020	Azure
1021	RAG
1022	Vector DB
1023	Javascript
1024	Cost Explorer
1025	Lambda
1101	Linux
1102	Bash Scripting
1103	Python Automation
1104	Git
1105	GitHub
1106	GitHub Actions
1107	GitLab CI/CD
1108	Jenkins
1109	CI/CD Pipeline Design
1110	Docker
1111	Kubernetes
1112	Helm
1113	Terraform
1114	Ansible
1115	Infrastructure as Code
1116	AWS
1117	Azure
1118	Google Cloud Platform
1119	EC2
1120	EKS
1121	ECS
1122	Lambda
1123	S3
1124	IAM
1125	VPC
1126	Load Balancer
1127	CloudWatch
1128	Prometheus
1129	Grafana
1130	ELK Stack
1131	Splunk
1132	Datadog
1133	Observability
1134	Monitoring & Alerting
1135	Incident Management
1136	Root Cause Analysis
1137	Site Reliability Engineering
1138	Service Level Objectives (SLO)
1139	Service Level Indicators (SLI)
1140	Service Level Agreements (SLA)
1141	High Availability Architecture
1142	Auto Scaling
1143	Capacity Planning
1144	Disaster Recovery
1145	Networking Fundamentals
1146	TCP/IP
1147	DNS
1148	HTTP/HTTPS
1149	Security Best Practices
1150	DevSecOps
1151	Secrets Management
1152	AWS KMS
1153	Container Security
1154	Kafka
1155	RabbitMQ
1156	NGINX
1157	API Gateway
1158	System Design
1159	Chaos Engineering
1160	Performance Tuning
1161	CloudFormation
1162	React
1163	Tailwind CSS
1164	SQL
1165	InfluxDB
1166	PostgreSQL
1167	Python
1168	Power BI
\.


--
-- Data for Name: stg_team_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stg_team_members (id, project_id, name, role, company, company_type, location, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4) FROM stdin;
\.


--
-- Data for Name: stg_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stg_users (id, employee_id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) FROM stdin;
16	\N	admin@domain.com	$2b$12$9gPclgrpPeMkZGLC1S/CLe4FuzQLu.W35g1STaNvZ04uM66iQk3W6	t	0	\N	\N	2026-03-23 06:15:01.221347	2026-03-23 06:15:01.221347
17	\N	new_user@gmail.com	$2b$12$WO6TtAvzbWIQf9YheoxUwuRqRGDJRjmCjsANnODQmzok8j/x69UsW	t	0	\N	\N	2026-03-23 07:39:41.033038	2026-03-23 07:39:41.033038
18	\N	test_user@gmail.com	$2b$12$2cejs2.q0hSr1yzbiD1NO.hxuoW9ws5X8K75ViV.rElCvqlnjOc1y	t	0	\N	\N	2026-03-23 09:49:20.282004	2026-03-23 09:49:20.282004
19	\N		$2b$12$sJ.5TqgXswLQfLA3A9EQne5x1Qpj0e0wPK0M8S8IlHw686to7UhzO	t	0	\N	\N	2026-03-23 09:56:54.644428	2026-03-23 09:56:54.644428
20	\N	admin@example.com	$2b$12$S1DzvFA4mjDiskf168ONGOz7uaVeThk.Ra2aesKIfar0.rgSGQzMG	t	0	\N	\N	2026-03-23 11:41:30.014121	2026-03-23 11:41:30.014121
21	\N	tester@example.com	$2b$12$fKEHWTdkxG5g/n3Y7uEOFu3aBYvifSlGjcDnaR7MHZRx1a28FIJTO	t	0	\N	\N	2026-03-24 05:32:19.690739	2026-03-24 05:32:19.690739
22	\N	user@user.com	$2b$12$yGx5Un6jA0y4BM.rJLZU4uC8OoUl4DATnqyX0MwxfiBzufnDYraYS	t	0	\N	\N	2026-03-24 05:37:22.262577	2026-03-24 05:37:22.262577
23	\N	test@test.com	$2b$12$OnBxNij364v2sqVTbRXdaO/A/hgPq0zqko/xv7Pv9nhm9vH65DP5u	t	0	\N	\N	2026-03-24 12:02:57.881001	2026-03-24 12:02:57.881001
24	\N	bob@example.com	$2b$12$Q/ZKpFn18fUg2jjPlq228.DrrCMTSzMwjqD6jdJmjNetxI1nv6aha	t	0	\N	\N	2026-03-24 12:04:18.786348	2026-03-24 12:04:18.786348
25	\N	string	$2b$12$KWAQ5vD2YV.2bpjIKsHjH.Xxw4jzjqX5VsvDlFipq8QZME6poCuMy	t	0	\N	\N	2026-03-24 12:10:04.091012	2026-03-24 12:10:04.091012
26	\N	user_dm5hc@test.com	$2b$12$RMwoF1RgeugVJyMm6ch76.wh4dOugIsAGZtfX73GEgR9xYVLx/P/G	t	0	\N	\N	2026-03-24 12:12:25.818657	2026-03-24 12:12:25.818657
27	\N	new_user_123@gmail.com	$2b$12$1IxtDjPDpDTQb9fZewOQGOqgnV9u3UOkkVcpIgGn6/LGbQCooRN6q	t	0	\N	\N	2026-03-25 05:37:43.624274	2026-03-25 05:37:43.624274
28	\N	myuniqueuser_2026@gmail.com	$2b$12$mp3rowkA8ZUlK2mHsdQZluUNkR1nuI/MKLa3xQHznsRjF/cnBpSpG	t	0	\N	\N	2026-03-25 05:40:09.940966	2026-03-25 05:40:09.940966
8	\N	verify@test.com	$2b$12$WuBO06A5gLhzHUxAfXQiL.KTvrB48QWAjeIxSKVafbeizEB6UWWAW	t	0	\N	\N	2026-03-12 08:21:53.938	2026-03-12 08:21:53.938
9	\N	tester@test.com	$2b$12$RXHw6xGI1xT2w6NWE5K6yeyRN.Flpnr3q/VjZA36JqvRllQ..aiGO	t	0	\N	\N	2026-03-12 08:38:56.217	2026-03-12 08:38:56.217
10	\N	eval2@test.com	$2b$12$P4HQnH0hrxEj4Rt5iKY0legtGNz4W.q5B8Y66yq7eSxLSGeoX2uNS	t	0	\N	\N	2026-03-12 08:43:01.353	2026-03-12 08:43:01.353
11	\N	testuser@test.com	$2b$12$R2Vf/sMTly8dcjOxyNCR6ea0Nm1hYQNCombnHf7.wPtVeeHhGpp1y	t	0	\N	\N	2026-03-12 09:06:07.982	2026-03-12 09:06:07.982
12	\N	admin@utiliza.ai	$2b$12$yqZ7IcUGIKccW4LabSSSL.KFfR0TlIG7uEPRRO2S9TNWgfaFv5TJ6	t	0	\N	\N	2026-03-13 07:29:49.248	2026-03-13 07:29:49.248
13	\N	agent@testing.com	$2b$12$t3do1dvYiRiOVNf7QEjeaunAziURTuMzwu3KL.vsD4ZeQaJpjrE8a	t	0	\N	\N	2026-03-17 08:56:53.773	2026-03-17 08:56:53.773
14	\N	test@cd.com	$2b$12$NMmgebw5Lq5zkObVWHYbKe4CaJldg6ANfMkuKBTpafyDX6YoRzTn.	t	0	\N	\N	2026-03-18 07:20:58.96	2026-03-18 07:20:58.96
4	\N	jetski_test_1@example.com	$2b$12$B/OnJ3rnnbfHXLsz.R.oU.xt/zyDXbIegG8xRmlezL6Tq3n.u3gOe	t	0	\N	\N	2026-02-25 11:11:26.482	2026-02-25 11:11:26.482
5	\N	jetski_new@example.com	$2b$12$Z0p2sZWb1xdN/MXZZ2FtOum.Psjm7kAm.FIRwT3NbLM5tHfq14XV2	t	0	\N	\N	2026-02-25 16:48:44.229	2026-02-25 16:48:44.229
1	\N	vishnupriyae@clouddestinations.com	$2b$12$ymqrYMsIN9ymPTPNiX5hgumilNrTR7IqN0fU.yykGWhMZjtx5zxUi	t	0	\N	\N	2026-02-23 10:28:43.617	2026-02-23 10:28:43.617
2	\N	sprasanth@clouddestinations.com	$2b$12$9.X0yTf7XW2gltcHPQZC/eM5wYc2OWmFm4vTcS551DmUhO0CvepI2	t	0	\N	\N	2026-02-23 11:12:26.617	2026-02-23 11:12:26.617
3	\N	test@example.com	$2b$12$Lajuw2NMDqMahgkNNkx0sOtN27uSMnANzuO0n8NemKCoN.5eDNOpq	t	0	\N	\N	2026-02-23 14:33:24.282	2026-02-23 14:33:24.282
15	\N	test@gmail.com	$2b$12$o4w/pl2Au27f555phLJxSeZony5e2w13NxNy842vjuBOcy5oM4Ny.	t	0	\N	\N	2026-03-23 05:56:06.661642	2026-03-23 05:56:06.661642
16	\N	admin@domain.com	$2b$12$9gPclgrpPeMkZGLC1S/CLe4FuzQLu.W35g1STaNvZ04uM66iQk3W6	t	0	\N	\N	2026-03-23 06:15:01.221347	2026-03-23 06:15:01.221347
17	\N	new_user@gmail.com	$2b$12$WO6TtAvzbWIQf9YheoxUwuRqRGDJRjmCjsANnODQmzok8j/x69UsW	t	0	\N	\N	2026-03-23 07:39:41.033038	2026-03-23 07:39:41.033038
18	\N	test_user@gmail.com	$2b$12$2cejs2.q0hSr1yzbiD1NO.hxuoW9ws5X8K75ViV.rElCvqlnjOc1y	t	0	\N	\N	2026-03-23 09:49:20.282004	2026-03-23 09:49:20.282004
19	\N		$2b$12$sJ.5TqgXswLQfLA3A9EQne5x1Qpj0e0wPK0M8S8IlHw686to7UhzO	t	0	\N	\N	2026-03-23 09:56:54.644428	2026-03-23 09:56:54.644428
20	\N	admin@example.com	$2b$12$S1DzvFA4mjDiskf168ONGOz7uaVeThk.Ra2aesKIfar0.rgSGQzMG	t	0	\N	\N	2026-03-23 11:41:30.014121	2026-03-23 11:41:30.014121
21	\N	tester@example.com	$2b$12$fKEHWTdkxG5g/n3Y7uEOFu3aBYvifSlGjcDnaR7MHZRx1a28FIJTO	t	0	\N	\N	2026-03-24 05:32:19.690739	2026-03-24 05:32:19.690739
22	\N	user@user.com	$2b$12$yGx5Un6jA0y4BM.rJLZU4uC8OoUl4DATnqyX0MwxfiBzufnDYraYS	t	0	\N	\N	2026-03-24 05:37:22.262577	2026-03-24 05:37:22.262577
23	\N	test@test.com	$2b$12$OnBxNij364v2sqVTbRXdaO/A/hgPq0zqko/xv7Pv9nhm9vH65DP5u	t	0	\N	\N	2026-03-24 12:02:57.881001	2026-03-24 12:02:57.881001
24	\N	bob@example.com	$2b$12$Q/ZKpFn18fUg2jjPlq228.DrrCMTSzMwjqD6jdJmjNetxI1nv6aha	t	0	\N	\N	2026-03-24 12:04:18.786348	2026-03-24 12:04:18.786348
25	\N	string	$2b$12$KWAQ5vD2YV.2bpjIKsHjH.Xxw4jzjqX5VsvDlFipq8QZME6poCuMy	t	0	\N	\N	2026-03-24 12:10:04.091012	2026-03-24 12:10:04.091012
26	\N	user_dm5hc@test.com	$2b$12$RMwoF1RgeugVJyMm6ch76.wh4dOugIsAGZtfX73GEgR9xYVLx/P/G	t	0	\N	\N	2026-03-24 12:12:25.818657	2026-03-24 12:12:25.818657
27	\N	new_user_123@gmail.com	$2b$12$1IxtDjPDpDTQb9fZewOQGOqgnV9u3UOkkVcpIgGn6/LGbQCooRN6q	t	0	\N	\N	2026-03-25 05:37:43.624274	2026-03-25 05:37:43.624274
28	\N	myuniqueuser_2026@gmail.com	$2b$12$mp3rowkA8ZUlK2mHsdQZluUNkR1nuI/MKLa3xQHznsRjF/cnBpSpG	t	0	\N	\N	2026-03-25 05:40:09.940966	2026-03-25 05:40:09.940966
8	\N	verify@test.com	$2b$12$WuBO06A5gLhzHUxAfXQiL.KTvrB48QWAjeIxSKVafbeizEB6UWWAW	t	0	\N	\N	2026-03-12 08:21:53.938	2026-03-12 08:21:53.938
9	\N	tester@test.com	$2b$12$RXHw6xGI1xT2w6NWE5K6yeyRN.Flpnr3q/VjZA36JqvRllQ..aiGO	t	0	\N	\N	2026-03-12 08:38:56.217	2026-03-12 08:38:56.217
10	\N	eval2@test.com	$2b$12$P4HQnH0hrxEj4Rt5iKY0legtGNz4W.q5B8Y66yq7eSxLSGeoX2uNS	t	0	\N	\N	2026-03-12 08:43:01.353	2026-03-12 08:43:01.353
11	\N	testuser@test.com	$2b$12$R2Vf/sMTly8dcjOxyNCR6ea0Nm1hYQNCombnHf7.wPtVeeHhGpp1y	t	0	\N	\N	2026-03-12 09:06:07.982	2026-03-12 09:06:07.982
12	\N	admin@utiliza.ai	$2b$12$yqZ7IcUGIKccW4LabSSSL.KFfR0TlIG7uEPRRO2S9TNWgfaFv5TJ6	t	0	\N	\N	2026-03-13 07:29:49.248	2026-03-13 07:29:49.248
13	\N	agent@testing.com	$2b$12$t3do1dvYiRiOVNf7QEjeaunAziURTuMzwu3KL.vsD4ZeQaJpjrE8a	t	0	\N	\N	2026-03-17 08:56:53.773	2026-03-17 08:56:53.773
14	\N	test@cd.com	$2b$12$NMmgebw5Lq5zkObVWHYbKe4CaJldg6ANfMkuKBTpafyDX6YoRzTn.	t	0	\N	\N	2026-03-18 07:20:58.96	2026-03-18 07:20:58.96
4	\N	jetski_test_1@example.com	$2b$12$B/OnJ3rnnbfHXLsz.R.oU.xt/zyDXbIegG8xRmlezL6Tq3n.u3gOe	t	0	\N	\N	2026-02-25 11:11:26.482	2026-02-25 11:11:26.482
5	\N	jetski_new@example.com	$2b$12$Z0p2sZWb1xdN/MXZZ2FtOum.Psjm7kAm.FIRwT3NbLM5tHfq14XV2	t	0	\N	\N	2026-02-25 16:48:44.229	2026-02-25 16:48:44.229
1	\N	vishnupriyae@clouddestinations.com	$2b$12$ymqrYMsIN9ymPTPNiX5hgumilNrTR7IqN0fU.yykGWhMZjtx5zxUi	t	0	\N	\N	2026-02-23 10:28:43.617	2026-02-23 10:28:43.617
2	\N	sprasanth@clouddestinations.com	$2b$12$9.X0yTf7XW2gltcHPQZC/eM5wYc2OWmFm4vTcS551DmUhO0CvepI2	t	0	\N	\N	2026-02-23 11:12:26.617	2026-02-23 11:12:26.617
3	\N	test@example.com	$2b$12$Lajuw2NMDqMahgkNNkx0sOtN27uSMnANzuO0n8NemKCoN.5eDNOpq	t	0	\N	\N	2026-02-23 14:33:24.282	2026-02-23 14:33:24.282
15	\N	test@gmail.com	$2b$12$o4w/pl2Au27f555phLJxSeZony5e2w13NxNy842vjuBOcy5oM4Ny.	t	0	\N	\N	2026-03-23 05:56:06.661642	2026-03-23 05:56:06.661642
\.


--
-- Data for Name: stg_weekly_allocations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stg_weekly_allocations (id, allocation_id, allocation_year, week_number, allocated_hours, created_at) FROM stdin;
1	AL-CP001-001	2026	10	10	\N
2	AL-CP001-001	2026	11	10	\N
3	AL-CP001-001	2026	12	10	\N
4	AL-CP001-001	2026	13	10	\N
1	AL-CP001-001	2026	10	10	\N
2	AL-CP001-001	2026	11	10	\N
3	AL-CP001-001	2026	12	10	\N
4	AL-CP001-001	2026	13	10	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, employee_id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, department_id, designation_id, created_at, updated_at) FROM stdin;
29	\N	s.prasanth2907@gmail.com	$2b$12$ibD2U3TexTClmvpl1qUxH.umKlwCxeAZUsB02XEr2FrtOs2Ywyb.G	t	0	\N	\N	\N	\N	2026-03-25 16:14:10.313962	2026-03-25 16:14:10.313962
\.


--
-- Data for Name: weekly_allocations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.weekly_allocations (id, allocation_id, allocation_year, week_number, allocated_hours, week_start_date, week_end_date, created_at) FROM stdin;
1	AL-CP001-001	2026	10	10	2026-03-02	2026-03-08	\N
2	AL-CP001-001	2026	11	10	2026-03-09	2026-03-15	\N
3	AL-CP001-001	2026	12	10	2026-03-16	2026-03-22	\N
4	AL-CP001-001	2026	13	10	2026-03-23	2026-03-29	\N
\.


--
-- Name: actionable_todos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.actionable_todos_id_seq', 38, true);


--
-- Name: alloc_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.alloc_id_seq', 1, false);


--
-- Name: cd_project_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cd_project_seq', 1, false);


--
-- Name: cert_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cert_id_seq', 1, false);


--
-- Name: client_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.client_id_seq', 1, false);


--
-- Name: cp_project_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cp_project_seq', 1, false);


--
-- Name: department_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.department_id_seq', 1, false);


--
-- Name: designation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.designation_id_seq', 1, false);


--
-- Name: feedback_tickets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.feedback_tickets_id_seq', 1, false);


--
-- Name: partner_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.partner_id_seq', 1, false);


--
-- Name: project_commercials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.project_commercials_id_seq', 1, false);


--
-- Name: project_scopes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.project_scopes_id_seq', 1, false);


--
-- Name: skill_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.skill_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 29, true);


--
-- Name: weekly_allocations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.weekly_allocations_id_seq', 4, true);


--
-- Name: actionable_todos actionable_todos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actionable_todos
    ADD CONSTRAINT actionable_todos_pkey PRIMARY KEY (id);


--
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (certificate_id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (client_id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (department_id);


--
-- Name: designations designations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.designations
    ADD CONSTRAINT designations_pkey PRIMARY KEY (designation_id);


--
-- Name: employee_certificates employee_certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_certificates
    ADD CONSTRAINT employee_certificates_pkey PRIMARY KEY (employee_id, certificate_id);


--
-- Name: employee_master employee_master_email_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_master
    ADD CONSTRAINT employee_master_email_id_key UNIQUE (email_id);


--
-- Name: employee_master employee_master_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_master
    ADD CONSTRAINT employee_master_pkey PRIMARY KEY (employee_id);


--
-- Name: employee_master_pro employee_master_pro_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_master_pro
    ADD CONSTRAINT employee_master_pro_pkey PRIMARY KEY (employee_id);


--
-- Name: employee_skills employee_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_skills
    ADD CONSTRAINT employee_skills_pkey PRIMARY KEY (employee_id, skill_id);


--
-- Name: feedback_tickets feedback_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feedback_tickets
    ADD CONSTRAINT feedback_tickets_pkey PRIMARY KEY (id);


--
-- Name: partners partners_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_pkey PRIMARY KEY (partner_id);


--
-- Name: project_commercials project_commercials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_commercials
    ADD CONSTRAINT project_commercials_pkey PRIMARY KEY (id);


--
-- Name: project_commercials project_commercials_project_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_commercials
    ADD CONSTRAINT project_commercials_project_id_key UNIQUE (project_id);


--
-- Name: project_scopes project_scopes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_scopes
    ADD CONSTRAINT project_scopes_pkey PRIMARY KEY (id);


--
-- Name: project_scopes project_scopes_project_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_scopes
    ADD CONSTRAINT project_scopes_project_id_key UNIQUE (project_id);


--
-- Name: project_skills project_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_skills
    ADD CONSTRAINT project_skills_pkey PRIMARY KEY (project_id, skill_id);


--
-- Name: projects_allocation projects_allocation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects_allocation
    ADD CONSTRAINT projects_allocation_pkey PRIMARY KEY (allocation_id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (project_id);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (skill_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_employee_id_key UNIQUE (employee_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: weekly_allocations weekly_allocations_allocation_id_allocation_year_week_numbe_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_allocations
    ADD CONSTRAINT weekly_allocations_allocation_id_allocation_year_week_numbe_key UNIQUE (allocation_id, allocation_year, week_number);


--
-- Name: weekly_allocations weekly_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_allocations
    ADD CONSTRAINT weekly_allocations_pkey PRIMARY KEY (id);


--
-- Name: idx_alloc_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_alloc_dates ON public.projects_allocation USING btree (allocation_start_date, allocation_end_date);


--
-- Name: idx_alloc_employee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_alloc_employee ON public.projects_allocation USING btree (employee_id);


--
-- Name: idx_alloc_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_alloc_project ON public.projects_allocation USING btree (project_id);


--
-- Name: idx_clients_partner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_partner ON public.clients USING btree (partner_id);


--
-- Name: idx_clients_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_status ON public.clients USING btree (status);


--
-- Name: idx_commercials_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_commercials_project ON public.project_commercials USING btree (project_id);


--
-- Name: idx_departments_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_departments_name ON public.departments USING btree (department_name);


--
-- Name: idx_designations_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_designations_name ON public.designations USING btree (designation_name);


--
-- Name: idx_emp_cert_cert; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emp_cert_cert ON public.employee_certificates USING btree (certificate_id);


--
-- Name: idx_emp_pro_manager; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emp_pro_manager ON public.employee_master_pro USING btree (reporting_manager_id);


--
-- Name: idx_emp_pro_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emp_pro_status ON public.employee_master_pro USING btree (employee_status);


--
-- Name: idx_emp_skills_skill; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_emp_skills_skill ON public.employee_skills USING btree (skill_id);


--
-- Name: idx_employee_department; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employee_department ON public.employee_master USING btree (department);


--
-- Name: idx_employee_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employee_email ON public.employee_master USING btree (email_id);


--
-- Name: idx_employee_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employee_type ON public.employee_master USING btree (employee_type);


--
-- Name: idx_feedback_tickets_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_feedback_tickets_created_at ON public.feedback_tickets USING btree (created_at DESC);


--
-- Name: idx_feedback_tickets_employee_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_feedback_tickets_employee_id ON public.feedback_tickets USING btree (employee_id);


--
-- Name: idx_proj_skills_skill; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_proj_skills_skill ON public.project_skills USING btree (skill_id);


--
-- Name: idx_projects_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_client ON public.projects USING btree (client_id);


--
-- Name: idx_projects_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_dates ON public.projects USING btree (start_date, end_date);


--
-- Name: idx_projects_partner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_partner ON public.projects USING btree (partner_id);


--
-- Name: idx_projects_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_status ON public.projects USING btree (project_status);


--
-- Name: idx_projects_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_type ON public.projects USING btree (project_type);


--
-- Name: idx_scopes_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scopes_project ON public.project_scopes USING btree (project_id);


--
-- Name: idx_todos_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_todos_status ON public.actionable_todos USING btree (status);


--
-- Name: idx_todos_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_todos_user ON public.actionable_todos USING btree (user_id);


--
-- Name: idx_users_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_active ON public.users USING btree (is_active);


--
-- Name: idx_users_department_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_department_id ON public.users USING btree (department_id);


--
-- Name: idx_users_designation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_designation_id ON public.users USING btree (designation_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_employee_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_employee_id ON public.users USING btree (employee_id);


--
-- Name: idx_weekly_date_range; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_weekly_date_range ON public.weekly_allocations USING btree (week_start_date, week_end_date);


--
-- Name: idx_weekly_end_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_weekly_end_date ON public.weekly_allocations USING btree (week_end_date);


--
-- Name: idx_weekly_start_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_weekly_start_date ON public.weekly_allocations USING btree (week_start_date);


--
-- Name: idx_weekly_year_week; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_weekly_year_week ON public.weekly_allocations USING btree (allocation_year, week_number);


--
-- Name: uidx_allocation_employee_project; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uidx_allocation_employee_project ON public.projects_allocation USING btree (employee_id, project_id);


--
-- Name: uidx_certificate_name_ci; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uidx_certificate_name_ci ON public.certificates USING btree (lower(TRIM(BOTH FROM certificate_name)));


--
-- Name: uidx_client_name_partner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uidx_client_name_partner ON public.clients USING btree (lower(TRIM(BOTH FROM client_name)), partner_id);


--
-- Name: uidx_client_website; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uidx_client_website ON public.clients USING btree (lower(TRIM(BOTH FROM website_url))) WHERE (website_url IS NOT NULL);


--
-- Name: uidx_department_name_ci; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uidx_department_name_ci ON public.departments USING btree (lower(TRIM(BOTH FROM department_name)));


--
-- Name: uidx_designation_name_ci; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uidx_designation_name_ci ON public.designations USING btree (lower(TRIM(BOTH FROM designation_name)));


--
-- Name: uidx_employee_email_ci; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uidx_employee_email_ci ON public.employee_master USING btree (lower(TRIM(BOTH FROM email_id)));


--
-- Name: uidx_employee_name_doj; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uidx_employee_name_doj ON public.employee_master USING btree (lower(TRIM(BOTH FROM employee_name)), date_of_joining);


--
-- Name: uidx_employee_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uidx_employee_phone ON public.employee_master USING btree (phone_number) WHERE (phone_number IS NOT NULL);


--
-- Name: uidx_employee_si_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uidx_employee_si_number ON public.employee_master USING btree (si_number) WHERE (si_number IS NOT NULL);


--
-- Name: uidx_internal_project_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uidx_internal_project_name ON public.projects USING btree (lower(TRIM(BOTH FROM project_name))) WHERE (client_id IS NULL);


--
-- Name: uidx_partner_name_ci; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uidx_partner_name_ci ON public.partners USING btree (lower(TRIM(BOTH FROM partner_name)));


--
-- Name: uidx_project_name_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uidx_project_name_client ON public.projects USING btree (lower(TRIM(BOTH FROM project_name)), client_id) WHERE (client_id IS NOT NULL);


--
-- Name: uidx_skill_name_ci; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uidx_skill_name_ci ON public.skills USING btree (lower(TRIM(BOTH FROM skill_name)));


--
-- Name: uidx_todos_user_message_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uidx_todos_user_message_status ON public.actionable_todos USING btree (user_id, lower(TRIM(BOTH FROM message)), status) WHERE ((status)::text = 'pending'::text);


--
-- Name: uidx_users_email_ci; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uidx_users_email_ci ON public.users USING btree (lower(TRIM(BOTH FROM email)));


--
-- Name: projects trg_generate_project_id; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_generate_project_id BEFORE INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.fn_generate_project_id();


--
-- Name: certificates trg_normalize_certificates; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_normalize_certificates BEFORE INSERT OR UPDATE ON public.certificates FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_certificates();


--
-- Name: clients trg_normalize_clients; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_normalize_clients BEFORE INSERT OR UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_clients();


--
-- Name: departments trg_normalize_departments; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_normalize_departments BEFORE INSERT OR UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_departments();


--
-- Name: designations trg_normalize_designations; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_normalize_designations BEFORE INSERT OR UPDATE ON public.designations FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_designations();


--
-- Name: employee_master trg_normalize_employee; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_normalize_employee BEFORE INSERT OR UPDATE ON public.employee_master FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_employee();


--
-- Name: partners trg_normalize_partners; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_normalize_partners BEFORE INSERT OR UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_partners();


--
-- Name: projects trg_normalize_projects; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_normalize_projects BEFORE INSERT OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_projects();


--
-- Name: skills trg_normalize_skills; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_normalize_skills BEFORE INSERT OR UPDATE ON public.skills FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_skills();


--
-- Name: users trg_normalize_users; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_normalize_users BEFORE INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_users();


--
-- Name: actionable_todos trg_updated_at_actionable_todos; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_updated_at_actionable_todos BEFORE UPDATE ON public.actionable_todos FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: employee_master trg_updated_at_employee_master; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_updated_at_employee_master BEFORE UPDATE ON public.employee_master FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: project_commercials trg_updated_at_project_commercials; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_updated_at_project_commercials BEFORE UPDATE ON public.project_commercials FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: project_scopes trg_updated_at_project_scopes; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_updated_at_project_scopes BEFORE UPDATE ON public.project_scopes FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: projects trg_updated_at_projects; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_updated_at_projects BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: projects_allocation trg_updated_at_projects_allocation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_updated_at_projects_allocation BEFORE UPDATE ON public.projects_allocation FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: users trg_updated_at_users; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_updated_at_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: weekly_allocations trg_validate_iso_week; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_validate_iso_week BEFORE INSERT OR UPDATE ON public.weekly_allocations FOR EACH ROW EXECUTE FUNCTION public.fn_validate_iso_week();


--
-- Name: actionable_todos actionable_todos_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actionable_todos
    ADD CONSTRAINT actionable_todos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: clients clients_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(partner_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employee_certificates employee_certificates_certificate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_certificates
    ADD CONSTRAINT employee_certificates_certificate_id_fkey FOREIGN KEY (certificate_id) REFERENCES public.certificates(certificate_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employee_certificates employee_certificates_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_certificates
    ADD CONSTRAINT employee_certificates_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee_master(employee_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employee_master_pro employee_master_pro_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_master_pro
    ADD CONSTRAINT employee_master_pro_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee_master(employee_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employee_master_pro employee_master_pro_reporting_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_master_pro
    ADD CONSTRAINT employee_master_pro_reporting_manager_id_fkey FOREIGN KEY (reporting_manager_id) REFERENCES public.employee_master(employee_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employee_skills employee_skills_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_skills
    ADD CONSTRAINT employee_skills_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee_master(employee_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employee_skills employee_skills_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_skills
    ADD CONSTRAINT employee_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(skill_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_commercials project_commercials_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_commercials
    ADD CONSTRAINT project_commercials_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_scopes project_scopes_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_scopes
    ADD CONSTRAINT project_scopes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_skills project_skills_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_skills
    ADD CONSTRAINT project_skills_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_skills project_skills_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_skills
    ADD CONSTRAINT project_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(skill_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: projects_allocation projects_allocation_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects_allocation
    ADD CONSTRAINT projects_allocation_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee_master(employee_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: projects_allocation projects_allocation_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects_allocation
    ADD CONSTRAINT projects_allocation_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: projects projects_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(client_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: projects projects_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(partner_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(department_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_designation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_designation_id_fkey FOREIGN KEY (designation_id) REFERENCES public.designations(designation_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee_master(employee_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: weekly_allocations weekly_allocations_allocation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_allocations
    ADD CONSTRAINT weekly_allocations_allocation_id_fkey FOREIGN KEY (allocation_id) REFERENCES public.projects_allocation(allocation_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Migration: Add location column to projects_allocation for per-member location storage
--

ALTER TABLE public.projects_allocation
    ADD COLUMN IF NOT EXISTS location character varying(100) DEFAULT 'Remote';

-- Backfill existing rows from employee_master.location
UPDATE public.projects_allocation pa
SET location = em.location
FROM public.employee_master em
WHERE pa.employee_id = em.employee_id
  AND (pa.location IS NULL OR pa.location = 'Remote');

--
-- PostgreSQL database dump complete
--

\unrestrict fxVYmwTKGp0QFqq6ftEgEgz2ZeSg2ydCffOAK9TmCb5Z7FIf4B0sG8agsLuhoCc

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    