// Department-specific skill mappings
export const DEPARTMENT_SKILLS = {
    'Software Engineering': ['React', 'Node.js', 'Python', 'Java', 'JavaScript', 'TypeScript', 'SQL', 'MongoDB', 'AWS', 'Docker', 'Kubernetes', 'Git', 'C++', 'Go', 'Rust', 'Angular', 'Vue.js'],
    'Data Engineering': ['Python', 'SQL', 'Spark', 'Hadoop', 'Kafka', 'Airflow', 'ETL', 'Data Warehousing', 'AWS', 'Azure', 'Snowflake', 'BigQuery'],
    'Quality Engineering': ['Selenium', 'Cypress', 'TestNG', 'JUnit', 'Automation Testing', 'Manual Testing', 'API Testing', 'Performance Testing', 'Jira', 'BDD', 'TDD'],
    'Cloud Solutions Engineering': ['AWS', 'Azure', 'Google Cloud', 'Terraform', 'Kubernetes', 'Docker', 'CI/CD', 'DevOps', 'Serverless', 'CloudFormation', 'Ansible'],
    'System Operations': ['Linux', 'Windows Server', 'Monitoring', 'Shell Scripting', 'Networking', 'Troubleshooting', 'ITIL', 'Jenkins', 'Nagios', 'Splunk'],
    'Product Engineering': ['Product Management', 'Agile', 'Scrum', 'User Research', 'Roadmapping', 'Analytics', 'Jira', 'Figma', 'Requirements Analysis'],
    'Security Engineering': ['Cybersecurity', 'Penetration Testing', 'SIEM', 'Firewall', 'Encryption', 'Compliance', 'Risk Assessment', 'Security Audits', 'SOC'],
    'US Staffing': ['Recruitment', 'Sourcing', 'ATS', 'LinkedIn Recruiting', 'Stakeholder Management', 'Vendor Management', 'Negotiation'],
    'Business Development': ['Lead Generation', 'Sales', 'CRM', 'Salesforce', 'Negotiation', 'B2B Sales', 'Proposal Writing', 'Client Relations'],
    'Training & Development': ['Training Delivery', 'Curriculum Design', 'L&D', 'Employee Engagement', 'Coaching', 'Presentation Skills', 'Learning Management Systems'],
    'HR': ['Recruitment', 'Employee Relations', 'Performance Management', 'HR Analytics', 'Compensation', 'HRIS', 'Payroll', 'Compliance'],
    'Finance': ['Accounting', 'Financial Analysis', 'Excel', 'SAP', 'Budgeting', 'Tax Planning', 'Financial Reporting', 'Auditing'],
    'PMO': ['Project Management', 'PMP', 'Agile', 'Scrum', 'Risk Management', 'Stakeholder Management', 'MS Project', 'Gantt Charts', 'Resource Planning'],
    'Management': ['Leadership', 'Strategic Planning', 'Team Management', 'Decision Making', 'Communication', 'Change Management', 'Business Strategy']
};

// Get all unique skills across all departments
export const ALL_SKILLS = Array.from(
    new Set(Object.values(DEPARTMENT_SKILLS).flat())
).sort();

// Helper function to get skills for a specific department
export const getSkillsForDepartment = (department) => {
    return DEPARTMENT_SKILLS[department] || [];
};
