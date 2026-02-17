import { Card } from 'antd';
import {
  MessageOutlined,
  BulbOutlined,
  PlusOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const actions = [
  {
    key: '/chat',
    icon: <MessageOutlined />,
    title: '健康咨询',
    desc: '和 AI 聊一聊健康问题',
    bg: 'var(--color-bg-blue-light)',
    color: '#136dec',
  },
  {
    key: '/advice',
    icon: <BulbOutlined />,
    title: '健康建议',
    desc: '生成专属健康报告',
    bg: 'var(--color-bg-purple-light)',
    color: '#722ed1',
  },
  {
    key: '/records',
    icon: <PlusOutlined />,
    title: '记录数据',
    desc: '添加血压、血糖等记录',
    bg: 'var(--color-bg-green-light)',
    color: '#13ec5b',
  },
  {
    key: '/records/trend',
    icon: <LineChartOutlined />,
    title: '我的记录',
    desc: '查看健康数据趋势',
    bg: 'var(--color-bg-yellow-light)',
    color: '#faad14',
  },
];

const ElderDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: 16,
        flex: 1,
      }}
    >
      {actions.map((item) => (
        <Card
          key={item.key}
          hoverable
          onClick={() => navigate(item.key)}
          style={{
            borderRadius: 20,
            border: 'none',
            background: item.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          styles={{ body: { padding: 16, width: '100%' } }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 8,
            }}
          >
            <div style={{ fontSize: 48, color: item.color, lineHeight: 1 }}>
              {item.icon}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: item.color }}>
              {item.title}
            </div>
            <div style={{ fontSize: 15, color: 'var(--color-text-secondary)' }}>
              {item.desc}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ElderDashboard;
