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
  UsergroupAddOutlined,
  MenuOutlined,
  HeartOutlined,
  SunOutlined,
  MoonOutlined,
  BulbOutlined,
  MedicineBoxOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useAuthStore, useThemeStore, useElderModeStore } from '../../store';
import { getIsAuthEnabled } from '../../lib/supabase';
import { whitelistApi } from '../../api/whitelist';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

// 老人模式底部 Tab 栏配置
const elderTabs = [
  { key: '/chat', icon: <MessageOutlined />, label: '健康咨询' },
  { key: '/advice', icon: <BulbOutlined />, label: '健康建议' },
  { key: '/records', icon: <LineChartOutlined />, label: '健康记录' },
];

const ELDER_TAB_HEIGHT = 64;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, hasFamily, isFamilyLoaded } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const { isElderMode, toggleElderMode } = useElderModeStore();
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
      key: '/health-plan',
      icon: <MedicineBoxOutlined />,
      label: '健康计划',
    },
    {
      key: 'ai',
      icon: <RobotOutlined />,
      label: 'AI 助手',
      children: [
        {
          key: '/advice',
          icon: <BulbOutlined />,
          label: '健康建议',
        },
        {
          key: '/chat',
          icon: <MessageOutlined />,
          label: '健康咨询',
        },
      ],
    },
    // 家庭设置仅在公网模式下显示（LAN 模式只有一个本地用户，无需家庭管理）
    ...(getIsAuthEnabled()
      ? [
          {
            key: '/family',
            icon: <UsergroupAddOutlined />,
            label: '家庭设置',
          },
        ]
      : []),
    // 设置页仅管理员可见
    ...(isAdmin
      ? [
          {
            key: '/settings',
            icon: <SettingOutlined />,
            label: '系统设置',
          },
        ]
      : []),
  ];

  // 用户下拉菜单（仅公网模式使用）
  const userMenuItems: MenuProps['items'] = [
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
    }
  };

  // 获取当前选中的菜单项
  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path.startsWith('/members')) return ['/members'];
    if (path.startsWith('/documents')) return ['/documents'];
    if (path.startsWith('/records')) return ['/records'];
    if (path.startsWith('/health-plan')) return ['/health-plan'];
    if (path.startsWith('/advice')) return ['/advice'];
    if (path.startsWith('/chat')) return ['/chat'];
    if (path.startsWith('/family')) return ['/family'];
    if (path.startsWith('/settings')) return ['/settings'];
    return ['/dashboard'];
  };

  // 老人模式下隐藏复杂菜单项
  const elderModeHiddenKeys = new Set(['/members', '/documents', '/health-plan', '/family']);

  // 根据是否有家庭 + 老人模式过滤菜单项
  const visibleMenuItems = (() => {
    if (!hasFamily && isFamilyLoaded) {
      return menuItems.filter(item => item?.key === '/family');
    }
    if (isElderMode) {
      return menuItems.filter(item => !elderModeHiddenKeys.has(item?.key as string));
    }
    return menuItems;
  })();

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
        defaultOpenKeys={(hasFamily || !isFamilyLoaded) ? ['ai'] : []}
        items={visibleMenuItems}
        onClick={handleMenuClick}
        style={{ borderRight: 0 }}
      />
    </>
  );

  // 老人模式底部 Tab 高亮匹配
  const getActiveElderTab = () => {
    const path = location.pathname;
    if (path.startsWith('/records')) return '/records';
    if (path.startsWith('/chat')) return '/chat';
    if (path.startsWith('/advice')) return '/advice';
    return '';
  };

  // ============================================================
  // 老人模式布局：无侧边栏 + 底部 Tab 栏
  // ============================================================
  if (isElderMode) {
    const activeTab = getActiveElderTab();
    return (
      <Layout style={{ height: '100dvh', overflow: 'hidden' }}>
        <Header
          style={{
            padding: '0 16px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px var(--color-shadow)',
            zIndex: 1,
            height: 56,
            lineHeight: '56px',
          }}
        >
          {/* 左侧占位，保持标题居中 */}
          <div style={{ width: 40 }} />
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: '#136dec',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <HeartOutlined />
            家庭健康管理
          </h1>
          {/* 右侧设置图标 */}
          {isAdmin ? (
            <div
              onClick={() => navigate('/settings')}
              style={{
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 18,
                color: 'var(--color-text-quaternary)',
                borderRadius: 8,
              }}
            >
              <SettingOutlined />
            </div>
          ) : (
            <div style={{ width: 40 }} />
          )}
        </Header>

        <Content
          style={{
            padding: isMobile ? 8 : 16,
            background: colorBgContainer,
            overflowX: 'hidden',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          }}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Outlet />
          </div>
        </Content>

        {/* 底部 Tab 栏 */}
        <div
          style={{
            height: ELDER_TAB_HEIGHT,
            background: colorBgContainer,
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'stretch',
            flexShrink: 0,
          }}
        >
          {elderTabs.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <div
                key={tab.key}
                onClick={() => navigate(tab.key)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  cursor: 'pointer',
                  color: isActive ? '#136dec' : '#c0c0c0',
                  transition: 'color 0.2s',
                  position: 'relative',
                  userSelect: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {/* 选中指示条 */}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '25%',
                      right: '25%',
                      height: 3,
                      borderRadius: 2,
                      background: '#136dec',
                    }}
                  />
                )}
                <span style={{ fontSize: 24, lineHeight: 1 }}>{tab.icon}</span>
                <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 400 }}>{tab.label}</span>
              </div>
            );
          })}
        </div>
      </Layout>
    );
  }

  // ============================================================
  // 普通模式布局：侧边栏 + 顶栏
  // ============================================================
  return (
    <Layout style={{ minHeight: '100dvh' }}>
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
            <Tooltip title="开启老人模式">
              <div
                onClick={toggleElderMode}
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
                <EyeOutlined />
              </div>
            </Tooltip>
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
            {getIsAuthEnabled() ? (
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
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 12px',
              }}>
                <Avatar icon={<UserOutlined />} size={isMobile ? 'small' : 'default'} />
                {!isMobile && <span>本地用户</span>}
              </div>
            )}
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
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
