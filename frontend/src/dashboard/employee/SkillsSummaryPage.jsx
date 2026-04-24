import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Award, Search, Filter } from 'lucide-react';
import { getEmployeeList } from '../../api/employeeApi';
import { useDataRefresh } from '../../context';
import SkillsOverview from './insights/SkillsOverview';

const SkillsSummaryPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [employees, setEmployees] = useState(location.state?.employees || []);
    const [loading, setLoading] = useState(!employees.length);
    const [error, setError] = useState(null);
    const { refreshKey } = useDataRefresh();

    useEffect(() => {
        const fetchEmployees = async () => {
            setLoading(true);
            try {
                const data = await getEmployeeList(refreshKey > 0);
                setEmployees(data);
            } catch (err) {
                setError(err.message || 'Failed to load resources');
            } finally {
                setLoading(false);
            }
        };
        fetchEmployees();
    }, [refreshKey]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-500">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500/25 border-t-blue-500"></div>
                    <p className="text-sm font-medium tracking-wide">Analysing skill distribution...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 flex flex-col gap-6 w-full h-full overflow-y-auto bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-slate-200 bg-white shadow-sm rounded-full transition-colors flex-shrink-0"
                        title="Go Back"
                    >
                        <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    <div className="flex items-start gap-3">
                        <div className="mt-1 p-1.5 rounded-lg bg-purple-50 text-purple-600 shadow-sm border border-white/50">
                            <Award size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Skill Summary</h1>
                            <p className="text-sm font-medium text-gray-500">Explore the talent matrix and skill concentration across your organization.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <SkillsOverview employees={employees} />
            </div>
        </div>
    );
};

export default SkillsSummaryPage;
