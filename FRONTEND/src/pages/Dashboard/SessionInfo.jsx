import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";

const SessionInfo = ({ data }) => {
  const information = [
    {
      label: "Academic Year",
      value: data?.academicYear ?? "--",
    },
    {
      label: "Current Semester",
      value: data?.semester ?? "--",
    },
    {
      label: "Result Status",
      value: data?.resultStatus ?? "--",
    },
    {
      label: "Last Updated",
      value: data?.lastUpdated ?? "--",
    },
  ];

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-slate-900">
        Session Information
      </h2>

      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {information.map((item) => (
          <div key={item.label}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {item.label}
            </p>

            <div className="mt-2">
              {item.label === "Result Status" &&
              item.value !== "--" ? (
                <Badge variant="success">{item.value}</Badge>
              ) : (
                <p className="text-sm font-semibold text-slate-700">
                  {item.value}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default SessionInfo;