import Layout from "../../components/layout/Layout";
import Card from "../../components/ui/Card";
import StatCards from "./StatCards";
import SessionInfo from "./SessionInfo";

const Dashboard = ({ dashboardData, onNavigate }) => {
  const data = dashboardData ?? {};

  return (
    <Layout
      activePage="Dashboard"
      onNavigate={onNavigate}
    >
      <div className="p-4 sm:p-6 lg:p-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Overview of examination results and academic performance.
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <select className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
              <option>Batch</option>
            </select>

            <select className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
              <option>Department</option>
            </select>

            <select className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
              <option>Academic Year</option>
            </select>

            <select className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
              <option>Semester</option>
            </select>

            <button className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700">
              Apply
            </button>
          </div>
        </Card>

        {/* Statistics */}
        <StatCards data={data} />

        {/* Session */}
        <div className="mt-6">
          <SessionInfo data={data} />
        </div>

        {/* Charts */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

          <Card className="p-5">
            <h2 className="font-semibold text-slate-900">
              Department-wise Pass %
            </h2>

            <div className="mt-4 flex h-72 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-400">
              Department Pass Chart
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold text-slate-900">
              Overall Pass vs Fail
            </h2>

            <div className="mt-4 flex h-72 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-400">
              Overall Pass Chart
            </div>
          </Card>

        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;