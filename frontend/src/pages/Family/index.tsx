import { useState } from 'react';
import {
  Card,
  Button,
  Input,
  Space,
  Typography,
  Modal,
  Form,
  List,
  Avatar,
  Tag,
  message,
  Tooltip,
  Popconfirm,
  Divider,
  Empty,
  Spin,
  Switch,
  Checkbox,
} from 'antd';
import {
  TeamOutlined,
  PlusOutlined,
  UserAddOutlined,
  CopyOutlined,
  ReloadOutlined,
  LogoutOutlined,
  DeleteOutlined,
  CrownOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { familyApi } from '../../api/family';
import type { VisibilityConfig, VisibilityConfigUser } from '../../api/family';
import { RelationshipLabels } from '../../types';
import type { Relationship } from '../../types';

const { Title, Text, Paragraph } = Typography;

export default function FamilyPage() {
  const { family, hasFamily, loadFamily, setFamily, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [createForm] = Form.useForm();
  const [joinForm] = Form.useForm();

  // 可见性配置相关状态
  const [visModalVisible, setVisModalVisible] = useState(false);
  const [visLoading, setVisLoading] = useState(false);
  const [visSaving, setVisSaving] = useState(false);
  const [visConfig, setVisConfig] = useState<VisibilityConfig | null>(null);
  const [visTargetUser, setVisTargetUser] = useState<VisibilityConfigUser | null>(null);
  const [visEnabled, setVisEnabled] = useState(false);
  const [visCheckedIds, setVisCheckedIds] = useState<string[]>([]);

  const handleCreateFamily = async (values: { name: string }) => {
    setLoading(true);
    try {
      const newFamily = await familyApi.create(values);
      setFamily(newFamily);
      message.success('家庭创建成功');
      setCreateModalVisible(false);
      createForm.resetFields();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '创建失败';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async (values: { inviteCode: string }) => {
    setLoading(true);
    try {
      const joinedFamily = await familyApi.join(values);
      setFamily(joinedFamily);
      message.success('成功加入家庭');
      setJoinModalVisible(false);
      joinForm.resetFields();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '加入失败';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInviteCode = () => {
    if (family?.inviteCode) {
      navigator.clipboard.writeText(family.inviteCode);
      message.success('邀请码已复制');
    }
  };

  const handleRegenerateCode = async () => {
    setLoading(true);
    try {
      const result = await familyApi.regenerateInviteCode();
      if (family) {
        setFamily({ ...family, inviteCode: result.inviteCode });
      }
      message.success('邀请码已更新');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '更新失败';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveFamily = async () => {
    setLoading(true);
    try {
      await familyApi.leave();
      setFamily(null);
      message.success('已离开家庭');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '操作失败';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setLoading(true);
    try {
      await familyApi.removeMember(userId);
      await loadFamily();
      message.success('成员已移除');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '操作失败';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 打开可见性配置弹窗
  const handleOpenVisModal = async (targetUser: { id: string; name: string; email: string }) => {
    setVisModalVisible(true);
    setVisLoading(true);
    try {
      const config = await familyApi.getVisibility();
      setVisConfig(config);
      const targetConfig = config.users.find((u) => u.id === targetUser.id);
      if (targetConfig) {
        setVisTargetUser(targetConfig);
        setVisEnabled(targetConfig.memberVisibilityConfigured);
        setVisCheckedIds(targetConfig.visibleMemberIds);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '加载失败';
      message.error(errorMessage);
      setVisModalVisible(false);
    } finally {
      setVisLoading(false);
    }
  };

  // 保存可见性配置
  const handleSaveVisibility = async () => {
    if (!visTargetUser) return;
    setVisSaving(true);
    try {
      await familyApi.setVisibility(visTargetUser.id, {
        memberVisibilityConfigured: visEnabled,
        visibleMemberIds: visCheckedIds,
      });
      message.success('可见性配置已保存');
      setVisModalVisible(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '保存失败';
      message.error(errorMessage);
    } finally {
      setVisSaving(false);
    }
  };

  // 切换成员勾选
  const handleToggleMember = (memberId: string, checked: boolean) => {
    if (checked) {
      setVisCheckedIds((prev) => [...prev, memberId]);
    } else {
      setVisCheckedIds((prev) => prev.filter((id) => id !== memberId));
    }
  };

  if (!hasFamily) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <Empty
            image={<TeamOutlined style={{ fontSize: 64, color: '#136dec' }} />}
            description={
              <Space direction="vertical" size="small">
                <Title level={4} style={{ margin: 0 }}>
                  您还没有加入任何家庭
                </Title>
                <Paragraph type="secondary">
                  创建一个新家庭或使用邀请码加入现有家庭，与家人共享健康数据
                </Paragraph>
              </Space>
            }
          >
            <Space size="large">
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalVisible(true)}
              >
                创建家庭
              </Button>
              <Button
                size="large"
                icon={<UserAddOutlined />}
                onClick={() => setJoinModalVisible(true)}
              >
                加入家庭
              </Button>
            </Space>
          </Empty>
        </Card>

        {/* 创建家庭弹窗 */}
        <Modal
          title="创建新家庭"
          open={createModalVisible}
          onCancel={() => setCreateModalVisible(false)}
          footer={null}
        >
          <Form form={createForm} onFinish={handleCreateFamily} layout="vertical">
            <Form.Item
              name="name"
              label="家庭名称"
              rules={[{ required: true, message: '请输入家庭名称' }]}
            >
              <Input placeholder="如：张三的家" maxLength={100} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                创建
              </Button>
            </Form.Item>
          </Form>
        </Modal>

        {/* 加入家庭弹窗 */}
        <Modal
          title="加入家庭"
          open={joinModalVisible}
          onCancel={() => setJoinModalVisible(false)}
          footer={null}
        >
          <Form form={joinForm} onFinish={handleJoinFamily} layout="vertical">
            <Form.Item
              name="inviteCode"
              label="邀请码"
              rules={[
                { required: true, message: '请输入邀请码' },
                { len: 8, message: '邀请码应为8位字符' },
              ]}
            >
              <Input
                placeholder="请输入8位邀请码"
                maxLength={8}
                style={{ textTransform: 'uppercase' }}
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                加入
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Spin spinning={loading}>
        {/* 家庭信息卡片 */}
        <Card
          title={
            <Space>
              <TeamOutlined />
              <span>家庭信息</span>
            </Space>
          }
          extra={
            family?.isOwner && (
              <Popconfirm
                title="确定要离开家庭吗？"
                description="离开后，家庭数据将被删除（如果您是最后一个成员）"
                onConfirm={handleLeaveFamily}
                okText="确定"
                cancelText="取消"
              >
                <Button danger icon={<LogoutOutlined />}>
                  离开家庭
                </Button>
              </Popconfirm>
            )
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">家庭名称</Text>
              <Title level={4} style={{ margin: '4px 0' }}>
                {family?.name}
              </Title>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div>
              <Text type="secondary">邀请码（分享给家人加入）</Text>
              <div style={{ marginTop: 8 }}>
                <Space>
                  <Input
                    value={family?.inviteCode}
                    readOnly
                    style={{
                      width: 150,
                      fontFamily: 'monospace',
                      fontSize: 18,
                      fontWeight: 'bold',
                      letterSpacing: 2,
                    }}
                  />
                  <Tooltip title="复制邀请码">
                    <Button icon={<CopyOutlined />} onClick={handleCopyInviteCode} />
                  </Tooltip>
                  {family?.isOwner && (
                    <Tooltip title="重新生成邀请码">
                      <Popconfirm
                        title="确定要重新生成邀请码吗？"
                        description="旧的邀请码将失效"
                        onConfirm={handleRegenerateCode}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button icon={<ReloadOutlined />} />
                      </Popconfirm>
                    </Tooltip>
                  )}
                </Space>
              </div>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div>
              <Space>
                <Tag color="blue">{family?.userCount} 个账号</Tag>
                <Tag color="green">{family?.memberCount} 个家庭成员</Tag>
              </Space>
            </div>
          </Space>
        </Card>

        {/* 家庭成员列表 */}
        <Card
          title="家庭账号"
          style={{ marginTop: 16 }}
          extra={<Text type="secondary">共 {family?.users?.length || 0} 个账号</Text>}
        >
          <List
            dataSource={family?.users || []}
            renderItem={(member) => (
              <List.Item
                actions={[
                  ...(family?.isOwner && member.id !== user?.id
                    ? [
                        <Tooltip key="visibility" title="配置可见性">
                          <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handleOpenVisModal(member)}
                          >
                            可见性
                          </Button>
                        </Tooltip>,
                        <Popconfirm
                          key="remove"
                          title="确定要移除该成员吗？"
                          onConfirm={() => handleRemoveMember(member.id)}
                          okText="确定"
                          cancelText="取消"
                        >
                          <Button danger size="small" icon={<DeleteOutlined />}>
                            移除
                          </Button>
                        </Popconfirm>,
                      ]
                    : []),
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar>{member.name?.[0] || member.email[0]}</Avatar>}
                  title={
                    <Space>
                      <span>{member.name || member.email}</span>
                      {member.isOwner && (
                        <Tag icon={<CrownOutlined />} color="gold">
                          创建者
                        </Tag>
                      )}
                      {member.id === user?.id && <Tag color="blue">我</Tag>}
                    </Space>
                  }
                  description={member.email}
                />
              </List.Item>
            )}
          />
        </Card>
      </Spin>

      {/* 可见性配置弹窗 */}
      <Modal
        title={`配置可见性 - ${visTargetUser?.name || visTargetUser?.email || ''}`}
        open={visModalVisible}
        onCancel={() => setVisModalVisible(false)}
        onOk={handleSaveVisibility}
        confirmLoading={visSaving}
        okText="保存"
        cancelText="取消"
      >
        <Spin spinning={visLoading}>
          {visConfig && visTargetUser && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <Space>
                  <Switch
                    checked={visEnabled}
                    onChange={setVisEnabled}
                  />
                  <Text>启用可见性限制</Text>
                </Space>
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {visEnabled
                      ? '该用户登录后，只能在健康相关页面看到下方勾选的家庭成员'
                      : '该用户登录后，可以看到所有家庭成员'}
                  </Text>
                </div>
              </div>

              {visEnabled && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                    勾选该用户可以看到的家庭成员：
                  </Text>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {visConfig.members.map((member) => {
                      const isLinkedMember = member.id === visTargetUser.linkedMemberId;
                      const checked = visCheckedIds.includes(member.id) || isLinkedMember;
                      return (
                        <Checkbox
                          key={member.id}
                          checked={checked}
                          disabled={isLinkedMember}
                          onChange={(e) => handleToggleMember(member.id, e.target.checked)}
                        >
                          <Space>
                            <span>{member.name}</span>
                            <Tag style={{ fontSize: 11 }}>
                              {RelationshipLabels[member.relationship as Relationship] || member.relationship}
                            </Tag>
                            {isLinkedMember && (
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                (本人，始终可见)
                              </Text>
                            )}
                          </Space>
                        </Checkbox>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </Spin>
      </Modal>
    </div>
  );
}
