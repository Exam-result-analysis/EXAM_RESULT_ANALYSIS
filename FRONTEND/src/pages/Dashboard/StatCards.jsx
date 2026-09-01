import Card from "../../components/ui/Card";

const StatCards = ({ data }) => {
  const stats = [
    {
      title: "Total Students",
      value: data?.totalStudents ?? "--",
      description: "Students included in results",
      icon: "👨‍🎓",
    },
    {
      title: "Total Departments",
      value: data?.totalDepartments ?? "--",
      description: "Active departments",
      icon: "🏢",
    },
    {
      title: "Overall Pass %",
      value:
        data?.overallPassPercentage != null
          ? `${data.overallPassPercentage}%`
          : "--",
      description: "Overall examination performance",
      icon: "📈",
    },
    {
      title: "Number of Courses",
      value: data?.totalCourses ?? "--",
      description: "Courses included",
      icon: "📚",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                {stat.title}
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stat.value}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-lg">
              {stat.icon}
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            {stat.description}
          </p>
        </Card>
      ))}
    </div>
  );
};

export default StatCards;
