-- View to calculate live employee experience in Cloud Destinations
CREATE OR REPLACE VIEW public.v_employee_experience AS
SELECT 
    m.employee_id,
    m.employee_name,
    m.date_of_joining,
    m.department,
    m.role_designation,
    p.employee_status,
    -- Calculate experience in years with 2 decimal precision
    -- Uses age() to handle leap years and month lengths correctly
    ROUND(
        (EXTRACT(EPOCH FROM age(CURRENT_DATE, m.date_of_joining)) / (365.25 * 24 * 3600))::numeric, 
        2
    ) AS experience_in_cd
FROM public.employee_master m
LEFT JOIN public.employee_master_pro p ON m.employee_id = p.employee_id;

COMMENT ON VIEW public.v_employee_experience IS 'Provides real-time calculation of employee tenure/experience based on date_of_joining.';
