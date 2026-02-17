import { Card, Row, Col, Empty, Button, Spin, Avatar, Tag } from 'antd';
import {
  PlusOutlined,
  TeamOutlined,
  FileTextOutlined,
  LineChartOutlined,
  BulbOutlined,
  UserOutlined,
  SafetyOutlined,
  ManOutlined,
  WomanOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { membersApi } from '../../api';
import type { FamilyMember } from '../../types';
import { RelationshipLabels } from '../../types';
import { useElderModeStore } from '../../store';
import ElderDashboard from './ElderDashboard';
import dayjs from 'dayjs';

const Dashboard: React.FC = () => {
  const isElderMode = useElderModeStore((s) => s.isElderMode);

  if (isElderMode) {
    return <ElderDashboard />;
  }
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
            {[
              { key: '/members', icon: <TeamOutlined />, color: '#136dec', bg: 'var(--color-bg-blue-light)', label: '家庭成员', value: stats?.memberCount || 0, unit: '人' },
              { key: '/documents', icon: <FileTextOutlined />, color: '#13ec5b', bg: 'var(--color-bg-green-light)', label: '健康文档', value: stats?.documentCount || 0, unit: '份' },
              { key: '/records', icon: <LineChartOutlined />, color: '#faad14', bg: 'var(--color-bg-yellow-light)', label: '健康记录', value: stats?.recordCount || 0, unit: '条' },
              { key: '/advice', icon: <BulbOutlined />, color: '#722ed1', bg: 'var(--color-bg-purple-light)', label: 'AI 建议', value: stats?.adviceCount || 0, unit: '次' },
            ].map((item) => (
              <Col xs={24} sm={12} lg={6} key={item.key}>
                <Card hoverable onClick={() => navigate(item.key)} style={{ padding: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: item.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      color: item.color,
                      flexShrink: 0,
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontSize: 32, fontWeight: 700, color: item.color, lineHeight: 1 }}>
                        {item.value} <span style={{ fontSize: 14, fontWeight: 400 }}>{item.unit}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          {/* 数据安全提示 */}
          <div style={{
            marginTop: 16,
            padding: '12px 20px',
            background: 'var(--color-bg-blue-light)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 13,
            color: 'var(--color-text-secondary)',
          }}>
            <SafetyOutlined style={{ fontSize: 18, color: '#136dec', flexShrink: 0 }} />
            <span>您的健康数据经过加密存储，仅您和家庭成员可以访问，平台管理员无法查看任何个人健康信息。</span>
          </div>

          {/* 新用户引导 */}
          {!hasSelfMember && (
            <Card
              style={{ marginTop: 24, background: 'var(--color-bg-blue-light)', border: '1px solid var(--color-guide-border)', borderRadius: 16 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#136dec' }}>开始使用</h3>
                  <p style={{ margin: '8px 0 0', color: 'var(--color-text-tertiary)' }}>
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
                            backgroundColor: member.gender === 'MALE' ? '#136dec' : '#eb2f96',
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
                              <ManOutlined style={{ color: '#136dec', fontSize: 12 }} />
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
                            <span style={{ fontSize: 12, color: 'var(--color-text-quaternary)' }}>
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
