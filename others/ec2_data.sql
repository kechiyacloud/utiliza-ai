--
-- PostgreSQL database dump
--

\restrict Rew9csPjX6VQyOVaWAXr56byl5KuVcd5PlXpSb1WDrJ10TX0I5gohKxuMn0kfXG

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
-- Data for Name: actionable_todos; Type: TABLE DATA; Schema: public; Owner: admin
--



--
-- Data for Name: certificates; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.stg_certificates (certificate_id, certificate_name) VALUES ('CI1234', 'HashiCorp Certified: Terraform Associate (003)');
INSERT INTO public.stg_certificates (certificate_id, certificate_name) VALUES ('CI1235', 'Microsoft Certified: DevOps Engineer Expert (AZ-400)');
INSERT INTO public.stg_certificates (certificate_id, certificate_name) VALUES ('CI1236', 'AWS Certified Solutions Architect - Professional');
INSERT INTO public.stg_certificates (certificate_id, certificate_name) VALUES ('CI1237', 'AWS Certified Solutions Architect – Associate (SAA-C03)');
INSERT INTO public.stg_certificates (certificate_id, certificate_name) VALUES ('CI1238', 'Certified Kubernetes Administrator (CKA)');
INSERT INTO public.stg_certificates (certificate_id, certificate_name) VALUES ('CI1239', 'Microsoft Certified: Azure Administrator Associate (AZ-104)');
INSERT INTO public.stg_certificates (certificate_id, certificate_name) VALUES ('CI1240', 'Microsoft Certified: Azure Solutions Architect Expert (AZ-305)');
INSERT INTO public.stg_certificates (certificate_id, certificate_name) VALUES ('CI1241', 'Microsoft Azure Administrator Certification Transition (AZ-102)');
INSERT INTO public.stg_certificates (certificate_id, certificate_name) VALUES ('C11242', 'AWS Certified Cloud Practitioner (CLF-C02)');


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.stg_clients (client_id, client_name, website_url, industry, status, budget) VALUES ('CL-1774437023740', 'masterbatter', 'masterbatter', 'Retail', 'Growing', 10000.0);


--
-- Data for Name: employee_master; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (1, 'CD-MAA01-00033', 'Naveen Vasanthakumar', 9123456902, 'naveenv@clouddestinations.com', 'Coimbatore', 'WFO', '2021-02-03', 'Cloud Architecht', 'Cloud Solutions Engineering', 'FTE', 6, 5.1, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (2, 'CD-MAA01-00090', 'Mohan Muruganandham', 9123456903, 'mohanm@clouddestinations.com', 'Chennai', 'WFO', '2020-12-17', 'Senior Engineer', 'Cloud Solutions Engineering', 'FTE', 6, 5.2, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (3, 'CD-MAA01-00136', 'Pavithra Ranganathan', 9123456904, 'pavithrar@clouddestinations.com', 'Coimbatore', 'WFO', '2019-10-26', 'Senior Engineer', 'Cloud Solutions Engineering', 'FTE', 7, 6.4, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (4, 'CD-MAA01-00217', 'Muthu Mohamed Inzamam Bari Mahaboob Ali', 9123456905, 'inzamamb@clouddestinations.com', 'Remote', 'WFO', '2023-10-18', 'Senior Engineer', 'Cloud Solutions Engineering', 'FTE', 5, 2.4, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (5, 'CD-MAA01-00220', 'Syed Ali Asan', 9123456906, 'syeda@clouddestinations.com', 'Coimbatore', 'WFO', '2017-08-25', 'Senior Engineer', 'Cloud Solutions Engineering', 'FTE', 10, 8.5, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (6, 'CD-RMT-00068', 'Varisha P Md', 9123456922, 'varishap@clouddestinations.com', 'Chennai', 'WFO', '2020-08-09', 'Engineer', 'Cloud Solutions Engineering', 'FTE', 7, 5.6, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (7, 'CD-RMT-00129', 'DharaniKumar Appar', 9123456924, 'dharanik@clouddestinations.com', 'Chennai', 'WFO', '2018-06-08', 'Engineer', 'Cloud Solutions Engineering', 'FTE', 8, 7.8, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (8, 'CD-CJB01-00206', 'Jose Rayan', 9123456928, 'joser@clouddestinations.com', 'Chennai', 'WFO', '2021-04-25', 'Engineer', 'Cloud Solutions Engineering', 'FTE', 4.9, 4.9, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (9, 'CD-RMT-00088', 'Prudhvi Raj Anupoju', 9123456925, 'prudhvir@clouddestinations.com', 'Chennai', 'WFO', '2017-06-15', 'Engineer', 'Cloud Solutions Engineering', 'FTE', 8, 8.7, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (22, 'CD-MAA01-00458', 'Ijaaz Ahamed', 9551416338, 'ijaaza@clouddestinations.com', 'Chennai', 'Hybrid', '2025-05-11', 'Associate Engineer', 'Cloud Solutions Engineering', 'Full Time', 8, 0.8, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (10, 'CD-CJB01-00212', 'Dinesh Palanisamy', 9123456926, 'dineshp@clouddestinations.com', 'Coimbatore', 'WFO', '2018-01-24', 'Senior Engineer', 'Cloud Solutions Engineering', 'FTE', 10, 8.1, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (11, 'CD-MAA01-00005', 'Mohanraj Balan', 9123456927, 'mohanrajb@clouddestinations.com', 'Chennai', 'WFO', '2017-08-18', 'Senior Engineer', 'Cloud Solutions Engineering', 'FTE', 9, 8.5, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (12, 'CD-MAA01-00204', 'Priyanka Mohan', 9123456929, 'priyankam@clouddestinations.com', 'Coimbatore', 'WFO', '2019-08-24', 'Engineer', 'Cloud Solutions Engineering', 'FTE', 8, 6.5, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (13, 'CD-CJB01-00190', 'Naresh Pandian Chinna', 9123456930, 'nareshp@clouddestinations.com', 'Remote', 'WFO', '2020-09-13', 'Senior Engineer', 'Cloud Solutions Engineering', 'FTE', 5, 5.5, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (14, 'CD-MAA01-00365', 'Bhavani Selvarajah', 9123456931, 'bhavani@clouddestinations.com', 'Remote', 'WFO', '2023-07-26', 'Senior Engineer', 'Cloud Solutions Engineering', 'FTE', 5, 2.6, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (15, 'CD-MAA01-00361', 'Naveen Srinivasan', 9123456934, 'naveens@clouddestinations.com', 'Remote', 'WFO', '2017-09-08', 'Devops Engineer', 'Cloud Solutions Engineering', 'FTE', 12, 8.5, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (23, 'CD-MAA01-00457', 'Vishnupriya Eakambaram', 8300059342, 'vishnupriyae@clouddestinations.com', 'Chennai', 'WFO', '2025-05-11', 'Associate Engineer', 'Cloud Solutions Engineering', 'FTE', 1, 0.8, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (16, 'CD-MAA01-00368', 'Rahul Mohan', 9123456935, 'rahulm@clouddestinations.com', 'Chennai', 'WFO', '2023-03-02', 'Devops Lead ', 'Cloud Solutions Engineering', 'FTE', 4, 3, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (17, 'CD-MAA01-00363', 'Venkatesh Gunasekaran', 9123456938, 'venkateshg@clouddestinations.com', 'Remote', 'WFO', '2017-02-22', 'Engineer', 'Cloud Solutions Engineering', 'FTE', 9, 9, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (18, 'CD-MAA01-00079', 'Preethi Ramesh', 9123456940, 'preethir@clouddestinations.com', 'Remote', 'WFO', '2020-09-11', 'Engineer', 'Cloud Solutions Engineering', 'FTE', 6, 5.5, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (19, 'CD-CJB01-00030', 'Aravindan Rajendran', 9123456941, 'aravindanr@clouddestinations.com', 'Remote', 'WFO', '2020-06-20', 'Engineer', 'SRE', 'FTE', 7, 5.7, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (20, 'CD-MAA01-00417', 'Ramkumar C', 9123456844, 'ramkumar@clouddestinations.com', 'Chennai', 'WFO', '2025-10-31', 'Engineer', 'Cloud Solutions Engineering', 'FTE', 4, 0.5, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (21, 'CD-MAA01-00459', 'Prasanth Subramanian', 9566464770, 'sprasanth@clouddestinations.com', 'Chennai', 'WFO', '2025-05-11', 'Associate Engineer', 'Cloud Solutions Engineering', 'FTE', 2, 0.8, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (24, 'CD-A0082', 'Vivin kumar ', 9003013557, 'vivink@clouddestination.com ', 'Chennai', 'WFO', '2025-06-22', ' Associate Trainee', 'Cloud Solutions Engineering', 'INTEN', 1, 0.7, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', '2026-03-13', NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (25, 'CD-MAA01-00456', 'Kechiya Sunil', 9566464770, 'kechiyav@clouddestinations.com', 'Chennai', 'WFO', '2025-05-14', 'Associate Engineer', 'Cloud Solutions Engineering', 'FTE', 1, 0.8, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (26, 'CD-CJB01-00433', 'Santhosh Kumar Periasamy', 9566464771, 'santhoshp@clouddestinations.com', 'Chennai', 'WFO', '2025-05-14', 'Senior DevOps Engineer', 'Cloud Solutions Engineering', 'FTE', 5, 4, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (27, 'CD-MAA01-00273', 'Sona Shri Suresh Sangeetha', 9566464772, 'sonas@clouddestinations.com', 'Chennai', 'WFO', '2021-04-25', 'Engineer', 'Cloud Solutions Engineering', 'FTE', 2, 2, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (28, 'CD-CJB01-00262', 'Durai Kanakashabai', 9566464772, NULL, 'Chennai', 'WFO', '2021-04-25', 'Associate Lead Site Reliability Engineer', 'SRE', 'FTE', 3, 2, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (29, 'CD-MAA01-00120', 'Gobi', 9566464772, NULL, 'Chennai', 'WFO', '2021-04-26', 'Associate Lead Site Reliability Engineer', 'SRE', 'FTE', 2, 1, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (30, 'CD-CJB01-00269', 'Sriram Rajasekaran', 9566464772, NULL, 'Chennai', 'WFO', '2021-04-27', 'Senior Engineer', 'Cloud Solutions Engineering', 'FTE', 4, 3, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (31, 'CD-MAA01-00375', 'Thamizh', 9566464772, NULL, 'Chennai', 'WFO', '2021-04-28', 'Senior SRE Engineer', 'SRE', 'FTE', 3, 2, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);
INSERT INTO public.stg_employee_master (si_number, employee_id, employee_name, phone_number, email_id, location, mode_of_work, date_of_joining, role_designation, department, employee_type, total_experience, experience_in_cd, shift, time_zone, date_of_resign, photo_url) VALUES (32, 'CD-CJB01-00060', 'Vasanth Poovaraghavan', 9566464772, NULL, 'Chennai', 'WFO', '2021-04-29', 'Site Reliability Engineer', 'SRE', 'FTE', 3, 2, 'General (10:00 AM - 07:00 PM)', '(GMT+05:30)', NULL, NULL);


--
-- Data for Name: employee_certificates; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.stg_employee_certificates (certificate_id, employee_id) VALUES ('CI1237', 'CD-MAA01-00368');
INSERT INTO public.stg_employee_certificates (certificate_id, employee_id) VALUES ('CI1237', 'CD-MAA01-00363');
INSERT INTO public.stg_employee_certificates (certificate_id, employee_id) VALUES ('C11242', 'CD-MAA01-00363');
INSERT INTO public.stg_employee_certificates (certificate_id, employee_id) VALUES ('CI1239', 'CD-MAA01-00361');
INSERT INTO public.stg_employee_certificates (certificate_id, employee_id) VALUES ('CI1234', 'CD-MAA01-00368');


--
-- Data for Name: employee_master_pro; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-MAA01-00033', 'CD-CJB01-011473', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-A0082', NULL, 'Bench', NULL, 0);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-MAA01-00361', 'CD-CJB01-011473', 'Bench', NULL, 0);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-MAA01-00368', 'CD-CJB01-011470', 'Bench', NULL, 0);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-MAA01-00005', 'CD-CJB01-011470', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-RMT-00068', 'CD-CJB01-011473', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-RMT-00088', 'CD-CJB01-011472', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-MAA01-00090', 'CD-CJB01-011469', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-RMT-00129', 'CD-CJB01-011470', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-MAA01-00136', 'CD-CJB01-011470', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-CJB01-00206', 'CD-CJB01-011470', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-MAA01-00220', 'CD-CJB01-011473', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-MAA01-00217', 'CD-CJB01-011473', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-MAA01-00204', 'CD-CJB01-011470', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-CJB01-00212', 'CD-CJB01-011469', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-MAA01-00365', 'CD-CJB01-011473', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-MAA01-00458', 'CD-MAA01-00255', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-CJB01-00030', 'CD-CJB01-011472', 'Bench', NULL, 0);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-MAA01-00417', 'CD-CJB01-011470', 'Bench', NULL, 0);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-CJB01-00060', 'CD-MAA01-00005', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-MAA01-00079', 'CD-CJB01-011470', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-CJB01-00190', 'CD-CJB01-011473', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-MAA01-00273', 'CD-MAA01-00217', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-CJB01-00262', 'CD-MAA01-00217', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-CJB01-00269', 'CD-CJB01-00269', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-MAA01-00363', 'CD-CJB01-011469', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-MAA01-00459', 'CD-CJB01-011470', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-MAA01-00457', 'CD-CJB01-00269', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-MAA01-00456', 'CD-MAA01-00005', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-CJB01-00433', 'CD-MAA01-00005', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-MAA01-00120', 'CD-MAA01-00255', 'Allocated', NULL, 100);
INSERT INTO public.stg_employee_master_pro (employee_id, reporting_manager_id, employee_status, upcoming_leaves, employee_allocations) VALUES ('CD-MAA01-00375', 'CD-MAA01-00005', 'Allocated', NULL, 100);


--
-- Data for Name: employee_nominations; Type: TABLE DATA; Schema: public; Owner: admin
--



--
-- Data for Name: skills; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1001, 'Python');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1002, 'GitHub Actions');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1003, 'Jenkins');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1004, 'Linux');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1005, 'ECS');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1006, 'EKS');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1007, 'CloudFormation');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1008, 'Route 53');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1009, 'DataDogs');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1010, 'Promethius');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1011, 'Grafana');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1012, 'React');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1013, 'Power BI');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1014, 'Postgres SQL');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1015, 'Docker');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1016, 'EC2');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1017, 'AWS KMS');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1018, 'GCP');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1019, 'Vertex AI');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1020, 'Azure');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1021, 'RAG');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1022, 'Vector DB');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1023, 'Javascript');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1024, 'Cost Explorer');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1025, 'Lambda');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1101, 'Linux');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1102, 'Bash Scripting');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1103, 'Python Automation');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1104, 'Git');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1105, 'GitHub');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1106, 'GitHub Actions');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1107, 'GitLab CI/CD');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1108, 'Jenkins');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1109, 'CI/CD Pipeline Design');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1110, 'Docker');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1111, 'Kubernetes');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1112, 'Helm');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1113, 'Terraform');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1114, 'Ansible');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1115, 'Infrastructure as Code');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1116, 'AWS');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1117, 'Azure');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1118, 'Google Cloud Platform');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1119, 'EC2');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1120, 'EKS');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1121, 'ECS');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1122, 'Lambda');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1123, 'S3');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1124, 'IAM');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1125, 'VPC');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1126, 'Load Balancer');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1127, 'CloudWatch');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1128, 'Prometheus');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1129, 'Grafana');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1130, 'ELK Stack');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1131, 'Splunk');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1132, 'Datadog');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1133, 'Observability');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1134, 'Monitoring & Alerting');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1135, 'Incident Management');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1136, 'Root Cause Analysis');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1137, 'Site Reliability Engineering');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1138, 'Service Level Objectives (SLO)');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1139, 'Service Level Indicators (SLI)');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1140, 'Service Level Agreements (SLA)');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1141, 'High Availability Architecture');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1142, 'Auto Scaling');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1143, 'Capacity Planning');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1144, 'Disaster Recovery');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1145, 'Networking Fundamentals');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1146, 'TCP/IP');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1147, 'DNS');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1148, 'HTTP/HTTPS');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1149, 'Security Best Practices');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1150, 'DevSecOps');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1151, 'Secrets Management');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1152, 'AWS KMS');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1153, 'Container Security');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1154, 'Kafka');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1155, 'RabbitMQ');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1156, 'NGINX');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1157, 'API Gateway');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1158, 'System Design');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1159, 'Chaos Engineering');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1160, 'Performance Tuning');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1161, 'CloudFormation');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1162, 'React');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1163, 'Tailwind CSS');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1164, 'SQL');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1165, 'InfluxDB');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1166, 'PostgreSQL');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1167, 'Python');
INSERT INTO public.stg_skills (skill_id, skill_name) VALUES (1168, 'Power BI');


--
-- Data for Name: employee_skills; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00033', 1109, 3, 1);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00033', 1168, 5, 3);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00033', 1001, 2, 1.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00033', 1151, 1, 4.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00033', 1005, 1, 4.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00033', 1140, 1, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00033', 1163, 5, 0.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00033', 1110, 4, 1.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00033', 1156, 2, 3.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00033', 1152, 5, 3.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00090', 1023, 4, 1.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00090', 1151, 1, 2.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00090', 1135, 3, 3);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00090', 1129, 4, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00090', 1156, 3, 1);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00090', 1161, 3, 3.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00090', 1155, 2, 3);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00090', 1103, 2, 4);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00090', 1007, 5, 2.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00090', 1154, 3, 3);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00136', 1021, 5, 1.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00136', 1005, 3, 2);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00136', 1110, 1, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00136', 1114, 5, 1.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00136', 1119, 4, 1);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00136', 1106, 5, 2);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00136', 1007, 4, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00136', 1117, 5, 3.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00136', 1010, 1, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00220', 1140, 1, 3);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00005', 1104, 2, 4);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00005', 1115, 5, 1);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00005', 1018, 2, 2.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00005', 1116, 1, 2.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00005', 1021, 1, 4.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00005', 1141, 1, 0.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00204', 1002, 4, 4.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00204', 1149, 5, 2.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00204', 1006, 3, 4.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00204', 1105, 5, 1);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00204', 1165, 3, 1.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00204', 1112, 5, 3);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00204', 1156, 3, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00204', 1005, 5, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00204', 1129, 2, 0.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00204', 1025, 3, 4.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00190', 1161, 4, 1.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00190', 1015, 3, 3.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00365', 1118, 5, 0.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00365', 1146, 2, 4);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00365', 1125, 2, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00365', 1018, 3, 3.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00361', 1128, 5, 3.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00361', 1134, 2, 2.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00361', 1127, 2, 0.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00361', 1151, 3, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00361', 1136, 3, 2.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00361', 1153, 4, 1.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00361', 1168, 1, 2.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00361', 1138, 2, 3);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00361', 1130, 1, 1);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00361', 1007, 1, 2.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00368', 1165, 2, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00368', 1113, 5, 3.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00368', 1112, 2, 3);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00068', 1112, 4, 1.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00068', 1002, 5, 4.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00068', 1014, 2, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00068', 1023, 4, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00068', 1118, 2, 1.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00068', 1012, 2, 4.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00129', 1157, 3, 3);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00129', 1166, 3, 1);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00129', 1147, 5, 1.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00129', 1123, 3, 4);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00129', 1124, 3, 2.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00129', 1130, 4, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00129', 1165, 5, 4);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00129', 1161, 5, 4.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00129', 1141, 2, 2.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00129', 1010, 1, 3);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00206', 1001, 2, 4.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00206', 1129, 1, 2.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00206', 1136, 4, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00206', 1131, 5, 1);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00206', 1104, 5, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00206', 1126, 5, 4.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00206', 1167, 3, 3.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00206', 1166, 2, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00206', 1145, 2, 3.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00206', 1003, 4, 1.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00088', 1132, 5, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00088', 1122, 3, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00088', 1012, 5, 3.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00088', 1016, 4, 4);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00088', 1165, 3, 2);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00088', 1022, 5, 4);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00088', 1136, 2, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00088', 1001, 1, 3.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00088', 1150, 1, 0.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00088', 1008, 1, 3.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00212', 1154, 2, 2.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00212', 1022, 4, 4);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00212', 1005, 2, 3);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00212', 1011, 5, 3.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00212', 1105, 1, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00212', 1150, 1, 2);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00212', 1123, 1, 1);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00212', 1137, 2, 4.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00212', 1162, 4, 0.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00212', 1146, 1, 4.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00005', 1010, 1, 3);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00005', 1016, 4, 4);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00005', 1004, 2, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00005', 1013, 1, 2.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00365', 1105, 3, 3);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00365', 1157, 4, 2.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00368', 1020, 2, 2.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00368', 1014, 5, 1.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00368', 1021, 5, 2);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00368', 1108, 2, 4.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00368', 1016, 1, 3);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00368', 1019, 1, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00368', 1114, 4, 2.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00363', 1119, 3, 1);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00363', 1018, 2, 4.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00363', 1001, 1, 2.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00363', 1007, 2, 3);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00363', 1150, 3, 0.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00363', 1104, 4, 3.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00363', 1006, 4, 2);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00363', 1023, 5, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00363', 1008, 2, 1);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00363', 1122, 2, 4);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00079', 1110, 5, 1);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00079', 1159, 5, 4);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00079', 1001, 4, 3.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00079', 1019, 5, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00079', 1115, 2, 4);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00079', 1147, 1, 4);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00079', 1135, 5, 4.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00079', 1111, 2, 3.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00079', 1116, 2, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00079', 1107, 2, 1.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00030', 1012, 2, 4);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00030', 1015, 1, 0.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00030', 1113, 5, 3);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00030', 1157, 1, 4);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00030', 1128, 2, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00030', 1132, 5, 3);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00030', 1006, 5, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00030', 1118, 4, 1.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00030', 1008, 5, 1.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00030', 1146, 5, 4);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00068', 1130, 5, 2);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00068', 1004, 2, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00068', 1016, 4, 0.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-RMT-00068', 1020, 1, 1.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00136', 1022, 1, 2.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00217', 1149, 1, 0.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00217', 1015, 1, 3.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00217', 1123, 4, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00217', 1106, 3, 4.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00217', 1016, 3, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00217', 1163, 4, 0.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00217', 1022, 2, 0.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00217', 1122, 2, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00217', 1021, 5, 2);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00217', 1002, 2, 2);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00220', 1162, 3, 0.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00220', 1101, 4, 4.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00220', 1022, 3, 4.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00220', 1119, 3, 4);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00220', 1107, 5, 3);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00220', 1102, 5, 4.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00220', 1001, 1, 2.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00220', 1004, 5, 4.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00220', 1114, 5, 0.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00190', 1001, 3, 2);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00190', 1002, 2, 2.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00190', 1004, 3, 4);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00190', 1003, 1, 2);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00190', 1007, 5, 1.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00190', 1009, 1, 5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00190', 1106, 5, 1.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-CJB01-00190', 1116, 3, 4.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00365', 1114, 2, 2.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00365', 1128, 1, 4);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00365', 1147, 4, 3.5);
INSERT INTO public.stg_employee_skills (employee_id, skill_id, proficiency_level, years_of_experience) VALUES ('CD-MAA01-00365', 1121, 4, 3);


--
-- Data for Name: partners; Type: TABLE DATA; Schema: public; Owner: admin
--



--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.stg_projects (project_id, project_name, project_status, billable, start_date, end_date, project_type, client_name, budget, billing_type, contract_type, revenue_model, commercial_notes, objective, deliverables, milestones, timeline_notes, client_id, partner_id) VALUES ('CDIN001', 'Project Dashboard', 'In Progress', 'Non - Billable', '2026-01-13', '2026-03-12', 'Internal', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.stg_projects (project_id, project_name, project_status, billable, start_date, end_date, project_type, client_name, budget, billing_type, contract_type, revenue_model, commercial_notes, objective, deliverables, milestones, timeline_notes, client_id, partner_id) VALUES ('CP010', 'On Lok', 'In-Progress', 'Billable', '2025-12-31', '2026-07-31', 'Client', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.stg_projects (project_id, project_name, project_status, billable, start_date, end_date, project_type, client_name, budget, billing_type, contract_type, revenue_model, commercial_notes, objective, deliverables, milestones, timeline_notes, client_id, partner_id) VALUES ('CP001', 'MHC', 'In-Progress', 'Billable', '2025-12-31', '2026-07-31', 'Client', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.stg_projects (project_id, project_name, project_status, billable, start_date, end_date, project_type, client_name, budget, billing_type, contract_type, revenue_model, commercial_notes, objective, deliverables, milestones, timeline_notes, client_id, partner_id) VALUES ('CP002', 'Bespin POD - Costco', 'In-Progress', 'Billable', '2025-12-31', '2026-12-31', 'Client', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.stg_projects (project_id, project_name, project_status, billable, start_date, end_date, project_type, client_name, budget, billing_type, contract_type, revenue_model, commercial_notes, objective, deliverables, milestones, timeline_notes, client_id, partner_id) VALUES ('CP003', 'Bespin - SEA', 'In-Progress', 'Billable', '2025-12-31', '2026-12-31', 'Client', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.stg_projects (project_id, project_name, project_status, billable, start_date, end_date, project_type, client_name, budget, billing_type, contract_type, revenue_model, commercial_notes, objective, deliverables, milestones, timeline_notes, client_id, partner_id) VALUES ('CP004', 'Bespin POD - Services for SRTA Tolling System AWS Design and Build - Phase 2
', 'In-Progress', 'Billable', '2025-12-31', '2026-12-31', 'Client', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.stg_projects (project_id, project_name, project_status, billable, start_date, end_date, project_type, client_name, budget, billing_type, contract_type, revenue_model, commercial_notes, objective, deliverables, milestones, timeline_notes, client_id, partner_id) VALUES ('CP005', 'Josys Infrastructure Provisioning & Management
', 'In-Progress', 'Billable', '2025-12-31', '2026-03-30', 'Client', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.stg_projects (project_id, project_name, project_status, billable, start_date, end_date, project_type, client_name, budget, billing_type, contract_type, revenue_model, commercial_notes, objective, deliverables, milestones, timeline_notes, client_id, partner_id) VALUES ('CP006', 'Inertia', 'In-Progress', 'Billable', '2025-12-31', '2026-07-31', 'Client', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.stg_projects (project_id, project_name, project_status, billable, start_date, end_date, project_type, client_name, budget, billing_type, contract_type, revenue_model, commercial_notes, objective, deliverables, milestones, timeline_notes, client_id, partner_id) VALUES ('CP007', 'Forge', 'In-Progress', 'Billable', '2025-12-31', '2026-07-31', 'Client', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.stg_projects (project_id, project_name, project_status, billable, start_date, end_date, project_type, client_name, budget, billing_type, contract_type, revenue_model, commercial_notes, objective, deliverables, milestones, timeline_notes, client_id, partner_id) VALUES ('CP008', 'Bespin Non POD - MAP', 'In-Progress', 'Billable', '2025-12-31', '2026-04-13', 'Client', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.stg_projects (project_id, project_name, project_status, billable, start_date, end_date, project_type, client_name, budget, billing_type, contract_type, revenue_model, commercial_notes, objective, deliverables, milestones, timeline_notes, client_id, partner_id) VALUES ('CP009', 'Forge- Shadow (Priyanka)', 'In-Progress', 'Non - Billable', '2025-12-31', NULL, 'Client', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.stg_projects (project_id, project_name, project_status, billable, start_date, end_date, project_type, client_name, budget, billing_type, contract_type, revenue_model, commercial_notes, objective, deliverables, milestones, timeline_notes, client_id, partner_id) VALUES ('CP011', 'On Lok -NOC/SOC - Planned', 'In-Progress', 'Non - Billable', '2025-12-31', '2027-03-30', 'Client', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.stg_projects (project_id, project_name, project_status, billable, start_date, end_date, project_type, client_name, budget, billing_type, contract_type, revenue_model, commercial_notes, objective, deliverables, milestones, timeline_notes, client_id, partner_id) VALUES ('CP012', 'EverGreen Unification- Planned', 'In-Progress', 'Non - Billable', '2025-12-31', NULL, 'Client', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.stg_projects (project_id, project_name, project_status, billable, start_date, end_date, project_type, client_name, budget, billing_type, contract_type, revenue_model, commercial_notes, objective, deliverables, milestones, timeline_notes, client_id, partner_id) VALUES ('CP013', 'Quantiphi, Caresoft - Planned
', 'In-Progress', 'Non - Billable', '2025-12-31', NULL, 'Client', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.stg_projects (project_id, project_name, project_status, billable, start_date, end_date, project_type, client_name, budget, billing_type, contract_type, revenue_model, commercial_notes, objective, deliverables, milestones, timeline_notes, client_id, partner_id) VALUES ('CP014', 'Optum AIOps', 'In-Progress', 'Billable', '2025-12-31', '2026-05-29', 'Client', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.stg_projects (project_id, project_name, project_status, billable, start_date, end_date, project_type, client_name, budget, billing_type, contract_type, revenue_model, commercial_notes, objective, deliverables, milestones, timeline_notes, client_id, partner_id) VALUES ('CP015', 'Movius - Onprem to Cloud Migration', 'In-Progress', 'Billable', '2025-12-31', '2026-04-16', 'Client', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.stg_projects (project_id, project_name, project_status, billable, start_date, end_date, project_type, client_name, budget, billing_type, contract_type, revenue_model, commercial_notes, objective, deliverables, milestones, timeline_notes, client_id, partner_id) VALUES ('CP016', 'Onyx Devops Support', 'In-Progress', 'Billable', '2025-12-31', '2026-12-30', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: project_commercials; Type: TABLE DATA; Schema: public; Owner: admin
--



--
-- Data for Name: project_scopes; Type: TABLE DATA; Schema: public; Owner: admin
--



--
-- Data for Name: project_skills; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CDIN001', 1013);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CDIN001', 1161);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CDIN001', 1155);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CDIN001', 1165);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CDIN001', 1129);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CDIN001', 1143);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CDIN001', 1120);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CDIN001', 1011);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CDIN001', 1128);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CDIN001', 1004);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CDIN001', 1115);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CDIN001', 1127);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP001', 1007);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP001', 1125);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP001', 1003);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP001', 1121);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP001', 1011);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP001', 1167);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP001', 1140);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP001', 1008);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP001', 1006);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP001', 1168);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP001', 1022);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP001', 1129);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP002', 1103);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP002', 1112);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP002', 1130);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP002', 1004);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP002', 1110);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP002', 1141);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP002', 1149);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP002', 1001);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP002', 1133);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP002', 1115);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP002', 1127);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP002', 1126);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP003', 1004);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP003', 1013);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP003', 1116);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP003', 1018);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP003', 1107);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP003', 1119);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP003', 1021);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP003', 1101);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP003', 1015);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP003', 1111);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP003', 1112);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP003', 1102);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP004', 1001);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP004', 1019);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP004', 1112);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP004', 1115);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP004', 1021);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP004', 1164);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP004', 1144);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP004', 1013);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP004', 1159);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP004', 1024);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP004', 1002);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP004', 1004);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP005', 1120);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP005', 1129);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP005', 1114);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP005', 1011);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP005', 1130);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP005', 1015);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP005', 1004);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP005', 1001);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP005', 1159);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP005', 1006);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP005', 1126);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP005', 1158);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP006', 1124);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP006', 1106);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP006', 1002);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP006', 1121);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP006', 1019);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP006', 1113);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP006', 1022);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP006', 1010);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP006', 1108);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP006', 1020);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP006', 1111);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP006', 1119);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP007', 1003);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP007', 1123);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP007', 1133);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP007', 1014);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP007', 1126);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP007', 1154);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP007', 1009);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP007', 1142);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP007', 1147);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP007', 1122);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP007', 1128);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP007', 1025);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP008', 1145);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP008', 1126);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP008', 1162);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP008', 1163);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP008', 1130);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP008', 1141);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP008', 1155);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP008', 1003);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP008', 1157);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP008', 1164);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP008', 1024);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP008', 1009);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP009', 1104);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP009', 1016);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP009', 1123);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP009', 1126);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP009', 1132);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP009', 1155);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP009', 1157);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP009', 1143);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP009', 1124);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP009', 1127);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP009', 1168);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP009', 1129);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP010', 1011);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP010', 1112);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP010', 1104);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP010', 1105);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP010', 1015);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP010', 1008);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP010', 1122);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP010', 1006);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP010', 1007);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP010', 1017);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP010', 1018);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP010', 1133);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP011', 1107);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP011', 1128);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP011', 1158);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP011', 1163);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP011', 1131);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP011', 1157);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP011', 1168);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP011', 1165);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP011', 1148);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP011', 1140);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP011', 1123);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP011', 1164);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP012', 1004);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP012', 1016);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP012', 1118);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP012', 1112);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP012', 1121);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP012', 1114);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP012', 1122);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP012', 1150);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP012', 1020);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP012', 1117);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP012', 1116);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP012', 1142);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP013', 1126);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP013', 1011);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP013', 1103);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP013', 1110);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP013', 1002);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP013', 1004);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP013', 1130);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP013', 1013);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP013', 1135);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP013', 1020);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP013', 1163);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP013', 1118);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP014', 1013);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP014', 1145);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP014', 1103);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP014', 1161);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP014', 1004);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP014', 1168);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP014', 1147);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP014', 1126);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP014', 1157);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP014', 1022);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP014', 1159);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP014', 1154);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP015', 1007);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP015', 1003);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP015', 1164);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP015', 1119);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP015', 1111);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP015', 1010);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP015', 1104);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP015', 1117);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP015', 1115);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP015', 1105);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP015', 1110);
INSERT INTO public.stg_project_skills (project_id, skill_id) VALUES ('CP015', 1004);


--
-- Data for Name: projects_allocation; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00137', 'CD-MAA01-00005', 'CP002', 'Cloud Solutions Engineering', 100, '2025-12-31', '2026-12-30', 'Billable', 40, 40, 40, 40, 40.00, '[40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0, 40.0]');
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00138', 'CD-RMT-00068', 'CP003', 'Cloud Solutions Engineering', 100, '2025-12-31', '2026-12-30', 'Billable', 40, 40, 40, 40, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00139', 'CD-MAA01-00079', 'CP014', 'Cloud Solutions Engineering', 100, '2025-12-31', '2026-05-30', 'Billable', 40, 40, 40, 40, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00140', 'CD-RMT-00088', 'CP004', 'Cloud Solutions Engineering', 50, '2025-12-31', '2026-12-30', 'Billable', 20, 20, 20, 20, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00141', 'CD-RMT-00088', 'CP015', 'Cloud Solutions Engineering', 50, '2025-12-31', '2026-04-16', 'Billable', 20, 20, 20, 20, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00142', 'CD-MAA01-00090', 'CP005', 'Cloud Solutions Engineering', 100, '2025-12-31', '2026-03-29', 'Billable', 40, 40, 40, 40, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00143', 'CD-RMT-00129', 'CP006', 'Cloud Solutions Engineering', 100, '2025-12-31', '2026-07-30', 'Billable', 40, 40, 40, 40, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00144', 'CD-MAA01-00136', 'CP005', 'Cloud Solutions Engineering', 100, '2025-12-31', '2026-03-29', 'Billable', 40, 40, 40, 40, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00145', 'CD-CJB01-00206', 'CP007', 'Cloud Solutions Engineering', 100, '2025-12-31', '2026-07-30', 'Billable', 40, 40, 40, 40, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00146', 'CD-MAA01-00220', 'CP005', 'Cloud Solutions Engineering', 100, '2025-12-31', '2026-03-29', 'Billable', 40, 40, 40, 40, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00147', 'CD-MAA01-00217', 'CP005', 'Cloud Solutions Engineering', 100, '2025-12-31', '2026-03-29', 'Billable', 40, 40, 40, 40, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00148', 'CD-CJB01-00190', 'CP008', 'Cloud Solutions Engineering', 100, '2025-12-31', '2026-04-12', 'Billable', 40, 40, 40, 40, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00149', 'CD-MAA01-00204', 'CP007', 'Cloud Solutions Engineering', 100, '2025-12-31', '2026-07-30', 'Billable', 40, 40, 40, 40, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00150', 'CD-CJB01-00212', 'CP004', 'Cloud Solutions Engineering', 100, '2025-12-31', '2026-12-30', 'Billable', 40, 40, 40, 40, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00151', 'CD-MAA01-00273', 'CP009', 'Cloud Solutions Engineering', 100, '2025-12-31', NULL, 'NonBillabel', 40, 40, 40, 40, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00152', 'CD-CJB01-00262', 'CP010', 'SRE', 100, '2025-12-31', '2026-07-29', 'Billable', 40, 40, 40, 40, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00153', 'CD-CJB01-00269', 'CP014', 'Cloud Solutions Engineering', 100, '2025-12-31', '2026-05-29', 'Billable', 40, 40, 40, 40, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00154', 'CD-MAA01-00363', 'CP010', 'Cloud Solutions Engineering', 100, '2025-12-31', '2026-07-29', 'Billable', 40, 40, 40, 40, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00155', 'CD-MAA01-00365', 'CDIN001', 'Cloud Solutions Engineering', 100, '2025-12-31', NULL, 'NonBillabel', 40, 40, 40, 40, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00156', 'CD-MAA01-00459', 'CP011', 'Cloud Solutions Engineering', 100, '2025-12-31', '2027-03-29', 'NonBillabel', 40, 40, 40, 40, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00158', 'CD-MAA01-00457', 'CDIN001', 'Cloud Solutions Engineering', 100, '2025-12-31', NULL, 'NonBillabel', 40, 40, 40, 40, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00159', 'CD-MAA01-00456', 'CP011', 'Cloud Solutions Engineering', 100, '2025-12-31', '2027-03-29', 'NonBillabel', 40, 40, 40, 40, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00160', 'CD-CJB01-00433', 'CP012', 'Cloud Solutions Engineering', 100, '2025-12-31', NULL, 'NonBillabel', 40, 40, 40, 40, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00161', 'CD-MAA01-00120', 'CP010', 'Cloud Solutions Engineering', 100, '2025-12-31', '2026-07-29', 'Billable', 40, 40, 40, 40, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00162', 'CD-MAA01-00375', 'CP013', 'SRE', 100, '2025-12-31', NULL, 'NonBillabel', 40, 40, 40, 40, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00163', 'CD-CJB01-00060', 'CP013', 'SRE', 100, '2025-12-31', NULL, 'NonBillabel', 40, 40, 40, 40, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00164', 'CD-MAA01-00033', 'CP016', 'Cloud Solutions Engineering', 25, '2025-12-31', '2026-12-30', 'Billable', 10, 10, 10, 10, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00165', 'CD-MAA01-00033', 'CP015', 'Cloud Solutions Engineering', 25, '2025-12-31', '2026-04-16', 'Billable', 10, 10, 10, 10, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL00166', 'CD-MAA01-00033', 'CP010', 'Cloud Solutions Engineering', 25, '2025-12-31', '2026-07-30', 'Billable', 10, 10, 10, 10, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('0e7a77d0-101f-462a-b318-3bd87925aa0b', 'CD-MAA01-00458', 'CP011', 'Cloud Solutions Engineering', 100, '2025-12-31', '2027-03-29', 'billable', 0, 0, 0, 0, NULL, NULL);
INSERT INTO public.stg_projects_allocation (allocation_id, employee_id, project_id, role_in_project, allocation_percentage, allocation_start_date, allocation_end_date, project_tags, w1, w2, w3, w4, weekly_hours, weekly_plan) VALUES ('AL-CP001-001', 'CD-MAA01-00033', 'CP001', 'Cloud Architecht', 25, '2025-12-31', '2026-07-30', 'Billable', 0, 0, 0, 0, NULL, NULL);


--
-- Data for Name: team_members; Type: TABLE DATA; Schema: public; Owner: admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (16, 'admin@domain.com', '$2b$12$9gPclgrpPeMkZGLC1S/CLe4FuzQLu.W35g1STaNvZ04uM66iQk3W6', true, 0, NULL, NULL, '2026-03-23 06:15:01.221347', '2026-03-23 06:15:01.221347');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (17, 'new_user@gmail.com', '$2b$12$WO6TtAvzbWIQf9YheoxUwuRqRGDJRjmCjsANnODQmzok8j/x69UsW', true, 0, NULL, NULL, '2026-03-23 07:39:41.033038', '2026-03-23 07:39:41.033038');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (18, 'test_user@gmail.com', '$2b$12$2cejs2.q0hSr1yzbiD1NO.hxuoW9ws5X8K75ViV.rElCvqlnjOc1y', true, 0, NULL, NULL, '2026-03-23 09:49:20.282004', '2026-03-23 09:49:20.282004');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (19, '', '$2b$12$sJ.5TqgXswLQfLA3A9EQne5x1Qpj0e0wPK0M8S8IlHw686to7UhzO', true, 0, NULL, NULL, '2026-03-23 09:56:54.644428', '2026-03-23 09:56:54.644428');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (20, 'admin@example.com', '$2b$12$S1DzvFA4mjDiskf168ONGOz7uaVeThk.Ra2aesKIfar0.rgSGQzMG', true, 0, NULL, NULL, '2026-03-23 11:41:30.014121', '2026-03-23 11:41:30.014121');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (21, 'tester@example.com', '$2b$12$fKEHWTdkxG5g/n3Y7uEOFu3aBYvifSlGjcDnaR7MHZRx1a28FIJTO', true, 0, NULL, NULL, '2026-03-24 05:32:19.690739', '2026-03-24 05:32:19.690739');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (22, 'user@user.com', '$2b$12$yGx5Un6jA0y4BM.rJLZU4uC8OoUl4DATnqyX0MwxfiBzufnDYraYS', true, 0, NULL, NULL, '2026-03-24 05:37:22.262577', '2026-03-24 05:37:22.262577');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (23, 'test@test.com', '$2b$12$OnBxNij364v2sqVTbRXdaO/A/hgPq0zqko/xv7Pv9nhm9vH65DP5u', true, 0, NULL, NULL, '2026-03-24 12:02:57.881001', '2026-03-24 12:02:57.881001');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (24, 'bob@example.com', '$2b$12$Q/ZKpFn18fUg2jjPlq228.DrrCMTSzMwjqD6jdJmjNetxI1nv6aha', true, 0, NULL, NULL, '2026-03-24 12:04:18.786348', '2026-03-24 12:04:18.786348');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (25, 'string', '$2b$12$KWAQ5vD2YV.2bpjIKsHjH.Xxw4jzjqX5VsvDlFipq8QZME6poCuMy', true, 0, NULL, NULL, '2026-03-24 12:10:04.091012', '2026-03-24 12:10:04.091012');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (26, 'user_dm5hc@test.com', '$2b$12$RMwoF1RgeugVJyMm6ch76.wh4dOugIsAGZtfX73GEgR9xYVLx/P/G', true, 0, NULL, NULL, '2026-03-24 12:12:25.818657', '2026-03-24 12:12:25.818657');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (27, 'new_user_123@gmail.com', '$2b$12$1IxtDjPDpDTQb9fZewOQGOqgnV9u3UOkkVcpIgGn6/LGbQCooRN6q', true, 0, NULL, NULL, '2026-03-25 05:37:43.624274', '2026-03-25 05:37:43.624274');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (28, 'myuniqueuser_2026@gmail.com', '$2b$12$mp3rowkA8ZUlK2mHsdQZluUNkR1nuI/MKLa3xQHznsRjF/cnBpSpG', true, 0, NULL, NULL, '2026-03-25 05:40:09.940966', '2026-03-25 05:40:09.940966');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (8, 'verify@test.com', '$2b$12$WuBO06A5gLhzHUxAfXQiL.KTvrB48QWAjeIxSKVafbeizEB6UWWAW', true, 0, NULL, NULL, '2026-03-12 08:21:53.938', '2026-03-12 08:21:53.938');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (9, 'tester@test.com', '$2b$12$RXHw6xGI1xT2w6NWE5K6yeyRN.Flpnr3q/VjZA36JqvRllQ..aiGO', true, 0, NULL, NULL, '2026-03-12 08:38:56.217', '2026-03-12 08:38:56.217');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (10, 'eval2@test.com', '$2b$12$P4HQnH0hrxEj4Rt5iKY0legtGNz4W.q5B8Y66yq7eSxLSGeoX2uNS', true, 0, NULL, NULL, '2026-03-12 08:43:01.353', '2026-03-12 08:43:01.353');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (11, 'testuser@test.com', '$2b$12$R2Vf/sMTly8dcjOxyNCR6ea0Nm1hYQNCombnHf7.wPtVeeHhGpp1y', true, 0, NULL, NULL, '2026-03-12 09:06:07.982', '2026-03-12 09:06:07.982');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (12, 'admin@utiliza.ai', '$2b$12$yqZ7IcUGIKccW4LabSSSL.KFfR0TlIG7uEPRRO2S9TNWgfaFv5TJ6', true, 0, NULL, NULL, '2026-03-13 07:29:49.248', '2026-03-13 07:29:49.248');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (13, 'agent@testing.com', '$2b$12$t3do1dvYiRiOVNf7QEjeaunAziURTuMzwu3KL.vsD4ZeQaJpjrE8a', true, 0, NULL, NULL, '2026-03-17 08:56:53.773', '2026-03-17 08:56:53.773');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (14, 'test@cd.com', '$2b$12$NMmgebw5Lq5zkObVWHYbKe4CaJldg6ANfMkuKBTpafyDX6YoRzTn.', true, 0, NULL, NULL, '2026-03-18 07:20:58.96', '2026-03-18 07:20:58.96');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (4, 'jetski_test_1@example.com', '$2b$12$B/OnJ3rnnbfHXLsz.R.oU.xt/zyDXbIegG8xRmlezL6Tq3n.u3gOe', true, 0, NULL, NULL, '2026-02-25 11:11:26.482', '2026-02-25 11:11:26.482');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (5, 'jetski_new@example.com', '$2b$12$Z0p2sZWb1xdN/MXZZ2FtOum.Psjm7kAm.FIRwT3NbLM5tHfq14XV2', true, 0, NULL, NULL, '2026-02-25 16:48:44.229', '2026-02-25 16:48:44.229');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (1, 'vishnupriyae@clouddestinations.com', '$2b$12$ymqrYMsIN9ymPTPNiX5hgumilNrTR7IqN0fU.yykGWhMZjtx5zxUi', true, 0, NULL, NULL, '2026-02-23 10:28:43.617', '2026-02-23 10:28:43.617');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (2, 'sprasanth@clouddestinations.com', '$2b$12$9.X0yTf7XW2gltcHPQZC/eM5wYc2OWmFm4vTcS551DmUhO0CvepI2', true, 0, NULL, NULL, '2026-02-23 11:12:26.617', '2026-02-23 11:12:26.617');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (3, 'test@example.com', '$2b$12$Lajuw2NMDqMahgkNNkx0sOtN27uSMnANzuO0n8NemKCoN.5eDNOpq', true, 0, NULL, NULL, '2026-02-23 14:33:24.282', '2026-02-23 14:33:24.282');
INSERT INTO public.stg_users (id, email, password_hash, is_active, failed_login_attempts, last_login_at, password_changed_at, created_at, updated_at) VALUES (15, 'test@gmail.com', '$2b$12$o4w/pl2Au27f555phLJxSeZony5e2w13NxNy842vjuBOcy5oM4Ny.', true, 0, NULL, NULL, '2026-03-23 05:56:06.661642', '2026-03-23 05:56:06.661642');


--
-- Data for Name: weekly_allocations; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.stg_weekly_allocations (id, allocation_id, allocation_year, week_number, allocated_hours) VALUES (1, 'AL-CP001-001', 2026, 10, 10);
INSERT INTO public.stg_weekly_allocations (id, allocation_id, allocation_year, week_number, allocated_hours) VALUES (2, 'AL-CP001-001', 2026, 11, 10);
INSERT INTO public.stg_weekly_allocations (id, allocation_id, allocation_year, week_number, allocated_hours) VALUES (3, 'AL-CP001-001', 2026, 12, 10);
INSERT INTO public.stg_weekly_allocations (id, allocation_id, allocation_year, week_number, allocated_hours) VALUES (4, 'AL-CP001-001', 2026, 13, 10);


--
-- Name: actionable_todos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.actionable_todos_id_seq', 5, true);


--
-- Name: employee_nominations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.employee_nominations_id_seq', 1, false);


--
-- Name: partners_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.partners_id_seq', 1, false);


--
-- Name: project_commercials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.project_commercials_id_seq', 1, false);


--
-- Name: project_scopes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.project_scopes_id_seq', 1, false);


--
-- Name: team_members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.team_members_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.users_id_seq', 28, true);


--
-- Name: weekly_allocations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.weekly_allocations_id_seq', 4, true);


--
-- PostgreSQL database dump complete
--

\unrestrict Rew9csPjX6VQyOVaWAXr56byl5KuVcd5PlXpSb1WDrJ10TX0I5gohKxuMn0kfXG

