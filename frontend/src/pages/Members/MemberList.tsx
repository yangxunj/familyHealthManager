import { useState } from 'react';
import { Card, Row, Col, Button, Empty, Spin, Modal, message, Avatar, Tag, Popconfirm } from 'antd';
import {
  PlusOutlined,
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  ManOutlined,
  WomanOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membersApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import type { FamilyMember } from '../../types';
import { RelationshipLabels } from '../../types';
import dayjs from 'dayjs';

const MemberList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);

  const { data: members, isLoading } = useQuery({
    queryKey: ['members', 'all'],
    queryFn: () => membersApi.getAll({ scope: 'all' }),
  });

  // 当前用户是否已关联某个成员
  const currentUserLinked = members?.some((m) => m.userId === user?.id);

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

  const linkMutation = useMutation({
    mutationFn: membersApi.linkToUser,
    onSuccess: () => {
      message.success('关联成功');
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: () => {
      message.error('关联失败');
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: membersApi.unlinkFromUser,
    onSuccess: () => {
      message.success('已解除关联');
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: () => {
      message.error('解除关联失败');
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
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>家庭成员</h2>
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
          {members.map((member: FamilyMember) => {
            const isMe = member.userId === user?.id;
            return (
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
                        size={80}
                        icon={<UserOutlined />}
                        src={member.avatar}
                        style={{
                          backgroundColor: member.gender === 'MALE' ? '#136dec' : '#eb2f96',
                        }}
                      />
                    }
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{member.name}</span>
                        {member.gender === 'MALE' ? (
                          <ManOutlined style={{ color: '#136dec' }} />
                        ) : (
                          <WomanOutlined style={{ color: '#eb2f96' }} />
                        )}
                      </div>
                    }
                    description={
                      <div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                          <Tag color={member.relationship === 'SELF' ? 'blue' : 'default'}>
                            {RelationshipLabels[member.relationship]}
                          </Tag>
                          {isMe && (
                            <Tag color="green">这是你</Tag>
                          )}
                        </div>
                        <div style={{ marginTop: 8, color: 'var(--color-text-tertiary)' }}>
                          {calculateAge(member.birthDate)} 岁
                        </div>
                        {(member.documentCount || member.recordCount) ? (
                          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-quaternary)' }}>
                            {member.documentCount || 0} 份文档 · {member.recordCount || 0} 条记录
                          </div>
                        ) : null}
                        {/* 关联/解除关联按钮 */}
                        {isMe ? (
                          <Popconfirm
                            title="确定解除关联吗？"
                            description="解除后系统将无法自动识别你的成员档案"
                            onConfirm={(e) => {
                              e?.stopPropagation();
                              unlinkMutation.mutate();
                            }}
                            onCancel={(e) => e?.stopPropagation()}
                          >
                            <Button
                              type="link"
                              size="small"
                              danger
                              onClick={(e) => e.stopPropagation()}
                              style={{ padding: 0, marginTop: 4, fontSize: 12 }}
                            >
                              解除关联
                            </Button>
                          </Popconfirm>
                        ) : !currentUserLinked && !member.userId ? (
                          <Button
                            type="link"
                            size="small"
                            icon={<LinkOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              linkMutation.mutate(member.id);
                            }}
                            loading={linkMutation.isPending}
                            style={{ padding: 0, marginTop: 4, fontSize: 12 }}
                          >
                            关联到我
                          </Button>
                        ) : null}
                      </div>
                    }
                  />
                </Card>
              </Col>
            );
          })}
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
