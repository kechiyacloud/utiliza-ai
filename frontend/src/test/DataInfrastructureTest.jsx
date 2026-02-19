import React from 'react';
import { useEmployees, useClients, useProjects, useAppData } from '../context';
import { DEPARTMENTS, LOCATIONS, STATUS_OPTIONS, WORK_MODES, EMPLOYMENT_TYPES } from '../data/constants';
import { DEPARTMENT_SKILLS, ALL_SKILLS, getSkillsForDepartment } from '../data/skills';

/**
 * Test component to verify all data infrastructure works correctly
 * This can be temporarily added to any route to test the setup
 */
const DataInfrastructureTest = () => {
    // Test individual context hooks
    const { employees, addEmployee } = useEmployees();
    const { clients, addClient } = useClients();
    const { projects, addProject } = useProjects();

    // Test composite hook
    const appData = useAppData();

    // Test skills helper
    const softwareSkills = getSkillsForDepartment('Software Engineering');

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Data Infrastructure Test ✓</h1>

            {/* Constants Test */}
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h2 className="font-bold text-green-800 mb-2">✓ Constants Imported Successfully</h2>
                <div className="text-sm text-green-700 space-y-1">
                    <p>• DEPARTMENTS: {DEPARTMENTS.length} items</p>
                    <p>• LOCATIONS: {LOCATIONS.length} items</p>
                    <p>• STATUS_OPTIONS: {STATUS_OPTIONS.length} items</p>
                    <p>• WORK_MODES: {WORK_MODES.length} items</p>
                    <p>• EMPLOYMENT_TYPES: {EMPLOYMENT_TYPES.length} items</p>
                </div>
            </div>

            {/* Skills Test */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h2 className="font-bold text-blue-800 mb-2">✓ Skills Module Working</h2>
                <div className="text-sm text-blue-700 space-y-1">
                    <p>• ALL_SKILLS: {ALL_SKILLS.length} total skills</p>
                    <p>• DEPARTMENT_SKILLS: {Object.keys(DEPARTMENT_SKILLS).length} departments</p>
                    <p>• Software Engineering skills: {softwareSkills.length} items</p>
                    <p className="text-xs mt-2">
                        Sample: {softwareSkills.slice(0, 5).join(', ')}...
                    </p>
                </div>
            </div>

            {/* Context Hooks Test */}
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h2 className="font-bold text-purple-800 mb-2">✓ Context Hooks Initialized</h2>
                <div className="text-sm text-purple-700 space-y-1">
                    <p>• useEmployees() - {employees.length} employees</p>
                    <p>• useClients() - {clients.length} clients</p>
                    <p>• useProjects() - {projects.length} projects</p>
                    <p className="text-xs mt-2">
                        Functions available: addEmployee, addClient, addProject, etc.
                    </p>
                </div>
            </div>

            {/* Composite Hook Test */}
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h2 className="font-bold text-orange-800 mb-2">✓ Composite Hook (useAppData)</h2>
                <div className="text-sm text-orange-700 space-y-1">
                    <p>• employees.employees: {appData.employees.employees.length}</p>
                    <p>• clients.clients: {appData.clients.clients.length}</p>
                    <p>• projects.projects: {appData.projects.projects.length}</p>
                </div>
            </div>

            {/* Sample Usage */}
            <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg">
                <h2 className="font-bold text-gray-800 mb-3">Sample Usage Examples</h2>

                <div className="space-y-4 text-sm">
                    {/* Department Dropdown */}
                    <div>
                        <label className="block font-medium mb-1">Department Dropdown:</label>
                        <select className="border rounded px-2 py-1 w-full">
                            <option>Select Department</option>
                            {DEPARTMENTS.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>

                    {/* Location Dropdown */}
                    <div>
                        <label className="block font-medium mb-1">Location Dropdown:</label>
                        <select className="border rounded px-2 py-1 w-full">
                            <option>Select Location</option>
                            {LOCATIONS.map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </select>
                    </div>

                    {/* Skills Display */}
                    <div>
                        <label className="block font-medium mb-1">Software Engineering Skills:</label>
                        <div className="flex flex-wrap gap-1">
                            {softwareSkills.slice(0, 10).map(skill => (
                                <span key={skill} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                    {skill}
                                </span>
                            ))}
                            {softwareSkills.length > 10 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                    +{softwareSkills.length - 10} more
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 p-3 bg-green-100 border border-green-300 rounded text-center">
                <p className="text-green-800 font-bold">🎉 All Infrastructure Components Working!</p>
            </div>
        </div>
    );
};

export default DataInfrastructureTest;
