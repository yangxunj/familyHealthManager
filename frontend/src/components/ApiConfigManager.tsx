/**
 * API 配置管理组件 - 管理员可配置 AI 服务的 API Key
 */
import { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Radio,
  Button,
  Space,
  message,
  Alert,
  Typography,
  Tag,
  Divider,
} from 'antd';
import {
  ApiOutlined,
  CloudOutlined,
  GoogleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { settingsApi, type ApiConfig } from '../api/settings';

const { Text } = Typography;

interface ApiConfigManagerProps {
  open: boolean;
  onClose: () => void;
}

export const ApiConfigManager: React.FC<ApiConfigManagerProps> = ({
  open,
  onClose,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ApiConfig | null>(null);

  // 加载配置
  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await settingsApi.getApiConfig();
      setConfig(data);
      form.setFieldsValue({
        aiProvider: data.aiProvider,
      });
    } catch (error: any) {
      message.error(error.message || '加载 API 配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadConfig();
      // 清空密码输入框
      form.setFieldsValue({
        dashscopeApiKey: '',
        googleApiKey: '',
      });
    }
  }, [open]);

  // 保存配置
  const handleSave = async () => {
    const values = form.getFieldsValue();
    const updateData: Record<string, string> = {};

    // 只在用户输入了新值时才更新
    if (values.dashscopeApiKey) {
      updateData.dashscopeApiKey = values.dashscopeApiKey;
    }
    if (values.googleApiKey) {
      updateData.googleApiKey = values.googleApiKey;
    }
    if (values.aiProvider) {
      updateData.aiProvider = values.aiProvider;
    }

    if (Object.keys(updateData).length === 0) {
      message.info('没有需要更新的配置');
      return;
    }

    setSaving(true);
    try {
      await settingsApi.updateApiConfig(updateData);
      message.success('API 配置已保存');
      // 重新加载显示最新状态
      await loadConfig();
      // 清空密码输入框
      form.setFieldsValue({
        dashscopeApiKey: '',
        googleApiKey: '',
      });
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 清除某个 Key
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

  // 状态标签
  const StatusTag = ({ has, source }: { has: boolean; source: string }) => {
    if (!has) {
      return <Tag icon={<CloseCircleOutlined />} color="default">未配置</Tag>;
    }
    if (source === 'database') {
      return <Tag icon={<CheckCircleOutlined />} color="success">已配置（数据库）</Tag>;
    }
    return <Tag icon={<CheckCircleOutlined />} color="blue">已配置（环境变量）</Tag>;
  };

  return (
    <Modal
      title={
        <Space>
          <ApiOutlined />
          API 配置
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
    >
      <Alert
        message="配置 AI 服务的 API Key，保存后立即生效。数据库配置优先于环境变量。"
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        {/* 阿里云 DashScope */}
        <Divider orientation="left" plain>
          <Space>
            <CloudOutlined />
            阿里云 DashScope
          </Space>
        </Divider>

        <div style={{ marginBottom: 8 }}>
          <Space>
            <Text type="secondary">当前状态：</Text>
            {config && <StatusTag has={config.hasDashscope} source={config.dashscopeSource} />}
          </Space>
          {config?.dashscopeApiKey && (
            <Text type="secondary" style={{ marginLeft: 8 }}>
              {config.dashscopeApiKey}
            </Text>
          )}
        </div>

        <Form.Item
          name="dashscopeApiKey"
          label="API Key"
          extra="用于 OCR 文字识别服务（必需）。无此 Key 时 OCR 功能不可用。"
        >
          <Space.Compact style={{ width: '100%' }}>
            <Input.Password
              placeholder="输入新的 API Key（留空则不修改）"
              autoComplete="off"
            />
            {config?.dashscopeSource === 'database' && (
              <Button
                danger
                onClick={() => handleClearKey('dashscopeApiKey')}
                loading={saving}
              >
                清除
              </Button>
            )}
          </Space.Compact>
        </Form.Item>

        {/* Google Gemini */}
        <Divider orientation="left" plain>
          <Space>
            <GoogleOutlined />
            Google Gemini
          </Space>
        </Divider>

        <div style={{ marginBottom: 8 }}>
          <Space>
            <Text type="secondary">当前状态：</Text>
            {config && <StatusTag has={config.hasGoogle} source={config.googleSource} />}
          </Space>
          {config?.googleApiKey && (
            <Text type="secondary" style={{ marginLeft: 8 }}>
              {config.googleApiKey}
            </Text>
          )}
        </div>

        <Form.Item
          name="googleApiKey"
          label="API Key"
          extra="用于 AI 健康建议和健康咨询（可选）。如不配置，这些功能将使用阿里云。"
        >
          <Space.Compact style={{ width: '100%' }}>
            <Input.Password
              placeholder="输入新的 API Key（留空则不修改）"
              autoComplete="off"
            />
            {config?.googleSource === 'database' && (
              <Button
                danger
                onClick={() => handleClearKey('googleApiKey')}
                loading={saving}
              >
                清除
              </Button>
            )}
          </Space.Compact>
        </Form.Item>

        {/* AI 服务偏好 - 仅当两个都有时显示 */}
        {config?.hasDashscope && config?.hasGoogle && (
          <>
            <Divider orientation="left" plain>
              AI 服务偏好
            </Divider>
            <Form.Item
              name="aiProvider"
              label="非 OCR 的 AI 服务（健康建议、健康咨询）使用哪个提供商？"
            >
              <Radio.Group>
                <Space direction="vertical">
                  <Radio value="auto">自动（优先使用 Google）</Radio>
                  <Radio value="google">始终使用 Google Gemini</Radio>
                  <Radio value="alibaba">始终使用阿里云（通义千问）</Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
          </>
        )}

        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button
              type="primary"
              onClick={handleSave}
              loading={saving || loading}
            >
              保存
            </Button>
          </Space>
        </div>
      </Form>
    </Modal>
  );
};
