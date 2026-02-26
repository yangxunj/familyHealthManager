import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layout,
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
  Dropdown,
} from 'antd';
import {
  MessageOutlined,
  PlusOutlined,
  DeleteOutlined,
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  ArrowLeftOutlined,
  PictureOutlined,
  CameraOutlined,
  CloseCircleFilled,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { chatApi, membersApi } from '../../api';
import { useDefaultMemberId } from '../../hooks/useDefaultMemberId';
import { useElderModeStore } from '../../store';
import { resolveUploadUrl } from '../../lib/capacitor';
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

// 预处理 Markdown 内容，修复中文标点旁的加粗渲染问题
// 把 **xxx** 模式中，紧邻中文标点的情况替换成 HTML <strong> 标签
const preprocessMarkdown = (content: string): string => {
  // 使用 Unicode 确保正确匹配中文引号和标点
  // \u201C " 左双引号, \u201D " 右双引号, \u2018 ' 左单引号, \u2019 ' 右单引号
  // \u300C 「, \u300D 」, \u300E 『, \u300F 』, \u3010 【, \u3011 】
  // \uFF08 （, \uFF09 ）
  const chinesePunctuation = /[\u201C\u201D\u2018\u2019\u300C\u300D\u300E\u300F\u3010\u3011\uFF08\uFF09]/;

  return content.replace(/\*\*([^*]+)\*\*/g, (match, inner) => {
    const firstChar = inner.charAt(0);
    const lastChar = inner.charAt(inner.length - 1);
    // 如果内容以中文标点开头或结尾，使用 HTML 标签
    if (chinesePunctuation.test(firstChar) || chinesePunctuation.test(lastChar)) {
      return `<strong>${inner}</strong>`;
    }
    // 否则保持原样，让 Markdown 解析器处理
    return match;
  });
};

const ChatPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isElderMode = useElderModeStore((s) => s.isElderMode);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>();
  const [filterMemberId, setFilterMemberId] = useState<string | undefined>(); // 筛选成员
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const fullResponseRef = useRef(''); // 累积完整的 AI 回复（用于最终存入 localMessages）
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>();
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const autoCreateTriggered = useRef(false);
  const [draftMember, setDraftMember] = useState<{ id: string; name: string } | null>(null); // 草稿模式：选了成员但未发消息
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 获取家庭成员（用于新建会话）
  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersApi.getAll(),
  });

  // 新建会话弹窗中，默认选中"自己"的成员
  useDefaultMemberId(members, selectedMemberId, setSelectedMemberId);

  // 只有一个可见成员时，简化 UI：隐藏成员筛选、跳过新建弹窗
  const isSingleMember = members?.length === 1;

  // 获取有会话记录的成员列表（用于筛选下拉菜单，只看普通咨询）
  const { data: membersWithSessions } = useQuery({
    queryKey: ['chat-members-with-sessions', 'GENERAL'],
    queryFn: () => chatApi.getMembersWithSessions('GENERAL'),
  });

  // 会话列表滚动容器引用
  const sessionListRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 20;

  // 获取会话列表（无限滚动，支持成员筛选）
  const {
    data: sessionsData,
    isLoading: isLoadingSessions,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['chat-sessions', 'GENERAL', filterMemberId],
    queryFn: ({ pageParam = 0 }) =>
      chatApi.getSessions({ limit: PAGE_SIZE, offset: pageParam, memberId: filterMemberId, type: 'GENERAL' }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      // 如果返回的数据少于 PAGE_SIZE，说明没有更多了
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
  });

  // 扁平化分页数据
  const sessions = sessionsData?.pages.flat();

  // 获取当前会话详情
  const { data: currentSession, isLoading: isLoadingSession } = useQuery({
    queryKey: ['chat-session', selectedSessionId],
    queryFn: () => chatApi.getSession(selectedSessionId!),
    enabled: !!selectedSessionId,
    // 标题仍为"新对话"时每 3 秒轮询，等后端异步生成标题完成后自动停止
    refetchInterval: (query) => {
      return query.state.data?.title === '新对话' ? 3000 : false;
    },
  });

  // 同步远程消息到本地（智能合并，避免用旧数据覆盖新添加的本地消息）
  useEffect(() => {
    if (currentSession?.messages && !isStreaming) {
      setLocalMessages((prev) => {
        // 如果本地没有消息，直接使用服务器消息
        if (!prev || prev.length === 0) {
          return currentSession.messages;
        }
        // 只有当服务器消息数量 >= 本地消息数量时，才使用服务器消息
        // 这样可以避免用旧数据覆盖刚添加的本地消息
        if (currentSession.messages.length >= prev.length) {
          return currentSession.messages;
        }
        // 服务器消息比本地少，保留本地消息（可能是刚添加的还没同步到服务器）
        return prev;
      });
    }
  }, [currentSession?.messages, isStreaming]);

  // 当会话标题从"新对话"变为实际标题时，同步刷新会话列表
  useEffect(() => {
    if (currentSession?.title && currentSession.title !== '新对话') {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
    }
  }, [currentSession?.title, queryClient]);

  // 创建会话
  const createSessionMutation = useMutation({
    mutationFn: chatApi.createSession,
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['chat-members-with-sessions'] }); // 刷新成员列表
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

  // 处理 URL 参数（从健康建议页面跳转过来）
  useEffect(() => {
    const memberId = searchParams.get('memberId');
    const question = searchParams.get('question');
    const sessionId = searchParams.get('sessionId');

    // 如果传入了 sessionId，直接选中该会话
    if (sessionId) {
      setSelectedSessionId(sessionId);
      setSearchParams({}, { replace: true });
      return;
    }

    if (memberId && question && !autoCreateTriggered.current) {
      autoCreateTriggered.current = true;
      // 保存问题，等会话创建后发送
      setPendingQuestion(question);

      // 解析来源追踪参数
      const sourceAdviceId = searchParams.get('sourceAdviceId');
      const sourceItemType = searchParams.get('sourceItemType') as 'concern' | 'suggestion' | 'action' | null;
      const sourceItemIndex = searchParams.get('sourceItemIndex');
      const sourceItemTitle = searchParams.get('sourceItemTitle');

      // 自动创建会话（包含来源信息）
      createSessionMutation.mutate({
        memberId,
        sourceAdviceId: sourceAdviceId || undefined,
        sourceItemType: sourceItemType || undefined,
        sourceItemIndex: sourceItemIndex ? parseInt(sourceItemIndex, 10) : undefined,
        sourceItemTitle: sourceItemTitle || undefined,
      });

      // 清除 URL 参数
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, createSessionMutation]);

  // 滚动到底部（仅在用户发送消息时调用一次）
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);


  // 会话列表滚动加载更多
  const handleSessionListScroll = useCallback(() => {
    const container = sessionListRef.current;
    if (!container || isFetchingNextPage || !hasNextPage) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    // 距离底部 100px 时加载更多
    if (scrollHeight - scrollTop - clientHeight < 100) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // 自动发送预设问题（从健康建议页面跳转过来）
  useEffect(() => {
    if (pendingQuestion && selectedSessionId && !isStreaming) {
      // 延迟一点确保会话已准备好
      const timer = setTimeout(() => {
        handleSend(pendingQuestion);
        setPendingQuestion(null);
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuestion, selectedSessionId, isStreaming]);

  // 生成缩略图（canvas 缩放，避免渲染原始大图）
  const createThumbnail = (file: File, maxSize = 128): Promise<string> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => {
        // fallback：直接用 blob URL
        resolve(url);
      };
      img.src = url;
    });
  };

  // 选择图片
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const remaining = 3 - pendingImages.length;
    const toAdd = files.slice(0, remaining);
    // 立即更新文件列表，预览先放占位空串（触发加载状态）
    setPendingImages((prev) => [...prev, ...toAdd]);
    setImagePreviewUrls((prev) => [...prev, ...toAdd.map(() => '')]);
    e.target.value = '';
    // 异步生成缩略图
    const startIndex = pendingImages.length;
    toAdd.forEach((file, i) => {
      createThumbnail(file).then((thumbUrl) => {
        setImagePreviewUrls((prev) => {
          const next = [...prev];
          next[startIndex + i] = thumbUrl;
          return next;
        });
      });
    });
  };

  // 移除已选图片
  const handleRemoveImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // 发送消息（可选传入消息内容，用于自动发送）
  const handleSend = async (messageContent?: string) => {
    const content = messageContent || inputValue.trim();
    if ((!content && pendingImages.length === 0) || isStreaming) return;

    // 草稿模式：先创建会话
    let sessionId = selectedSessionId;
    if (!sessionId && draftMember) {
      try {
        const session = await chatApi.createSession({ memberId: draftMember.id });
        sessionId = session.id;
        setSelectedSessionId(session.id);
        setDraftMember(null);
        queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['chat-members-with-sessions'] });
      } catch {
        message.error('创建会话失败');
        return;
      }
    }
    if (!sessionId) return;

    // 先上传图片
    let uploadedUrls: string[] = [];
    if (pendingImages.length > 0) {
      setUploading(true);
      try {
        uploadedUrls = await Promise.all(
          pendingImages.map((f) => chatApi.uploadChatImage(f).then((r) => r.url)),
        );
      } catch {
        message.error('图片上传失败');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: content || '(图片)',
      imageUrls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      createdAt: new Date().toISOString(),
    };

    // 立即添加用户消息到本地，并滚动到底部让用户看到自己的问题
    setLocalMessages((prev) => [...(prev || []), userMessage]);
    if (!messageContent) setInputValue('');
    // 清空已选图片
    imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPendingImages([]);
    setImagePreviewUrls([]);
    setIsStreaming(true);
    setStreamingContent('');
    fullResponseRef.current = '';

    // 发送后滚动一次，让用户看到自己发送的消息
    setTimeout(() => scrollToBottom(), 100);

    try {
      await chatApi.sendMessage(
        sessionId,
        userMessage.content,
        (event) => {
          if ('tokensUsed' in event) {
            // API 完成事件 — 将完整回复存入 localMessages，清空流式状态
            const fullText = fullResponseRef.current;
            if (fullText) {
              const aiMessage: ChatMessage = {
                id: `ai-${Date.now()}`,
                role: 'assistant',
                content: fullText,
                createdAt: new Date().toISOString(),
              };
              setLocalMessages((prev) => [...(prev || []), aiMessage]);
            }
            setIsStreaming(false);
            setStreamingContent('');
            fullResponseRef.current = '';
            // 延迟刷新服务器数据，确保 React 已处理状态更新
            // 标题由 refetchInterval 轮询自动捕获，这里只刷新消息和会话列表
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['chat-session', sessionId] });
              queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
            }, 300);
          } else {
            // 实时显示 AI 返回的内容
            const msgEvent = event as SSEMessageEvent;
            if (!msgEvent.done) {
              fullResponseRef.current += msgEvent.content;
              setStreamingContent(fullResponseRef.current);
            }
          }
        },
        (error) => {
          message.error(error);
          setIsStreaming(false);
          fullResponseRef.current = '';
        },
        uploadedUrls.length > 0 ? uploadedUrls : undefined,
      );
    } catch (error) {
      console.error('[ChatPage] 发送消息失败:', error);
      const errorMsg = error instanceof Error ? error.message : '发送消息失败';
      message.error(errorMsg);
      setIsStreaming(false);
      fullResponseRef.current = '';
    }
  };

  // 处理快捷问题点击
  const handleQuickQuestion = (question: string) => {
    setInputValue(question);
  };

  // 创建新会话（进入草稿模式，不立即调 API）
  const handleCreateSession = () => {
    if (!selectedMemberId) {
      message.warning('请选择家庭成员');
      return;
    }
    const member = members?.find((m) => m.id === selectedMemberId);
    if (!member) return;
    setDraftMember({ id: member.id, name: member.name });
    setSelectedSessionId(null);
    setLocalMessages([]);
    setShowNewSessionModal(false);
  };

  // 新建对话入口：单成员时跳过弹窗直接进入草稿模式
  const handleNewSession = () => {
    if (isSingleMember && members?.[0]) {
      const member = members[0];
      setDraftMember({ id: member.id, name: member.name });
      setSelectedSessionId(null);
      setLocalMessages([]);
    } else {
      setShowNewSessionModal(true);
    }
  };

  // 消息气泡尺寸（老人模式放大）
  const msgFontSize = isElderMode ? 17 : (isMobile ? 14 : undefined);
  const msgLineHeight = isElderMode ? 1.8 : 1.6;
  const msgPadding = isElderMode ? '12px 16px' : (isMobile ? '8px 12px' : '10px 14px');

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
              padding: msgPadding,
              borderRadius: 16,
              borderTopLeftRadius: isUser ? 16 : 4,
              borderTopRightRadius: isUser ? 4 : 16,
              wordBreak: 'break-word',
              fontSize: msgFontSize,
              lineHeight: msgLineHeight,
            }}
            className={isUser ? undefined : 'markdown-content'}
          >
            {isUser ? (
              <>
                {msg.imageUrls && msg.imageUrls.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: msg.content && msg.content !== '(图片)' ? 8 : 0 }}>
                    {msg.imageUrls.map((url, i) => (
                      <img
                        key={i}
                        src={resolveUploadUrl(url)}
                        alt={`图片${i + 1}`}
                        style={{
                          maxWidth: isMobile ? 160 : 200,
                          maxHeight: isMobile ? 160 : 200,
                          borderRadius: 8,
                          cursor: 'pointer',
                          objectFit: 'cover',
                        }}
                        onClick={() => window.open(resolveUploadUrl(url), '_blank')}
                      />
                    ))}
                  </div>
                )}
                {msg.content && msg.content !== '(图片)' && (
                  <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                )}
              </>
            ) : (
              <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{preprocessMarkdown(msg.content)}</Markdown>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 渲染流式消息（实时显示 AI 返回的内容）
  const renderStreamingMessage = () => {
    if (!isStreaming) return null;

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
              padding: isElderMode ? '12px 16px' : (isMobile ? '8px 12px' : '12px 16px'),
              borderRadius: 12,
              borderTopLeftRadius: 4,
              wordBreak: 'break-word',
              minWidth: 60,
              fontSize: msgFontSize,
              lineHeight: msgLineHeight,
            }}
            className="markdown-content"
          >
            {streamingContent ? (
              <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{preprocessMarkdown(streamingContent)}</Markdown>
            ) : (
              <>
                <Spin size="small" />
                <span style={{ marginLeft: 8, color: 'var(--color-text-secondary)' }}>AI 正在思考...</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 会话列表内容（桌面端和移动端共用）
  const renderSessionList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* 成员筛选（只有一个可见成员时隐藏） */}
      {!isSingleMember && membersWithSessions && membersWithSessions.length > 0 && (
        isElderMode ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, flexShrink: 0 }}>
            <Button
              type={!filterMemberId ? 'primary' : 'default'}
              style={{ borderRadius: 20 }}
              onClick={() => setFilterMemberId(undefined)}
            >
              全部
            </Button>
            {membersWithSessions.map((member) => (
              <Button
                key={member.id}
                type={filterMemberId === member.id ? 'primary' : 'default'}
                style={{
                  borderRadius: 20,
                  ...(filterMemberId !== member.id ? { borderColor: 'var(--color-border)' } : {}),
                }}
                onClick={() => setFilterMemberId(member.id)}
              >
                {member.name}
              </Button>
            ))}
          </div>
        ) : (
          <Select
            value={filterMemberId || 'all'}
            onChange={(value) => setFilterMemberId(value === 'all' ? undefined : value)}
            style={{ marginBottom: 12, flexShrink: 0 }}
          >
            <Select.Option value="all">所有人</Select.Option>
            {membersWithSessions.map((member) => (
              <Select.Option key={member.id} value={member.id}>
                {member.name}
              </Select.Option>
            ))}
          </Select>
        )
      )}

      <Button
        type={isElderMode ? undefined : 'primary'}
        icon={<PlusOutlined />}
        onClick={() => handleNewSession()}
        style={{
          marginBottom: 16,
          flexShrink: 0,
          ...(isElderMode ? { background: '#52c41a', borderColor: '#52c41a', color: '#fff' } : {}),
        }}
        block
      >
        新建对话
      </Button>

      <div
        ref={sessionListRef}
        onScroll={handleSessionListScroll}
        className="hover-scrollbar"
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}
      >
        {isLoadingSessions ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spin />
          </div>
        ) : sessions && sessions.length > 0 ? (
          <>
            {sessions.map((session: ChatSession) => (
              <div
                key={session.id}
                style={{
                  cursor: 'pointer',
                  padding: '12px',
                  borderRadius: 8,
                  marginBottom: 8,
                  backgroundColor:
                    selectedSessionId === session.id ? 'var(--color-chat-selected)' : 'transparent',
                }}
                onClick={() => setSelectedSessionId(session.id)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%', gap: 8 }}>
                  <MessageOutlined style={{ fontSize: 20, color: '#136dec', flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: '1.4',
                        wordBreak: 'break-all',
                        fontWeight: 500,
                      }}
                    >
                      {session.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                      {session.member.name} · {dayjs(session.updatedAt).format('MM-DD HH:mm')}
                    </div>
                  </div>
                  <Popconfirm
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
                      style={{ flexShrink: 0 }}
                    />
                  </Popconfirm>
                </div>
              </div>
            ))}
            {/* 加载更多指示器 */}
            {isFetchingNextPage && (
              <div style={{ textAlign: 'center', padding: 12 }}>
                <Spin size="small" />
              </div>
            )}
            {!hasNextPage && sessions.length >= PAGE_SIZE && (
              <div style={{ textAlign: 'center', padding: 12, color: 'var(--color-text-secondary)', fontSize: 12 }}>
                没有更多了
              </div>
            )}
          </>
        ) : (
          <Empty description="暂无会话" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </div>
    </div>
  );

  // 对话内容区（桌面端和移动端共用）
  const renderChatContent = () => {
    if (!selectedSessionId && !draftMember) {
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
              onClick={() => handleNewSession()}
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
              onClick={() => { setSelectedSessionId(null); setDraftMember(null); }}
              style={{ padding: '4px 8px' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong ellipsis style={{ display: 'block', fontSize: 15 }}>
                {currentSession?.title || (draftMember ? '新对话' : '对话')}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {currentSession?.member?.name || draftMember?.name}
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
              {localMessages?.map(renderMessage)}
              {renderStreamingMessage()}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 快捷问题 */}
        {(!localMessages || localMessages.length === 0) && !isStreaming && pendingImages.length === 0 && (
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
          {/* 图片预览 */}
          {imagePreviewUrls.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              {imagePreviewUrls.map((url, i) => (
                <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
                  {url ? (
                    <img
                      src={url}
                      alt={`预览${i + 1}`}
                      style={{
                        width: 64,
                        height: 64,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '1px solid var(--color-border)',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 8,
                        border: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--color-bg-elevated)',
                      }}
                    >
                      <Spin size="small" />
                    </div>
                  )}
                  <CloseCircleFilled
                    onClick={() => handleRemoveImage(i)}
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      fontSize: 18,
                      color: '#ff4d4f',
                      cursor: 'pointer',
                      background: '#fff',
                      borderRadius: '50%',
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          {/* 选择本地图片 */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleImageSelect}
          />
          {/* 拍照（capture 属性调起摄像头） */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleImageSelect}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'gallery',
                    icon: <PictureOutlined />,
                    label: '本地相册',
                    onClick: () => imageInputRef.current?.click(),
                  },
                  {
                    key: 'camera',
                    icon: <CameraOutlined />,
                    label: '拍照',
                    onClick: () => cameraInputRef.current?.click(),
                  },
                ],
              }}
              placement="topLeft"
              trigger={['click']}
              disabled={isStreaming || uploading || pendingImages.length >= 3}
            >
              <Button
                type="text"
                icon={<PictureOutlined />}
                disabled={isStreaming || uploading || pendingImages.length >= 3}
                title="添加图片（最多3张）"
                style={{ flexShrink: 0, padding: '4px 8px' }}
              />
            </Dropdown>
            <TextArea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={pendingImages.length > 0 ? '添加文字说明（可选）...' : '输入您的健康问题...'}
              autoSize={{ minRows: 1, maxRows: isMobile ? 3 : 4 }}
              disabled={isStreaming}
              style={{ flex: 1, ...(isElderMode ? { fontSize: 17 } : {}) }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => handleSend()}
              loading={isStreaming || uploading}
              disabled={!inputValue.trim() && pendingImages.length === 0}
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
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--color-bg-container)',
            margin: isElderMode ? -8 : -12,
          }}
        >
          {(selectedSessionId || draftMember) ? (
            // 移动端：聊天界面（全屏）
            renderChatContent()
          ) : (
            // 移动端：会话列表（全屏）
            <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: 18, flexShrink: 0 }}>健康咨询</h2>
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
          confirmLoading={false}
        >
          <div style={{ marginBottom: 16 }}>
            <Text>请选择要咨询的家庭成员：</Text>
          </div>
          {isElderMode ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {members?.map((member) => (
                <Button
                  key={member.id}
                  type={selectedMemberId === member.id ? 'primary' : 'default'}
                  style={{
                    borderRadius: 20,
                    minWidth: 80,
                    ...(selectedMemberId !== member.id ? { borderColor: 'var(--color-border)' } : {}),
                  }}
                  onClick={() => setSelectedMemberId(member.id)}
                >
                  {member.name}
                </Button>
              ))}
            </div>
          ) : (
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
          )}
        </Modal>
      </>
    );
  }

  // ========== 桌面端布局 ==========
  return (
    <Layout style={{ flex: 1, minHeight: 0, background: 'var(--color-bg-container)' }}>
      {/* 会话列表侧边栏 */}
      <Sider
        width={280}
        style={{
          background: 'var(--color-bg-elevated)',
          borderRight: '1px solid var(--color-border)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden', // 防止 Sider 本身滚动，让内部容器控制滚动
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
