import csv
import io

data_em = """si_number	employee_id	employee_name	phone_number	email_id	location	mode_of_work	date_of_joining	role_designation	department	employee_type	total_experience	experience_in_cd	shift	time_zone	date_of_resign	photo_url
1	CD-MAA01-00033	Naveen Vasanthakumar	9123456902	naveenv@clouddestinations.com	Coimbatore	WFO	2/3/2021	Cloud Architecht	Cloud Solutions Engineering	FTE	6	5.1	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
2	CD-MAA01-00090	Mohan Muruganandham	9123456903	mohanm@clouddestinations.com	Chennai	WFO	12/17/2020	Senior Engineer	Cloud Solutions Engineering	FTE	6	5.2	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
3	CD-MAA01-00136	Pavithra Ranganathan	9123456904	pavithrar@clouddestinations.com	Coimbatore	WFO	10/26/2019	Senior Engineer	Cloud Solutions Engineering	FTE	7	6.4	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
4	CD-MAA01-00217	Muthu Mohamed Inzamam Bari Mahaboob Ali	9123456905	inzamamb@clouddestinations.com	Remote	WFO	10/18/2023	Senior Engineer	Cloud Solutions Engineering	FTE	5	2.4	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
5	CD-MAA01-00220	Syed Ali Asan	9123456906	syeda@clouddestinations.com	Coimbatore	WFO	8/25/2017	Senior Engineer	Cloud Solutions Engineering	FTE	10	8.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
6	CD-RMT-00068	Varisha P Md	9123456922	varishap@clouddestinations.com	Chennai	WFO	8/9/2020	Engineer	Cloud Solutions Engineering	FTE	7	5.6	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
7	CD-RMT-00129	DharaniKumar Appar	9123456924	dharanik@clouddestinations.com	Chennai	WFO	6/8/2018	Engineer	Cloud Solutions Engineering	FTE	8	7.8	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
8	CD-CJB01-00206	Jose Rayan	9123456928	joser@clouddestinations.com	Chennai	WFO	4/25/2021	Engineer	Cloud Solutions Engineering	FTE	4.9	4.9	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
9	CD-RMT-00088	Prudhvi Raj Anupoju	9123456925	prudhvir@clouddestinations.com	Chennai	WFO	6/15/2017	Engineer	Cloud Solutions Engineering	FTE	8	8.7	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
10	CD-CJB01-00212	Dinesh Palanisamy	9123456926	dineshp@clouddestinations.com	Coimbatore	WFO	1/24/2018	Senior Engineer	Cloud Solutions Engineering	FTE	10	8.1	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
11	CD-MAA01-00005	Mohanraj Balan	9123456927	mohanrajb@clouddestinations.com	Chennai	WFO	8/18/2017	Senior Engineer	Cloud Solutions Engineering	FTE	9	8.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
12	CD-MAA01-00204	Priyanka Mohan	9123456929	priyankam@clouddestinations.com	Coimbatore	WFO	8/24/2019	Engineer	Cloud Solutions Engineering	FTE	8	6.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
13	CD-CJB01-00190	Naresh Pandian Chinna	9123456930	nareshp@clouddestinations.com	Remote	WFO	9/13/2020	Senior Engineer	Cloud Solutions Engineering	FTE	5	5.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
14	CD-MAA01-00365	Bhavani Selvarajah	9123456931	bhavani@clouddestinations.com	Remote	WFO	7/26/2023	Senior Engineer	Cloud Solutions Engineering	FTE	5	2.6	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
15	CD-MAA01-00361	Naveen Srinivasan	9123456934	naveens@clouddestinations.com	Remote	WFO	9/8/2017	Devops Engineer	Cloud Solutions Engineering	FTE	12	8.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
16	CD-MAA01-00368	Rahul Mohan	9123456935	rahulm@clouddestinations.com	Chennai	WFO	3/2/2023	Devops Lead 	Cloud Solutions Engineering	FTE	4	3	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
17	CD-MAA01-00363	Venkatesh Gunasekaran	9123456938	venkateshg@clouddestinations.com	Remote	WFO	2/22/2017	Engineer	Cloud Solutions Engineering	FTE	9	9	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
18	CD-MAA01-00079	Preethi Ramesh	9123456940	preethir@clouddestinations.com	Remote	WFO	9/11/2020	Engineer	Cloud Solutions Engineering	FTE	6	5.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
19	CD-CJB01-00030	Aravindan Rajendran	9123456941	aravindanr@clouddestinations.com	Remote	WFO	6/20/2020	Engineer	SRE	FTE	7	5.7	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
20	CD-MAA01-00417	Ramkumar C	9123456844	ramkumar@clouddestinations.com	Chennai	WFO	11/1/2025	Engineer	Cloud Solutions Engineering	FTE	4	0.5	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
21	CD-MAA01-00459	Prasanth Subramanian	9566464770	sprasanth@clouddestinations.com	Chennai	WFO	5/12/2025	Associate Engineer	Cloud Solutions Engineering	FTE	2	0.8	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
22	CD-MAA01-00458	Ijaaz Ahamed	9551416338	ijaaza@clouddestinations.com	Chennai	WFO	5/11/2025	Associate Engineer	Cloud Solutions Engineering	FTE	8	0.8	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
23	CD-MAA01-00457	Vishnupriya Eakambaram	8300059342	vishnupriyae@clouddestinations.com	Chennai	WFO	5/11/2025	Associate Engineer	Cloud Solutions Engineering	FTE	1	0.8	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
24	CD-A0082	Vivin kumar 	9003013557	vivink@clouddestination.com 	Chennai	WFO	6/22/2025	 Associate Trainee	Cloud Solutions Engineering	INTEN	1	0.7	General (10:00 AM - 07:00 PM)	(GMT+05:30)	03/14/2026	
25	CD-MAA01-00456	Kechiya Sunil	9566464770	kechiyav@clouddestinations.com	Chennai	WFO	5/14/2025	Associate Engineer	Cloud Solutions Engineering	FTE	1	0.8	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
26	CD-CJB01-00433	Santhosh Kumar Periasamy	9566464771	santhoshp@clouddestinations.com	Chennai	WFO	5/15/2025	Senior DevOps Engineer	Cloud Solutions Engineering	FTE	5	4	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
27	CD-MAA01-00273	Sona Shri Suresh Sangeetha	9566464772	sonas@clouddestinations.com	Chennai	WFO	4/25/2021	Engineer	Cloud Solutions Engineering	FTE	2	2	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
28	CD-CJB01-00262	Durai Kanakashabai	9566464772		Chennai	WFO	4/26/2021	Associate Lead Site Reliability Engineer	SRE	FTE	3	2	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
29	CD-MAA01-00120	Gobi	9566464772		Chennai	WFO	4/27/2021	Associate Lead Site Reliability Engineer	SRE	FTE	2	1	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
30	CD-CJB01-00269	Sriram Rajasekaran	9566464772		Chennai	WFO	4/28/2021	Senior Engineer	Cloud Solutions Engineering	FTE	4	3	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
31	CD-MAA01-00375	Thamizh	9566464772		Chennai	WFO	4/29/2021	Senior SRE Engineer	SRE	FTE	3	2	General (10:00 AM - 07:00 PM)	(GMT+05:30)		
32	CD-CJB01-00060	Vasanth Poovaraghavan	9566464772		Chennai	WFO	4/30/2021	Site Reliability Engineer	SRE	FTE	3	2	General (10:00 AM - 07:00 PM)	(GMT+05:30)		"""

data_proj = """project_id	project_name	project_status	billable	start_date	end_date	project_type
CDIN001	Project Dashboard	In Progress	Non - Billable	13/01/2026	12/03/2026	Internal
CP010	On Lok	In-Progress	Billable	01/01/2026	7/31/2026	Client
CP001	MHC	In-Progress	Billable	01/01/2026	7/31/2026	Client
CP002	Bespin POD - Costco	In-Progress	Billable	01/01/2026	12/31/2026	Client
CP003	Bespin - SEA	In-Progress	Billable	01/01/2026	12/31/2026	Client
CP004	Bespin POD - Services for SRTA Tolling System AWS Design and Build - Phase 2	In-Progress	Billable	01/01/2026	12/31/2026	Client
CP005	Josys Infrastructure Provisioning & Management	In-Progress	Billable	01/01/2026	3/30/2026	Client
CP006	Inertia	In-Progress	Billable	01/01/2026	7/31/2026	Client
CP007	Forge	In-Progress	Billable	01/01/2026	7/31/2026	Client
CP008	Bespin Non POD - MAP	In-Progress	Billable	01/01/2026	4/13/2026	Client
CP009	Forge- Shadow (Priyanka)	In-Progress	Non - Billable	01/01/2026		Client
CP011	On Lok -NOC/SOC - Planned	In-Progress	Non - Billable	01/01/2026	3/30/2027	Client
CP012	EverGreen Unification- Planned	In-Progress	Non - Billable	01/01/2026		Client
CP013	Quantiphi, Caresoft - Planned	In-Progress	Non - Billable	01/01/2026		Client
CP014	Optum AIOps	In-Progress	Billable	01/01/2026	5/30/2026	Client
CP015	Movius - Onprem to Cloud Migration	In-Progress	Billable	01/01/2026	4/17/2026	Client
CP016	Onyx Devops Support	In-Progress	Billable	01/01/2026	12/31/2026	"""

data_alloc = """allocation_id	employee_id	project_id	role_in_project	allocation_percentage	allocation_start_date	allocation_end_date
AL00137	CD-MAA01-00005	CP002	Cloud Solutions Engineering	100	01/01/2026	12/31/2026
AL00138	CD-RMT-00068	CP003	Cloud Solutions Engineering	100	01/01/2026	12/31/2026
AL00139	CD-MAA01-00079	CP014	Cloud Solutions Engineering	100	01/01/2026	5/31/2026
AL00140	CD-RMT-00088	CP004	Cloud Solutions Engineering	50	01/01/2026	12/31/2026
AL00141	CD-RMT-00088	CP015	Cloud Solutions Engineering	50	01/01/2026	4/17/2026
AL00142	CD-MAA01-00090	CP005	Cloud Solutions Engineering	100	01/01/2026	3/30/2026
AL00143	CD-RMT-00129	CP006	Cloud Solutions Engineering	100	01/01/2026	7/31/2026
AL00144	CD-MAA01-00136	CP005	Cloud Solutions Engineering	100	01/01/2026	3/30/2026
AL00145	CD-CJB01-00206	CP007	Cloud Solutions Engineering	100	01/01/2026	7/31/2026
AL00146	CD-MAA01-00220	CP005	Cloud Solutions Engineering	100	01/01/2026	3/30/2026
AL00147	CD-MAA01-00217	CP005	Cloud Solutions Engineering	100	01/01/2026	3/30/2026
AL00148	CD-CJB01-00190	CP008	Cloud Solutions Engineering	100	01/01/2026	4/13/2026
AL00149	CD-MAA01-00204	CP007	Cloud Solutions Engineering	100	01/01/2026	7/31/2026
AL00150	CD-CJB01-00212	CP004	Cloud Solutions Engineering	100	01/01/2026	12/31/2026
AL00151	CD-MAA01-00273	CP009	Cloud Solutions Engineering	100	01/01/2026	
AL00152	CD-CJB01-00262	CP010	SRE	100	01/01/2026	7/30/2026
AL00153	CD-CJB01-00269	CP014	Cloud Solutions Engineering	100	01/01/2026	5/30/2026
AL00154	CD-MAA01-00363	CP010	Cloud Solutions Engineering	100	01/01/2026	7/30/2026
AL00155	CD-MAA01-00365	CDIN001	Cloud Solutions Engineering	100	01/01/2026	
AL00156	CD-MAA01-00459	CP011	Cloud Solutions Engineering	100	01/01/2026	3/30/2027
AL00157	CD-MAA01-00458	CP011	Cloud Solutions Engineering	100	01/01/2026	3/30/2027
AL00158	CD-MAA01-00457	CDIN001	Cloud Solutions Engineering	100	01/01/2026	
AL00159	CD-MAA01-00456	CP011	Cloud Solutions Engineering	100	01/01/2026	3/30/2027
AL00160	CD-CJB01-00433	CP012	Cloud Solutions Engineering	100	01/01/2026	
AL00161	CD-MAA01-00120	CP010	Cloud Solutions Engineering	100	01/01/2026	7/30/2026
AL00162	CD-MAA01-00375	CP013	SRE	100	01/01/2026	
AL00163	CD-CJB01-00060	CP013	SRE	100	01/01/2026	"""

data_em_pro = """employee_id	reporting_manager_id	employee_status	upcoming_leaves	employee_allocations
CD-MAA01-00033	CD-CJB01-011473	Bench		0
CD-MAA01-00090	CD-CJB01-011469	Allocated		100
CD-MAA01-00136	CD-CJB01-011470	Allocated		100
CD-MAA01-00217	CD-CJB01-011473	Allocated		100
CD-MAA01-00220	CD-CJB01-011473	Allocated		100
CD-RMT-00068	CD-CJB01-011473	Allocated		100
CD-RMT-00129	CD-CJB01-011470	Allocated		100
CD-CJB01-00206	CD-CJB01-011470	Allocated		100
CD-RMT-00088	CD-CJB01-011472	Allocated		100
CD-CJB01-00212	CD-CJB01-011469	Allocated		100
CD-MAA01-00005	CD-CJB01-011470	Allocated		100
CD-MAA01-00204	CD-CJB01-011470	Allocated		100
CD-CJB01-00190	CD-CJB01-011473	Allocated		100
CD-MAA01-00365	CD-CJB01-011473	Allocated		100
CD-MAA01-00361	CD-CJB01-011473	Bench		0
CD-MAA01-00368	CD-CJB01-011470	Bench		0
CD-MAA01-00363	CD-CJB01-011469	Allocated		100
CD-MAA01-00079	CD-CJB01-011470	Allocated		100
CD-CJB01-00030	CD-CJB01-011472	Bench		0
CD-MAA01-00417	CD-CJB01-011470	Bench		0
CD-MAA01-00459	CD-CJB01-011470	Allocated		100
CD-MAA01-00458	CD-MAA01-00255	Allocated		100
CD-MAA01-00457	CD-CJB01-00269	Allocated		100
CD-MAA01-00456	CD-MAA01-00005	Allocated		100
CD-CJB01-00433	CD-MAA01-00005	Allocated		100
CD-MAA01-00273	CD-MAA01-00217	Allocated		100
CD-CJB01-00262	CD-MAA01-00217	Allocated		100
CD-MAA01-00120	CD-MAA01-00255	Allocated		100
CD-CJB01-00269	CD-CJB01-00269	Allocated		100
CD-MAA01-00375	CD-MAA01-00005	Allocated		100
CD-CJB01-00060	CD-MAA01-00005	Allocated		100"""

def fmt(val):
    val = val.strip()
    if not val:
        return 'NULL'
    return "'" + val.replace("'", "''") + "'"
    
with open('/tmp/update_data.sql', 'w') as f:
    # Disable foreign key checks for truncation implicitly with CASCADE maybe?
    # Better yet, TRUNCATE with CASCADE
    f.write("-- TRUNCATE and Load\n")
    f.write("TRUNCATE TABLE employee_master, projects, projects_allocation, employee_master_pro CASCADE;\n\n")

    # employee_master
    reader = csv.reader(io.StringIO(data_em), delimiter='\t')
    headers = next(reader)
    for row in reader:
        if not any(row): continue
        vals = [fmt(v) for v in row]
        f.write(f"INSERT INTO employee_master ({', '.join(headers)}) VALUES ({', '.join(vals)});\n")

    f.write("\n")

    # projects
    reader = csv.reader(io.StringIO(data_proj), delimiter='\t')
    headers = next(reader)
    for row in reader:
        if not any(row): continue
        vals = [fmt(v) for v in row]
        f.write(f"INSERT INTO projects ({', '.join(headers)}) VALUES ({', '.join(vals)});\n")
        
    f.write("\n")

    # projects_allocation
    reader = csv.reader(io.StringIO(data_alloc), delimiter='\t')
    headers = next(reader)
    for row in reader:
        if not any(row): continue
        vals = [fmt(v) for v in row]
        f.write(f"INSERT INTO projects_allocation ({', '.join(headers)}) VALUES ({', '.join(vals)});\n")

    f.write("\n")

    # employee_masters_pro
    reader = csv.reader(io.StringIO(data_em_pro), delimiter='\t')
    headers = next(reader)
    for row in reader:
        if not any(row): continue
        vals = [fmt(v) for v in row]
        f.write(f"INSERT INTO employee_master_pro ({', '.join(headers)}) VALUES ({', '.join(vals)});\n")

print("Created /tmp/update_data.sql")
