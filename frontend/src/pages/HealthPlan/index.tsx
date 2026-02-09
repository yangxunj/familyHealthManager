import { Tabs } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { MedicineBoxOutlined, ScheduleOutlined } from '@ant-design/icons';

export default function HealthPlanPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    if (location.pathname.startsWith('/health-plan/checkups')) return 'checkups';
    return 'vaccinations';
  };

  const handleTabChange = (key: string) => {
    navigate(`/health-plan/${key}`, { replace: true });
  };

  // VaccinationAdd 是独立表单页，不显示 Tab
  const showTabs = !location.pathname.includes('/add');

  return (
    <div>
      {showTabs && (
        <Tabs
          activeKey={getActiveTab()}
          onChange={handleTabChange}
          style={{ marginBottom: 8 }}
          items={[
            {
              key: 'vaccinations',
              label: <span><MedicineBoxOutlined style={{ marginRight: 6 }} />疫苗接种</span>,
            },
            {
              key: 'checkups',
              label: <span><ScheduleOutlined style={{ marginRight: 6 }} />定期检查</span>,
            },
          ]}
        />
      )}
      <Outlet />
    </div>
  );
}
