/**
 * Simple verification script to test data infrastructure imports
 * Run this in browser console or use as reference
 */

// Test 1: Import Constants
console.group('✓ Testing Constants Import');
import { DEPARTMENTS, LOCATIONS, STATUS_OPTIONS, WORK_MODES, EMPLOYMENT_TYPES } from '../data/constants.js';
console.log('DEPARTMENTS:', DEPARTMENTS.length, 'items');
console.log('LOCATIONS:', LOCATIONS.length, 'items');
console.log('STATUS_OPTIONS:', STATUS_OPTIONS.length, 'items');
console.log('WORK_MODES:', WORK_MODES.length, 'items');
console.log('EMPLOYMENT_TYPES:', EMPLOYMENT_TYPES.length, 'items');
console.groupEnd();

// Test 2: Import Skills
console.group('✓ Testing Skills Import');
import { DEPARTMENT_SKILLS, ALL_SKILLS, getSkillsForDepartment } from '../data/skills.js';
console.log('ALL_SKILLS:', ALL_SKILLS.length, 'total skills');
console.log('DEPARTMENT_SKILLS:', Object.keys(DEPARTMENT_SKILLS).length, 'departments');
const swSkills = getSkillsForDepartment('Software Engineering');
console.log('Software Engineering skills:', swSkills.length);
console.log('Sample skills:', swSkills.slice(0, 5));
console.groupEnd();

// Test 3: Context Providers
console.group('✓ Testing Context Providers');
import { EmployeeProvider, useEmployees } from '../context/EmployeeContext.jsx';
import { ClientProvider, useClients } from '../context/ClientContext.jsx';
import { ProjectProvider, useProjects } from '../context/ProjectContext.jsx';
console.log('EmployeeProvider: imported successfully');
console.log('ClientProvider: imported successfully');
console.log('ProjectProvider: imported successfully');
console.groupEnd();

// Test 4: Composite Provider
console.group('✓ Testing Composite Provider');
import { AppDataProvider, useAppData } from '../context/index.jsx';
console.log('AppDataProvider: imported successfully');
console.log('useAppData hook: imported successfully');
console.groupEnd();

console.log('\n🎉 ALL IMPORTS SUCCESSFUL!');
console.log('Visit http://localhost:5173/info/test to see full visual verification');
