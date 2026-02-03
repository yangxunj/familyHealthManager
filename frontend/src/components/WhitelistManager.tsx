/**
 * 白名单管理组件 - 管理员可以管理允许登录的邮箱
 */
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Input,
  Button,
  Table,
  Space,
  message,
  Popconfirm,
  Typography,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SafetyOutlined,
  MailOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { whitelistApi, type AllowedEmail } from '../api/whitelist';
import dayjs from 'dayjs';

const { Text } = Typography;

interface WhitelistManagerProps {
  open: boolean;
  onClose: () => void;
}

export const WhitelistManager: React.FC<WhitelistManagerProps> = ({
  open,
  onClose,
}) => {
  const [emails, setEmails] = useState<AllowedEmail[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);

  // 加载白名单
  const loadWhitelist = async () => {
    setLoading(true);
    try {
      const response = await whitelistApi.getWhitelist();
      setEmails(response.emails);
    } catch (error: any) {
      message.error(error.message || '加载白名单失败');
    } finally {
      setLoading(false);
    }
  };

  // 打开时加载数据
  useEffect(() => {
    if (open) {
      loadWhitelist();
    }
  }, [open]);

  // 添加邮箱
  const handleAdd = async () => {
    const email = newEmail.trim();
    if (!email) return;

    // 基本邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      message.error('请输入有效的邮箱地址');
      return;
    }

    setAdding(true);
    try {
      await whitelistApi.addEmail(email);
      message.success('邮箱已添加到白名单');
      setNewEmail('');
      await loadWhitelist();
    } catch (error: any) {
      message.error(error.message || '添加失败');
    } finally {
      setAdding(false);
    }
  };

  // 删除邮箱
  const handleDelete = async (email: string) => {
    setDeletingEmail(email);
    try {
      await whitelistApi.removeEmail(email);
      message.success('邮箱已从白名单移除');
      await loadWhitelist();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    } finally {
      setDeletingEmail(null);
    }
  };

  const columns = [
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => (
        <Space>
          <MailOutlined style={{ color: '#1890ff' }} />
          <Text strong>{email}</Text>
        </Space>
      ),
    },
    {
      title: '添加者',
      dataIndex: 'addedBy',
      key: 'addedBy',
      width: 200,
      render: (addedBy: string | null) => (
        <Space>
          <UserOutlined style={{ color: '#999' }} />
          <Text type="secondary">{addedBy || '系统'}</Text>
        </Space>
      ),
    },
    {
      title: '添加时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (createdAt: string) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#999' }} />
          <Text type="secondary">
            {dayjs(createdAt).format('YYYY-MM-DD HH:mm')}
          </Text>
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: AllowedEmail) => (
        <Popconfirm
          title="确认移除"
          description={`确定要将 ${record.email} 从白名单中移除吗？`}
          onConfirm={() => handleDelete(record.email)}
          okText="确定"
          cancelText="取消"
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            loading={deletingEmail === record.email}
          />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <SafetyOutlined />
          白名单管理
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      <div style={{ marginBottom: 16 }}>
        <Alert
          message="只有在白名单中的邮箱才能登录系统。如果白名单为空，则允许所有认证用户登录。"
          type="info"
          showIcon
          icon={<SafetyOutlined />}
        />
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Input
          placeholder="输入邮箱地址"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          onPressEnter={handleAdd}
          style={{ flex: 1 }}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          loading={adding}
          disabled={!newEmail.trim()}
        >
          添加
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={emails}
        rowKey="id"
        loading={loading}
        pagination={false}
        scroll={{ y: 400 }}
        locale={{ emptyText: '白名单为空，所有认证用户都可以登录' }}
      />

      <div
        style={{ marginTop: 16, textAlign: 'center', color: '#999', fontSize: 12 }}
      >
        共 {emails.length} 个邮箱
      </div>
    </Modal>
  );
};
