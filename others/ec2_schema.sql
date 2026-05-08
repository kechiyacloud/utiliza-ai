--
-- PostgreSQL database dump
--

\restrict pK91FdEfjTMOyuQEgmA4JOyeRefstonfxgBTXTLIEnUG2YzhNtnAn2miEKoFU2a

-- Dumped from database version 16.13 (Debian 16.13-1.pgdg13+1)
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
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: sync_employee_allocations(); Type: FUNCTION; Schema: public; Owner: admin
--

CREATE FUNCTION public.sync_employee_allocations() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            DECLARE
                target_emp_id VARCHAR;
            BEGIN
                -- Determine the employee_id based on the operation
                IF TG_OP = 'DELETE' THEN
                    target_emp_id := OLD.employee_id;
                ELSE
                    target_emp_id := NEW.employee_id;
                END IF;

                -- Update the employee_allocations in employee_master_pro
                -- We only sum active allocations (end_date IS NULL OR >= CURRENT_DATE)
                UPDATE employee_master_pro
                SET employee_allocations = (
                    SELECT COALESCE(SUM(allocation_percentage), 0)
                    FROM projects_allocation
                    WHERE employee_id = target_emp_id
                    AND (allocation_end_date IS NULL OR allocation_end_date >= CURRENT_DATE)
                )
                WHERE employee_id = target_emp_id;

                RETURN NULL; -- Return NULL for AFTER triggers
            END;
            $$;


ALTER FUNCTION public.sync_employee_allocations() OWNER TO admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: actionable_todos; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.actionable_todos (
    id integer NOT NULL,
    message text NOT NULL,
    type character varying(50) DEFAULT 'info'::character varying,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.actionable_todos OWNER TO admin;

--
-- Name: actionable_todos_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.actionable_todos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.actionable_todos_id_seq OWNER TO admin;

--
-- Name: actionable_todos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.actionable_todos_id_seq OWNED BY public.actionable_todos.id;


--
-- Name: certificates; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.certificates (
    certificate_id character varying(50) NOT NULL,
    certificate_name character varying(255)
);


ALTER TABLE public.certificates OWNER TO admin;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.clients (
    client_id character varying(255) NOT NULL,
    client_name character varying(255),
    website_url character varying(255),
    industry character varying(255),
    status character varying(255),
    budget numeric
);


ALTER TABLE public.clients OWNER TO admin;

--
-- Name: employee_certificates; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.employee_certificates (
    certificate_id character varying(50) NOT NULL,
    employee_id character varying(50) NOT NULL
);


ALTER TABLE public.employee_certificates OWNER TO admin;

--
-- Name: employee_master; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.employee_master (
    si_number integer,
    employee_id character varying(50) NOT NULL,
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


ALTER TABLE public.employee_master OWNER TO admin;

--
-- Name: employee_master_pro; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.employee_master_pro (
    employee_id character varying(50) NOT NULL,
    reporting_manager_id character varying(50),
    employee_status character varying(50),
    upcoming_leaves character varying(255),
    employee_allocations integer
);


ALTER TABLE public.employee_master_pro OWNER TO admin;

--
-- Name: employee_nominations; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.employee_nominations (
    id integer NOT NULL,
    employee_id character varying(50) NOT NULL,
    nominator_role character varying(50) NOT NULL,
    feedback_text text NOT NULL,
    month character varying(10) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.employee_nominations OWNER TO admin;

--
-- Name: employee_nominations_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.employee_nominations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.employee_nominations_id_seq OWNER TO admin;

--
-- Name: employee_nominations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.employee_nominations_id_seq OWNED BY public.employee_nominations.id;


--
-- Name: employee_skills; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.employee_skills (
    employee_id character varying(50) NOT NULL,
    skill_id integer NOT NULL,
    proficiency_level integer,
    years_of_experience numeric
);


ALTER TABLE public.employee_skills OWNER TO admin;

--
-- Name: partners; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.partners (
    id integer NOT NULL,
    name character varying(255) NOT NULL
);


ALTER TABLE public.partners OWNER TO admin;

--
-- Name: partners_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.partners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.partners_id_seq OWNER TO admin;

--
-- Name: partners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.partners_id_seq OWNED BY public.partners.id;


--
-- Name: project_commercials; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.project_commercials (
    id integer NOT NULL,
    project_id character varying(50),
    project_name character varying(255),
    client_id character varying(50),
    budget numeric(15,2) DEFAULT 0.00,
    billing_type character varying(100),
    contract_type character varying(100),
    revenue_model character varying(100),
    commercial_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.project_commercials OWNER TO admin;

--
-- Name: project_commercials_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.project_commercials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_commercials_id_seq OWNER TO admin;

--
-- Name: project_commercials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.project_commercials_id_seq OWNED BY public.project_commercials.id;


--
-- Name: project_scopes; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.project_scopes (
    id integer NOT NULL,
    project_id character varying(50),
    objective text,
    deliverables text,
    milestones text,
    timeline_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.project_scopes OWNER TO admin;

--
-- Name: project_scopes_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.project_scopes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_scopes_id_seq OWNER TO admin;

--
-- Name: project_scopes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.project_scopes_id_seq OWNED BY public.project_scopes.id;


--
-- Name: project_skills; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.project_skills (
    project_id character varying(50) NOT NULL,
    skill_id integer NOT NULL
);


ALTER TABLE public.project_skills OWNER TO admin;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.projects (
    project_id character varying(50) NOT NULL,
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


ALTER TABLE public.projects OWNER TO admin;

--
-- Name: projects_allocation; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.projects_allocation (
    allocation_id character varying(50) NOT NULL,
    employee_id character varying(50),
    project_id character varying(50),
    role_in_project character varying(255),
    allocation_percentage integer,
    allocation_start_date date,
    allocation_end_date date,
    project_tags character varying(255),
    w1 integer DEFAULT 0,
    w2 integer DEFAULT 0,
    w3 integer DEFAULT 0,
    w4 integer DEFAULT 0,
    weekly_hours numeric(6,2),
    weekly_plan jsonb
);


ALTER TABLE public.projects_allocation OWNER TO admin;

--
-- Name: skills; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.skills (
    skill_id integer NOT NULL,
    skill_name character varying(255)
);


ALTER TABLE public.skills OWNER TO admin;

--
-- Name: team_members; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.team_members (
    id integer NOT NULL,
    project_id character varying(255),
    name character varying(255),
    role character varying(255),
    company character varying(255),
    company_type character varying(50),
    location character varying(150),
    w1 integer DEFAULT 0,
    w2 integer DEFAULT 0,
    w3 integer DEFAULT 0,
    w4 integer DEFAULT 0
);


ALTER TABLE public.team_members OWNER TO admin;

--
-- Name: team_members_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.team_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.team_members_id_seq OWNER TO admin;

--
-- Name: team_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.team_members_id_seq OWNED BY public.team_members.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    last_login_at timestamp without time zone,
    password_changed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.users OWNER TO admin;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO admin;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: weekly_allocations; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.weekly_allocations (
    id integer NOT NULL,
    allocation_id character varying(50),
    allocation_year integer NOT NULL,
    week_number integer NOT NULL,
    allocated_hours integer DEFAULT 0,
    CONSTRAINT weekly_allocations_week_number_check CHECK (((week_number >= 1) AND (week_number <= 53)))
);


ALTER TABLE public.weekly_allocations OWNER TO admin;

--
-- Name: weekly_allocations_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.weekly_allocations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.weekly_allocations_id_seq OWNER TO admin;

--
-- Name: weekly_allocations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.weekly_allocations_id_seq OWNED BY public.weekly_allocations.id;


--
-- Name: actionable_todos id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.actionable_todos ALTER COLUMN id SET DEFAULT nextval('public.actionable_todos_id_seq'::regclass);


--
-- Name: employee_nominations id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.employee_nominations ALTER COLUMN id SET DEFAULT nextval('public.employee_nominations_id_seq'::regclass);


--
-- Name: partners id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.partners ALTER COLUMN id SET DEFAULT nextval('public.partners_id_seq'::regclass);


--
-- Name: project_commercials id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.project_commercials ALTER COLUMN id SET DEFAULT nextval('public.project_commercials_id_seq'::regclass);


--
-- Name: project_scopes id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.project_scopes ALTER COLUMN id SET DEFAULT nextval('public.project_scopes_id_seq'::regclass);


--
-- Name: team_members id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.team_members ALTER COLUMN id SET DEFAULT nextval('public.team_members_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: weekly_allocations id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.weekly_allocations ALTER COLUMN id SET DEFAULT nextval('public.weekly_allocations_id_seq'::regclass);


--
-- Name: actionable_todos actionable_todos_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.actionable_todos
    ADD CONSTRAINT actionable_todos_pkey PRIMARY KEY (id);


--
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (certificate_id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (client_id);


--
-- Name: employee_certificates employee_certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.employee_certificates
    ADD CONSTRAINT employee_certificates_pkey PRIMARY KEY (certificate_id, employee_id);


--
-- Name: employee_master employee_master_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.employee_master
    ADD CONSTRAINT employee_master_pkey PRIMARY KEY (employee_id);


--
-- Name: employee_master_pro employee_master_pro_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.employee_master_pro
    ADD CONSTRAINT employee_master_pro_pkey PRIMARY KEY (employee_id);


--
-- Name: employee_nominations employee_nominations_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.employee_nominations
    ADD CONSTRAINT employee_nominations_pkey PRIMARY KEY (id);


--
-- Name: employee_skills employee_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.employee_skills
    ADD CONSTRAINT employee_skills_pkey PRIMARY KEY (employee_id, skill_id);


--
-- Name: partners partners_name_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_name_key UNIQUE (name);


--
-- Name: partners partners_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_pkey PRIMARY KEY (id);


--
-- Name: project_commercials project_commercials_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.project_commercials
    ADD CONSTRAINT project_commercials_pkey PRIMARY KEY (id);


--
-- Name: project_scopes project_scopes_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.project_scopes
    ADD CONSTRAINT project_scopes_pkey PRIMARY KEY (id);


--
-- Name: project_skills project_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.project_skills
    ADD CONSTRAINT project_skills_pkey PRIMARY KEY (project_id, skill_id);


--
-- Name: projects_allocation projects_allocation_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.projects_allocation
    ADD CONSTRAINT projects_allocation_pkey PRIMARY KEY (allocation_id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (project_id);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (skill_id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: weekly_allocations weekly_allocations_allocation_id_allocation_year_week_numbe_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.weekly_allocations
    ADD CONSTRAINT weekly_allocations_allocation_id_allocation_year_week_numbe_key UNIQUE (allocation_id, allocation_year, week_number);


--
-- Name: weekly_allocations weekly_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.weekly_allocations
    ADD CONSTRAINT weekly_allocations_pkey PRIMARY KEY (id);


--
-- Name: idx_em_department; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_em_department ON public.employee_master USING btree (department);


--
-- Name: idx_em_resign; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_em_resign ON public.employee_master USING btree (date_of_resign);


--
-- Name: idx_emp_pro_status; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_emp_pro_status ON public.employee_master_pro USING btree (employee_status);


--
-- Name: idx_employee_master_department; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_employee_master_department ON public.employee_master USING btree (department);


--
-- Name: idx_employee_master_join; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_employee_master_join ON public.employee_master USING btree (date_of_joining);


--
-- Name: idx_employee_master_pro_allocations; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_employee_master_pro_allocations ON public.employee_master_pro USING btree (employee_allocations);


--
-- Name: idx_employee_master_pro_employee_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_employee_master_pro_employee_id ON public.employee_master_pro USING btree (employee_id);


--
-- Name: idx_employee_master_resign; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_employee_master_resign ON public.employee_master USING btree (date_of_resign);


--
-- Name: idx_employee_skills_employee_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_employee_skills_employee_id ON public.employee_skills USING btree (employee_id);


--
-- Name: idx_employee_skills_skill_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_employee_skills_skill_id ON public.employee_skills USING btree (skill_id);


--
-- Name: idx_pa_dates; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_pa_dates ON public.projects_allocation USING btree (allocation_start_date, allocation_end_date);


--
-- Name: idx_pa_employee_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_pa_employee_id ON public.projects_allocation USING btree (employee_id);


--
-- Name: idx_pa_project_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_pa_project_id ON public.projects_allocation USING btree (project_id);


--
-- Name: idx_projects_allocation_employee_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_projects_allocation_employee_id ON public.projects_allocation USING btree (employee_id);


--
-- Name: idx_projects_allocation_project_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_projects_allocation_project_id ON public.projects_allocation USING btree (project_id);


--
-- Name: idx_projects_client_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_projects_client_id ON public.projects USING btree (client_id);


--
-- Name: idx_projects_status; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_projects_status ON public.projects USING btree (project_status);


--
-- Name: projects_allocation trg_sync_allocations; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trg_sync_allocations AFTER INSERT OR DELETE OR UPDATE ON public.projects_allocation FOR EACH ROW EXECUTE FUNCTION public.sync_employee_allocations();


--
-- Name: employee_certificates employee_certificates_certificate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.employee_certificates
    ADD CONSTRAINT employee_certificates_certificate_id_fkey FOREIGN KEY (certificate_id) REFERENCES public.certificates(certificate_id);


--
-- Name: employee_certificates employee_certificates_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.employee_certificates
    ADD CONSTRAINT employee_certificates_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee_master(employee_id);


--
-- Name: employee_master_pro employee_master_pro_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.employee_master_pro
    ADD CONSTRAINT employee_master_pro_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee_master(employee_id);


--
-- Name: employee_nominations employee_nominations_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.employee_nominations
    ADD CONSTRAINT employee_nominations_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee_master(employee_id);


--
-- Name: employee_skills employee_skills_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.employee_skills
    ADD CONSTRAINT employee_skills_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee_master(employee_id);


--
-- Name: employee_skills employee_skills_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.employee_skills
    ADD CONSTRAINT employee_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(skill_id);


--
-- Name: project_commercials project_commercials_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.project_commercials
    ADD CONSTRAINT project_commercials_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON DELETE CASCADE;


--
-- Name: project_scopes project_scopes_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.project_scopes
    ADD CONSTRAINT project_scopes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON DELETE CASCADE;


--
-- Name: project_skills project_skills_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.project_skills
    ADD CONSTRAINT project_skills_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id);


--
-- Name: project_skills project_skills_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.project_skills
    ADD CONSTRAINT project_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(skill_id);


--
-- Name: projects_allocation projects_allocation_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.projects_allocation
    ADD CONSTRAINT projects_allocation_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employee_master(employee_id);


--
-- Name: projects_allocation projects_allocation_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.projects_allocation
    ADD CONSTRAINT projects_allocation_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id);


--
-- Name: projects projects_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id);


--
-- Name: team_members team_members_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON DELETE CASCADE;


--
-- Name: weekly_allocations weekly_allocations_allocation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.weekly_allocations
    ADD CONSTRAINT weekly_allocations_allocation_id_fkey FOREIGN KEY (allocation_id) REFERENCES public.projects_allocation(allocation_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict pK91FdEfjTMOyuQEgmA4JOyeRefstonfxgBTXTLIEnUG2YzhNtnAn2miEKoFU2a

