import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, theme, message } from 'antd';
import type { MenuProps } from 'antd';
import {
  HomeOutlined,
  TeamOutlined,
  FileTextOutlined,
  LineChartOutlined,
  RobotOutlined,
  MessageOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SafetyOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store';
import { whitelistApi } from '../../api/whitelist';
import { WhitelistManager } from '../WhitelistManager';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [whitelistModalOpen, setWhitelistModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuthStore();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // 检查是否是管理员
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await whitelistApi.checkAdmin();
        setIsAdmin(response.isAdmin);
      } catch (error) {
        console.error('Failed to check admin status:', error);
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  // 侧边栏菜单
  const menuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/members',
      icon: <TeamOutlined />,
      label: '家庭成员',
    },
    {
      key: '/documents',
      icon: <FileTextOutlined />,
      label: '健康文档',
    },
    {
      key: '/records',
      icon: <LineChartOutlined />,
      label: '健康记录',
    },
    {
      key: 'ai',
      icon: <RobotOutlined />,
      label: 'AI 助手',
      children: [
        {
          key: '/advice',
          label: '健康建议',
        },
        {
          key: '/chat',
          icon: <MessageOutlined />,
          label: '健康咨询',
        },
      ],
    },
    {
      key: '/family',
      icon: <UsergroupAddOutlined />,
      label: '家庭设置',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
  ];

  // 用户下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
    },
    ...(isAdmin
      ? [
          {
            key: 'whitelist',
            icon: <SafetyOutlined />,
            label: '白名单管理',
          },
        ]
      : []),
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ];

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    navigate(e.key);
  };

  const handleUserMenuClick: MenuProps['onClick'] = (e) => {
    if (e.key === 'logout') {
      signOut();
      message.success('已退出登录');
      navigate('/login');
    } else if (e.key === 'profile') {
      navigate('/settings');
    } else if (e.key === 'whitelist') {
      setWhitelistModalOpen(true);
    }
  };

  // 获取当前选中的菜单项
  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path.startsWith('/members')) return ['/members'];
    if (path.startsWith('/documents')) return ['/documents'];
    if (path.startsWith('/records')) return ['/records'];
    if (path.startsWith('/advice')) return ['/advice'];
    if (path.startsWith('/chat')) return ['/chat'];
    if (path.startsWith('/family')) return ['/family'];
    if (path.startsWith('/settings')) return ['/settings'];
    return ['/dashboard'];
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        style={{
          borderRight: '1px solid #f0f0f0',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: collapsed ? 16 : 18,
              fontWeight: 600,
              color: '#1890ff',
              whiteSpace: 'nowrap',
            }}
          >
            {collapsed ? '健康' : '家庭健康管理'}
          </h1>
        </div>
        <Menu
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={['ai']}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <div
            onClick={() => setCollapsed(!collapsed)}
            style={{ cursor: 'pointer', fontSize: 18 }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>
          <Dropdown
            menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
            placement="bottomRight"
          >
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user?.name || '用户'}</span>
            </div>
          </Dropdown>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: 280,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>

      {/* 白名单管理弹窗 */}
      <WhitelistManager
        open={whitelistModalOpen}
        onClose={() => setWhitelistModalOpen(false)}
      />
    </Layout>
  );
};

export default MainLayout;
