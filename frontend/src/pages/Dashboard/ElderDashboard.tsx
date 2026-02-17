import { Card, Row, Col } from 'antd';
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
    <div>
      <h2 style={{ marginBottom: 24, fontSize: 26 }}>您好，今天想做什么？</h2>
      <Row gutter={[20, 20]}>
        {actions.map((item) => (
          <Col xs={24} sm={12} key={item.key}>
            <Card
              hoverable
              onClick={() => navigate(item.key)}
              style={{
                borderRadius: 20,
                border: 'none',
                background: item.bg,
                minHeight: 160,
              }}
              styles={{ body: { padding: 28 } }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 56,
                    color: item.color,
                    lineHeight: 1,
                  }}
                >
                  {item.icon}
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: item.color }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 16, color: 'var(--color-text-secondary)' }}>
                  {item.desc}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default ElderDashboard;
