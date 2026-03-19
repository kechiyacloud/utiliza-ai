--
-- PostgreSQL database dump
--

\restrict 6IeEQrvc97kV3r8IaFzY524C4ML6AX1Sjr9wzsruIEbch3JvH1b3fvlvee3zqKw

-- Dumped from database version 16.13 (Debian 16.13-1.pgdg13+1)
-- Dumped by pg_dump version 16.13 (Debian 16.13-1.pgdg13+1)

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
    end_date date
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
    project_tags character varying(255)
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
-- Name: actionable_todos id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.actionable_todos ALTER COLUMN id SET DEFAULT nextval('public.actionable_todos_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: actionable_todos; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.actionable_todos (id, message, type, status, created_at) FROM stdin;
\.


--
-- Data for Name: certificates; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.certificates (certificate_id, certificate_name) FROM stdin;
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
-- Data for Name: employee_certificates; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.employee_certificates (certificate_id, employee_id) FROM stdin;
CI1237	CD-MAA01-00368
CI1237	CD-MAA01-00363
C11242	CD-MAA01-00363
CI1239	CD-MAA01-00361
CI1234	CD-MAA01-00368
\.


--
-- Data for Name: employee_master; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) FROM stdin;
1	CD-MAA01-00263	SHA ABIDH JAIN ALAUDEEN	9123456900	shahabidhj@clouddestinations.com	Chennai	WFO	2018-11-15	Manager	Cloud Solutions Engineering	FTE	8	7.3	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
2	CD-MAA01-00033	Naveen Vasanthakumar	9123456902	naveenv@clouddestinations.com	Coimbatore	WFO	2021-02-03	Cloud Architecht	Cloud Solutions Engineering	FTE	6	5.1	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
3	CD-MAA01-00090	Mohan Muruganandham	9123456903	mohanm@clouddestinations.com	Chennai	WFO	2020-12-17	Senior Engineer	Cloud Solutions Engineering	FTE	6	5.2	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
4	CD-MAA01-00136	Pavithra Ranganathan	9123456904	pavithrar@clouddestinations.com	Coimbatore	WFO	2019-10-26	Senior Engineer	Cloud Solutions Engineering	FTE	7	6.4	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
5	CD-MAA01-00217	Muthu Mohamed Inzamam Bari Mahaboob Ali	9123456905	inzamamb@clouddestinations.com	Remote	WFO	2023-10-18	Senior Engineer	Cloud Solutions Engineering	FTE	5	2.4	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
6	CD-MAA01-00220	Syed Ali Asan	9123456906	syeda@clouddestinations.com	Coimbatore	WFO	2017-08-25	Senior Engineer	Cloud Solutions Engineering	FTE	10	8.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
7	CD-CJB01-00107	Deepak Sathiyamoorthi	9123456917	deepaks@clouddestinations.com	Remote	WFO	2018-04-30	Engineer	SRE	FTE	9	7.9	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
8	CD-MAA01-00371	Bharath Kumar	9123456920	bharathk@clouddestinations.com	Coimbatore	WFO	2023-03-01	Engineer	Cloud Solutions Engineering	FTE	5	3	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
9	CD-CJB01-00102	Devaraj Vadivel	9123456921	devarajv@clouddestinations.com	Remote	WFO	2022-11-04	Engineer	Cloud Solutions Engineering	FTE	4	3.3	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
10	CD-RMT-00068	Varisha P Md	9123456922	varishap@clouddestinations.com	Chennai	WFO	2020-08-09	Engineer	Cloud Solutions Engineering	FTE	7	5.6	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
11	CD-RMT-00129	Dharani Kumar Appar	9123456924	dharanik@clouddestinations.com	Chennai	WFO	2018-06-08	Engineer	Cloud Solutions Engineering	FTE	8	7.8	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
12	CD-CJB01-00206	Jose Rayan	9123456928	joser@clouddestinations.com	Chennai	WFO	2021-04-25	Engineer	Cloud Solutions Engineering	FTE	4.9	4.9	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
13	CD-RMT-00088	Prudhvi Raj Anupoju	9123456925	prudhvir@clouddestinations.com	Chennai	WFO	2017-06-15	Engineer	Cloud Solutions Engineering	FTE	8	8.7	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
14	CD-CJB01-00212	Dinesh Palanisamy	9123456926	dineshp@clouddestinations.com	Coimbatore	WFO	2018-01-24	Senior Engineer	Cloud Solutions Engineering	FTE	10	8.1	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
15	CD-MAA01-00005	Mohanraj Balan	9123456927	mohanrajb@clouddestinations.com	Chennai	WFO	2017-08-18	Senior Engineer	Cloud Solutions Engineering	FTE	9	8.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
16	CD-MAA01-00204	Priyanka Mohan	9123456929	priyankam@clouddestinations.com	Coimbatore	WFO	2019-08-24	Engineer	Cloud Solutions Engineering	FTE	8	6.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
17	CD-CJB01-00190	NareshPandian Chinna	9123456930	nareshp@clouddestinations.com	Remote	WFO	2020-09-13	Senior Engineer	Cloud Solutions Engineering	FTE	5	5.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
18	CD-MAA01-00365	Bhavani	9123456931	bhavani@clouddestinations.com	Remote	WFO	2023-07-26	Senior Engineer	Cloud Solutions Engineering	FTE	5	2.6	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
19	CD-SFO01-00005	Ebrahim	9123456932	ebrahim@clouddestinations.com	Remote	WFO	2022-04-16	Vice President	Cloud Solutions Engineering	FTE	5	3.9	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
20	CD-MAA01-00361	Naveen S	9123456934	naveens@clouddestinations.com	Remote	WFO	2017-09-08	Lead	SRE	FTE	12	8.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
21	CD-MAA01-00368	Rahul Mohan	9123456935	rahulm@clouddestinations.com	Chennai	WFO	2023-03-02	Devops Lead 	Cloud Solutions Engineering	FTE	4	3	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
22	CD-MAA01-00043	Soundra Panneerselvan	9123456936	soundrap@clouddestinations.com	Remote	WFO	2018-06-25	Associate Vice President	Cloud Solutions Engineering	FTE	7.7	7.7	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
23	CD-MAA01-00363	Venkatesh Gunasekaran	9123456938	venkateshg@clouddestinations.com	Remote	WFO	2017-02-22	Engineer	Cloud Solutions Engineering	FTE	9	9	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
24	CD-MAA01-00079	Preethi Ramesh	9123456940	preethir@clouddestinations.com	Remote	WFO	2020-09-11	Engineer	Cloud Solutions Engineering	FTE	6	5.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
25	CD-CJB01-00030	Aravindan Rajendran	9123456941	aravindanr@clouddestinations.com	Remote	WFO	2020-06-20	Engineer	SRE	FTE	7	5.7	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
26	CD-MAA01-00417	Ramkumar	9123456844	ramkumar@clouddestinations.com	Chennai	WFO	2025-10-31	Engineer	Cloud Solutions Engineering	FTE	4	0.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
27	CDC126	Prasanna Baskar	9123456846	prasannabaskar@clouddestinations.com	Remote	WFH	2025-10-31	Engineer	Cloud Solutions Engineering	FTE	3	0.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
28	CDC137	Pomila Murthy	9123456847	pomilamurthy@clouddestinations.com	Remote	WFH	2025-10-31	Engineer	Cloud Solutions Engineering	FTE	2	0.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
29	CD-MAA01-00459	Prasanth Subramanian	9566464770	sprasanth@clouddestinations.com	Chennai	WFO	2025-05-11	Associate Engineer	Cloud Solutions Engineering	FTE	2	0.8	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
30	CD-MAA01-00458	Ijaaz Ahamed	9551416338	ijaaza@clouddestinations.com	Chennai	WFO	2025-05-11	Associate Engineer	Cloud Solutions Engineering	FTE	8	0.8	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
31	CD-MAA01-00457	Vishnupriya Eakambaram	8300059342	vishnupriyae@clouddestinations.com	Chennai	WFO	2025-05-11	Associate Engineer	Cloud Solutions Engineering	FTE	1	0.8	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
32	CD-A0082	Vivin kumar 	9003013557	vivink@clouddestination.com 	Chennai	WFO	2025-06-22	 Associate Trainee	Cloud Solutions Engineering	INTEN	1	0.7	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
33	CD-MAA01-00456	Kechiya Sunil	9566464770	kechiyav@clouddestinations.com	Chennai	WFO	2025-05-14	Associate Engineer	Cloud Solutions Engineering	FTE	1	0.8	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
34	CD-CJB01-00433	Santhosh Kumar Periasamy	9566464771	santhoshp@clouddestinations.com	Chennai	WFO	2025-05-14	Senior DevOps Engineer	Cloud Solutions Engineering	FTE	5	4	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
35	CD-MAA01-00273	Sona Shri Suresh Sangeetha	9566464772	sonas@clouddestinations.com	Chennai	WFO	2025-05-15	Engineer	Cloud Solutions Engineering	FTE	2	2	General (10:00 AM - 07:00 PM)	(GMT+05:30)	\N	\N
\.


--
-- Data for Name: employee_master_pro; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) FROM stdin;
CD-MAA01-00365	CD-CJB01-011473	Bench	\N	0
CD-SFO01-00005	CD-CJB01-011473	Allocated	\N	100
CD-MAA01-00361	CD-CJB01-011469	Allocated	\N	200
CD-MAA01-00368	CD-CJB01-011470	Allocated	\N	200
CD-MAA01-00043	CD-CJB01-011469	Allocated	\N	100
CD-MAA01-00263	CD-CJB01-011469	Bench	\N	0
CD-MAA01-00033	CD-CJB01-011473	Allocated	\N	150
CD-MAA01-00090	CD-CJB01-011473	Allocated	\N	100
CD-MAA01-00136	CD-CJB01-011473	Allocated	\N	100
CD-MAA01-00217	CD-CJB01-011470	Allocated	\N	100
CD-MAA01-00220	CD-CJB01-011470	Allocated	\N	100
CD-CJB01-00107	CD-CJB01-011472	Bench	\N	0
CD-MAA01-00371	CD-CJB01-011472	Bench	\N	0
CD-CJB01-00102	CD-CJB01-011473	Bench	\N	0
CD-RMT-00068	CD-CJB01-011469	Allocated	\N	100
CD-RMT-00129	CD-CJB01-011470	Allocated	\N	50
CD-RMT-00088	CD-CJB01-011470	Allocated	\N	200
CD-CJB01-00212	CD-CJB01-011473	Allocated	\N	100
CD-MAA01-00005	CD-CJB01-011473	Allocated	\N	100
CD-CJB01-00206	CD-CJB01-011473	Allocated	\N	100
CD-MAA01-00204	CD-CJB01-011470	Allocated	\N	100
CD-CJB01-00190	CD-CJB01-011469	Allocated	\N	100
CD-MAA01-00363	CD-CJB01-011470	Allocated	\N	100
CD-MAA01-00079	CD-CJB01-011472	Allocated	\N	100
CD-CJB01-00030	CD-CJB01-011470	Allocated	\N	100
CD-MAA01-00417	CD-CJB01-011470	Allocated	\N	100
CDC137	CD-CJB01-011473	Bench	\N	0
CDC126	CD-CJB01-011472	Bench	\N	0
CD-CJB01-00433	CD-MAA01-00255	Bench	\N	0
CD-MAA01-00273	CD-CJB01-00269	Allocated	\N	100
CD-MAA01-00459	CD-MAA01-00217	Allocated	\N	100
CD-MAA01-00458	CD-MAA01-00005	Allocated	\N	100
CD-MAA01-00456	CD-MAA01-00005	Allocated	\N	100
CD-A0082	CD-MAA01-00217	Allocated	\N	100
CD-MAA01-00457	CD-MAA01-00217	Allocated	\N	50
\.


--
-- Data for Name: employee_skills; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) FROM stdin;
CD-MAA01-00033	1109	3	1
CD-MAA01-00033	1168	5	3
CD-MAA01-00033	1001	2	1.5
CD-MAA01-00033	1151	1	4.5
CD-MAA01-00033	1005	1	4.5
CD-MAA01-00033	1140	1	5
CD-MAA01-00033	1163	5	0.5
CD-MAA01-00033	1110	4	1.5
CD-MAA01-00033	1156	2	3.5
CD-MAA01-00033	1152	5	3.5
CD-MAA01-00090	1023	4	1.5
CD-MAA01-00090	1151	1	2.5
CD-MAA01-00090	1135	3	3
CD-MAA01-00090	1129	4	5
CD-MAA01-00090	1156	3	1
CD-MAA01-00090	1161	3	3.5
CD-MAA01-00090	1155	2	3
CD-MAA01-00090	1103	2	4
CD-MAA01-00090	1007	5	2.5
CD-MAA01-00090	1154	3	3
CD-MAA01-00136	1021	5	1.5
CD-MAA01-00136	1005	3	2
CD-MAA01-00136	1110	1	5
CD-MAA01-00136	1114	5	1.5
CD-MAA01-00136	1119	4	1
CD-MAA01-00136	1106	5	2
CD-MAA01-00136	1007	4	5
CD-MAA01-00136	1117	5	3.5
CD-MAA01-00136	1010	1	5
CD-MAA01-00220	1140	1	3
CD-RMT-00068	1112	4	1.5
CD-RMT-00068	1002	5	4.5
CD-RMT-00068	1014	2	5
CD-RMT-00068	1023	4	5
CD-RMT-00068	1118	2	1.5
CD-RMT-00068	1012	2	4.5
CD-RMT-00129	1157	3	3
CD-RMT-00129	1166	3	1
CD-RMT-00129	1147	5	1.5
CD-RMT-00129	1123	3	4
CD-RMT-00129	1124	3	2.5
CD-RMT-00129	1130	4	5
CD-RMT-00129	1165	5	4
CD-RMT-00129	1161	5	4.5
CD-RMT-00129	1141	2	2.5
CD-RMT-00129	1010	1	3
CD-CJB01-00206	1001	2	4.5
CD-CJB01-00206	1129	1	2.5
CD-CJB01-00206	1136	4	5
CD-CJB01-00206	1131	5	1
CD-CJB01-00206	1104	5	5
CD-CJB01-00206	1126	5	4.5
CD-CJB01-00206	1167	3	3.5
CD-CJB01-00206	1166	2	5
CD-CJB01-00206	1145	2	3.5
CD-CJB01-00206	1003	4	1.5
CD-RMT-00088	1132	5	5
CD-RMT-00088	1122	3	5
CD-RMT-00088	1012	5	3.5
CD-RMT-00088	1016	4	4
CD-RMT-00088	1165	3	2
CD-RMT-00088	1022	5	4
CD-RMT-00088	1136	2	5
CD-RMT-00088	1001	1	3.5
CD-RMT-00088	1150	1	0.5
CD-RMT-00088	1008	1	3.5
CD-CJB01-00212	1154	2	2.5
CD-CJB01-00212	1022	4	4
CD-CJB01-00212	1005	2	3
CD-CJB01-00212	1011	5	3.5
CD-CJB01-00212	1105	1	5
CD-CJB01-00212	1150	1	2
CD-CJB01-00212	1123	1	1
CD-CJB01-00212	1137	2	4.5
CD-CJB01-00212	1162	4	0.5
CD-CJB01-00212	1146	1	4.5
CD-MAA01-00005	1010	1	3
CD-MAA01-00005	1016	4	4
CD-MAA01-00005	1004	2	5
CD-MAA01-00005	1013	1	2.5
CD-MAA01-00005	1104	2	4
CD-MAA01-00005	1115	5	1
CD-MAA01-00005	1018	2	2.5
CD-MAA01-00005	1116	1	2.5
CD-MAA01-00005	1021	1	4.5
CD-MAA01-00005	1141	1	0.5
CD-MAA01-00204	1002	4	4.5
CD-MAA01-00204	1149	5	2.5
CD-MAA01-00204	1006	3	4.5
CD-MAA01-00204	1105	5	1
CD-MAA01-00204	1165	3	1.5
CD-MAA01-00204	1112	5	3
CD-MAA01-00204	1156	3	5
CD-MAA01-00204	1005	5	5
CD-MAA01-00204	1129	2	0.5
CD-MAA01-00204	1025	3	4.5
CD-CJB01-00190	1161	4	1.5
CD-CJB01-00190	1015	3	3.5
CD-MAA01-00365	1118	5	0.5
CD-MAA01-00365	1146	2	4
CD-MAA01-00365	1125	2	5
CD-MAA01-00365	1018	3	3.5
CD-MAA01-00365	1105	3	3
CD-MAA01-00365	1157	4	2.5
CD-SFO01-00005	1005	4	2
CD-SFO01-00005	1111	5	0.5
CD-SFO01-00005	1158	3	3.5
CD-SFO01-00005	1015	1	4.5
CD-SFO01-00005	1013	4	3.5
CD-SFO01-00005	1016	2	1
CD-SFO01-00005	1103	4	2.5
CD-SFO01-00005	1007	5	0.5
CD-SFO01-00005	1131	2	3.5
CD-SFO01-00005	1138	2	3.5
CD-MAA01-00361	1128	5	3.5
CD-MAA01-00361	1134	2	2.5
CD-MAA01-00361	1127	2	0.5
CD-MAA01-00361	1151	3	5
CD-MAA01-00361	1136	3	2.5
CD-MAA01-00361	1153	4	1.5
CD-MAA01-00361	1168	1	2.5
CD-MAA01-00361	1138	2	3
CD-MAA01-00361	1130	1	1
CD-MAA01-00361	1007	1	2.5
CD-MAA01-00368	1165	2	5
CD-MAA01-00368	1113	5	3.5
CD-MAA01-00368	1112	2	3
CD-MAA01-00368	1020	2	2.5
CD-MAA01-00368	1014	5	1.5
CD-MAA01-00368	1021	5	2
CD-MAA01-00368	1108	2	4.5
CD-MAA01-00368	1016	1	3
CD-MAA01-00368	1019	1	5
CD-MAA01-00368	1114	4	2.5
CD-MAA01-00043	1123	1	1
CD-MAA01-00043	1003	1	3
CD-MAA01-00043	1024	1	4.5
CD-MAA01-00043	1112	4	2.5
CD-MAA01-00043	1025	3	2
CD-MAA01-00043	1015	1	1.5
CD-MAA01-00363	1119	3	1
CD-MAA01-00363	1018	2	4.5
CD-MAA01-00363	1001	1	2.5
CD-MAA01-00363	1007	2	3
CD-MAA01-00363	1150	3	0.5
CD-MAA01-00363	1104	4	3.5
CD-MAA01-00363	1006	4	2
CD-MAA01-00363	1023	5	5
CD-MAA01-00363	1008	2	1
CD-MAA01-00363	1122	2	4
CD-MAA01-00079	1110	5	1
CD-MAA01-00079	1159	5	4
CD-MAA01-00079	1001	4	3.5
CD-MAA01-00079	1019	5	5
CD-MAA01-00079	1115	2	4
CD-MAA01-00079	1147	1	4
CD-MAA01-00079	1135	5	4.5
CD-MAA01-00079	1111	2	3.5
CD-MAA01-00079	1116	2	5
CD-MAA01-00079	1107	2	1.5
CD-CJB01-00030	1012	2	4
CD-CJB01-00030	1015	1	0.5
CD-CJB01-00030	1113	5	3
CD-CJB01-00030	1157	1	4
CD-CJB01-00030	1128	2	5
CD-CJB01-00030	1132	5	3
CD-CJB01-00030	1006	5	5
CD-CJB01-00030	1118	4	1.5
CD-CJB01-00030	1008	5	1.5
CD-CJB01-00030	1146	5	4
CD-MAA01-00263	1134	4	4.5
CD-MAA01-00263	1008	1	2.5
CD-MAA01-00263	1025	3	1
CD-MAA01-00263	1017	5	1.5
CD-MAA01-00263	1001	3	3
CD-MAA01-00263	1109	4	2
CD-MAA01-00263	1113	1	1
CD-MAA01-00263	1120	3	0.5
CD-MAA01-00263	1112	1	4
CD-MAA01-00263	1121	1	5
CD-CJB01-00107	1004	3	0.5
CD-CJB01-00107	1144	2	2.5
CD-CJB01-00107	1018	1	2.5
CD-CJB01-00107	1014	1	3
CD-CJB01-00107	1162	4	4
CD-CJB01-00107	1149	5	2
CD-CJB01-00107	1141	1	3.5
CD-CJB01-00107	1121	2	1
CD-CJB01-00107	1020	5	1.5
CD-CJB01-00107	1016	3	1.5
CD-MAA01-00371	1001	2	3
CD-MAA01-00371	1103	5	5
CD-MAA01-00371	1121	3	1.5
CD-MAA01-00371	1109	4	4
CD-MAA01-00371	1008	5	4.5
CD-MAA01-00371	1122	5	5
CD-MAA01-00371	1113	3	3.5
CD-MAA01-00371	1016	1	4.5
CD-MAA01-00371	1106	5	1
CD-MAA01-00371	1101	3	4
CD-CJB01-00102	1125	1	3
CD-CJB01-00102	1126	5	4.5
CD-CJB01-00102	1161	5	1.5
CD-CJB01-00102	1144	1	1.5
CD-CJB01-00102	1142	2	1.5
CD-CJB01-00102	1165	2	4.5
CD-CJB01-00102	1159	5	4
CD-CJB01-00102	1010	3	3.5
CD-CJB01-00102	1160	1	1
CD-CJB01-00102	1145	5	2
CD-RMT-00068	1130	5	2
CD-RMT-00068	1004	2	5
CD-RMT-00068	1016	4	0.5
CD-RMT-00068	1020	1	1.5
CD-MAA01-00136	1022	1	2.5
CD-MAA01-00217	1149	1	0.5
CD-MAA01-00217	1015	1	3.5
CD-MAA01-00217	1123	4	5
CD-MAA01-00217	1106	3	4.5
CD-MAA01-00217	1016	3	5
CD-MAA01-00217	1163	4	0.5
CD-MAA01-00217	1022	2	0.5
CD-MAA01-00217	1122	2	5
CD-MAA01-00217	1021	5	2
CD-MAA01-00217	1002	2	2
CD-MAA01-00220	1162	3	0.5
CD-MAA01-00220	1101	4	4.5
CD-MAA01-00220	1022	3	4.5
CD-MAA01-00220	1119	3	4
CD-MAA01-00220	1107	5	3
CD-MAA01-00220	1102	5	4.5
CD-MAA01-00220	1001	1	2.5
CD-MAA01-00220	1004	5	4.5
CD-MAA01-00220	1114	5	0.5
CD-CJB01-00190	1001	3	2
CD-CJB01-00190	1002	2	2.5
CD-CJB01-00190	1004	3	4
CD-CJB01-00190	1003	1	2
CD-CJB01-00190	1007	5	1.5
CD-CJB01-00190	1009	1	5
CD-CJB01-00190	1106	5	1.5
CD-CJB01-00190	1116	3	4.5
CD-MAA01-00365	1114	2	2.5
CD-MAA01-00365	1128	1	4
CD-MAA01-00365	1147	4	3.5
CD-MAA01-00365	1121	4	3
CD-MAA01-00043	1122	3	2.5
CD-MAA01-00043	1116	2	1.5
CD-MAA01-00043	1107	3	3
CD-MAA01-00043	1004	2	5
\.


--
-- Data for Name: project_skills; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.project_skills (project_id, skill_id) FROM stdin;
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
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.projects (project_id, project_name, project_status, billable, start_date, end_date) FROM stdin;
CDIN001	Project Dashboard	Live	Non - Billable	2026-01-13	2026-03-12
CP001	Aaon - Flexpoint	Ended	Billable	2025-12-31	2026-02-24
CP002	DevOps Support Onyx	Live	Billable	2026-01-01	\N
CP003	Josys Infra Provisioning and Management	Live	Billable	2023-07-18	2026-12-30
CP004	OpsNow SRE Project	Ended	Billable	2026-01-03	2026-02-24
CP005	Managed Services - Paradigm	Live	Billable	2026-01-04	\N
CP006	CloudOps Support	Live	Billable	2026-01-05	\N
CP007	AlertNow Maintenance Project	Ended	Billable	2026-01-06	2026-02-24
CP008	GCP - Infrastruture Support	Live	Billable	2026-01-07	\N
CP009	Inertia Cloud Operartions	Live	Billable	2026-01-08	\N
CP010	Bespin POD	Live	Billable	2026-01-09	\N
CP011	Platform Engineering Project - Forge	Live	Billable	2024-11-13	2026-07-30
CP012	Optum: TnM	Live	Billable	2026-01-11	\N
CP013	MHC - Power BI Enablement	Ended	Billable	2026-01-12	2026-02-24
CP014	MHC - Enterprise Data Warehouse	Ended	Billable	2026-01-13	2026-02-26
CP015	Movius - Onprem to Cloud Migration	Live	Billable	2025-10-02	\N
CP016	Chicago Public Schools	Live	Billable	2025-12-31	\N
CDIN000	PIP	In Progress	Non - Billable	\N	\N
\.


--
-- Data for Name: projects_allocation; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags) FROM stdin;
AL00132	CD-MAA01-00033	CP002	L2 Operations	50	2025-12-31	2026-12-30	Billable
AL00133	CD-MAA01-00090	CP003	L2 Operations	100	2026-01-01	2026-03-30	Billable
AL00134	CD-MAA01-00136	CP003	L2 Operations	100	2026-01-02	2026-03-30	Billable
AL00135	CD-MAA01-00217	CP003	L2 Operations	100	2026-01-03	2026-03-30	Billable
AL00128	CD-MAA01-00220	CP003	L2 Operations	100	2026-01-04	2026-03-30	Billable
AL00129	CD-MAA01-00417	CP003	L2 Operations	100	2026-01-05	2026-03-30	Billable
AL00136	CD-RMT-00068	CP006	L2 Operations	100	2026-01-06	2026-12-30	Billable
AL00138	CD-RMT-00129	CP009	L2 Operations	50	2026-01-07	2026-07-30	Billable
AL00139	CD-RMT-00088	CP010	L2 Operations	100	2026-01-08	2026-12-30	Billable
AL00140	CD-CJB01-00212	CP010	L2 Operations	100	2026-01-09	2026-12-30	Billable
AL00141	CD-MAA01-00005	CP010	L2 Operations	100	2026-01-10	2026-12-30	Billable
AL00142	CD-CJB01-00206	CP011	L2 Operations	100	2026-01-11	2026-07-30	Billable
AL00143	CD-MAA01-00204	CP011	L2 Operations	100	2026-01-12	2026-07-30	Billable
AL00144	CD-CJB01-00190	CP011	L2 Operations	100	2026-01-13	2026-04-12	Billable
AL00145	CD-MAA01-00273	CP011	L2 Operations	100	2026-01-14	\N	NonBillable
AL00149	CD-MAA01-00361	CP012	L2 Operations	100	2026-01-15	2026-03-30	Billable
AL00150	CD-MAA01-00368	CP012	L2 Operations	100	2026-01-16	2026-03-30	Billable
AL00152	CD-MAA01-00363	CP012	L2 Operations	100	2026-01-17	2026-03-30	Billable
AL00154	CD-MAA01-00079	CP012	L2 Operations	100	2026-01-18	2026-05-30	Billable
AL00155	CD-CJB01-00030	CP012	L2 Operations	100	2026-01-19	2026-05-30	Billable
AL00156	CD-MAA01-00033	CP014	L2 Operations	0	2026-01-20	2026-07-30	Billable
AL00159	CD-MAA01-00361	CP015	L2 Operations	100	2026-01-21	2026-03-30	Billable
AL00160	CD-MAA01-00368	CP015	L2 Operations	100	2026-01-22	2026-03-30	Billable
AL00161	CD-RMT-00088	CP015	L2 Operations	100	2026-01-23	2026-04-16	Billable
AL00162	CD-MAA01-00033	CP015	L2 Operations	100	2026-01-24	2026-04-16	Billable
AL00123	CD-MAA01-00459	CDIN001	L2 Operations	100	2026-01-25	\N	NonBillable
AL00125	CD-MAA01-00458	CDIN001	L2 Operations	100	2026-01-26	\N	NonBillable
AL00126	CD-MAA01-00456	CDIN001	L2 Operations	100	2026-01-27	\N	NonBillable
AL00127	CD-A0082	CDIN001	L2 Operations	100	2026-01-28	\N	NonBillable
AL00163	CD-MAA01-00457	CDIN001	L2 Operations	100	2026-01-29	\N	NonBillable
\.


--
-- Data for Name: skills; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.skills (skill_id, skill_name) FROM stdin;
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
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) FROM stdin;
4	jetski_test_1@example.com	$2b$12$B/OnJ3rnnbfHXLsz.R.oU.xt/zyDXbIegG8xRmlezL6Tq3n.u3gOe	t	0	\N	\N	2026-02-25 11:11:26.482	2026-02-25 11:11:26.482
5	jetski_new@example.com	$2b$12$Z0p2sZWb1xdN/MXZZ2FtOum.Psjm7kAm.FIRwT3NbLM5tHfq14XV2	t	0	\N	\N	2026-02-25 16:48:44.229	2026-02-25 16:48:44.229
1	vishnupriyae@clouddestinations.com	$2b$12$ymqrYMsIN9ymPTPNiX5hgumilNrTR7IqN0fU.yykGWhMZjtx5zxUi	t	0	\N	\N	2026-02-23 10:28:43.617	2026-02-23 10:28:43.617
2	sprasanth@clouddestinations.com	$2b$12$9.X0yTf7XW2gltcHPQZC/eM5wYc2OWmFm4vTcS551DmUhO0CvepI2	t	0	\N	\N	2026-02-23 11:12:26.617	2026-02-23 11:12:26.617
3	test@example.com	$2b$12$Lajuw2NMDqMahgkNNkx0sOtN27uSMnANzuO0n8NemKCoN.5eDNOpq	t	0	\N	\N	2026-02-23 14:33:24.282	2026-02-23 14:33:24.282
\.


--
-- Name: actionable_todos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.actionable_todos_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.users_id_seq', 7, true);


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
-- Name: employee_skills employee_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.employee_skills
    ADD CONSTRAINT employee_skills_pkey PRIMARY KEY (employee_id, skill_id);


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
-- PostgreSQL database dump complete
--

\unrestrict 6IeEQrvc97kV3r8IaFzY524C4ML6AX1Sjr9wzsruIEbch3JvH1b3fvlvee3zqKw

