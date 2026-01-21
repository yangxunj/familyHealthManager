import { Card, Row, Col, Empty, Button, Spin, Avatar, Tag } from 'antd';
import {
  PlusOutlined,
  TeamOutlined,
  FileTextOutlined,
  LineChartOutlined,
  BulbOutlined,
  UserOutlined,
  ManOutlined,
  WomanOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { membersApi } from '../../api';
import type { FamilyMember } from '../../types';
import { RelationshipLabels } from '../../types';
import dayjs from 'dayjs';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['memberStats'],
    queryFn: membersApi.getStats,
  });

  const { data: members, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.getAll,
  });

  const isLoading = isLoadingStats || isLoadingMembers;

  const calculateAge = (birthDate: string) => {
    return dayjs().diff(dayjs(birthDate), 'year');
  };

  // 检查是否有"本人"档案
  const hasSelfMember = members?.some((m) => m.relationship === 'SELF');

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>欢迎使用家庭健康管理平台</h2>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 50 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* 统计卡片 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card hoverable onClick={() => navigate('/members')}>
                <div style={{ textAlign: 'center' }}>
                  <TeamOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                  <h3>家庭成员</h3>
                  <p style={{ fontSize: 24, margin: 0, color: '#1890ff' }}>
                    {stats?.memberCount || 0} <span style={{ fontSize: 14 }}>人</span>
                  </p>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card hoverable onClick={() => navigate('/documents')}>
                <div style={{ textAlign: 'center' }}>
                  <FileTextOutlined style={{ fontSize: 32, color: '#52c41a' }} />
                  <h3>健康文档</h3>
                  <p style={{ fontSize: 24, margin: 0, color: '#52c41a' }}>
                    {stats?.documentCount || 0} <span style={{ fontSize: 14 }}>份</span>
                  </p>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card hoverable onClick={() => navigate('/records')}>
                <div style={{ textAlign: 'center' }}>
                  <LineChartOutlined style={{ fontSize: 32, color: '#faad14' }} />
                  <h3>健康记录</h3>
                  <p style={{ fontSize: 24, margin: 0, color: '#faad14' }}>
                    {stats?.recordCount || 0} <span style={{ fontSize: 14 }}>条</span>
                  </p>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card hoverable onClick={() => navigate('/advice')}>
                <div style={{ textAlign: 'center' }}>
                  <BulbOutlined style={{ fontSize: 32, color: '#722ed1' }} />
                  <h3>AI 建议</h3>
                  <p style={{ fontSize: 24, margin: 0, color: '#722ed1' }}>
                    {stats?.adviceCount || 0} <span style={{ fontSize: 14 }}>次</span>
                  </p>
                </div>
              </Card>
            </Col>
          </Row>

          {/* 新用户引导 */}
          {!hasSelfMember && (
            <Card
              style={{ marginTop: 24, background: '#e6f7ff', border: '1px solid #91d5ff' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#1890ff' }}>开始使用</h3>
                  <p style={{ margin: '8px 0 0', color: '#666' }}>
                    请先创建您的个人健康档案，以便开始管理您和家人的健康数据
                  </p>
                </div>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/members/add')}
                >
                  创建个人档案
                </Button>
              </div>
            </Card>
          )}

          {/* 家庭成员列表 */}
          <Card
            title="家庭成员"
            style={{ marginTop: 24 }}
            extra={
              <Button
                type="link"
                icon={<PlusOutlined />}
                onClick={() => navigate('/members/add')}
              >
                添加成员
              </Button>
            }
          >
            {!members || members.length === 0 ? (
              <Empty description="暂无家庭成员">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/members/add')}
                >
                  添加第一位家庭成员
                </Button>
              </Empty>
            ) : (
              <Row gutter={[16, 16]}>
                {members.slice(0, 8).map((member: FamilyMember) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={member.id}>
                    <Card
                      hoverable
                      size="small"
                      onClick={() => navigate(`/members/${member.id}`)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar
                          size={48}
                          icon={<UserOutlined />}
                          src={member.avatar}
                          style={{
                            backgroundColor: member.gender === 'MALE' ? '#1890ff' : '#eb2f96',
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span
                              style={{
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {member.name}
                            </span>
                            {member.gender === 'MALE' ? (
                              <ManOutlined style={{ color: '#1890ff', fontSize: 12 }} />
                            ) : (
                              <WomanOutlined style={{ color: '#eb2f96', fontSize: 12 }} />
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <Tag
                              color={member.relationship === 'SELF' ? 'blue' : 'default'}
                              style={{ margin: 0 }}
                            >
                              {RelationshipLabels[member.relationship]}
                            </Tag>
                            <span style={{ fontSize: 12, color: '#999' }}>
                              {calculateAge(member.birthDate)}岁
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
            {members && members.length > 8 && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Button type="link" onClick={() => navigate('/members')}>
                  查看全部 {members.length} 位成员
                </Button>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default Dashboard;
