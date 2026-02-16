import { useState } from 'react';
import { Button, Input, message, Spin } from 'antd';
import {
  HeartOutlined,
  CloudOutlined,
  HomeOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { setServerConfig } from '../../lib/serverConfig';
import { updateApiBaseUrl } from '../../api/client';
import axios from 'axios';

interface ServerSetupProps {
  onComplete: () => void;
}

export default function ServerSetup({ onComplete }: ServerSetupProps) {
  const [url, setUrl] = useState('');
  const [connecting, setConnecting] = useState(false);

  /** Normalize user input to a proper URL */
  function normalizeUrl(input: string): string {
    let trimmed = input.trim().replace(/\/+$/, '');
    // If no protocol, add http:// (most LAN servers use http)
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = 'http://' + trimmed;
    }
    return trimmed;
  }

  const handleConnect = async () => {
    if (!url.trim()) {
      message.warning('请输入服务器地址');
      return;
    }

    const serverUrl = normalizeUrl(url);
    setConnecting(true);

    try {
      const { data } = await axios.get(`${serverUrl}/api/v1/config/public`, {
        timeout: 10000,
      });

      const authRequired = !!(data?.data?.authRequired ?? data?.authRequired);

      // Save config
      setServerConfig(serverUrl, authRequired);

      // Update API client base URL
      updateApiBaseUrl(serverUrl.replace(/\/+$/, '') + '/api/v1');

      const modeLabel = authRequired ? '公网模式（需要登录）' : '局域网模式（免登录）';
      message.success(`连接成功！检测到${modeLabel}`);

      onComplete();
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        message.error('连接超时，请检查服务器地址是否正确');
      } else if (error.response) {
        message.error(`服务器返回错误 (${error.response.status})，请确认地址正确`);
      } else {
        message.error('无法连接到服务器，请检查地址和网络');
      }
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        background: 'linear-gradient(180deg, #f0f5ff 0%, #ffffff 100%)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <HeartOutlined
            style={{ fontSize: 56, color: '#136dec', marginBottom: 16 }}
          />
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              margin: 0,
              color: '#1a1a1a',
            }}
          >
            家庭健康管理
          </h1>
          <p style={{ color: '#888', marginTop: 8, fontSize: 15 }}>
            请配置服务器地址以开始使用
          </p>
        </div>

        {/* URL Input */}
        <div style={{ marginBottom: 20 }}>
          <Input
            size="large"
            prefix={<LinkOutlined style={{ color: '#bbb' }} />}
            placeholder="例如 192.168.1.5:5002 或 https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onPressEnter={handleConnect}
            disabled={connecting}
            style={{
              height: 52,
              borderRadius: 12,
              fontSize: 15,
            }}
          />
        </div>

        {/* Connect Button */}
        <Button
          type="primary"
          size="large"
          block
          loading={connecting}
          onClick={handleConnect}
          disabled={!url.trim()}
          icon={connecting ? undefined : <CloudOutlined />}
          style={{
            height: 52,
            fontSize: 16,
            borderRadius: 12,
            fontWeight: 600,
          }}
        >
          {connecting ? '正在连接...' : '连接服务器'}
        </Button>

        {/* Help text */}
        <div
          style={{
            marginTop: 32,
            padding: 16,
            background: '#f8f9fa',
            borderRadius: 12,
            fontSize: 13,
            color: '#666',
            lineHeight: 1.8,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8, color: '#333' }}>
            <HomeOutlined style={{ marginRight: 6 }} />
            如何获取服务器地址？
          </div>
          <div>
            <strong>局域网部署：</strong>使用电脑的 IP 地址，如{' '}
            <code>192.168.1.100:5002</code>
          </div>
          <div>
            <strong>公网部署：</strong>使用域名，如{' '}
            <code>https://health.example.com</code>
          </div>
        </div>
      </div>

      {/* Connecting overlay */}
      {connecting && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255,255,255,0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <Spin size="large" tip="正在连接服务器..." />
        </div>
      )}
    </div>
  );
}
