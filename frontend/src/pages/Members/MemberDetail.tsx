import { Card, Descriptions, Button, Spin, Tag, Row, Col, Statistic, Empty } from 'antd';
import {
  EditOutlined,
  ArrowLeftOutlined,
  FileTextOutlined,
  LineChartOutlined,
  BulbOutlined,
  ManOutlined,
  WomanOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { membersApi } from '../../api';
import { RelationshipLabels, GenderLabels, BloodTypeLabels } from '../../types';
import dayjs from 'dayjs';

const MemberDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: member, isLoading, error } = useQuery({
    queryKey: ['member', id],
    queryFn: () => membersApi.getById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !member) {
    return (
      <Card>
        <Empty description="成员不存在">
          <Button onClick={() => navigate('/members')}>返回列表</Button>
        </Empty>
      </Card>
    );
  }

  const age = dayjs().diff(dayjs(member.birthDate), 'year');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/members')}>
          返回列表
        </Button>
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => navigate(`/members/${id}/edit`)}
        >
          编辑
        </Button>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card title="基本信息">
            <Descriptions column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="姓名">
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {member.name}
                  {member.gender === 'MALE' ? (
                    <ManOutlined style={{ color: '#1890ff' }} />
                  ) : (
                    <WomanOutlined style={{ color: '#eb2f96' }} />
                  )}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="关系">
                <Tag color={member.relationship === 'SELF' ? 'blue' : 'default'}>
                  {RelationshipLabels[member.relationship]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="性别">
                {GenderLabels[member.gender]}
              </Descriptions.Item>
              <Descriptions.Item label="年龄">{age} 岁</Descriptions.Item>
              <Descriptions.Item label="出生日期">
                {dayjs(member.birthDate).format('YYYY年MM月DD日')}
              </Descriptions.Item>
              <Descriptions.Item label="血型">
                {BloodTypeLabels[member.bloodType]}
              </Descriptions.Item>
              {member.height && (
                <Descriptions.Item label="身高">{member.height} cm</Descriptions.Item>
              )}
              {member.weight && (
                <Descriptions.Item label="体重">{member.weight} kg</Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {(member.chronicDiseases?.length || member.allergies) && (
            <Card title="健康信息" style={{ marginTop: 24 }}>
              <Descriptions column={1}>
                {member.chronicDiseases && member.chronicDiseases.length > 0 && (
                  <Descriptions.Item label="慢性病史">
                    {member.chronicDiseases.map((disease, index) => (
                      <Tag key={index} style={{ marginBottom: 4 }}>
                        {disease}
                      </Tag>
                    ))}
                  </Descriptions.Item>
                )}
                {member.allergies && (
                  <Descriptions.Item label="过敏史">
                    {member.allergies}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}

          {member.notes && (
            <Card title="备注" style={{ marginTop: 24 }}>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{member.notes}</p>
            </Card>
          )}
        </Col>

        <Col xs={24} lg={8}>
          <Card title="健康概览">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="健康文档"
                  value={member.documentCount || 0}
                  prefix={<FileTextOutlined />}
                  suffix="份"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="健康记录"
                  value={member.recordCount || 0}
                  prefix={<LineChartOutlined />}
                  suffix="条"
                />
              </Col>
              <Col span={24}>
                <Statistic
                  title="AI建议"
                  value={member.adviceCount || 0}
                  prefix={<BulbOutlined />}
                  suffix="次"
                />
              </Col>
            </Row>
          </Card>

          <Card title="快捷操作" style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Button
                icon={<FileTextOutlined />}
                onClick={() => navigate(`/documents?memberId=${id}`)}
                block
              >
                查看健康文档
              </Button>
              <Button
                icon={<LineChartOutlined />}
                onClick={() => navigate(`/records?memberId=${id}`)}
                block
              >
                查看健康记录
              </Button>
              <Button
                icon={<BulbOutlined />}
                onClick={() => navigate(`/advice?memberId=${id}`)}
                block
              >
                获取AI健康建议
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MemberDetail;
