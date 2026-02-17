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
  Row,
  Col,
  Card,
  Empty,
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
  TeamOutlined,
  FileTextOutlined,
  LineChartOutlined,
  BulbOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getIsAuthEnabled } from '../../lib/supabase';
import { isNativePlatform } from '../../lib/capacitor';
import { getServerUrl, getServerAuthRequired, clearServerConfig } from '../../lib/serverConfig';
import { whitelistApi, type AllowedEmail } from '../../api/whitelist';
import { settingsApi, type ApiConfig } from '../../api/settings';
import { familyApi, type FamilyOverview } from '../../api/family';
import { useElderModeStore } from '../../store';
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
            key: 'display',
            label: <span><EyeOutlined style={{ marginRight: 6 }} />显示设置</span>,
            children: <DisplaySection />,
          },
          // 服务器配置（仅 App 环境显示）
          ...(isNativePlatform
            ? [
                {
                  key: 'server',
                  label: <span><CloudOutlined style={{ marginRight: 6 }} />服务器配置</span>,
                  children: <ServerConfigSection />,
                },
              ]
            : []),
          {
            key: 'api',
            label: <span><ApiOutlined style={{ marginRight: 6 }} />API 配置</span>,
            children: <ApiConfigSection />,
          },
          // 家庭概览仅在公网模式下显示（LAN 模式只有一个本地家庭）
          ...(getIsAuthEnabled()
            ? [
                {
                  key: 'families',
                  label: <span><TeamOutlined style={{ marginRight: 6 }} />家庭概览</span>,
                  children: <FamilyOverviewSection />,
                },
              ]
            : []),
          // 白名单管理仅在公网模式下显示（LAN 模式无账号登录概念）
          ...(getIsAuthEnabled()
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

// ============================================================
// 家庭概览区块
// ============================================================
function FamilyOverviewSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['adminFamilyOverview'],
    queryFn: familyApi.getAdminOverview,
  });

  const families = data?.families || [];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin />
      </div>
    );
  }

  if (families.length === 0) {
    return <Empty description="系统中暂无家庭" />;
  }

  const statItems = [
    { key: 'memberCount', icon: <TeamOutlined />, color: '#136dec', label: '成员', unit: '人' },
    { key: 'documentCount', icon: <FileTextOutlined />, color: '#13ec5b', label: '文档', unit: '份' },
    { key: 'recordCount', icon: <LineChartOutlined />, color: '#faad14', label: '记录', unit: '条' },
    { key: 'adviceCount', icon: <BulbOutlined />, color: '#722ed1', label: 'AI 建议', unit: '次' },
  ] as const;

  return (
    <div>
      <Alert
        message={`系统中共有 ${families.length} 个家庭，以下仅显示各家庭的统计数据，不涉及个人隐私信息。`}
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 16 }}
      />

      <Row gutter={[16, 16]}>
        {families.map((family: FamilyOverview) => (
          <Col xs={24} sm={12} lg={8} key={family.familyId}>
            <Card>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{family.familyName}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-quaternary)', marginTop: 4 }}>
                  <UserOutlined style={{ marginRight: 4 }} />
                  {family.creatorName}
                  <MailOutlined style={{ marginLeft: 12, marginRight: 4 }} />
                  {family.creatorEmail}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                {statItems.map((item) => (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
                      <span style={{ color: item.color, marginRight: 6 }}>{item.icon}</span>
                      {item.label}
                    </span>
                    <span style={{ fontWeight: 600 }}>
                      {family[item.key]} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-text-quaternary)' }}>{item.unit}</span>
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-quaternary)' }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                创建于 {dayjs(family.createdAt).format('YYYY-MM-DD')}
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}

// ============================================================
// 显示设置区块
// ============================================================
function DisplaySection() {
  const { isElderMode, toggleElderMode } = useElderModeStore();

  return (
    <div>
      <Alert
        message="调整界面显示模式，适配不同使用需求。"
        type="info"
        showIcon
        icon={<EyeOutlined />}
        style={{ marginBottom: 16 }}
      />

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              <EyeOutlined style={{ marginRight: 8, color: '#136dec' }} />
              老人模式
            </div>
            <Text type="secondary">
              开启后将增大字体、简化导航菜单、显示大按钮首页，更适合长辈使用。
            </Text>
          </div>
          <Button
            type={isElderMode ? 'primary' : 'default'}
            onClick={toggleElderMode}
            style={{ minWidth: 80 }}
          >
            {isElderMode ? '已开启' : '开启'}
          </Button>
        </div>

        {isElderMode && (
          <Alert
            message="老人模式已开启"
            description="界面已切换为大字体、简化导航。部分高级功能（健康文档、家庭成员管理等）已隐藏，可通过关闭老人模式恢复。"
            type="success"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>
    </div>
  );
}

// ============================================================
// 服务器配置区块（仅 Capacitor 环境）
// ============================================================
function ServerConfigSection() {
  const serverUrl = getServerUrl();
  const authRequired = getServerAuthRequired();

  const handleChangeServer = () => {
    clearServerConfig();
    // Reload the app to go back to ServerSetup
    window.location.reload();
  };

  return (
    <div>
      <Alert
        message="当前 App 连接的服务器信息"
        type="info"
        showIcon
        icon={<CloudOutlined />}
        style={{ marginBottom: 16 }}
      />

      <div style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">服务器地址</Text>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>
            {serverUrl || '未配置'}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">运行模式</Text>
          <div style={{ marginTop: 4 }}>
            <Tag color={authRequired ? 'blue' : 'green'}>
              {authRequired ? '公网模式（需要登录）' : '局域网模式（免登录）'}
            </Tag>
          </div>
        </div>
      </div>

      <Popconfirm
        title="更换服务器"
        description="更换服务器后需要重新配置连接，确定继续吗？"
        onConfirm={handleChangeServer}
        okText="确定"
        cancelText="取消"
      >
        <Button danger>更换服务器</Button>
      </Popconfirm>
    </div>
  );
}
