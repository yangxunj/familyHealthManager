import { useState } from 'react';
import { Card, Row, Col, Button, Empty, Spin, Modal, message, Avatar, Tag } from 'antd';
import {
  PlusOutlined,
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  ManOutlined,
  WomanOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membersApi } from '../../api';
import type { FamilyMember } from '../../types';
import { RelationshipLabels } from '../../types';
import dayjs from 'dayjs';

const MemberList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: membersApi.delete,
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setDeleteId(null);
    },
    onError: () => {
      message.error('删除失败');
    },
  });

  const calculateAge = (birthDate: string) => {
    return dayjs().diff(dayjs(birthDate), 'year');
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>家庭成员</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/members/add')}
        >
          添加成员
        </Button>
      </div>

      {!members || members.length === 0 ? (
        <Card>
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
      ) : (
        <Row gutter={[16, 16]}>
          {members.map((member: FamilyMember) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={member.id}>
              <Card
                hoverable
                onClick={() => navigate(`/members/${member.id}`)}
                actions={[
                  <EditOutlined
                    key="edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/members/${member.id}/edit`);
                    }}
                  />,
                  <DeleteOutlined
                    key="delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(member.id);
                    }}
                  />,
                ]}
              >
                <Card.Meta
                  avatar={
                    <Avatar
                      size={64}
                      icon={<UserOutlined />}
                      src={member.avatar}
                      style={{
                        backgroundColor: member.gender === 'MALE' ? '#1890ff' : '#eb2f96',
                      }}
                    />
                  }
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{member.name}</span>
                      {member.gender === 'MALE' ? (
                        <ManOutlined style={{ color: '#1890ff' }} />
                      ) : (
                        <WomanOutlined style={{ color: '#eb2f96' }} />
                      )}
                    </div>
                  }
                  description={
                    <div>
                      <Tag color={member.relationship === 'SELF' ? 'blue' : 'default'}>
                        {RelationshipLabels[member.relationship]}
                      </Tag>
                      <div style={{ marginTop: 8, color: '#666' }}>
                        {calculateAge(member.birthDate)} 岁
                      </div>
                      {(member.documentCount || member.recordCount) && (
                        <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
                          {member.documentCount || 0} 份文档 · {member.recordCount || 0} 条记录
                        </div>
                      )}
                    </div>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title="确认删除"
        open={!!deleteId}
        onOk={handleDelete}
        onCancel={() => setDeleteId(null)}
        confirmLoading={deleteMutation.isPending}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要删除该家庭成员吗？删除后相关的健康数据也将被删除。</p>
      </Modal>
    </div>
  );
};

export default MemberList;
