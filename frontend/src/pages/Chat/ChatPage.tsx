import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layout,
  List,
  Button,
  Input,
  Select,
  Space,
  Spin,
  Empty,
  Typography,
  Modal,
  Alert,
  message,
  Popconfirm,
  Grid,
} from 'antd';
import {
  MessageOutlined,
  PlusOutlined,
  DeleteOutlined,
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi, membersApi } from '../../api';
import type {
  ChatSession,
  ChatMessage,
  SSEMessageEvent,
} from '../../types';
import dayjs from 'dayjs';

const { Sider, Content } = Layout;
const { TextArea } = Input;
const { Text } = Typography;
const { useBreakpoint } = Grid;

// 快捷问题
const QUICK_QUESTIONS = [
  '我最近的血压正常吗？',
  '如何改善睡眠质量？',
  '我应该注意哪些饮食习惯？',
  '帮我分析最近的健康数据',
];

const ChatPage: React.FC = () => {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>();
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);

  // 获取家庭成员
  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.getAll,
  });

  // 获取会话列表
  const { data: sessions, isLoading: isLoadingSessions } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () => chatApi.getSessions(),
  });

  // 获取当前会话详情
  const { data: currentSession, isLoading: isLoadingSession } = useQuery({
    queryKey: ['chat-session', selectedSessionId],
    queryFn: () => chatApi.getSession(selectedSessionId!),
    enabled: !!selectedSessionId,
  });

  // 同步远程消息到本地
  useEffect(() => {
    if (currentSession?.messages) {
      setLocalMessages(currentSession.messages);
    }
  }, [currentSession?.messages]);

  // 创建会话
  const createSessionMutation = useMutation({
    mutationFn: chatApi.createSession,
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      setSelectedSessionId(session.id);
      setShowNewSessionModal(false);
      message.success('会话创建成功');
    },
    onError: () => {
      message.error('创建会话失败');
    },
  });

  // 删除会话
  const deleteSessionMutation = useMutation({
    mutationFn: chatApi.deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      if (selectedSessionId) {
        setSelectedSessionId(null);
        setLocalMessages([]);
      }
      message.success('会话已删除');
    },
    onError: () => {
      message.error('删除会话失败');
    },
  });

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [localMessages, streamingContent, scrollToBottom]);

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || !selectedSessionId || isStreaming) return;

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      createdAt: new Date().toISOString(),
    };

    // 立即添加用户消息到本地
    setLocalMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsStreaming(true);
    setStreamingContent('');

    try {
      await chatApi.sendMessage(
        selectedSessionId,
        userMessage.content,
        (event) => {
          if ('tokensUsed' in event) {
            // 完成事件
            setIsStreaming(false);
            setStreamingContent('');
            // 刷新消息列表
            queryClient.invalidateQueries({ queryKey: ['chat-session', selectedSessionId] });
            queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
          } else {
            // 消息事件
            const msgEvent = event as SSEMessageEvent;
            if (!msgEvent.done) {
              setStreamingContent((prev) => prev + msgEvent.content);
            }
          }
        },
        (error) => {
          message.error(error);
          setIsStreaming(false);
          setStreamingContent('');
        },
      );
    } catch (error) {
      message.error('发送消息失败');
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  // 处理快捷问题点击
  const handleQuickQuestion = (question: string) => {
    setInputValue(question);
  };

  // 创建新会话
  const handleCreateSession = () => {
    if (!selectedMemberId) {
      message.warning('请选择家庭成员');
      return;
    }
    createSessionMutation.mutate({ memberId: selectedMemberId });
  };

  // 渲染消息气泡
  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.role === 'user';
    return (
      <div
        key={msg.id}
        style={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: isUser ? 'row-reverse' : 'row',
            alignItems: 'flex-start',
            maxWidth: isMobile ? '90%' : '80%',
          }}
        >
          <div
            style={{
              width: isMobile ? 30 : 36,
              height: isMobile ? 30 : 36,
              borderRadius: '50%',
              backgroundColor: isUser ? '#136dec' : '#13ec5b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0,
              fontSize: isMobile ? 12 : 14,
              margin: isUser ? '0 0 0 8px' : '0 8px 0 0',
            }}
          >
            {isUser ? <UserOutlined /> : <RobotOutlined />}
          </div>
          <div
            style={{
              backgroundColor: isUser ? '#136dec' : 'var(--color-bg-chat-ai)',
              color: isUser ? '#fff' : 'var(--color-text-primary)',
              padding: isMobile ? '8px 12px' : '10px 14px',
              borderRadius: 16,
              borderTopLeftRadius: isUser ? 16 : 4,
              borderTopRightRadius: isUser ? 4 : 16,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: isMobile ? 14 : undefined,
              lineHeight: 1.6,
            }}
          >
            {msg.content}
          </div>
        </div>
      </div>
    );
  };

  // 渲染流式消息
  const renderStreamingMessage = () => {
    if (!isStreaming && !streamingContent) return null;

    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            maxWidth: isMobile ? '90%' : '80%',
          }}
        >
          <div
            style={{
              width: isMobile ? 30 : 36,
              height: isMobile ? 30 : 36,
              borderRadius: '50%',
              backgroundColor: '#13ec5b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0,
              fontSize: isMobile ? 12 : 14,
              marginRight: 8,
            }}
          >
            <RobotOutlined />
          </div>
          <div
            style={{
              backgroundColor: 'var(--color-bg-chat-ai)',
              color: 'var(--color-text-primary)',
              padding: isMobile ? '8px 12px' : '12px 16px',
              borderRadius: 12,
              borderTopLeftRadius: 4,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              minWidth: 60,
              fontSize: isMobile ? 14 : undefined,
              lineHeight: 1.6,
            }}
          >
            {streamingContent || <Spin size="small" />}
          </div>
        </div>
      </div>
    );
  };

  // 会话列表内容（桌面端和移动端共用）
  const renderSessionList = () => (
    <>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => setShowNewSessionModal(true)}
        style={{ marginBottom: 16 }}
        block
      >
        新建对话
      </Button>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {isLoadingSessions ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spin />
          </div>
        ) : sessions && sessions.length > 0 ? (
          <List
            dataSource={sessions}
            renderItem={(session: ChatSession) => (
              <List.Item
                style={{
                  cursor: 'pointer',
                  padding: '12px',
                  borderRadius: 8,
                  marginBottom: 8,
                  backgroundColor:
                    selectedSessionId === session.id ? 'var(--color-chat-selected)' : 'transparent',
                }}
                onClick={() => setSelectedSessionId(session.id)}
                actions={[
                  <Popconfirm
                    key="delete"
                    title="确定删除此会话吗？"
                    onConfirm={(e) => {
                      e?.stopPropagation();
                      deleteSessionMutation.mutate(session.id);
                    }}
                    onCancel={(e) => e?.stopPropagation()}
                  >
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={(e) => e.stopPropagation()}
                      danger
                    />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <MessageOutlined style={{ fontSize: 20, color: '#136dec' }} />
                  }
                  title={
                    <Text ellipsis style={{ maxWidth: isMobile ? 200 : 150 }}>
                      {session.title}
                    </Text>
                  }
                  description={
                    <Space direction="vertical" size={0}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {session.member.name}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(session.updatedAt).format('MM-DD HH:mm')}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无会话" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </div>
    </>
  );

  // 对话内容区（桌面端和移动端共用）
  const renderChatContent = () => {
    if (!selectedSessionId) {
      return (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Empty
            description="选择或创建一个会话开始对话"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowNewSessionModal(true)}
            >
              新建对话
            </Button>
          </Empty>
        </div>
      );
    }

    return (
      <>
        {/* 移动端聊天头部 */}
        {isMobile && (
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'var(--color-bg-container)',
              flexShrink: 0,
            }}
          >
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => setSelectedSessionId(null)}
              style={{ padding: '4px 8px' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong ellipsis style={{ display: 'block', fontSize: 15 }}>
                {currentSession?.title || '对话'}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {currentSession?.member?.name}
              </Text>
            </div>
          </div>
        )}

        {/* 消息列表 */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: isMobile ? '12px 12px' : '16px 24px',
          }}
        >
          <Alert
            message="AI 健康建议仅供参考，不能替代专业医疗诊断和治疗。"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            closable
          />

          {isLoadingSession ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin />
            </div>
          ) : (
            <>
              {localMessages.map(renderMessage)}
              {renderStreamingMessage()}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 快捷问题 */}
        {localMessages.length === 0 && !isStreaming && (
          <div style={{ padding: isMobile ? '0 12px 12px' : '0 24px 16px' }}>
            <Text type="secondary" style={{ marginBottom: 8, display: 'block', fontSize: 13 }}>
              快捷问题：
            </Text>
            <Space wrap size={[8, 8]}>
              {QUICK_QUESTIONS.map((q) => (
                <Button
                  key={q}
                  size="small"
                  onClick={() => handleQuickQuestion(q)}
                >
                  {q}
                </Button>
              ))}
            </Space>
          </div>
        )}

        {/* 输入区 */}
        <div
          style={{
            padding: isMobile ? '10px 12px' : '16px 24px',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-bg-elevated)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <TextArea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="输入您的健康问题..."
              autoSize={{ minRows: 1, maxRows: isMobile ? 3 : 4 }}
              disabled={isStreaming}
              style={{ flex: 1 }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={isStreaming}
              disabled={!inputValue.trim()}
              style={isMobile ? { padding: '0 12px' } : undefined}
            >
              {isMobile ? '' : '发送'}
            </Button>
          </div>
        </div>
      </>
    );
  };

  // ========== 移动端布局 ==========
  if (isMobile) {
    return (
      <>
        <div
          style={{
            height: 'calc(100vh - 100px)',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--color-bg-container)',
            margin: -12,
          }}
        >
          {selectedSessionId ? (
            // 移动端：聊天界面（全屏）
            renderChatContent()
          ) : (
            // 移动端：会话列表（全屏）
            <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>健康咨询</h2>
              {renderSessionList()}
            </div>
          )}
        </div>

        {/* 新建会话弹窗 */}
        <Modal
          title="新建对话"
          open={showNewSessionModal}
          onOk={handleCreateSession}
          onCancel={() => setShowNewSessionModal(false)}
          confirmLoading={createSessionMutation.isPending}
        >
          <div style={{ marginBottom: 16 }}>
            <Text>请选择要咨询的家庭成员：</Text>
          </div>
          <Select
            placeholder="选择家庭成员"
            style={{ width: '100%' }}
            value={selectedMemberId}
            onChange={setSelectedMemberId}
          >
            {members?.map((member) => (
              <Select.Option key={member.id} value={member.id}>
                {member.name}
              </Select.Option>
            ))}
          </Select>
        </Modal>
      </>
    );
  }

  // ========== 桌面端布局 ==========
  return (
    <Layout style={{ height: 'calc(100vh - 180px)', background: 'var(--color-bg-container)' }}>
      {/* 会话列表侧边栏 */}
      <Sider
        width={280}
        style={{
          background: 'var(--color-bg-elevated)',
          borderRight: '1px solid var(--color-border)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {renderSessionList()}
      </Sider>

      {/* 对话内容区 */}
      <Content style={{ display: 'flex', flexDirection: 'column' }}>
        {renderChatContent()}
      </Content>

      {/* 新建会话弹窗 */}
      <Modal
        title="新建对话"
        open={showNewSessionModal}
        onOk={handleCreateSession}
        onCancel={() => setShowNewSessionModal(false)}
        confirmLoading={createSessionMutation.isPending}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>请选择要咨询的家庭成员：</Text>
        </div>
        <Select
          placeholder="选择家庭成员"
          style={{ width: '100%' }}
          value={selectedMemberId}
          onChange={setSelectedMemberId}
        >
          {members?.map((member) => (
            <Select.Option key={member.id} value={member.id}>
              {member.name}
            </Select.Option>
          ))}
        </Select>
      </Modal>
    </Layout>
  );
};

export default ChatPage;
