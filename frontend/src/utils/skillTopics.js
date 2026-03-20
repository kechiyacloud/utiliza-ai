const TOPIC_DEFINITIONS = [
    {
        name: 'AWS',
        keywords: ['aws', 'ec2', 'eks', 'ecs', 'lambda', 'cloudformation', 'iam', 's3', 'rds', 'vpc', 'route53', 'route 53', 'cloudwatch', 'dynamodb', 'elastic beanstalk', 'alb', 'elb']
    },
    {
        name: 'Azure',
        keywords: ['azure', 'aks', 'azure devops', 'azure sql', 'adf', 'synapse', 'application insights', 'app service', 'azure functions', 'logic apps', 'entra', 'aad']
    },
    {
        name: 'GCP',
        keywords: ['gcp', 'google cloud', 'gke', 'bigquery', 'cloud run', 'cloud sql', 'pub/sub', 'pubsub', 'composer', 'dataflow']
    },
    {
        name: 'Containers & Orchestration',
        keywords: ['kubernetes', 'docker', 'helm', 'openshift', 'container', 'istio', 'service mesh']
    },
    {
        name: 'IaC & Automation',
        keywords: ['terraform', 'ansible', 'pulumi', 'packer', 'automation', 'scripting', 'shell scripting', 'powershell', 'bash', 'infrastructure as code']
    },
    {
        name: 'CI/CD & DevOps',
        keywords: ['ci/cd', 'cicd', 'jenkins', 'github actions', 'gitlab', 'argo', 'deployment pipeline', 'devops', 'gitops']
    },
    {
        name: 'Monitoring & Observability',
        keywords: ['prometheus', 'grafana', 'datadog', 'splunk', 'elk', 'observability', 'monitoring', 'alerting', 'nagios', 'new relic', 'application insights']
    },
    {
        name: 'Linux & Systems',
        keywords: ['linux', 'unix', 'system administration', 'os', 'troubleshooting', 'server administration']
    },
    {
        name: 'Windows & Microsoft',
        keywords: ['windows', 'windows server', 'active directory', 'microsoft', 'office 365', 'sharepoint', 'exchange']
    },
    {
        name: 'Networking',
        keywords: ['network', 'dns', 'load balancer', 'nginx', 'firewall', 'tcp', 'vpn', 'proxy', 'cdn']
    },
    {
        name: 'Security',
        keywords: ['security', 'iam', 'devsecops', 'vulnerability', 'compliance', 'sso', 'siem', 'soc', 'cybersecurity', 'penetration testing', 'encryption', 'security audits', 'risk assessment']
    },
    {
        name: 'Databases',
        keywords: ['mysql', 'postgres', 'postgresql', 'mongodb', 'oracle', 'sql server', 'redis', 'database', 'pl/sql', 'db2']
    },
    {
        name: 'Data & Analytics',
        keywords: ['kafka', 'spark', 'hadoop', 'etl', 'airflow', 'snowflake', 'bigquery', 'data engineering', 'data pipeline', 'data warehousing', 'analytics', 'reporting', 'bi']
    },
    {
        name: 'Testing & Quality',
        keywords: ['testing', 'qa', 'selenium', 'cypress', 'playwright', 'automation testing', 'jmeter', 'manual testing', 'api testing', 'performance testing', 'junit', 'testng', 'bdd', 'tdd']
    },
    {
        name: 'ITSM & Support',
        keywords: ['servicenow', 'incident', 'change management', 'problem management', 'support', 'runbook', 'itil', 'ticketing', 'helpdesk']
    },
    {
        name: 'Programming & Web',
        keywords: ['python', 'java', 'node', 'node.js', 'javascript', 'typescript', 'go', 'golang', 'react', 'angular', 'vue', 'vue.js', 'c++', 'rust', 'frontend', 'backend', 'api', 'sql']
    },
    {
        name: 'Product & Design',
        keywords: ['product management', 'user research', 'roadmapping', 'figma', 'ux', 'ui', 'requirements analysis', 'product design']
    },
    {
        name: 'Project & Delivery',
        keywords: ['project management', 'pmp', 'agile', 'scrum', 'ms project', 'gantt', 'resource planning', 'delivery management', 'stakeholder management']
    },
    {
        name: 'HR & Recruitment',
        keywords: ['recruitment', 'employee relations', 'performance management', 'hr analytics', 'compensation', 'hris', 'payroll', 'curriculum design', 'training delivery', 'learning management systems', 'l&d', 'coaching', 'sourcing', 'ats', 'linkedin recruiting']
    },
    {
        name: 'Business & Sales',
        keywords: ['lead generation', 'sales', 'crm', 'salesforce', 'negotiation', 'b2b sales', 'proposal writing', 'client relations', 'vendor management']
    },
    {
        name: 'Finance & ERP',
        keywords: ['accounting', 'financial analysis', 'excel', 'sap', 'budgeting', 'tax planning', 'financial reporting', 'auditing', 'erp']
    },
    {
        name: 'Leadership & Strategy',
        keywords: ['leadership', 'strategic planning', 'team management', 'decision making', 'communication', 'business strategy']
    }
];

export const normalizeSkillName = (skill) => {
    if (!skill) return '';
    return String(skill).trim();
};

const normalizeToken = (skill) =>
    normalizeSkillName(skill)
        .toLowerCase()
        .replace(/[._/-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

export const getSkillTopic = (skillName) => {
    const normalized = normalizeToken(skillName);
    if (!normalized) return 'Other';

    const match = TOPIC_DEFINITIONS.find((topic) =>
        topic.keywords.some((keyword) => normalized.includes(keyword))
    );

    if (match?.name) return match.name;

    if (normalized.includes('cloud')) return 'Cloud Platforms';
    if (normalized.includes('cert') || normalized.includes('certificate')) return 'Certifications';
    if (normalized.includes('support') || normalized.includes('operation')) return 'ITSM & Support';
    if (normalized.includes('engineer') || normalized.includes('developer')) return 'Programming & Web';

    return 'Other';
};

export const groupSkillsByTopic = (skills = [], getMeta = () => ({})) => {
    const grouped = new Map();

    skills.forEach((skillItem) => {
        const rawSkill = typeof skillItem === 'string' ? skillItem : skillItem.skill;
        const skillName = normalizeSkillName(rawSkill);
        if (!skillName) return;

        const topicName = getSkillTopic(skillName);
        if (!grouped.has(topicName)) {
            grouped.set(topicName, {
                topic: topicName,
                total: 0,
                items: []
            });
        }

        const group = grouped.get(topicName);
        group.total += 1;
        group.items.push({
            skill: skillName,
            ...getMeta(skillItem)
        });
    });

    return [...grouped.values()]
        .map((group) => ({
            ...group,
            items: group.items.sort((left, right) => left.skill.localeCompare(right.skill))
        }))
        .sort((left, right) => {
            if (right.items.length !== left.items.length) {
                return right.items.length - left.items.length;
            }
            return left.topic.localeCompare(right.topic);
        });
};
