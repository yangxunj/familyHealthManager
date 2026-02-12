import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tabs,
  Form,
  Input,
  Select,
  Radio,
  Button,
  Space,
  Table,
  Popconfirm,
  Tag,
  Divider,
  Typography,
  Alert,
  Spin,
  message,
} from 'antd';
import {
  ApiOutlined,
  SafetyOutlined,
  PlusOutlined,
  DeleteOutlined,
  MailOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CloudOutlined,
  GoogleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { isAuthEnabled } from '../../lib/supabase';
import { whitelistApi, type AllowedEmail } from '../../api/whitelist';
import { settingsApi, type ApiConfig } from '../../api/settings';
import dayjs from 'dayjs';

const { Text } = Typography;

export default function SettingsPage() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = 加载中

  // 检查管理员权限
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await whitelistApi.checkAdmin();
        if (!response.isAdmin) {
          navigate('/dashboard', { replace: true });
          return;
        }
        setIsAdmin(true);
      } catch {
        navigate('/dashboard', { replace: true });
      }
    };
    checkAdmin();
  }, [navigate]);

  if (isAdmin === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Tabs
        items={[
          {
            key: 'api',
            label: <span><ApiOutlined style={{ marginRight: 6 }} />API 配置</span>,
            children: <ApiConfigSection />,
          },
          // 白名单管理仅在公网模式下显示（LAN 模式无账号登录概念）
          ...(isAuthEnabled
            ? [
                {
                  key: 'whitelist',
                  label: <span><SafetyOutlined style={{ marginRight: 6 }} />白名单管理</span>,
                  children: <WhitelistSection />,
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}

// ============================================================
// API 配置区块
// ============================================================
function ApiConfigSection() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ApiConfig | null>(null);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await settingsApi.getApiConfig();
      setConfig(data);
      form.setFieldsValue({
        aiProvider: data.aiProvider,
        dashscopeModel: data.dashscopeModel,
        geminiModel: data.geminiModel,
      });
    } catch (error: any) {
      message.error(error.message || '加载 API 配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async () => {
    const values = form.getFieldsValue();
    const updateData: Record<string, string> = {};

    if (values.dashscopeApiKey) {
      updateData.dashscopeApiKey = values.dashscopeApiKey;
    }
    if (values.googleApiKey) {
      updateData.googleApiKey = values.googleApiKey;
    }
    if (values.aiProvider) {
      updateData.aiProvider = values.aiProvider;
    }
    if (values.dashscopeModel && values.dashscopeModel !== config?.dashscopeModel) {
      updateData.dashscopeModel = values.dashscopeModel;
    }
    if (values.geminiModel && values.geminiModel !== config?.geminiModel) {
      updateData.geminiModel = values.geminiModel;
    }

    if (Object.keys(updateData).length === 0) {
      message.info('没有需要更新的配置');
      return;
    }

    setSaving(true);
    try {
      await settingsApi.updateApiConfig(updateData);
      message.success('API 配置已保存');
      await loadConfig();
      form.setFieldsValue({ dashscopeApiKey: '', googleApiKey: '' });
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleClearKey = async (keyName: 'dashscopeApiKey' | 'googleApiKey') => {
    setSaving(true);
    try {
      await settingsApi.updateApiConfig({ [keyName]: '' });
      message.success('已清除数据库中的配置');
      await loadConfig();
    } catch (error: any) {
      message.error(error.message || '清除失败');
    } finally {
      setSaving(false);
    }
  };

  const [testing, setTesting] = useState<'dashscope' | 'google' | null>(null);

  const handleTest = async (provider: 'dashscope' | 'google') => {
    setTesting(provider);
    try {
      await settingsApi.testApiKey(provider);
      message.success('连接测试成功');
      await loadConfig();
    } catch (error: any) {
      message.error(error.message || '连接测试失败');
    } finally {
      setTesting(null);
    }
  };

  const StatusTags = ({ has, source, verified }: { has: boolean; source: string; verified?: boolean }) => {
    if (!has) return <Tag icon={<CloseCircleOutlined />} color="default">未配置</Tag>;
    const sourceLabel = source === 'database' ? '数据库' : '环境变量';
    return (
      <>
        <Tag icon={<CheckCircleOutlined />} color="blue">已配置（{sourceLabel}）</Tag>
        {verified && <Tag icon={<CheckCircleOutlined />} color="success">已验证</Tag>}
      </>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin />
      </div>
    );
  }

  return (
    <div>
      <Alert
        message="配置 AI 服务的 API Key，保存后立即生效。数据库配置优先于环境变量。"
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Divider titlePlacement="left" plain>
          <Space><CloudOutlined />阿里云 DashScope</Space>
        </Divider>

        <div style={{ marginBottom: 8 }}>
          <Space>
            <Text type="secondary">当前状态：</Text>
            {config && <StatusTags has={config.hasDashscope} source={config.dashscopeSource} verified={config.dashscopeVerified} />}
            {config?.hasDashscope && !config.dashscopeVerified && (
              <Button size="small" onClick={() => handleTest('dashscope')} loading={testing === 'dashscope'}>测试</Button>
            )}
          </Space>
          {config?.dashscopeApiKey && (
            <Text type="secondary" style={{ marginLeft: 8 }}>{config.dashscopeApiKey}</Text>
          )}
        </div>

        <Form.Item
          name="dashscopeApiKey"
          label="API Key"
          extra="用于 OCR 文字识别服务（必需）。无此 Key 时 OCR 功能不可用。"
        >
          <Space.Compact style={{ width: '100%' }}>
            <Input.Password placeholder="输入新的 API Key（留空则不修改）" autoComplete="off" />
            {config?.dashscopeSource === 'database' && (
              <Button danger onClick={() => handleClearKey('dashscopeApiKey')} loading={saving}>清除</Button>
            )}
          </Space.Compact>
        </Form.Item>

        {config?.hasDashscope && (
          <Form.Item
            name="dashscopeModel"
            label="AI 模型"
            extra="括号内为每百万 Token 的输入/输出价格（¥ 人民币）。"
          >
            <Select>
              <Select.Option value="deepseek-v3.2">DeepSeek V3.2（¥2 / ¥3）</Select.Option>
              <Select.Option value="qwen3-max">通义千问 Qwen3-Max（¥2.5 / ¥10）</Select.Option>
              <Select.Option value="glm-4.7">智谱 GLM-4.7（¥3 / ¥14）</Select.Option>
              <Select.Option value="kimi-k2.5">Kimi K2.5（¥4 / ¥21）</Select.Option>
            </Select>
          </Form.Item>
        )}

        <Divider titlePlacement="left" plain>
          <Space><GoogleOutlined />Google Gemini</Space>
        </Divider>

        <div style={{ marginBottom: 8 }}>
          <Space>
            <Text type="secondary">当前状态：</Text>
            {config && <StatusTags has={config.hasGoogle} source={config.googleSource} verified={config.googleVerified} />}
            {config?.hasGoogle && !config.googleVerified && (
              <Button size="small" onClick={() => handleTest('google')} loading={testing === 'google'}>测试</Button>
            )}
          </Space>
          {config?.googleApiKey && (
            <Text type="secondary" style={{ marginLeft: 8 }}>{config.googleApiKey}</Text>
          )}
        </div>

        <Form.Item
          name="googleApiKey"
          label="API Key"
          extra="用于 AI 健康建议和健康咨询（可选）。如不配置，这些功能将使用阿里云。"
        >
          <Space.Compact style={{ width: '100%' }}>
            <Input.Password placeholder="输入新的 API Key（留空则不修改）" autoComplete="off" />
            {config?.googleSource === 'database' && (
              <Button danger onClick={() => handleClearKey('googleApiKey')} loading={saving}>清除</Button>
            )}
          </Space.Compact>
        </Form.Item>

        {config?.hasGoogle && (
          <Form.Item
            name="geminiModel"
            label="AI 模型"
            extra="括号内为每百万 Token 的输入/输出价格（≈ 人民币，按 $1≈¥7.3 折算）。"
          >
            <Select>
              <Select.Option value="gemini-3-flash-preview">Gemini 3 Flash（≈¥3.7 / ¥21.9）</Select.Option>
              <Select.Option value="gemini-3-pro-preview">Gemini 3 Pro（≈¥14.6 / ¥87.6）</Select.Option>
            </Select>
          </Form.Item>
        )}

        {config?.hasDashscope && config?.hasGoogle && (
          <>
            <Divider titlePlacement="left" plain>AI 服务偏好</Divider>
            <Form.Item
              name="aiProvider"
              label="非 OCR 的 AI 服务（健康建议、健康咨询、AI 规整）使用哪个提供商？"
            >
              <Radio.Group>
                <Space direction="vertical">
                  <Radio value="google">Google Gemini</Radio>
                  <Radio value="alibaba">阿里云 DashScope</Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
          </>
        )}

        <div style={{ textAlign: 'right' }}>
          <Button type="primary" onClick={handleSave} loading={saving}>保存</Button>
        </div>
      </Form>
    </div>
  );
}

// ============================================================
// 白名单管理区块
// ============================================================
function WhitelistSection() {
  const [emails, setEmails] = useState<AllowedEmail[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);

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

  useEffect(() => {
    loadWhitelist();
  }, []);

  const handleAdd = async () => {
    const email = newEmail.trim();
    if (!email) return;

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
          <MailOutlined style={{ color: '#136dec' }} />
          <Text strong>{email}</Text>
        </Space>
      ),
    },
    {
      title: '添加者',
      key: 'addedBy',
      width: 200,
      render: (_: unknown, record: AllowedEmail) => {
        const display = record.addedByName || record.addedBy || '系统';
        return (
          <Space>
            <UserOutlined style={{ color: 'var(--color-text-quaternary)' }} />
            <Text type="secondary">{display}</Text>
          </Space>
        );
      },
    },
    {
      title: '添加时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (createdAt: string) => (
        <Space>
          <ClockCircleOutlined style={{ color: 'var(--color-text-quaternary)' }} />
          <Text type="secondary">{dayjs(createdAt).format('YYYY-MM-DD HH:mm')}</Text>
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
    <div>
      <Alert
        message="只有在白名单中的邮箱才能登录系统。如果白名单为空，则允许所有认证用户登录。"
        type="info"
        showIcon
        icon={<SafetyOutlined />}
        style={{ marginBottom: 16 }}
      />

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

      <div style={{ marginTop: 16, textAlign: 'center', color: 'var(--color-text-quaternary)', fontSize: 12 }}>
        共 {emails.length} 个邮箱
      </div>
    </div>
  );
}
