import { Card, Row, Col, Empty, Button } from 'antd';
import { PlusOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>欢迎使用家庭健康管理平台</h2>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <TeamOutlined style={{ fontSize: 32, color: '#1890ff' }} />
              <h3>家庭成员</h3>
              <p style={{ color: '#999' }}>0 人</p>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <TeamOutlined style={{ fontSize: 32, color: '#52c41a' }} />
              <h3>健康文档</h3>
              <p style={{ color: '#999' }}>0 份</p>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <TeamOutlined style={{ fontSize: 32, color: '#faad14' }} />
              <h3>健康记录</h3>
              <p style={{ color: '#999' }}>0 条</p>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <TeamOutlined style={{ fontSize: 32, color: '#722ed1' }} />
              <h3>AI 建议</h3>
              <p style={{ color: '#999' }}>0 次</p>
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="家庭成员" style={{ marginTop: 24 }}>
        <Empty description="暂无家庭成员">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/members/add')}
          >
            添加第一位家庭成员
          </Button>
        </Empty>
      </Card>
    </div>
  );
};

export default Dashboard;
