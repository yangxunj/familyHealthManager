import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Drawer, Grid, theme, message, Tooltip } from 'antd';
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
  MenuOutlined,
  HeartOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import { useAuthStore, useThemeStore } from '../../store';
import { whitelistApi } from '../../api/whitelist';
import { WhitelistManager } from '../WhitelistManager';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [whitelistModalOpen, setWhitelistModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, hasFamily } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const screens = useBreakpoint();
  const isMobile = !screens.md; // < 768px
  const {
    token: { colorBgContainer },
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

  // 路由变化时关闭移动端抽屉
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

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

  // 根据是否有家庭过滤菜单项
  const visibleMenuItems = hasFamily
    ? menuItems
    : menuItems.filter(item => item?.key === '/family');

  // 菜单内容（桌面端和移动端共用）
  const siderContent = (
    <>
      <div
        style={{
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 0',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: !isMobile && collapsed ? 18 : 20,
            fontWeight: 700,
            color: '#136dec',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <HeartOutlined />
          {!isMobile && collapsed ? '' : '家庭健康管理'}
        </h1>
      </div>
      <Menu
        mode="inline"
        selectedKeys={getSelectedKeys()}
        defaultOpenKeys={hasFamily ? ['ai'] : []}
        items={visibleMenuItems}
        onClick={handleMenuClick}
        style={{ borderRight: 0 }}
      />
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 桌面端侧边栏 */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          theme="light"
          style={{
            borderRight: '1px solid var(--color-border)',
            background: 'var(--color-bg-elevated)',
          }}
        >
          {siderContent}
        </Sider>
      )}

      {/* 移动端抽屉菜单 */}
      {isMobile && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={250}
          styles={{ body: { padding: 0 } }}
          closable={false}
        >
          {siderContent}
        </Drawer>
      )}

      <Layout>
        <Header
          style={{
            padding: isMobile ? '0 12px' : '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px var(--color-shadow)',
            zIndex: 1,
          }}
        >
          <div
            onClick={() => (isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed))}
            style={{ cursor: 'pointer', fontSize: 18 }}
          >
            {isMobile ? (
              <MenuOutlined />
            ) : collapsed ? (
              <MenuUnfoldOutlined />
            ) : (
              <MenuFoldOutlined />
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tooltip title={isDark ? '切换亮色模式' : '切换暗色模式'}>
              <div
                onClick={toggleTheme}
                style={{
                  cursor: 'pointer',
                  fontSize: 18,
                  padding: '4px 8px',
                  borderRadius: 8,
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {isDark ? <SunOutlined /> : <MoonOutlined />}
              </div>
            </Tooltip>
            <Dropdown
              menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
              placement="bottomRight"
            >
              <div style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 12px',
                borderRadius: 8,
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Avatar icon={<UserOutlined />} size={isMobile ? 'small' : 'default'} />
                {!isMobile && <span>{user?.user_metadata?.full_name || user?.email || '用户'}</span>}
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: isMobile ? 12 : 24,
            padding: isMobile ? 12 : 28,
            background: colorBgContainer,
            borderRadius: 16,
            minHeight: 280,
            overflow: 'auto',
            boxShadow: '0 1px 4px var(--color-shadow-light)',
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
